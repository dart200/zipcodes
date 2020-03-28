#!/usr/bin/env node
const fs = require('fs');
const lineReader = require('line-reader');

const db = fs.createWriteStream('db.csv', { flags: 'w' });

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
let notFound = 0;
const readZipCodes = (filename) => new Promise((resolve) =>
  lineReader.eachLine(filename, (line) => {
    total = total + 1;

    const matches = line.match(/,|".+?",|.+?,|.+$/g)
      .map(m => m.replace(/^"|",$|"$|,$/g, ''));

    const [
      zip,type,decommissioned,primary_city,acceptable_cities,unacceptable_cities,
      state,county,timezone,area_codes,world_region,country,latitude,longitude,
      irs_estimated_population_2015
    ] = matches;

    if (zip === 'zip') {
      db.write('zip;county;state;geopoint;timezone\n');
      return;
    }

    if (type === 'MILITARY') {
      return;
    }

    const zipCode = zip;
    const searchState = state.toUpperCase();
    const searchCounty = county.replace(/\./g,'').toUpperCase();

    let geopoint = geopoints[zipCode];
    if (!geopoint){
      geopoint = `${latitude}, ${longitude}`;
      // console.log(`geopoint not found: ${zipCode} ${type}, resorting to: ${geopoint}`);
      notFound = notFound + 1;
    }

    db.write(`${zipCode};${searchCounty};${searchState};${geopoint};${timezone}\n`);
  }, () => {
    console.log(`total: ${total}`);
    console.log(`less precise geopoint: ${notFound}`);
    resolve();
  })
);

const run = async () => {
  await readGeoPoints('./opensoft-geopoints.csv');
  await readZipCodes('./zipcode-localities.csv');
};

run();
