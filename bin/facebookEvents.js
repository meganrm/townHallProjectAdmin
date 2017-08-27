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
        submitTownhall(transformFacebookTownhall(event));
      }
    });
  });
}

function submitTownhall(townhall) {
  console.log(townhall);
  var updates = {};
  updates['/townHallIds/' + townhall.eventId] = {
    eventId:townhall.eventId,
    lastUpdated: Date.now()
  };
  updates['/UserSubmission/' + townhall.eventId] = townhall;

  return firebasedb.ref().update(updates);

}

function createFacebookQuery(facebookID, startDate) {
  return request({
    uri: 'https://graph.facebook.com/v2.10/' + facebookID + '/events?since=' + startDate +'&access_token=' + facebookToken,
    json: true
  });
}

function transformFacebookTownhall(event) {
  var district;
  if (event.MoC.type === 'sen') {
    district = 'Senate';
  } else {
    district = event.MoC.state + '-' + event.MoC.district;
  }
  let start = new Date(event.start_time);
  var townhall = {
    eventId: 'fb_' + event.id,
    Member: event.MoC.displayName,
    govtrack_id: event.MoC.govtrack_id,
    Party: event.MoC.party,
    District: district,
    State: statesAb[event.MoC.state],
    stateName: statesAb[event.MoC.state],
    state: event.MoC.state,
    eventName: event.name,
    meetingType: 'unknown',
    link: 'https://www.facebook.com/events/' + event.id + '/',
    linkName: 'Facebook Link',
    dateObj: Date.parse(start),
    dateString: moment.parseZone(event.start_time).format('ddd, MMM D, YYYY'),
    Date: moment.parseZone(event.start_time).format('ddd, MMM D, YYYY'),
    Time: moment.parseZone(event.start_time).format('LT'),
    timeStart24: moment.parseZone(event.start_time).format('HH:mm:ss'),
    timeEnd24: moment.parseZone(event.end_time).format('HH:mm:ss'),
    yearMonthDay: moment.parseZone(event.start_time).format('YYYY-MM-DD'),
    lastUpdated: Date.now()
  };

  if (event.hasOwnProperty('place')) {
    townhall.Location = event.place.name;
    if (event.place.hasOwnProperty('location')) {
      var location = event.place.location;
      townhall.lat = location.latitude;
      townhall.lng = location.longitude;
      townhall.address = location.street + ', ' + location.city + ', ' + location.state + ' ' + location.zip;
    }
  }

  return townhall;
}

console.log('working')
