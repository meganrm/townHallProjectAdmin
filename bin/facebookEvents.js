#!/usr/bin/env node



var request = require('request-promise'); // NB:  This is isn't the default request library!

var eventbriteToken = process.env.EVENTBRITE_TOKEN;
var facebookToken = process.env.FACEBOOK_TOKEN;
var firebaseKey = process.env.FIREBASE_TOKEN.replace(/\\n/g, '\n');
var statesAb = require('../bin/stateMap.js');
var firebasedb = require('../bin/setupFirebase.js');

var moment = require('moment');

// Get list of existing townhalls so we don't submit duplicates
var existingTownHallIds = [];

firebasedb.ref('/townHallIds/').once('value').then(function(snapshot){
  snapshot.forEach(node => {
    existingTownHallIds.push(node.val().eventId);
  });
  getTownhalls();
});

function getTownhalls() {
  firebasedb.ref('mocData/').once('value').then((snapshot) => {
    getFacebookEvents(snapshot.val());
  });
  // getEventbriteEvents();
}

function getFacebookEvents(MoCs) {
  var facebookPromises = [];
  var startDate = Math.floor(new Date() / 1000); //Needs to be in Unix timestamp form
  Object.keys(MoCs).forEach(id => {
    let MoC = MoCs[id];
    if (MoC.hasOwnProperty('facebook') && MoC.facebook_account) {
      facebookPromises.push(
        createFacebookQuery(MoC.facebook_account, startDate).then(res => {
          // Create references to MoCs for easy data lookup later
          res.data.forEach(event => event.MoC = MoC);
          return res.data;
        }).catch(() => {})
      );
    }
  });
  Promise.all(facebookPromises).then(res => {
    // Stop gap measure for while we have bad facebook id data and are getting undefined
    res = res.filter(eventCollection => {
      if (Array.isArray(eventCollection)) {
        return eventCollection;
      }
    });
    // Collapse into flat array
    var facebookEvents = [].concat.apply([], res);
    var newEventIds = removeExistingIds(facebookEvents.map(event => 'fb_' + event.id));

    facebookEvents.forEach(event => {
      if (newEventIds.indexOf('fb_' + event.id) !== -1) {
        // submitTownhall(transformFacebookTownhall(event));
      }
    });
  });
}

function createFacebookQuery(facebookID, startDate) {
  return request({
    uri: 'https://graph.facebook.com/v2.10/' + facebookID + '/events?since=' + startDate +'&access_token=' + facebookToken,
    json: true
  });
}

console.log('working')
