#!/usr/bin/env node

  const firebasedb = require('../bin/setupFirebase.js');
  const moment = require('moment');

  function TownHall(opts) {
    for (keys in opts) {
      this[keys] = opts[keys];
    }
  }

  TownHall.removeOld = function removeOld() {
    var time = Date.now();
    firebasedb.ref('/townHalls/').once('value').then(function getSnapShot(snapshot) {
      snapshot.forEach(function (townhall) {
        var ele = new TownHall(townhall.val());
        if (ele.dateObj && ele.dateObj < time && !ele.repeatingEvent) {
          console.log('old', ele.eventId,  moment(ele.dateObj), ele.Date, ele.Time, ele.timeZone);
          if (townhall.val().eventId) {
            var year = new Date(ele.dateObj).getFullYear();
            var month = new Date(ele.dateObj).getMonth();
            var dateKey = year + '-' + month;
            var oldTownHall = firebasedb.ref('/townHalls/' + ele.eventId);
            var oldTownHallID = firebasedb.ref('/townHallIds/' + ele.eventId);
            firebasedb.ref('/townHallsOld/' + dateKey + '/' + ele.eventId).update(ele);
            oldTownHall.remove();
            oldTownHallID.remove();
          }
        }
      });
    });
  };

  TownHall.removeOld();
