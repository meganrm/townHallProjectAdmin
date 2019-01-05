#!/usr/bin/env node

  const firebasedb = require('../server/lib/setupFirebase.js');
  const moment = require('moment');

  function TownHall(opts) {
    for (let keys in opts) {
      this[keys] = opts[keys];
    }
  }

  TownHall.removeOld = function removeOld(townhallPath, archivePath) {
    var time = Date.now();
    firebasedb.ref(townhallPath).once('value').then(function getSnapShot(snapshot) {
      snapshot.forEach(function (townhall) {
        var ele = new TownHall(townhall.val());
        if (ele.dateObj && ele.dateObj < time && !ele.repeatingEvent) {
          console.log('old', ele.eventId,  moment(ele.dateObj), ele.Date, ele.Time, ele.timeZone, archivePath);
          if (townhall.val().eventId) {
            var year = new Date(ele.dateObj).getFullYear();
            var month = new Date(ele.dateObj).getMonth();
            var dateKey = year + '-' + month;
            var oldTownHall = firebasedb.ref(townhallPath + ele.eventId);
            var oldTownHallID = firebasedb.ref('/townHallIds/' + ele.eventId);
            firebasedb.ref(archivePath + dateKey + '/' + ele.eventId).update(ele);
            oldTownHall.remove();
            oldTownHallID.remove();
          }
        }
      });
    });
  };

  TownHall.removeOld('/townHalls/', '/townHallsOld/');
  TownHall.removeOld('/state_townhalls/CO/', '/state_townhalls_archive/CO/');
  TownHall.removeOld('/state_townhalls/VA/', '/state_townhalls_archive/VA/');
  TownHall.removeOld('/state_townhalls/NC/', '/state_townhalls_archive/NC/');
  TownHall.removeOld('/state_townhalls/OR/', '/state_townhalls_archive/OR/');
  TownHall.removeOld('/state_townhalls/AZ/', '/state_townhalls_archive/AZ/');
