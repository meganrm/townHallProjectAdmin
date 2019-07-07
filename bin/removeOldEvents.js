#!/usr/bin/env node

  const firebasedb = require('../server/lib/setupFirebase.js');
  const metaDataUpdates = require('../events/meta-data-updates');

  const getStateLegs = require('../server/data/get-states').getStateLegs;
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
                      metaDataUpdates.updateUserWhenEventArchived(townHall);
                      firebasedb.ref(archivePath + dateKey + '/' + townHall.eventId).update(townHall);
                      oldTownHall.remove();
                  }
              }
          });
      });
  };

  TownHall.removeOld('/townHalls/', '/archived_town_halls/');
  
  getStateLegs()
    .then(states => {
        states.forEach(state => {
            TownHall.removeOld(`/state_townhalls/${state}/`, `/archived_state_town_halls/${state}/`);
        });
    });

