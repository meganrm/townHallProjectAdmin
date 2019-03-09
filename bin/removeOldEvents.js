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
                  const eventDate = moment(townHall.dateObj);
                  console.log('old', townHall.eventId, moment(townHall.dateObj).format(), townHall.dateString);
                  if (townHall.eventId) {

                      const year = eventDate.get('year');
                      const month = eventDate.get('month');
                      var dateKey = `${year}-${month}`;
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

  TownHall.removeOld('/townHalls/', '/archive_clean/');
  TownHall.removeOld('/state_townhalls/CO/', '/state_townhalls_archive/CO/');
  TownHall.removeOld('/state_townhalls/VA/', '/state_townhalls_archive/VA/');
  TownHall.removeOld('/state_townhalls/NC/', '/state_townhalls_archive/NC/');
  TownHall.removeOld('/state_townhalls/OR/', '/state_townhalls_archive/OR/');
  TownHall.removeOld('/state_townhalls/AZ/', '/state_townhalls_archive/AZ/');
