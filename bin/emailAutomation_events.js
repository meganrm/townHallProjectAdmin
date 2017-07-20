#!/usr/bin/env node
  function TownHall(opts) {
    for (keys in opts) {
      this[keys] = opts[keys];
    }
  }

  // Global data state
  TownHall.townHallbyDistrict = {};
  TownHall.senateEvents = {};

  var admin = require('firebase-admin');
  var statesAb = require('../scripts/data/states.js');
  var firebasekey = process.env.FIREBASE_TOKEN.replace(/\\n/g, '\n');

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: 'townhallproject-86312',
      clientEmail: 'herokuadmin@townhallproject-86312.iam.gserviceaccount.com',
      privateKey: firebasekey,
      databaseAuthVariableOverride: {
        uid: 'read-only'
      }
    }),
    databaseURL: 'https://townhallproject-86312.firebaseio.com'
  });

  var firebasedb = admin.database();

  TownHall.setLastEmailTime = function() {
    var today = new Date().getDay();
    var now = Date.now();
    console.log(now);
    if (today === 4) {
      console.log('Thursday');
      firebasedb.ref('emailLastSent/weekly').set(now);
    }
    console.log('setting daily');
    firebasedb.ref('emailLastSent/daily').set(now);
  };

  TownHall.prototype.inNextWeek = function(lastEmailed){
    var townhall = this;
    var lastweekly = lastEmailed.weekly;
    var lastDaily = lastEmailed.daily;
    var milsecToDays = (1000 * 60 * 60 * 24);
    var today = new Date().getDay();
    var townhallDay = new Date(townhall.dateObj);
    if (townhall.dateObj) {
      if (townhall.dateObj < Date.now()) {
        // console.log('in past', townhall.Date );
        // in past
        return false;
      }
      if ((townhallDay - lastweekly)/milsecToDays > 8 ) {
        // console.log('not in next week', townhall.Date,  (townhallDay - lastweekly)/milsecToDays);
        // not in the next week
        return false;
      }
      // if Thursday
      if (today === 4) {
        // console.log('wednesday', townhall.Date );
        return true;
      // if not Thursday, is the event new since last emailed?
      } else if (townhall.lastUpdated > lastDaily){
        // console.log('updated recently', townhall.Date );
        return true;
      }
      return false;
    }
  };

  TownHall.prototype.include = function(){
    var townhall = this;
    var include;
    switch (townhall.meetingType) {
    case 'Town Hall':
      include = true;
      break;
    case 'Empty Chair Town Hall':
      include = true;
      break;
    case 'Tele-Town Hall':
      include = true;
      break;
    default:
      include = false;
    }
    return include;
  };


  TownHall.prototype.emailText = function(){
    var date;
    var location;
    var time;
    var notes;
    var address;
    var updated;
    var title;
    if (this.repeatingEvent) {
      date = this.repeatingEvent;
    } else {
      date = this.Date;
    }
    if (this.meetingType === 'Tele-Town Hall') {
      location = this.phoneNumber;
      time = this.Time;
    } else if (this.timeZone) {
      location = this.Location;
      time = `${this.Time}, ${this.timeZone}`;
    } else {
      location = this.Location;
      time = this.Time;
    }
    if (time) {
      time = `<li>${time}</li>`;
    } else {
      time = '';
    }
    if (location) {
      location = `<li>${location}</li>`;
    } else {
      location = '';
    }
    if (this.eventName) {
      title = `<li>${this.eventName}</li>`;
    } else {
      title = '';
    }

    if (this.Notes) {
      notes = `<i>${this.Notes}</i></br>`;
    } else {
      notes = '';
    }
    if (this.address) {
      address = `<li>${this.address}</li>`;
    } else {
      address = '';
    }
    if (this.updatedBy) {
      updated = '*The details of this event were changed recently';
    } else {
      updated = '';
    }
    var eventTemplate =
    `<strong style="color:#0d4668">${this.Member} (${this.District}), <span style="color:#ff4741">${this.meetingType}</span></strong>
    <small><em>${updated}</em></small>
      <section style="margin-left:10px; margin-bottom: 20px; line-height: 20px">
      <ul>
        ${title}
        <li>${date}</li>
        ${time}
        ${location}
        ${address}
        <li><a href="https://townhallproject.com/?eventId=${this.eventId}">Link on townhallproject site</a></br>
        <p>${notes}</p>
      </ul>
      </section>`;
    return eventTemplate;
  };

  TownHall.prototype.addToEventList = function(eventList, key){
    var townhall = this;
    if (!eventList[key]) {
      eventList[key] = [];
    }
    eventList[key].push(townhall);
  };

  TownHall.getAll = function(lastUpdated){
    return new Promise(function (resolve, reject) {
      firebasedb.ref('townHalls').once('value').then(function (snapshot) {
        snapshot.forEach(function(ele) {
          var townhall = new TownHall(ele.val());
          if (townhall.District && townhall.inNextWeek(lastUpdated) && townhall.include()) {
            if (townhall.District === 'Senate') {
              // get state two letter code
              for (const key of Object.keys(statesAb)) {
                if (statesAb[key] === townhall.State) {
                  var state = key;
                }
              }
              townhall.addToEventList(TownHall.senateEvents, state);
            } else {
              townhall.addToEventList(TownHall.townHallbyDistrict, townhall.District);
            }
          }
        });
      }).then(function(){
        resolve();
      }).catch(function (error) {
        reject(error);
      });
    });
  };

  TownHall.getLastSent = function() {
    return new Promise(function (resolve, reject) {
      firebasedb.ref('emailLastSent/').once('value').then(function (snapshot) {
        if (snapshot.val()) {
          console.log(snapshot.val());
          resolve(snapshot.val());
        } else {
          reject ('no last date');
        }
      });
    });
  };
  // will always finish before the users are done downloading
  module.exports = TownHall;
