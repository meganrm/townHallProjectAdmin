#!/usr/bin/env node



var admin = require('firebase-admin');
var request = require('request-promise'); // NB:  This is isn't the default request library!

var eventbriteToken = process.env.EVENTBRITE_TOKEN;
var statesAb = require('../bin/stateMap.js');
var firebasedb = require('../bin/setupFirebase.js');

var moment = require('moment');


console.log('working')
