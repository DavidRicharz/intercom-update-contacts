import fetch from "node-fetch";
import fs from "fs";
import "dotenv/config";

if (
  !process.env.INTERCOM_ACCESS_TOKEN_PRODUCTION &&
  !process.env.INTERCOM_ACCESS_TOKEN_STAGING
) {
  console.error(
    "Missing critical env vars. Make sure all variables are defined in .env file. Aborting. "
  );
  process.exit(1);
}
const baseUrl = `https://api.intercom.io/`;
const token = process.env.INTERCOM_ACCESS_TOKEN_PRODUCTION;

const requestOpts = {
  method: "GET",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    "Intercom-Version": "2.9",
  },
};

// A list of custom_attributes to filter contacts by. If all attributes are undefined the contact is dropped
const filter = [
  "funnel_phase",
  "inactive",
  "active",
  "awareness",
  "exploration",
  "application",
  "selection",
  "employment",
];

const fetchContacts = async (allContactIds = [], cursor) => {
  try {
    // call Intercom API
    let url =
      baseUrl +
      "contacts/" + // contacts gets all contacts
      "?per_page=150"; // num of pages per result: https://developers.intercom.com/docs/build-an-integration/learn-more/rest-apis/pagination-cursor/
    if (cursor) {
      url += `&starting_after=${cursor}`;
    }

    const res = await fetch(url, requestOpts);
    if (!res.ok)
      console.error(
        `http response failed with ${res.status} : ${res.statusText}`
      );
    const body = await res.json();
    const { data, pages } = body;
    const { page, total_pages } = pages;
    const starting_after = pages?.next?.starting_after; // starting after contains the next x results
    console.log(`Fetched page ${page}/${total_pages}`);

    const contact_ids = data
      .filter(
        (contact) =>
          contact.workspace_id === "sx32r71f" && // filter by JC workspace id for jobs.ch [TEST]
          hasAnyDefinedProperties(contact.custom_attributes, filter) // filter out any contact where all attributes defined in filter are undefined
      )
      .map((contact) => contact.id); // extract intercom contact id

    // append this page's ids to master list
    allContactIds = [...allContactIds, ...contact_ids];

    const contactIDCount = page * 150 + allContactIds.length;
    console.log("contact id count: ", contactIDCount);

    // determine whether to continue sweep
    if (starting_after) {
      // Store interim result to prevent heap limit
      storeContacts(allContactIds);
      allContactIds = []; // reset stored contact ids
      return await fetchContacts(allContactIds, starting_after);
    } else {
      console.log(`Done.`);
      console.log(`Total amount of contact ids: ${contactIDCount}`);

      return allContactIds;
    }
  } catch (e) {
    console.error(e.message);
  }
};

/**
 * Returns false if all properties of the provided list are undefined
 * @param {*} object An object to check
 * @param {string[]} propertiesToFilter A list of porperties to check for undefined value
 * @returns {boolean}
 */
function hasAnyDefinedProperties(object, propertiesToFilter) {
  if (propertiesToFilter.length === 0) return true;
  const result = !propertiesToFilter.every(
    (prop) => object[prop] === undefined || object[prop] === null
  );
  return result;
}

/**
 * Store all contact ids from last request on hard drive
 * @param {string[]} contactIDs
 */
function storeContacts(contactIDs) {
  const content = JSON.stringify(contactIDs, null, 2);
  const destinationFile = "./res/allContacts.txt";
  fs.appendFile(destinationFile, content, (err) => {
    if (err) {
      return console.error(err);
    } else {
      console.log("all contacts stored in " + destinationFile);
    }
  });
}

// run fetchContacts to get all contact ids
(async () => {
  console.log("getting contacts...");
  const contactIDs = await fetchContacts();
})();
