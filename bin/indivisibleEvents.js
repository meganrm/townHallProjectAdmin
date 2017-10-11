#!/usr/bin/env node

// TODO:  Once we re-enable eventbrite scraping DRY and facebookEvents out and make a
// common library both can pull from

var request = require('request-promise'); // NB:  This is isn't the default request library!
var eventbriteToken = process.env.EVENTBRITE_TOKEN;
var firebasedb = require('../bin/setupFirebase.js');
var moment = require('moment');

// Get list of existing townhalls so we don't submit duplicates
var existingTownHallIds = [];

// TODO:  Change this to the actual endpoint
firebasedb.ref('/indivisible/').once('value').then(function(snapshot){
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
    json: true
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


function submitTownhallToIndivisible(event) {
  var updates = {};
  updates['/indivisbleIds/' + event.eventId] = {
    eventId: event.eventId,
    lastUpdated: Date.now()
  };
  updates['/indivisible/' + event.eventId] = event;

  return firebasedb.ref().update(updates);
}

function transformIndivisibleTownhall(event) {
  return {
    id: 'in_' + event.id,
    user_group_id: event.organizer.id,
    user_group_name: event.organizer.name,
    user_group_description: event.organizer.description.text,
    event_public_description: event.description.text,
    event_title: event.name.text,
    event_starts_at_date: moment.parseZone(event.start.local).format('YYYY-MM-DD'),
    event_starts_at_time: moment.parseZone(event.start.local).format('h:mm'),
    event_starts_at_ampm: moment.parseZone(event.start.local).format('A'),
    event_address1: event.venue.address.address_1,
    event_city: event.venue.address.city,
    event_country: event.venue.address.country,
    event_venue: event.venue.name,
    event_capacity: event.capacity,
    event_online: event.online_event,
    action_link_to_event_information: event.url,
    twitter: event.organizer.twitter,
    facebook: event.organizer.facebook,
    logo: event.organizer.logo ? event.organizer.logo.url : null,
  };
}
