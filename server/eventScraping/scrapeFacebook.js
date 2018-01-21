#!/usr/bin/env node
require('dotenv').load();
var facebookToken = process.env.FACEBOOK_TOKEN;

var firebasedb = require('../server/lib/setupFirebase');
var moment = require('moment');
var request = require('request-promise'); // NB:  This is isn't the default request library!
var scrapingModule = require('./scraping');
var statesAb = require('../server/data/stateMap');

// Res is an object with existingTownHallIds and MoCs
scrapingModule.getTownhalls().then(res => {
  var existingTownHallIds = res.existingTownHallIds;
  var MoCs = res.MoCs;
  var facebookPromises = [];
  var startDate = Math.floor(new Date() / 1000); //Needs to be in Unix timestamp form

  Object.keys(MoCs).forEach(id => {
    let MoC = MoCs[id];
    if (MoC.in_office) {
      if (MoC.hasOwnProperty('facebook_official_account') && MoC.facebook_official_account && MoC.facebook_official_account.length > 0) {
        facebookPromises.push(createFacebookQuery(MoC, MoC.facebook_official_account, startDate));
      } else if (MoC.hasOwnProperty('facebook_account') && MoC.facebook_account && MoC.facebook_account.length > 0) {
        facebookPromises.push(createFacebookQuery(MoC, MoC.facebook_account, startDate));
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
    var newEventIds = scrapingModule.removeExistingIds(facebookEvents.map(townhallevent => 'fb_' + townhallevent.id), existingTownHallIds);
    facebookEvents.forEach(eventToSubmit => {
      if (newEventIds.indexOf('fb_' + eventToSubmit.id) !== -1) {
        scrapingModule.submitTownhall(transformFacebookTownhall(eventToSubmit))
        .then(() => {
          console.log('submitted');
        })
        .catch((error) => {
          console.log('error submitting', error, eventToSubmit);
        });
      } else {
      	console.log(transformFacebookTownhall(eventToSubmit))
      }
    });
  }).catch((error) => {
    console.log('error with facebook Promise', error);
  });
});

function createFacebookQuery(MoC, facebookID, startDate) {
  return request({
    uri: 'https://graph.facebook.com/v2.10/' + facebookID + '/events?since=' + startDate +'&access_token=' + facebookToken,
    json: true,
  }).then(res => {
    // Create references to MoCs for easy data lookup later
    res.data.forEach(event => event.MoC = MoC);
    return res.data;
  }).catch(() => {});
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
    party: facebookEvent.MoC.party,
    District: district,
    district: facebookEvent.MoC.district,
    State: statesAb[facebookEvent.MoC.state],
    stateName: statesAb[facebookEvent.MoC.state],
    state: facebookEvent.MoC.state,
    eventName: facebookEvent.name,
    meetingType: null,
    link: 'https://www.facebook.com/events/' + facebookEvent.id + '/',
    linkName: 'Facebook Link',
    dateObj: moment(facebookEvent.start_time).valueOf(),
    dateString: moment.parseZone(facebookEvent.start_time).format('ddd, MMM D, YYYY'),
    Date: moment.parseZone(facebookEvent.start_time).format('ddd, MMM D, YYYY'),
    Time: moment.parseZone(facebookEvent.start_time).format('LT'),
    timeStart24: moment.parseZone(facebookEvent.start_time).format('HH:mm:ss'),
    timeEnd24: moment.parseZone(facebookEvent.end_time).format('HH:mm:ss'),
    yearMonthDay: moment.parseZone(facebookEvent.start_time).format('YYYY-MM-DD'),
    lastUpdated: Date.now(),
    Notes: facebookEvent.description,
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