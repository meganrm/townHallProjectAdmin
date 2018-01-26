const facebookToken = process.env.FACEBOOK_TOKEN;

const moment = require('moment');
const request = require('request-promise'); // NB:  This is isn't the default request library!

const statesAb = require('../data/stateMap');

const facebookModule = {};

facebookModule.createFacebookQuery = (MoC, facebookID, startDate) => {
  return request({
    uri: 'https://graph.facebook.com/v2.10/' + facebookID + '/events?since=' + startDate +'&access_token=' + facebookToken,
    json: true,
  }).then(res => {
    // Create references to MoCs for easy data lookup later
    res.data.forEach(event => event.MoC = MoC);
    return res.data;
  }).catch(() => {});
};

facebookModule.transformFacebookTownhall = (facebookEvent) => {
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
};

module.exports = facebookModule;
