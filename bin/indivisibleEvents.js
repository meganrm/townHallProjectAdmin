#!/usr/bin/env node
require('dotenv').load();

// TODO:  Once we re-enable eventbrite scraping DRY and facebookEvents out and make a
// common library both can pull from

var request = require('request-promise'); // NB:  This is isn't the default request library!
var moment = require('moment');
var firebasedb = require('../server/lib/setupFirebase.js');

var eventbriteToken = process.env.EVENTBRITE_TOKEN;
// Get list of existing townhalls so we don't submit duplicates
var existingTownHallIds = [];

// TODO:  Change this to the actual endpoint
firebasedb.ref('/indivisbleIds/').once('value').then(function(snapshot){
  snapshot.forEach(node => {
    existingTownHallIds.push(node.val().eventId);
  });
  fetchNextEventbritePage('indivisible', 1, [], processIndivisibleResults);
});

// queryTerm: A term that must appear in the group's name, group's description, or event's name
// page: Page query should start on. Pagination support
// collection: New array or an outside obj that you want to contain the results
// cb: Callback to be executed upon run completion
function fetchNextEventbritePage(queryTerm, page, collection, cb) {
  createEventbriteQuery(queryTerm, page).then(function(res) {
    collection.push(...res.events);
    // Eventbrite's "has_more_items" seems to be broken
    if (res.pagination.page_number < res.pagination.page_count) {
      fetchNextEventbritePage(queryTerm, page + 1, collection, cb);
    } else {
      cb(queryTerm, collection);
    }
  });
}

function createEventbriteQuery(queryTerm, page=1) {
  return request({
    uri: 'https://www.eventbriteapi.com/v3/events/search/?q=' + queryTerm + '&page=' + page + '&expand=organizer,venue&token=' + eventbriteToken,
    json: true,
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

function processIndivisibleResults(queryTerm, collection) {
  collection = collection.filter(e => {
    return [e.name.text, e.organizer.name, e.organizer.description.text].some(text => {
      // These fields can sometimes be null
      if (text) {
        return text.toLowerCase().indexOf(queryTerm) !== -1;
      }
    });
  });
  var newEventIds = removeExistingIds(collection.map(event => 'in_' + event.id));

  collection.forEach(event => {
    if (newEventIds.indexOf('in_' + event.id) !== -1) {
      submitTownhallToIndivisible(transformIndivisibleTownhall(event));
    }
  });
}


function submitTownhallToIndivisible(eventbriteEvent) {
  var updates = {};
  updates['/indivisbleIds/' + eventbriteEvent.eventId] = {
    eventId: eventbriteEvent.eventId,
    lastUpdated: Date.now(),
  };
  updates['/indivisible/' + eventbriteEvent.eventId] = eventbriteEvent;
  return firebasedb.ref().update(updates).catch((e) =>{
    console.log('couldnt updated firebase', e);
  });
}

function transformIndivisibleTownhall(eventbriteEvent) {
  return {
    eventId: 'in_' + eventbriteEvent.id,
    user_group_id: eventbriteEvent.organizer.id,
    user_group_name: eventbriteEvent.organizer.name,
    user_group_description: eventbriteEvent.organizer.description.text,
    event_public_description: eventbriteEvent.description.text,
    event_title: eventbriteEvent.name.text,
    event_starts_at_date: moment.parseZone(eventbriteEvent.start.local).format('YYYY-MM-DD'),
    event_starts_at_time: moment.parseZone(eventbriteEvent.start.local).format('h:mm'),
    event_starts_at_ampm: moment.parseZone(eventbriteEvent.start.local).format('A'),
    event_address1: eventbriteEvent.venue.address.address_1,
    event_city: eventbriteEvent.venue.address.city,
    event_country: eventbriteEvent.venue.address.country,
    event_venue: eventbriteEvent.venue.name,
    event_capacity: eventbriteEvent.capacity,
    event_online: eventbriteEvent.online_event,
    action_link_to_event_information: eventbriteEvent.url,
    twitter: eventbriteEvent.organizer.twitter ? eventbriteEvent.organizer.twitter: null,
    facebook: eventbriteEvent.organizer.facebook ? eventbriteEvent.organizer.facebook: null,
    logo: eventbriteEvent.organizer.logo ? eventbriteEvent.organizer.logo.url : null,
  };
}
