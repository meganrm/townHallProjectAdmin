#!/usr/bin/env node
require('dotenv').load();

var googleAuth = require('google-auth-library');

const googleMethods = require('../server/recess-events/google-methods');
const readRowAndUpdate = require('../server/moc/update-crisis-status');

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


googleMethods.read(oauth2Client, '1_zaj6jbt3JbsNvZxi0hnaKw-NUtx1zmRK7lIf-t2DVw', 'Sheet1!A:G')
  .then((googleRows) => {
      googleRows.forEach(row => {
          readRowAndUpdate(row);
      });
  })
  .catch(e => {
      console.log('error reading crisis sheet', e);
  });
