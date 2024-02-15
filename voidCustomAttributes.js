import fetch from "node-fetch";
import fs from "fs";
import pMap, { pMapSkip } from "p-map";
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
  method: "PUT",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    "Intercom-Version": "2.9",
  },
};
const progressSteps = 1000; // set to number of requests that should run inbetween console log feedback

/**
 *
 * @param {string} contactID An intercom contact id of the contact profile to update
 * @param {fetch.RequestInit} updateConfig The configuration of the request handed to the Intercom API
 * @returns
 */
const updateContact = async (contactID, updateConfig) => {
  try {
    // call Intercom API
    let url = baseUrl + "contacts/" + contactID; // update endpoint
    const response = await fetch(url, updateConfig);
    if (!response.ok) {
      console.error(
        `Request to Intercom API failed with ${response.status} : ${response.statusText} for Intercom Contact ID ${contactID}`
      );
    }
    saveResult(contactID, response.ok);
    return response;
  } catch (error) {
    console.error(
      `Error requesting Intercom user update for id ${contactID} : ${error.message}`
    );
    saveResult(contactID, false);
    return pMapSkip; // skip the element that errored
  }
};

/**
 * Resets a collection of Intercom Custom attributes to unknown on Intercom Profiles
 * @param {string[]} contactIDs A list of contact ids to sweep
 */
const sweep = async (contactIDs) => {
  console.log("running sweep...");

  // reset custom parameters OR set to desired values: https://developers.intercom.com/docs/references/rest-api/api.intercom.io/Contacts/UpdateContact/
  requestOpts.body = JSON.stringify({
    custom_attributes: {
      funnel_phase: "",
      active: "",
      "active-joined": "",
      awareness: "",
      "awareness-joined": "",
      exploration: "",
      "exploration-joined": "",
      application: "",
      "application-joined": "",
      selection: "",
      "selection-joined": "",
      employment: "",
      inactive: "",
      "inactive-joined": "",
    },
  });

  console.log("%cRequest is: ", "color:yellow; background:green;");
  console.log(requestOpts);

  let counter = 0;
  pMap(
    contactIDs,
    async (contact) => {
      const result = await updateContact(contact, requestOpts);
      counter++;
      if (counter % progressSteps === 0) {
        console.log(`Upated ${counter} of ${contactIDs.length} contacts.`);
      }
      return result;
    },
    { concurrency: 13 }
  );
};

/**
 * Write results to hard drive to verify results
 * @param {string} id
 * @param {boolean} wasSuccessful
 */
function saveResult(id, wasSuccessful) {
  const file = wasSuccessful
    ? "./res/sweep_result.txt"
    : "./res/sweep_result_errors.txt";
  //Write prettified output to file (for testing)
  fs.appendFile(file, '"' + id + '", ', (err) => {
    if (err) return console.error(err);
  });
}

// run sweep to reset custom attributes
(async () => {
  const contactIDs = JSON.parse(
    fs.readFileSync("./res/allContacts.txt", "utf8")
  );
  sweep(contactIDs);
})();
