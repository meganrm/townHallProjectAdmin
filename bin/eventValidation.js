function eventValidation() {

  var firebasedb = require('../bin/setupFirebase.js');
  var ErrorReport = require('../bin/errorReporting.js');
  var moment = require('moment');

  // geocodes an address
  // TownHall.prototype.getLatandLog = function (address, type, key) {
  //   var addressQuery = escape(address);
  //   var addresskey = address.replace(/\W/g, '');
  //   var options = {
  //     hostname: 'maps.googleapis.com',
  //     path: `/maps/api/geocode/json?address=${addressQuery}&key=AIzaSyB868a1cMyPOQyzKoUrzbw894xeoUhx9MM`,
  //     method: 'GET',
  //   };
  //   var str = '';
  //   var newTownHall = this;
  //   var req = https.request(options, (res) => {
  //     res.setEncoding('utf8');
  //     res.on('data', (chunk) => {
  //       str += chunk;
  //     });
  //     res.on('end', () => {
  //       var r = JSON.parse(str);
  //       if (!r.results[0]) {
  //         console.log('no geocode results', newTownHall.eventId);
  //       } else {
  //         newTownHall.lat = r.results[0].geometry.location.lat;
  //         newTownHall.lng = r.results[0].geometry.location.lng;
  //         newTownHall.address = r.results[0].formatted_address.split(', USA')[0];
  //         addresskey.trim();
  //         update =  {
  //             lat: newTownHall.lat,
  //             lng: newTownHall.lng,
  //             formatted_address: newTownHall.address,
  //           }
  //       }
  //       updateEvent(townhall.eventId, update);
  //     });
  //   });
  //   req.on('error', (e) => {
  //     console.error('error requests', e, newTownHall.eventId);
  //   });
  //   req.end();
  // };




  function needsGeoCode(townhall){
    if (!townhall.lat && townhall.address) {
      return true;
    } else {
      return false;
    }
  }

  function dateValid(date) {
    isValid = false;
    if (moment(date, 'YYYY-MM-DD', true).isValid()) {
      isValid = true;
    }
    return isValid;
  }

  function timeValid(time) {
    isValid = false;
    if (moment(time,'HH:mm:ss',true).isValid()) {
      isValid = true;
    }
    return isValid;
  }


  function dateTimeValidation(townhall, path) {
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
        updateEvent(townhall.eventId, update, path);
      }
    } else if (!townhall.repeatingEvent) {
      if (needsGeoCode(townhall)) {
        error = new ErrorReport(path + townhall.eventId, 'Needs geocode');
        error.sendEmail();
      }
      if (!dateValid(townhall.yearMonthDay)) {
        console.log('date', townhall);
      }
      if (!timeValid(townhall.timeStart24)) {
        if (moment(townhall.timeStart24, 'H:mm:ss', true).isValid()) {
          update = {};
          update.timeStart24 = moment(townhall.timeStart24, 'H:mm:ss').format('HH:mm:ss');
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
        updateEvent(townhall.eventId, update, path);
      }
    }
  }

  function updateEvent(key, update, path) {
    console.log(path + key, update);
    firebasedb.ref(path + key).update(update);
  }

  firebasedb.ref('townHalls/').on('child_changed', function(snapshot){
    var townhall = snapshot.val();
    dateTimeValidation(townhall, 'townHalls/');
  });
  firebasedb.ref('UserSubmission/').on('child_added', function(snapshot){
    var townhall = snapshot.val();
    dateTimeValidation(townhall, 'UserSubmission/');
  });
}
module.exports = eventValidation;
