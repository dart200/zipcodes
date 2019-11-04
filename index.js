const fs = require('fs');
const lineReader = require('line-reader');
var admin = require('firebase-admin');

// initialize firebase/firestore
const serviceAccount = require("./muva-backend-dev-key.json");
const app = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://muva-backend.firebaseio.com"
});
const db = admin.firestore();

const geopoints = [];

const readGeoPoints = (filename) => new Promise((resolve) =>
  lineReader.eachLine(filename, (line) => {
    const [ zipCode, city, state, latitude, longitude, timezone, daylightSavingsFlag, geopoint ] 
      = line.split(';');
    
    if (zipCode !== 'Zip')
      //console.log(`zipCode: ${zipCode} geopoint: ${geopoint}`);
      geopoints[zipCode] = geopoint;
  }, () => {
    console.log(`geopoints read`);
    resolve();
  })
);

let total = 0;
let kept = 0;
const zipcodes = [];

const readZipCodes = (filename) => new Promise((resolve) =>
  lineReader.eachLine(filename, (line) => {
    const [ x, type, ...tRest ] = line.split('\t');
    const [ n0, n1, zipCode ] = x.split(' ')
    total = total + 1;

    //if (type === 'General' || type === 'Unique') {
      kept = kept + 1;
      const geopoint = geopoints[zipCode];
      if (!geopoint){
        console.log(`geopoint not found: ${zipCode} ${type}`);
        db.collection('validZipCodes').doc(zipCode).set({ type, geopoint: '' });
      } else { 
        //console.log({ type, geopoint });
        db.collection('validZipCodes').doc(zipCode).set({ type, geopoint });
      }
    //}
  }, () => {
    console.log(`total: ${total}, kept: ${kept}`);
    resolve();
  })
);

const run = async () => {
  await readGeoPoints('./ca-geopoints.csv');
  await readZipCodes('./san-diego');
  await readZipCodes('./ventura');
}

run();
