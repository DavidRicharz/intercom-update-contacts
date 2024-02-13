const fetch = require("node-fetch");
const fs = require("fs");

require("dotenv").config();

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

/**
 *
 * @param {string} contactID An intercom contact id of the contact profile to update
 * @param {fetch.RequestInit} updateConfig The configuration of the request handed to the Intercom API
 * @returns
 */
const updateContact = async (contactID, updateConfig) => {
  // call Intercom API
  let url = baseUrl + "contacts/" + contactID; // update endpoint
  const response = await fetch(url, updateConfig);
  console.log(response.statusText);
  return response;
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

  let successes = [];
  let errors = [];
  let counter = 0;

  for (const contact of contactIDs) {
    counter++;
    let response = await updateContact(contact, requestOpts);
    let body = await response.json();

    if (!response.ok) {
      console.error(
        `Request to Intercom API failed with ${response.status} : ${response.statusText} for Intercom Contact ID ${contact}`
      );
      errors.push(
        JSON.stringify({ contact_id: contact, error: response.statusText })
      );
    } else {
      successes.push(JSON.stringify(body?.id));
    }

    // store and reset intermedia results
    if (counter % 5 == 0) {
      console.log(`Upated ${counter} of ${contactIDs.length} contacts.`);
      trackResults(successes, errors);
      successes = errors = []; // flush
    }
  }
};

/**
 * Write results to hard drive to verify results
 * @param {string[]} result
 * @param {Object[]} errors
 */
function trackResults(result, errors) {
  //Write prettified output to file (for testing)
  fs.appendFile("./res/sweep_result.csv", result.join(","), (err) => {
    if (err) {
      return console.error(err);
    } else {
      console.log("Intercom ids swept saved in sweep_result.csv");
    }
  });

  fs.appendFile("./res/sweep_result_errors.csv", errors.join(","), (err) => {
    if (err) {
      return console.error(err);
    } else {
      console.log("Failed requests saved in sweep_result_errors.csv");
    }
  });
}

// run sweep to reset custom attributes
(async () => {
  const contactIDs = JSON.parse(
    fs.readFileSync("./res/sampleContacts.txt", "utf8")
  );
  sweep(contactIDs);
})();
