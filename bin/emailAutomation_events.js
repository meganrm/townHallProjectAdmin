#!/usr/bin/env node
  function TownHall(opts) {
    for (keys in opts) {
      this[keys] = opts[keys];
    }
  }

  var statesAb = {
    AL: 'Alabama',
    AK: 'Alaska',
    AS: 'American Samoa',
    AZ: 'Arizona',
    AR: 'Arkansas',
    CA: 'California',
    CO: 'Colorado',
    CT: 'Connecticut',
    DE: 'Delaware',
    DC: 'District Of Columbia',
    FM: 'Federated States Of Micronesia',
    FL: 'Florida',
    GA: 'Georgia',
    GU: 'Guam',
    HI: 'Hawaii',
    ID: 'Idaho',
    IL: 'Illinois',
    IN: 'Indiana',
    IA: 'Iowa',
    KS: 'Kansas',
    KY: 'Kentucky',
    LA: 'Louisiana',
    ME: 'Maine',
    MH: 'Marshall Islands',
    MD: 'Maryland',
    MA: 'Massachusetts',
    MI: 'Michigan',
    MN: 'Minnesota',
    MS: 'Mississippi',
    MO: 'Missouri',
    MT: 'Montana',
    NE: 'Nebraska',
    NV: 'Nevada',
    NH: 'New Hampshire',
    NJ: 'New Jersey',
    NM: 'New Mexico',
    NY: 'New York',
    NC: 'North Carolina',
    ND: 'North Dakota',
    MP: 'Northern Mariana Islands',
    OH: 'Ohio',
    OK: 'Oklahoma',
    OR: 'Oregon',
    PW: 'Palau',
    PA: 'Pennsylvania',
    PR: 'Puerto Rico',
    RI: 'Rhode Island',
    SC: 'South Carolina',
    SD: 'South Dakota',
    TN: 'Tennessee',
    TX: 'Texas',
    UT: 'Utah',
    VT: 'Vermont',
    VI: 'Virgin Islands',
    VA: 'Virginia',
    WA: 'Washington',
    WV: 'West Virginia',
    WI: 'Wisconsin',
    WY: 'Wyoming'
  };

  // Global data state
  TownHall.townHallbyDistrict = {};
  TownHall.senateEvents = {};

  var firebasedb = require('../bin/setupFirebase.js');
  var moment = require('moment')

  // admin.database.enableLogging(true);
  TownHall.prints = {
    inPast: [],
    notInNextWeek: [],
    isThursday: [],
    changedToday : []
  };

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
    var lastweekly = moment(lastEmailed.weekly).endOf('day');
    var nextweekly = moment(lastweekly).add(7, 'days');
    var nextThursday = moment(lastweekly).add(14, 'days');
    var lastDaily = lastEmailed.daily;
    var today = new Date().getDay();
    var townhallDay = moment(townhall.dateObj);
    var include = townhall.include();

    if (townhall.dateObj) {
      if (townhall.dateObj < moment()) {
        // in past
        if (include) {
          TownHall.prints.inPast.push(`<li>${townhall.Date}</li>`);
        }
        return false;
      }
      if (today !== 4){
        // not in the next week
        if (townhallDay.isAfter(nextweekly)) {
          if (include) {
            TownHall.prints.notInNextWeek.push(`<li>${townhall.Date}</li>`);
          }
          return false;
        }
        if (townhall.lastUpdated > lastDaily){
          // if not Thursday, is the event new since last emailed?
          TownHall.prints.changedToday.push(`<li>${townhall.Date}, ${townhall.meetingType}, include? ${include}</li>`);
          return true;
        }
      }
      // if Thursday
      if (today === 4 && townhallDay.isBefore(nextThursday)) {
        if (include) {
          TownHall.prints.isThursday.push(`<li>${townhall.Date}}</li>`);
        }
        return true;
      } else
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
    case 'Other':
      if (townhall.iconFlag === 'in-person') {
        include = true;
      } else {
        include = false;
      }
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
    }  else if (this.dateString) {
      date = this.dateString;
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
                if (statesAb[key] == townhall.State) {
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
