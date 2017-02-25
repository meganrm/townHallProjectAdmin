#!/usr/bin/env node

  function TownHall(opts) {
    for (keys in opts) {
      this[keys] = opts[keys]
    }
  }

  // Global data stete
  TownHall.allTownHalls = []
  TownHall.allTownHallsFB = []
  TownHall.currentContext = []
  TownHall.filteredResults = []
  TownHall.filterIds = {
    meetingType:'',
    Party:'',
    State:'',
  }
  var https = require('https')
  var admin = require('firebase-admin')
  var google = require('googleapis')

  var sendgrid  = require('sendgrid')(
    process.env.SENDGRID_USERNAME,
    process.env.SENDGRID_PASSWORD
  )
  // Initialize the app with a custom auth variable, limiting the server's access
  var firebasekey =  process.env.FIREBASE_TOKEN.replace(/\\n/g, '\n')

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: "townhallproject-86312",
      clientEmail: "herokuadmin@townhallproject-86312.iam.gserviceaccount.com",
      privateKey: firebasekey
    }),
    databaseURL: "https://townhallproject-86312.firebaseio.com"
  });

  var firebasedb = admin.database()
  // admin.database.enableLogging(true)

  // The app only has access as defined in the Security Rules
  TownHall.isCurrentContext = false
  TownHall.isMap = false
  TownHall.zipQuery

  TownHall.timeZones = {
    PST : 'America/Los_Angeles',
    MST : 'America/Denver',
    CST : 'America/Chicago',
    EST : 'America/New_York',
    other : 'no time zone',
  }

  // writes to townhall, can take a key for update
  TownHall.prototype.updateFB = function (key) {
    var newEvent = this
    var metaData = { eventId:newEvent.eventId, lastUpdated:newEvent.lastUpdated }
    var updates = {}
    updates['/townHallsTesting/' + key] = newEvent
    updates['/townHallIdsTesting/' + key] = metaData
    console.log(`writing ${newEvent.eventId}`);
    return firebasedb.ref().update(updates).catch(function (error) {
      console.log('could not update', newEvent.eventId)
    })
  }

  TownHall.saveZipLookup = function (zip) {
    firebasedb.ref('/zipZeroResults/' + zip).once('value').then(function (snapshot) {
      console.log(zip)
      var newVal
      if (snapshot.exists()) {
        newVal = snapshot.val() + 1
        console.log('new val', newVal)
      } else {
        newVal = 1
      }
      return firebasedb.ref('/zipZeroResults/' + zip).set(newVal)
    })
  }


  // DATA PROCESSING BEFORE WRITE
  // check if there is a time zone, if not, looks up on google
  TownHall.prototype.validateZone = function () {
    var tz = TownHall.timeZones[this.timeZone]
    if (!tz) {
      var time = Date.now()
      var loc = this.lat + ',' + this.lng
      console.log('look up timezone')
      // url = 'https://maps.googleapis.com/maps/api/timezone/json?location='+loc+'&timestamp=1331766000&key=AIzaSyBlmL9awpTV6AQKQJOmOuUlH1APXWmCHLQ';
      // $.get(url, function (response){
      //   this.zoneString = response.timeZoneId;
      //   return this;
      // })
    } else {
      this.zoneString = tz
      return this
    }
  }

  TownHall.prototype.findLinks = function () {
    var $regExUrl = /(https?:\/\/[^\s]+)/g
   // make the urls hyper links
    if (this.Notes && this.Notes.length > 0) {
      var withAnchors = this.Notes.replace($regExUrl, '<a href="$1" target="_blank">Link</a>')
      this.Notes = '<p>' + withAnchors + '</p>'
    }
  }

  // converts time to 24hour time
  TownHall.toTwentyFour = function (time) {
    var hourmin = time.split(' ')[0]
    var ampm = time.split(' ')[1]
    if (ampm === 'PM') {
      var hour = hourmin.split(':')[0]
      hour = Number(hour) + 12
      hourmin = hour + ':' + hourmin.split(':')[1]
    }
    return hourmin + ':' + '00'
  }

  // formatting date and time for the calendar app
  TownHall.prototype.formatDateTime = function () {
    var timesplit = this.Time.split('-')
    var time
    var timeZone
    var timeEnd
    if (timesplit.length === 2) {
      time = this.Time.split('-')[0]
      timeEnd = this.Time.split('-')[1]
    } else {
      time = this.Time
    }
    if (this.timeZone === 'HAST') {
      timeZone = 'UTC-1000'
    } else {
      timeZone = this.timeZone
    }
    this.dateObj = new Date(this.Date + ' ' + time + ' ' + timeZone)
    this.dateString = this.dateObj.toDateString()
    if (this.dateString !== 'Invalid Date') {
      this.dateValid = true
      var month = this.dateObj.getMonth() + 1
      month = month.toString().length === 1 ? (0 + month.toString()) : month.toString()
      var day = this.dateObj.getDate()
      day = day.toString().length === 1 ? (0 + day.toString()) : day.toString()
      var yearMonthDay = this.dateObj.getFullYear() + '-' + month + '-' + day
      this.timeStart24 = TownHall.toTwentyFour(this.Time)
      // If no ending time, just add 2 hours
      if (timeEnd) {
        this.timeEnd24 = TownHall.toTwentyFour(timeEnd)
      } else {
        var hour = parseInt(this.timeStart24.split(':')[0]) + 2
        this.timeEnd24 = hour + ':' + this.timeStart24.split(':')[1] + ':' + '00'
      }
      this.validateZone()
      this.yearMonthDay = yearMonthDay
      this.dateObj = this.dateObj.getTime()
      return this
    } else {
      console.log('no date', this.Date + ' ' + time + ' ' + this.timeZone)
      return this
    }
  }

  TownHall.prototype.isInFuture = function () {
    this.dateObj = new Date(this.Date)
    var now = new Date()
    if (now - this.dateObj < 0) {
      return true
    }
  }

  // geocodes an address
  TownHall.prototype.getLatandLog = function (address) {
    var addressQuery = escape(address)
    var options = {
      hostname: 'maps.googleapis.com',
      path: `/maps/api/geocode/json?address=${addressQuery}&key=AIzaSyB868a1cMyPOQyzKoUrzbw894xeoUhx9MM`,
      method: 'GET',
    }
    var str = ''
    var newTownHall = this
    var req = https.request(options, (res) => {
      res.setEncoding('utf8')
      res.on('data', (chunk) => {
          str += chunk
      })
      res.on('end', () => {
        var r = JSON.parse(str)
        if (!r.results[0]) {
          console.log('no geocode results', newTownHall.eventId)
          newTownHall.formatDateTime()
          newTownHall.findLinks()
          newTownHall.updateFB(newTownHall.eventId)
          firebasedb.ref('/townHallsErrors/geocoding/' + newTownHall.eventId).set({eventId: newTownHall.eventId})
        } else {
        newTownHall.lat = r.results[0].geometry.location.lat
        newTownHall.lng = r.results[0].geometry.location.lng
        newTownHall.address = r.results[0].formatted_address.split(', USA')[0]
        newTownHall.formatDateTime()
        newTownHall.findLinks()
        console.log('geolcate google', newTownHall.eventId)
        newTownHall.updateFB(newTownHall.eventId)
        var addresskey = addressQuery.replace(/\W/g, '')
        addresskey.trim()
        firebasedb.ref('/townHallsErrors/geocoding/' + newTownHall.eventId).remove()
        firebasedb.ref('geolocateTesting/' + addresskey).set(
          {
            lat : newTownHall.lat,
            lng : newTownHall.lng,
            formatted_address : newTownHall.address,
          })
        }
      })
    })
    req.on('error', (e) => {
      console.error('error requests', e, newTownHall.eventId)
      newTownHall.formatDateTime()
      newTownHall.findLinks()
      newTownHall.updateFB(newTownHall.eventId)
      firebasedb.ref('/townHallsErrors/geocoding/' + newTownHall.eventId).set({eventId: newTownHall.eventId})
    })
    req.end()
  }


  // checks firebase for address, if it's not there, calls google geocode
  TownHall.prototype.geoCodeFirebase = function (address) {
    var newTownHall = this
    var addresskey = address.replace(/\W/g, '')
    addresskey.trim()
    firebasedb.ref('geolocate/' + addresskey).once('value').then(function(snapshot) {
      if (snapshot.child('lat').exists() === true) {
        newTownHall.lat = snapshot.val().lat
        newTownHall.lng = snapshot.val().lng
        newTownHall.address = snapshot.val().formatted_address
        newTownHall.formatDateTime()
        newTownHall.findLinks()
        newTownHall.updateFB(newTownHall.eventId)
      } else if (snapshot.child('lat').exists() === false) {
        firebasedb.ref('/townHallsErrors/geocoding/' + newTownHall.eventId).once('value').then(function (snapID) {
          if (snapID.child('streetAddress').exists() === newTownHall.streetAddress) {
            console.log('known error')
          } else {
            newTownHall.getLatandLog(address)
          }
        })
      }
    })
    .catch(function (error){
      console.log(error)
    })
  }

  TownHall.fetchAllGoogle = function (next) {
    TownHall.allTownHalls = []
    return new Promise(function (resolve, reject) {
      var sheets = google.sheets('v4')
      sheets.spreadsheets.values.get({
        spreadsheetId: '1yq1NT9DZ2z3B8ixhid894e77u9rN5XIgOwWtTW72IYA',
        range: 'Upcoming%20Events!C:U',
        key: 'AIzaSyBw6HZ7Y4J1dATyC4-_mKmt3u0hLRRqthQ',
      }, function (err, response) {
        if (err) {
          console.error('The API returned an error: ' + err)
          return
        }
        var rows = response.values
        if (rows.length === 0) {
          console.error('No data found')
        } else {
          var encodedArray = TownHall.loadAll(rows)
          resolve(encodedArray)
        }
      })
    })
  }

  TownHall.loadAll = function loadAll(array) {
    var googlekeys = ['eventId', 'lastUpdated', 'Member', 'Party', 'State', 'District', 'meetingType', 'RSVP', 'eventName', 'Date', 'Time', 'timeEnd', 'Location', 'streetAddress', 'City', 'StateAb', 'Zip', 'Notes', 'source']
    var encodedArray = []
    for (var j = 0; j < array.length; j++) {
      var row = array[j]
      var rowObj = new TownHall()
      for (var k = 0; k < row.length; k++) {
        rowObj[googlekeys[k]] = row[k]
      }
      if (parseInt(rowObj.eventId)) {
        // checks if data is complete
        if (row.length >= 11) {
          encodedArray.push(rowObj)
        } else {
          // If incomplete store to seperate table
          firebasedb.ref('/townHallsErrors/missingRows/' + rowObj.eventId).set(rowObj).catch(function (error) {
            console.error('couldnt write', rowObj)
          })
        }
      } else {
        // console.log('not id', rowObj);
      }
    }
    return encodedArray
  }

  TownHall.prototype.isInDatabase = function () {
    var newTownHall = this
    var ref = firebasedb.ref('/townHallIdsTesting/' + newTownHall.eventId)
    ref.once('value', function (snapshot) {
      if (snapshot.exists()) {
        console.log('already in database');
        var firebaseUpdate = new Date(snapshot.val().lastUpdated).getTime()
        var googleUpdate = new Date(newTownHall.lastUpdated).getTime()
        if (firebaseUpdate === googleUpdate) {
        } else {
          console.log('has been updated');
          newTownHall.formattAddressQuery()
        }
      } else if (snapshot.child('lat').exists() === false) {
        console.log('new');
        newTownHall.formattAddressQuery()
      }
    }).catch(function(error){
      newTownHall.formattAddressQuery()
    })
  }

  TownHall.prototype.formattAddressQuery = function () {
    var newTownHall = this
    var address
    if (newTownHall.meetingType.slice(0, 4) === 'Tele') {
      address = newTownHall.State
    } else if (newTownHall.streetAddress && newTownHall.streetAddress.length > 2) {
      address = newTownHall.streetAddress + ' ' + newTownHall.City + ' ' + newTownHall.StateAb
    } else {
      newTownHall.noLoc = true
      address = newTownHall.State
    }
    newTownHall.geoCodeFirebase(address)
  }

  TownHall.batchCalls = function(response) {
    var chunck = response.splice(0,10)
    console.log('checking 10');
    chunck.forEach(function(ele){
      ele.isInDatabase()
    })
    if (response.length > 0) {
      setTimeout(function(){
        TownHall.batchCalls(response);
      }, 2000);
    } else {
      // When done, update firebase
      console.log('got all data')
      TownHall.sendEmail
    };
}
  TownHall.sendEmail = function (){
    sendgrid.send({
    to: 'meganrm@gmail.com',
    from: 'herokuadmin@townhallproject-86312.iam.gserviceaccount.com',
    subject: 'Updated firebase',
    text: 'I just updated firebase'
  }, function(err, json) {
    if (err) {
      console.error(err);
    }
    done()
});
  }

  TownHall.removeOld = function removeOld() {
    firebasedb.ref('/townHallsTesting/').once('value').then(function getSnapShot(snapshot) {
      snapshot.forEach(function(townhall){
        var ele = new TownHall(townhall.val())
        if (TownHall.allIdsGoogle.indexOf(ele.eventId) < 0) {
          console.log('old', ele.eventId)
          if (townhall.val().eventId) {
            var oldTownHall = firebasedb.ref('/townHallsTesting/' + ele.eventId)
            firebasedb.ref('/townHallsOldTesting/' + ele.eventId).set(ele)
            oldTownHall.remove()
          }
        }
      })
    })
  }

  TownHall.allIdsGoogle = []
  TownHall.allIdsFirebase = []
  TownHall.lengthOfGoogle

  TownHall.dataProcess = function dataProcess() {
    firebasedb.ref('/lastupdatedTesting/time').set(Date.now())
    console.log('time', new Date())
    TownHall.fetchAllGoogle().then(function (result) {
      var results = result
      TownHall.lengthOfGoogle = results.length
      results.forEach(function (ele) {
        TownHall.allIdsGoogle.push(ele.eventId)
      })
      TownHall.batchCalls(results)
      TownHall.removeOld()
    }, function (err) {
      console.error(err)
    })
  }

  TownHall.readGoogle = function readGoogle() {
    var time = 60 * 60 * 1000
    setInterval(TownHall.dataProcess, time)
  }

  TownHall.dataProcess()
  module.exports = TownHall
