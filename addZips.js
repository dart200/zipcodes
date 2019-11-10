#!/usr/bin/env node

const [,, ...args] = process.argv;

let debug = false;    // sets debug printout instead of pushing to database
let verbose = false;  // doesn't do anything, just here to see how clean i can make a flag interface

const opts = [
  [() => debug = true, '-d', '--debug'],
  [() => verbose = true, '-v'],
].map(([effect, ...flags]) => ({ effect, flags }));

for (arg of args) {
  if (!/-{1,2}[\S]*/.test(arg)) continue;

  const found = opts.find(
    ({effect, flags}) => flags.includes(arg)
  );
  
  if (!found) {
    console.error(`unknown flag: ${arg}`);
    process.exit();
  } else {
    found.effect();
  }
};

const fs = require('fs');
const lineReader = require('line-reader');

// initialize firebase/firestore
var admin = require('firebase-admin');
const serviceAccount = require("./muva-backend-key.json");
const app = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://muva-backend.firebaseio.com"
});
const db = admin.firestore();

const geopoints = [];

const readGeoPoints = (filename) => new Promise((resolve) =>
  lineReader.eachLine(filename, (line) => {
    const [zipCode, city, state, latitude, longitude, timezone, daylightSavingsFlag, geopoint] 
      = line.split(';');
    
    if (zipCode !== 'Zip')
      geopoints[zipCode] = geopoint;
  }, () => {
    console.log(`geopoints read`);
    resolve();
  })
);

let total = 0;

const readZipCodes = (filename) => new Promise((resolve) =>
  lineReader.eachLine(filename, (line) => {
    const [x, type, ...tRest] = line.split('\t');
    const [n0, n1, zipCode] = x.split(' ')
    
    total = total + 1;
    const geopoint = geopoints[zipCode];

    if (debug) {
      if (!geopoint){
        console.log(`geopoint not found: ${zipCode} ${type}`);
      } else { 
        console.log({ zipCode, type: type[0], geopoint });
      }
    } else {
      db.doc(`validZipCodes/${zipCode}`).set({
        type,
        geopoint: geopoint || '',
      });
    }

  }, () => {
    if (!debug) console.log('zip codes written');
    console.log(`total: ${total}`);
    resolve();
  })
);

const run = async () => {
  await readGeoPoints('./ca-geopoints.csv');
  await readZipCodes('./counties/santa-barbara');
};

run();
