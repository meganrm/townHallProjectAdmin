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
    let chamber;
    if (eventBriteEvent.MoC.type === 'sen') {
        chamber = 'upper';
    } else {
        chamber = 'lower';
    }
    let start = moment(eventBriteEvent.start.local);
    let end = moment(eventBriteEvent.end.local);
    var townhall = {
        eventId: 'eb_' + eventBriteEvent.id,
        displayName: eventBriteEvent.MoC.displayName,
        govtrack_id: eventBriteEvent.MoC.govtrack_id,
        party: eventBriteEvent.MoC.party,
        chamber: chamber,
        district: eventBriteEvent.MoC.district,
        stateName: statesAb[eventBriteEvent.MoC.state],
        state: eventBriteEvent.MoC.state,
        eventName: eventBriteEvent.name.text,
        meetingType: '',
        link: eventBriteEvent.url,
        linkName: 'Eventbrite RSVP',
        dateObj: moment(eventBriteEvent.start.utc).valueOf(),
        dateString: start.format('ddd, MMM D, YYYY'),
        Date: start.format('ddd, MMM D, YYYY'),
        Time: start.format('LT'),
        timeStart24: start.format('HH:mm:ss'),
        timeEnd24: end.format('HH:mm:ss'),
        yearMonthDay: start.format('YYYY-MM-DD'),
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
