#!/usr/bin/env node

const states = require('../server/data/stateMap');
var readline = require('readline');
var googleAuth = require('google-auth-library');
const Pledger = require('../server/pledger/model');

const firebasedb = require('../server/lib/setupFirebase');
const googleMethods = require('../server/recess-events/google-methods');
const readRowAndUpdate = require('../server/moc/update-crisis-status');

var SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

var clientSecret = process.env.GOOGLE_CLIENT_SECRET;
var clientId = process.env.GOOGLE_CLIENT_ID;
var redirectUrl = process.env.GOOGLE_REDIRECT_URI_1;
var auth = new googleAuth();
var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

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

googleMethods.getSheets(oauth2Client, '15B6AjwdKrtbE1NZ4NeQUopiZfyzplJwKdmfTRki2p2g')
  .then((sheetsNames)=> {
    let ranges = sheetsNames.filter(name => {
      let state = name.split(' ')[0];
      return (states[state]);
    }).map(sheetname => {
      return `${sheetname}!A:O`;
    });
    googleMethods.readMultipleRanges(oauth2Client, '15B6AjwdKrtbE1NZ4NeQUopiZfyzplJwKdmfTRki2p2g', ranges).then((googleRows) => {
      googleRows.forEach((sheet) => {
        let data = [];
        let sheetName = sheet.range;
        let state = sheetName.split(' ')[0].split('\'')[1];
        let values = sheet.values;
        let columnNames = values[0];
        for (let i = 1; i < values.length; i++){
          let row = values[i];
          if (row.length === columnNames.length){
            let obj = row.reduce((acc, cur, index) => {
              let columnName = columnNames[index];
              acc[columnName] = cur;
              return acc;
            }, {});
            if (obj.Candidate && obj.Candidate.length > 0){
              let newPledger = new Pledger(obj, state);
              let key = row[12];
              if (key === 'end') {
                key = firebasedb.ref(`town_hall_pledges/${newPledger.state}`).push().key;
                row[12] = key;
                let writeRange = `${sheetName.split('!')[0]}!A${i+ 1}:O${i + 1}`;
  
                let toUpdate = {
                  'range': writeRange,
                  'majorDimension': 'ROWS',
                  'values': [
                    row,
                  ],
                };
                data.push(toUpdate);
              }
              firebasedb.ref(`town_hall_pledges/${newPledger.state}/${key}`).update(newPledger);
            }
          }
        }
        console.log(data);
        googleMethods.write(oauth2Client, '15B6AjwdKrtbE1NZ4NeQUopiZfyzplJwKdmfTRki2p2g', data);
      });
    });
  })
  .catch(err => {
    console.log('error reading sheet:', err.message);
  });

googleMethods.read(oauth2Client, '1_zaj6jbt3JbsNvZxi0hnaKw-NUtx1zmRK7lIf-t2DVw', 'Sheet1!A:G')
  .then((googleRows) => {
    googleRows.forEach(row => {

      readRowAndUpdate(row);
    });
  });