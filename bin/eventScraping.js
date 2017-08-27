#!/usr/bin/env node
var admin = require('firebase-admin');
var request = require('request-promise'); // NB:  This is isn't the default request library!

var eventbriteToken = process.env.EVENTBRITE_TOKEN;
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
  getEventbriteEvents();
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

function getEventbriteEvents() {
  var eventbriteQueryTerms = [
    'town%20hall%20senator',
    'town%20hall%20congresswoman',
    'town%20hall%20congressman',
    'townhall%20senator',
    'townhall%20congresswoman',
    'townhall%20congressman',
    'townhall%20representative',
    'town%20hall%20representative',
    'ask%20senator',
    'ask%20congresswoman',
    'ask%20congressman'
  ];

  var eventbritePromises = [];

  eventbriteQueryTerms.forEach(function(queryTerm) {
    eventbritePromises.push(createEventbriteQuery(queryTerm));
  });

  Promise.all(eventbritePromises).then(function(res) {
    res = res.map(eventCollection => eventCollection.events);
    // Collapse into flat array
    var eventbriteEvents = [].concat.apply([], res);
    // With generic searches we get some duplicates, let's remove them
    eventbriteEvents = eventbriteEvents.filter(unqiueFilter);
    var newEventIds = removeExistingIds(eventbriteEvents.map(event => 'eb_' + event.id));
    eventbriteEvents.forEach(event => {
      if (newEventIds.indexOf('eb_' + event.id) !== -1) {
        // submitTownhall(transformEventbriteTownhall(event));
      }
    });
  });
}

function removeExistingIds(eventIds) {
  existingTownHallIds.forEach(existingId => {
    let position = eventIds.indexOf(existingId);
    if (position !== -1) {
      eventIds.splice(position, 1);
    }
  });
  return eventIds;
}

function unqiueFilter(value, index, self) {
  return self.findIndex(obj => obj.id === value.id) === index;
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

function createEventbriteQuery(queryTerm) {
  return request({
    uri: 'https://www.eventbriteapi.com/v3/events/search/?q=' + queryTerm + '&categories=112&expand=organizer,venue&token=' + eventbriteToken,
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

function transformEventbriteTownhall(event) {
  let start = new Date(event.start.utc);
  let end = new Date(event.end.utc);
  var townhall = {
    eventId: 'eb_' + event.id,
    Member: event.organizer.name,
    eventName: event.name.text,
    meetingType: 'unknown',
    link: event.url,
    linkName: 'Eventbrite Link',
    dateObj: Date.parse(start),
    dateString: start.toDateString(),
    Time: start.toLocaleString('en-US', { hour: 'numeric',minute:'numeric', hour12: true }),
    timeStart24: start.toLocaleString('en-US', { hour: 'numeric', minute:'numeric', second: 'numeric', hour12: false }),
    timeEnd24: end.toLocaleString('en-US', { hour: 'numeric', minute:'numeric', second: 'numeric', hour12: false }),
    yearMonthDay: start.toISOString().substring(0, 10),
    lastUpdated: Date.now()
  };

  if (event.hasOwnProperty('venue')) {
    townhall.Location = event.venue.name;
    townhall.lat = event.venue.latitude;
    townhall.lng = event.venue.longitude;
    if (event.venue.hasOwnProperty('address')) {
      townhall.address = event.venue.address.localized_address_display;
    }
  }

  return townhall;
}

module.exports = eventScraping;
