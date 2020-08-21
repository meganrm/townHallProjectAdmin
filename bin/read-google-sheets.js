#!/usr/bin/env node
require('dotenv').load();

var readline = require('readline');
var googleAuth = require('google-auth-library');
const moment = require('moment');

const Pledger = require('../server/pledger/model');

const firebasedb = require('../server/lib/setupFirebase').realtimedb;
const googleMethods = require('../server/recess-events/google-methods');

var SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const TESTING_SHEETS_ID = "1tAfnKQz-2HUmCSKjbblqzs-T8Q4trn1GbVUJklTbbjc";
const PLEDGER_SHEETS_ID = '15B6AjwdKrtbE1NZ4NeQUopiZfyzplJwKdmfTRki2p2g';
const SHEETS_ID = process.env.NODE_ENV === 'production' ? PLEDGER_SHEETS_ID : TESTING_SHEETS_ID;

const ROOT_DATABASE_PATH = 'town_hall_pledges';
console.log('testing google sheet:', SHEETS_ID === TESTING_SHEETS_ID)
console.log('production google sheet:', SHEETS_ID === PLEDGER_SHEETS_ID)

var clientSecret = process.env.GOOGLE_CLIENT_SECRET;
var clientId = process.env.GOOGLE_CLIENT_ID;
var redirectUrl = process.env.GOOGLE_REDIRECT_URI_1;
var auth = new googleAuth();
var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);
const CURRENT_YEAR = moment().format('YYYY')
const currentToken =
  { access_token: process.env.GOOGLE_ACCESS_TOKEN,
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    token_type: 'Bearer',
    expiry_date: 1522106489761,
  };

oauth2Client.credentials = currentToken;

function getNewToken(oauth2Client, callback) {
  var authUrl = oauth2Client.generateAuthUrl({
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url: ', authUrl);
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', function(code) {
    rl.close();
    oauth2Client.getToken(code, function(err, token) {
      if (err) {
        console.log('Error while trying to retrieve access token', err);
        return;
      }
      console.log('got token', token);
      oauth2Client.credentials = token;
      callback(oauth2Client);
    });
  });
}

const isMayoralSheet = columnNames => columnNames.includes("state")

const sleep = ms =>
  new Promise(resolve => {
    setTimeout(resolve, ms)
  })

let writeToSheetPromises = []

let numberOfTimesFailed = 1

// Keep trying to write to sheet. If an error happens, sleep
// for an exponential amount of time and try again
const writeToSheet = async (data) => {
  try {
    await googleMethods.write(oauth2Client, SHEETS_ID, data)
  } catch (error) {
    console.log('trying to write but failed', error)
    const sleepDuration = 60 * 1000 * Math.min(numberOfTimesFailed, 5)
    await sleep(sleepDuration)
    numberOfTimesFailed *= 2
    return writeToSheet(data)
  }
}

const getYearAndState = (columnNames, sheetName) => {
  let state;
  let year;
      if (!isMayoralSheet(columnNames)) {
        try {

          [_, state, year] = /([A-Z]{2}) (\d{4})/.exec(sheetName)
        } catch (e) {
          return console.log(e)
        }
      } else {
        try {
          [_, year] = /(\d{4}) Mayoral/i.exec(sheetName)
        } catch (e) {
          return console.log(e)
        }
      }
  return {
    state,
    year
  }
}

const getNewKey = (year, state, newPledger) => {
         try {
           const key = firebasedb
             .ref(ROOT_DATABASE_PATH)
             .child(year)
             .child(state || newPledger.state)
             .push(newPledger).key
            return key;
         } catch (error) {
           return console.log('error making firebase key', error, ROOT_DATABASE_PATH, year, state, newPledger.state)
         }
}

googleMethods
  .getSheets(oauth2Client, SHEETS_ID)
  .then(sheetsNames => {
    const ranges = sheetsNames
      .filter(name => /([A-Z]{2}) \d{4}/.test(name) || /\d{4} Mayoral/i.test(name))
      .map(sheetname => `${sheetname}!A:P`)
    googleMethods
      .readMultipleRanges(oauth2Client, SHEETS_ID, ranges)
      .then(googleRows => {
        googleRows.forEach(sheet => {
          let updateDataForSheet = []
          let sheetName = sheet.range
          let values = sheet.values
          let columnNames = values[0]; // HEADER OF THE SHEET
          let {
            state,
            year
          } = getYearAndState(columnNames, sheetName)
          if (year !== CURRENT_YEAR) {
            console.log('not current year', year)
            return;
          }
          for (let i = 1; i < values.length; i++) {
        
            let row = values[i]
            let obj = row.reduce((acc, cur, index) => {
              let columnName = columnNames[index]
              acc[columnName] = cur
              return acc
            }, {})
      
            let newPledger = new Pledger(obj, state, year)
            let newKey = false;
            if (obj.Candidate && obj.Candidate.length > 0) {
              let key = isMayoralSheet(columnNames) ? row[15] : row[12];
              if (key === "end" || !key) {
                newKey = getNewKey(year, state, newPledger);
                if (isMayoralSheet(columnNames)) {
                  row[15] = newKey
                } else {
                  row[12] = newKey
                }
              } else {
                writeToSheetPromises.push(
                firebasedb
                  .ref(`${ROOT_DATABASE_PATH}/${newPledger.year}/${newPledger.state}/${key}`)
                  .update(newPledger))
              }
              if (newKey) {
                let writeRange = `${sheetName.split("!")[0]}!A${i + 1}:P${i + 1}`
                let toUpdate = {
                  range: writeRange,
                  majorDimension: "ROWS",
                  values: [row]
                }
                updateDataForSheet.push(toUpdate)
              }
            }
          }
          if (updateDataForSheet.length) {
            writeToSheetPromises.push(writeToSheet(updateDataForSheet))

          }
        })
      }).then(()=> {
        Promise.all(writeToSheetPromises).then(() => {
          console.log('wrote to sheet')
          process.exit(0)
        })
      })
  })
  .catch(err => {
    console.log("error reading sheet:", err.message)
    process.exit(1)
  })