#!/usr/bin/env node
require('dotenv').load();

var request = require('request-promise'); // NB:  This is isn't the default request library!

var eventbriteToken = process.env.EVENTBRITE_TOKEN;
var facebookToken = process.env.FACEBOOK_TOKEN;

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
    if (MoC.in_office) {
      if (MoC.hasOwnProperty('facebook_official_account') && MoC.facebook_official_account && MoC.facebook_official_account.length > 0) {
        facebookPromises.push(
          createFacebookQuery(MoC.facebook_official_account, startDate).then(res => {
            // Create references to MoCs for easy data lookup later
            res.data.forEach(event => event.MoC = MoC);
            return res.data;
          }).catch(() => {})
        );
      } else if (MoC.hasOwnProperty('facebook_account') && MoC.facebook_account && MoC.facebook_account.length > 0) {
        facebookPromises.push(
          createFacebookQuery(MoC.facebook_account, startDate).then(res => {
            // Create references to MoCs for easy data lookup later
            res.data.forEach(event => event.MoC = MoC);
            return res.data;
          }).catch(() => {})
        );
      }
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
        submitTownhall(transformEventbriteTownhall(event));
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
  var updates = {};
  updates['/townHallIds/' + townhall.eventId] = {
    eventId:townhall.eventId,
    lastUpdated: Date.now()
  };
  updates['/UserSubmission/' + townhall.eventId] = townhall;
  console.log(updates);
  // return firebasedb.ref().update(updates);

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

function transformFacebookTownhall(facebookEvent) {
  var district;
  if (facebookEvent.MoC.type === 'sen') {
    district = 'Senate';
  } else {
    district = facebookEvent.MoC.state + '-' + facebookEvent.MoC.district;
  }
  var townhall = {
    eventId: 'fb_' + facebookEvent.id,
    Member: facebookEvent.MoC.displayName,
    govtrack_id: facebookEvent.MoC.govtrack_id,
    Party: facebookEvent.MoC.party,
    District: district,
    State: statesAb[facebookEvent.MoC.state],
    stateName: statesAb[facebookEvent.MoC.state],
    state: facebookEvent.MoC.state,
    eventName: facebookEvent.name,
    meetingType: null,
    link: 'https://www.facebook.com/events/' + facebookEvent.id + '/',
    linkName: 'Facebook Link',
    dateObj: moment(facebookEvent.start_time),
    dateString: moment.parseZone(facebookEvent.start_time).format('ddd, MMM D, YYYY'),
    Date: moment.parseZone(facebookEvent.start_time).format('ddd, MMM D, YYYY'),
    Time: moment.parseZone(facebookEvent.start_time).format('LT'),
    timeStart24: moment.parseZone(facebookEvent.start_time).format('HH:mm:ss'),
    timeEnd24: moment.parseZone(facebookEvent.end_time).format('HH:mm:ss'),
    yearMonthDay: moment.parseZone(facebookEvent.start_time).format('YYYY-MM-DD'),
    lastUpdated: Date.now(),
    Notes: facebookEvent.description
  };

  if (facebookEvent.hasOwnProperty('place')) {
    townhall.Location = facebookEvent.place.name;
    if (facebookEvent.place.hasOwnProperty('location')) {
      var location = facebookEvent.place.location;
      townhall.lat = location.latitude;
      townhall.lng = location.longitude;
      townhall.address = location.street + ', ' + location.city + ', ' + location.state + ' ' + location.zip;
    }
  }

  return townhall;
}

function transformEventbriteTownhall(eventBriteEvent) {
  let start = new Date(eventBriteEvent.start.utc);
  let end = new Date(eventBriteEvent.end.utc);
  var townhall = {
    eventId: 'eb_' + eventBriteEvent.id,
    Member: null,
    eventName: eventBriteEvent.name.text,
    meetingType: 'unknown',
    link: eventBriteEvent.url,
    linkName: 'Eventbrite Link',
    dateObj: Date.parse(start),
    dateString: moment.parseZone(start).format('ddd, MMM D, YYYY'),
    Date: moment.parseZone(start).format('ddd, MMM D, YYYY'),
    Time: moment.parseZone(start).format('LT'),
    timeStart24: moment.parseZone(start).format('HH:mm:ss'),
    timeEnd24: moment.parseZone(end).format('HH:mm:ss'),
    yearMonthDay: moment.parseZone(start).format('YYYY-MM-DD'),
    lastUpdated: Date.now(),
  };

  if (eventBriteEvent.hasOwnProperty('venue')) {
    townhall.Location = eventBriteEvent.venue.name;
    townhall.lat = eventBriteEvent.venue.latitude;
    townhall.lng = eventBriteEvent.venue.longitude;
    if (eventBriteEvent.venue.hasOwnProperty('address')) {
      townhall.address = eventBriteEvent.venue.address.localized_address_display;
    }
  }

  return townhall;
}
