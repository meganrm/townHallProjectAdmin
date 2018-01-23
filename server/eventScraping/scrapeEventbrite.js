#!/usr/bin/env node
require('dotenv').load();
var eventbriteToken = process.env.EVENTBRITE_TOKEN;

var moment = require('moment');
var request = require('request-promise'); // NB:  This is isn't the default request library!
var scrapingModule = require('../lib/scraping');
var statesAb = require('../server/data/stateMap');

// Res is an object with existingTownHallIds and MoCs
scrapingModule.getTownhalls().then(res => {
  var existingTownHallIds = res.existingTownHallIds;
  var MoCs = res.MoCs;
  var eventbritePromises = [];
  var date = new Date().toISOString().split('.')[0]; // ISO without fractions of a second or timezone

  Object.keys(MoCs).forEach(id => {
    let MoC = MoCs[id];
    if (MoC.in_office && MoC.hasOwnProperty('eventbrite_id') && typeof MoC.eventbrite_id ==='number') {
      eventbritePromises.push(createEventbriteQuery(MoC, date));
    }
  });

  Promise.all(eventbritePromises).then(res => {
    // Stop gap measure for while we have bad eventbrite id data and are getting undefined
    res = res.filter(eventCollection => {
      if (Array.isArray(eventCollection)) {
        return eventCollection;
      }
    });
    // Collapse into flat array
    var eventbriteEvents = [].concat.apply([], res);
    // console.log(eventbriteEvents.map(townhallevent => 'eb_' + townhallevent.id));
    var newEventIds = scrapingModule.removeExistingIds(eventbriteEvents.map(townhallevent => 'eb_' + townhallevent.id), existingTownHallIds);
    eventbriteEvents.forEach(eventToSubmit => {
      if (newEventIds.indexOf('eb_' + eventToSubmit.id) !== -1) {
        scrapingModule.submitTownhall(transformEventbriteTownhall(eventToSubmit))
        .then(() => {
          console.log('submitted');
        })
        .catch((error) => {
          console.log('error submitting', error, eventToSubmit);
        });
      }
    });
  }).catch((error) => {
    console.log('error with eventbrite Promise', error);
  });
});

function createEventbriteQuery(MoC, startDate) {
  return request({
    uri: 'https://www.eventbriteapi.com/v3/organizers/' + MoC.eventbrite_id + '/events/?start_date.range_start=' + startDate +'&token=' + eventbriteToken,
    json: true,
  }).then(res => {
    // Create references to MoCs for easy data lookup later
    res.events.forEach(event => event.MoC = MoC);
    return res.events || [];
  }).catch(() => {});
}

function transformEventbriteTownhall(eventBriteEvent) {
  var district;
  if (eventBriteEvent.MoC.type === 'sen') {
    district = 'Senate';
  } else {
    district = eventBriteEvent.MoC.state + '-' + eventBriteEvent.MoC.district;
  }
  let start = moment(eventBriteEvent.start.utc);
  let end = moment(eventBriteEvent.end.utc);
  var townhall = {
    eventId: 'eb_' + eventBriteEvent.id,
    Member: eventBriteEvent.MoC.displayName,
    govtrack_id: eventBriteEvent.MoC.govtrack_id,
    Party: eventBriteEvent.MoC.party,
    party: eventBriteEvent.MoC.party,
    District: district,
    district: eventBriteEvent.MoC.district,
    State: statesAb[eventBriteEvent.MoC.state],
    stateName: statesAb[eventBriteEvent.MoC.state],
    state: eventBriteEvent.MoC.state,
    eventName: eventBriteEvent.name.text,
    meetingType: 'unknown',
    link: eventBriteEvent.url,
    linkName: 'Eventbrite Link',
    dateObj: start.valueOf(),
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
