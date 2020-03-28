#!/usr/bin/env node
const fs = require('fs');
const commandLineArgs = require('command-line-args');
const lineReader = require('line-reader');

const errorOut = (errMsg) => {
  console.error(errMsg);
  process.exit(1);
}

// process command lines args
const optionDefinitions = [
  {name: 'live', type: Boolean},
  {name: 'positionals', defaultOption: true, multiple: true},
];
const {live, positionals} = commandLineArgs(optionDefinitions);

if (!positionals) 
  errorOut('need selector of syntax: <county|state>=<value>');

let selectCounty = null;
let selectState = null;
for (const arg of positionals) {
  const matches = arg.match(/(county|state)=(\w+)/)
  if (!matches) errorOut('selectors must be of syntax: <county|state>=<value>');
  const [match, select, value] = matches;
  if (select === 'county') selectCounty = value.toUpperCase();
  if (select === 'state') {
    if (value.length !== 2) errorOut('state must be two letter code');
    selectState = value.toUpperCase().replace(' ', '');
  }
}

if (!selectCounty && !selectState) {
  errorOut('no selectors set?');
}

// initialize firebase/firestore
var admin = require('firebase-admin');
const serviceAccount = require("./muva-backend-key.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://muva-backend.firebaseio.com"
});
const db = admin.firestore();

let total = 0;
const promises = [];
const readZipCodes = () => new Promise((resolve) =>
  lineReader.eachLine('./db/db.csv', async (line) => {
    const [zipCode, county, state, geopoint, timezone] = line.split(';');

    if (selectState && state !== selectState) return;
    if (selectCounty && county.replace(/ /g, '') !== selectCounty) return;

    if (live) {
      const p = db.doc(`validZipCodes/${zipCode}`).set({
        geopoint: geopoint,
        timezone,
        county,
        state,
      });
      promises.push(p);
    } else { 
      console.log(`${zipCode}; ${county}; ${state}; ${geopoint}; ${timezone}`);
    }
    total = total+1;
  }, async () => {
    console.log(`total: ${total}`);
    if (live) {
      await Promise.all(promises);
      console.log('zip codes written');
    }
    resolve();
  })
);

const run = async () => {
  await readZipCodes();
};

run();
