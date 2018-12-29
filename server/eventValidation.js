function eventValidation() {
  var https = require('https');
  const moment = require('moment-timezone');

  var firebasedb = require('./lib/setupFirebase.js');
  var ErrorReport = require('./lib/errorReporting.js');
  var utils = require('./util');

  const stateMap = require('./data/stateMap');

  const FEDERAL_TOWNHALLS = '/townHalls/';
  const STATE_TOWNHALLS = '/state_townhalls/';

  const FEDERAL_SUBMISSION_PATH = '/UserSubmission/';
  const STATE_SUBMISSION_PATH = '/state_legislators_user_submission/';

  const STATES = ['CO/', 'VA/', 'NC/', 'AZ/', 'OR/'];
  const startMonth = '0';
  const startYear = '2017';
  let current = moment([startYear, startMonth])
  let DATES = [];
  while (current.isSameOrBefore(moment(), 'month')){
    DATES.push(current.format('YYYY-M'));
    current = current.add(1, 'month');
  }

  function TownHall(opts) {
    for (keys in opts) {
      this[keys] = opts[keys];
    }
  }
  //geocodes an address
  TownHall.prototype.getLatandLog = function (address, path) {
    var addressQuery = escape(address);
    var addresskey = address.replace(/\W/g, '');
    var options = {
      hostname: 'maps.googleapis.com',
      path: `/maps/api/geocode/json?address=${addressQuery}&key=AIzaSyDP8q2OVisSLyFyOUU6OTgGjNNQCq7Q3rE`,
      method: 'GET',
    };
    var str = '';
    var newTownHall = this;
    var req = https.request(options, (res) => {
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        str += chunk;
      });
      res.on('end', () => {
        var r = JSON.parse(str);
        if (!r.results[0]) {
          console.log('no geocode results', newTownHall.eventId);
        } else {
          newTownHall.lat = r.results[0].geometry.location.lat;
          newTownHall.lng = r.results[0].geometry.location.lng;
          newTownHall.address = r.results[0].formatted_address.split(', USA')[0];
          addresskey.trim();
          const update =  {
            lat: newTownHall.lat,
            lng: newTownHall.lng,
            formatted_address: newTownHall.address,
          };
          console.log('got lat log', newTownHall.eventId);
          updateEvent(newTownHall.eventId, update, path);
        }
      });
    });
    req.on('error', (e) => {
      console.error('error requests', e, newTownHall.eventId);
    });
    req.end();
  };




  function needsGeoCode(townhall){
    if (!townhall.lat && townhall.address) {
      return true;
    } else {
      return false;
    }
  }

  function dateValid(date) {
    let isValid = false;
    if (moment(date, 'YYYY-MM-DD', true).isValid()) {
      isValid = true;
    }
    return isValid;
  }

  function timeValid(time) {
    let isValid = false;
    if (moment(time,'HH:mm:ss',true).isValid()) {
      isValid = true;
    }
    return isValid;
  }


  function dateTimeValidation(townhall, path) {
    let update;
    if (
      !townhall.repeatingEvent &&
      townhall.lat &&
      townhall.zoneString &&
      dateValid(townhall.yearMonthDay) &&
      timeValid(townhall.timeStart24) &&
      timeValid(townhall.timeEnd24)) {
      if (!townhall.dateValid) {
        update = {};
        update.dateValid = true;
        console.log('updating date valid');
        updateEvent(townhall.eventId, update, path);
      }
    } else if (!townhall.repeatingEvent) {
      if (needsGeoCode(townhall)) {
        let error = new ErrorReport(path + townhall.eventId, 'Needs geocode');
        error.sendEmail();
      }
      if (!dateValid(townhall.yearMonthDay)) {
        console.log('date', townhall);
      }
      if (!timeValid(townhall.timeStart24)) {
        if (moment(townhall.timeStart24, 'H:mm:ss', true).isValid()) {
          update = {};
          update.timeStart24 = moment(townhall.timeStart24, 'H:mm:ss').format('HH:mm:ss');
          console.log('updating timeStart24');

          updateEvent(townhall.eventId, update, path);
        }
      }
      if (!timeValid(townhall.timeEnd24)) {
        if (moment(townhall.timeEnd24, 'H:mm:ss', true).isValid()) {
          update = {};
          update.timeEnd24 = moment(townhall.timeEnd24, 'H:mm:ss').format('HH:mm:ss');
          updateEvent(townhall.eventId, update, path);
        }
      }
    } else {
      if (townhall.dateValid) {
        update = {};
        update.dateValid = false;
        console.log('updating date not valid');
        updateEvent(townhall.eventId, update, path);
      }
    }
  }

  function checkDistrictAndState(townhall, path) {
    if (townhall.district && townhall.state) {
      return;
    }
    if (townhall.District === 'Senate') {
      return;
    }
    let update = {};
    if (!townhall.district && townhall.District) {
      let district = townhall.District.split('-')[1];
      update.district = utils.zeropadding(district);
      console.log('adding district', district);
    }
    if (!townhall.state && townhall.District) {
      let state = townhall.District.split('-')[0];
      update.state = state;
      update.stateName = stateMap[state];
      console.log('adding state', state, stateMap[state]);
    }
    console.log(townhall.State);
    updateEvent(townhall.eventId, update, path);
  }

  function updateEvent(key, update, path) {
    console.log('updating event!', path + key, update);
    firebasedb.ref(path + key).update(update);
  }

  firebasedb.ref(FEDERAL_TOWNHALLS).on('child_changed', function(snapshot){
    var townhall = snapshot.val();
    dateTimeValidation(townhall, FEDERAL_TOWNHALLS);
  });

  firebasedb.ref(FEDERAL_TOWNHALLS).on('child_added', function(snapshot){
    var townhall = new TownHall(snapshot.val());

    if (!townhall.lat && townhall.meetingType === 'Tele-Town Hall' && townhall.District === 'Senate') {
      townhall.getLatandLog(townhall.State, 'state', FEDERAL_TOWNHALLS);
    }
    if (townhall.govtrack_id && townhall.dateObj && townhall.zoneString) {
      firebasedb.ref(`mocData/${townhall.govtrack_id}/confirmed_events`)
        .update({
          [townhall.meetingType]: {
            [townhall.eventId]: moment.tz(townhall.dateObj, townhall.zoneString).format(),
          },
        })
        .catch(console.log);
    }
  });

  firebasedb.ref(FEDERAL_SUBMISSION_PATH).on('child_added', function(snapshot){
    var townhall = snapshot.val();
    dateTimeValidation(townhall, FEDERAL_SUBMISSION_PATH);
    checkDistrictAndState(townhall, FEDERAL_SUBMISSION_PATH);
  });

  STATES.forEach((state) => {
    let path = `${STATE_SUBMISSION_PATH}${state}`;
    firebasedb.ref(path).on('child_added', function(snapshot){
      var townhall = snapshot.val();
      dateTimeValidation(townhall, path);
    });
  });

  STATES.forEach((state) => {
    let path = `${STATE_TOWNHALLS}${state}`;
    firebasedb.ref(path).on('child_added', function(snapshot){
      var townhall = snapshot.val();
      dateTimeValidation(townhall, path);
    });
  });
  
  // DATES.forEach((date) => {
  //   let path = `townHallsOld/${date}`;
  //   firebasedb.ref(path).on('child_added', function (snapshot) {
  //     const townhall = snapshot.val();
  //     if (townhall.meetingType && townhall.govtrack_id && townhall.dateObj && townhall.zoneString) {
  //       firebasedb.ref(`mocData/${townhall.govtrack_id}/confirmed_events`)
  //         .update({
  //           [townhall.meetingType]: {
  //             [townhall.eventId]: moment.tz(townhall.dateObj, townhall.zoneString).format(),
  //           },
  //         })
  //         .catch(console.log);
  //     }
  //   });
  // });

}

module.exports = eventValidation;
