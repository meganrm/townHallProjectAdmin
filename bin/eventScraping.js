#!/usr/bin/env node
var admin = require('firebase-admin');
var https = require('https');
var request = require('request-promise'); // NB:  This is isn't the default request library!

var eventBriteToken = process.env.EVENTBRITE_TOKEN;
var facebookToken = process.env.FACEBOOK_TOKEN;
var firebaseKey = process.env.FIREBASE_TOKEN.replace(/\\n/g, '\n');

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: 'townhallproject-86312',
    clientEmail: 'herokuadmin@townhallproject-86312.iam.gserviceaccount.com',
    privateKey: firebaseKey
  }),
  databaseURL: 'https://townhallproject-86312.firebaseio.com'
});

var firebasedb = admin.database();
admin.database.enableLogging(true);

// Get list of existing townhalls so we don't submit duplicates
var existingTownHallIds = [];
firebasedb.ref('/towhHallIDs/').once('value').then(function(snapshot){
  // TODO:  Change this to actual map
  existingTownHallIds.push(...snapshot.val().map(event => event.id));
  getTownhalls();
});

function getTownhalls() {
  firebase.database().ref('mocData/').once('value').then((snapshot) => {
    getFacebookEvents(snapshot.val());
  });
  getEventbriteEvents();
}

function getFacebookEvents(MoCs) {
  var facebookPromises = [];
  var startDate = Math.floor(new Date() / 1000); //Needs to be in Unix timestamp form
  Object.keys(MoCs).forEach(id => {
    let MoC = MoCs[id];
    if (MoC.hasOwnProperty('facebook') && MoC.facebook) {
      facebookPromises.push(
        createFacebookQuery(MoC.facebook, startDate).then(res => {
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
    var newEventIds = removeExistingIds(facebookEvents.map(event => event.id));

    facebookEvents.forEach(event => {
      if (newEventIds.indexOf(event.id) !== -1) {
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
    eventbritePromises.push(
      $.get('https://www.eventbriteapi.com/v3/events/search/?q=' + queryTerm + '&categories=112&token=' + eventBriteToken)
    );
  });

  // var events = [];

  // Promise.all(eventbritePromises).then(function(results){
  //     results.forEach(result => events.push(...result.events));
  //     events.map(e => 'Name: ' + e.name.text + ', start in utc: ' + e.start.utc + ', url: ' + e.url).forEach(e => console.log(e))
  //     debugger;
  // });
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

function submitTownhall(townhall) {
  firebasedb.ref('/UserSubmission/' + townhall.eventId).set(townhall);
}

function createFacebookQuery(facebookID, startDate) {
  return request({
    uri: 'https://graph.facebook.com/v2.10/' + facebookID + '/events?since=' + startDate +'&access_token=' + facebookToken,
    json: true
  })
}

function createFacebookQuery(facebookID, startDate) {
  return request({
    uri: 'https://graph.facebook.com/v2.10/' + facebookID + '/events?since=' + startDate +'&access_token=' + facebookToken,
    json: true
  });
}

function transformFacebookTownhall(event) {
  let start = new Date(event.start_time);
  let end = new Date(event.end_time);
  var townhall = {
    eventId: event.id,
    Member: event.MoC.displayName,
    govtrack_id: event.MoC.govtrack_id,
    Party: event.MoC.party,
    District: event.MoC.state + '-' + event.MoC.district,
    StateAb: event.MoC.state,
    eventName: event.name,
    meetingType: 'unknown',
    link: 'https://www.facebook.com/events/' + event.id + '/',
    linkName: 'Facebook Link',
    dateObj: Date.parse(start),
    dateString: start.toDateString(),
    Time: start.toLocaleString('en-US', { hour: 'numeric',minute:'numeric', hour12: true }),
    timeStart24: start.toLocaleString('en-US', { hour: 'numeric', minute:'numeric', second: 'numeric', hour12: false }),
    timeEnd24: end.toLocaleString('en-US', { hour: 'numeric', minute:'numeric', second: 'numeric', hour12: false }),
    yearMonthDay: start.toISOString().substring(0, 10),
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
