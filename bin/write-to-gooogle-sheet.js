const moment = require('moment');
const find = require('lodash').find;
const findIndex = require('lodash').findIndex;

var readline = require('readline');
var googleAuth = require('google-auth-library');


const firebasedb = require('../server/lib/setupFirebase');
const googleMethods = require('../server/recess-events/google-methods');
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

googleMethods.read(oauth2Client).then((googleRows)=> {
  firebasedb.ref('townHalls/').once('value')
  .then((snapshot) => {
    const data = [];
    snapshot.forEach(ele => {
      const townhall = ele.val();
      if (
        moment(townhall.dateObj).isBetween('2018-03-23', '2018-04-09', [])
        && townhall.govtrack_id) {
        if (townhall.meetingType === 'Town Hall') {
          const thisRow = find(googleRows, (row)=> {
            return row[0] === townhall.govtrack_id;
          });
          const rowIndex = 1 + findIndex(googleRows, (row)=> {
            return row[0] === townhall.govtrack_id;
          });
          if (townhall.iconFlag === 'mfol') {
            thisRow[7] = true;
          }
          thisRow[8] = null;
          let writeRange = `all MOCS!A${rowIndex}:Z${rowIndex}`;
          if (thisRow.indexOf(townhall.eventId) === -1) {
            thisRow.push(townhall.eventId);
            console.log(thisRow[1]);
          }

          const toWrite = {

            'range': writeRange,
            'majorDimension': 'ROWS',
            'values': [
              thisRow,
            ],

          };
          data.push(toWrite);
        } else if (townhall.iconFlag === 'mfol'){
          console.log('mfol event');
          const thisRow = find(googleRows, (row)=> {
            return row[0] === townhall.govtrack_id;
          });
          const rowIndex = 1 + findIndex(googleRows, (row)=> {
            return row[0] === townhall.govtrack_id;
          });
          thisRow[7] = true;
          thisRow[8] = null;
          let writeRange = `all MOCS!A${rowIndex}:Z${rowIndex}`;
          const toWrite = {

            'range': writeRange,
            'majorDimension': 'ROWS',
            'values': [
              thisRow,
            ],
          };
          data.push(toWrite);
        }
      }
    });
    const timestamp = {
      'range': 'summary!A2',
      'majorDimension': 'ROWS',
      'values': [
        [`${moment().format('MM/DD/YYYY, h:mm A')}`],
      ],

    };
    data.push(timestamp);

    googleMethods.write(oauth2Client, data);

  })
  .catch(err => {
    console.log('error reading sheet:', err.message);
  });
});
