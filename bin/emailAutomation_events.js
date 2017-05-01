#!/usr/bin/env node
  function TownHall(opts) {
    for (keys in opts) {
      this[keys] = opts[keys]
    }
  }

  // Global data state
  TownHall.townHallbyDistrict = {}
  TownHall.senateEvents = {}

  var admin = require('firebase-admin')
  var statesAb = require('../scripts/data/states.js')
  var firebasekey = process.env.FIREBASE_TOKEN.replace(/\\n/g, '\n')

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: 'townhallproject-86312',
      clientEmail: 'herokuadmin@townhallproject-86312.iam.gserviceaccount.com',
      privateKey: firebasekey
    }),
    databaseURL: 'https://townhallproject-86312.firebaseio.com'
  });

  var firebasedb = admin.database()

  TownHall.prototype.inNextWeek = function(){
    var townhall = this;
    var milsecToDays = (1000 * 60 * 60 * 24)
    if (townhall.dateObj) {
      var townhallDay = new Date(townhall.dateObj)
      if ((townhallDay - Date.now())/milsecToDays < 8 ) {
        return true
      } else {
        return false
      }
    }
  }

  TownHall.prototype.include = function(){
    var townhall = this;
    var include
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
      include = true;
      break;
    default:
      include = false;
    }
    return include
  }


  TownHall.prototype.emailText = function(){
    var date
    var location
    var time
    var notes
    if (this.repeatingEvent) {
      date = this.repeatingEvent
    } else {
      date = this.Date
    }
    if (this.meetingType === 'Tele-Town Hall') {
      location = this.phoneNumber
      time = this.Time
    } else if (this.timeZone) {
      location = this.Location
      time = `${this.Time}, ${this.timeZone}`
    } else {
      location = this.Location
      time = this.Time
    }
    if (this.Notes) {
      notes = `<i>${this.Notes}</i></br>`
    } else {
      notes = ''
    }
    var eventTemplate =
    `<strong style="color:#0d4668">${this.Member}, ${this.meetingType}</strong>
      <section style="margin-left:10px; margin-bottom: 20px; line-height: 20px">
        ${date}</br>
        ${time}</br>
        ${location}</br>
        ${this.address}</br>
        <a href="https://townhallproject.com/?eventId=${this.eventId}">Link on townhallproject site</a></br>
        ${notes}
      </section>`
    return eventTemplate
  }

  TownHall.prototype.addToEventList = function(eventList, key){
    var townhall = this;
    if (!eventList[key]) {
      eventList[key] = []
    }
    eventList[key].push(townhall)
  }

  TownHall.getAll = function(){
    firebasedb.ref('townHalls').once('value').then(function (snapshot) {
      snapshot.forEach(function(ele) {
        var townhall = new TownHall(ele.val())
        if (townhall.District && townhall.inNextWeek() && townhall.include()) {
          if (townhall.District === 'Senate') {
            // get state two letter code
            for (const key of Object.keys(statesAb)) {
              if (statesAb[key] === townhall.State) {
                var state = key
              }
            }
            townhall.addToEventList(TownHall.senateEvents, state)
          } else {
            townhall.addToEventList(TownHall.townHallbyDistrict, townhall.District)
          }
        }
      })
    }).then(function(){
      console.log('got all events!');
    }).catch(function (error) {
      console.log(error);
    });
  }
  // will always finish before the users are done downloading
  TownHall.getAll()

  module.exports = TownHall
