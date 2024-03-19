## Intercom Contact Updated

A script to mass update Intercom contacts

## Setup

Create a `.env` file based on `.env.example` by copying the example and filling in the bearer token value of you Intercom workspace.

```shell
cp .env.example .env
```

Install packages

`npm install`

## Run

`npm run getContacts` - Get a list of all contact ids associated with your workspace

`npm run sweepContacts` - Update the list of contacts based on defined request

## Usage

You can do what you want with the fetched contacts by altering the requestOpts body property in voidCustomAttributes.js:

```js
requestOpts.body = JSON.stringify({
  custom_attributes: {
    my_atttribute: "Updated value",
  },
});
```

## Rate limits

https://developers.intercom.com/docs/references/rest-api/errors/rate-limiting/

# intercom-update-contacts
