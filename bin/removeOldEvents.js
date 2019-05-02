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
          snapshot.forEach(function (townHallSnap) {
              var townHall = new TownHall(townHallSnap.val());
        
              if (townHall.dateObj && townHall.dateObj < time && !townHall.repeatingEvent) {
                  console.log('old', townHall.eventId, moment(townHall.dateObj).format(), townHall.dateString);
                  if (townHall.eventId) {

                      const dateKey = townHall.dateObj ? moment(townHall.dateObj).format('YYYY-MM') : 'no_date';
                      var oldTownHall = firebasedb.ref(townhallPath + townHall.eventId);
                      firebasedb.ref(`/townHallIds/${townHall.eventId}`).update({
                          status: 'archived',
                          archive_path: `${archivePath}${dateKey}`,
                      });
                      firebasedb.ref(archivePath + dateKey + '/' + townHall.eventId).update(townHall);
                      oldTownHall.remove();
                  }
              }
          });
      });
  };

  TownHall.removeOld('/townHalls/', '/archived_town_halls/');
  TownHall.removeOld('/state_townhalls/CO/', '/archived_state_town_halls/CO/');
  TownHall.removeOld('/state_townhalls/VA/', '/archived_state_town_halls/VA/');
  TownHall.removeOld('/state_townhalls/NC/', '/archived_state_town_halls/NC/');
  TownHall.removeOld('/state_townhalls/OR/', '/archived_state_town_halls/OR/');
  TownHall.removeOld('/state_townhalls/AZ/', '/archived_state_town_halls/AZ/');
