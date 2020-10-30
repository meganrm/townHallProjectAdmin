#!/usr/bin/env node
require('dotenv').load();

var googleAuth = require('google-auth-library');
const moment = require('moment');

const zeropadding = require('../server/util').zeropadding;
const firebasedb = require('../server/lib/setupFirebase').realtimedb;
const googleMethods = require('../server/recess-events/google-methods');

const TESTING_SHEETS_ID = '1tAfnKQz-2HUmCSKjbblqzs-T8Q4trn1GbVUJklTbbjc';
const PLEDGER_SHEETS_ID = '15B6AjwdKrtbE1NZ4NeQUopiZfyzplJwKdmfTRki2p2g';
const SHEETS_ID = PLEDGER_SHEETS_ID;

console.log('testing google sheet:', SHEETS_ID === TESTING_SHEETS_ID);
console.log('production google sheet:', SHEETS_ID === PLEDGER_SHEETS_ID);

var clientSecret = process.env.GOOGLE_CLIENT_SECRET;
var clientId = process.env.GOOGLE_CLIENT_ID;
var redirectUrl = process.env.GOOGLE_REDIRECT_URI_1;
var auth = new googleAuth();
var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);
const CURRENT_YEAR = moment().format('YYYY');
const currentToken =
  { access_token: process.env.GOOGLE_ACCESS_TOKEN,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      token_type: 'Bearer',
      expiry_date: 1522106489761,
  };

oauth2Client.credentials = currentToken;



const writeOut = (mm, displayName, party, winner) => {
    let district;
    let updateObject = {
        state: mm.state,
        sitting_missing_member: mm.mmName,
        missing_member_party: mm.mmParty[0],
        pledger: displayName,
        pledger_party: party,
        winner: winner,
    };
    if (mm.state === 'PA') {
        if (mm.district == 10 || mm.district == 12) {
            return;
        }
        return;
    }
    if (Number(mm.district)) {
        district = zeropadding(mm.district);
        return firebasedb.ref(`do_your_job_districts/${CURRENT_YEAR}/${mm.state}-${district}`)
            .once('value')
            .then(snapshot => {
                updateObject.district = district;
                if (!snapshot.exists()) {
                    return firebasedb.ref(`do_your_job_districts/${CURRENT_YEAR}/${mm.state}-${district}`)
                        .update(updateObject);
                } else {
                    console.log('already in there', updateObject.state, updateObject.district);
                }
            });
    } else {
        return firebasedb.ref(`do_your_job_districts/${CURRENT_YEAR}/${mm.state}-${mm.state_rank}`)
            .once('value')
            .then(snapshot => {
                updateObject.district = 'Senate';

                if (!snapshot.exists() && mm.state_rank) {
                    return firebasedb.ref(`do_your_job_districts/${CURRENT_YEAR}/${mm.state}-${mm.state_rank}`)
                        .update(updateObject);
                } else {
                    console.log('already in there', updateObject.state, updateObject.district);
                }
            });
    }
};


googleMethods
    .read(oauth2Client, SHEETS_ID, 'DYJD!A:G')
    .then(googleRows => {
        let columnNames = googleRows[0]; // HEADER OF THE SHEET


        for (let i = 1; i < googleRows.length; i++) {
    
            let row = googleRows[i];
            let obj = row.reduce((acc, cur, index) => {
                let columnName = columnNames[index];
                acc[columnName] = cur;
                return acc;
            }, {});
            let missingMember = {
                state: obj.State,
                district: obj.District,
                chamber: isNaN(Number(obj.District)) ? 'upper' : 'lower',
                type: isNaN(Number(obj.District)) ? 'sen': 'rep',
                mmName: obj.Incumbent,
                mmParty: obj['Incumbent Party'],
                state_rank: obj.rank || null,
            };
            writeOut(missingMember, obj.Pledger, obj['Pledger Party'], false);
        }

    
    }).then(()=> {
        console.log('read all');
        process.exit(0);
  
    })
  
    .catch(err => {
        console.log('error reading sheet:', err.message);
        process.exit(1);
    });