const eventbriteToken = process.env.EVENTBRITE_TOKEN;

const moment = require('moment');
const request = require('request-promise'); // NB:  This is isn't the default request library!
const statesAb = require('../data/stateMap');

const eventBriteModule = {};

eventBriteModule.createEventbriteQuery = (MoC, startDate) => {
  return request({
    uri: 'https://www.eventbriteapi.com/v3/organizers/' + MoC.eventbrite_id + '/events/?start_date.range_start=' + startDate +'&token=' + eventbriteToken,
    json: true,
  }).then(res => {
    // Create references to MoCs for easy data lookup later
    res.events.forEach(evnt => evnt.MoC = MoC);
    return res.events || [];
  }).catch(() => {});
};

eventBriteModule.transformEventbriteTownhall = (eventBriteEvent) => {
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
};

module.exports = eventBriteModule;
