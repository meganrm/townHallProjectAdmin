#!/usr/bin/env node

  function TownHall(opts) {
    for (keys in opts) {
      this[keys] = opts[keys]
    }
  }

  // Global data state
  TownHall.allTownHalls = []
  TownHall.allTownHallsFB = []
  TownHall.currentContext = []
  TownHall.filteredResults = []
  TownHall.allIdsGoogle = []
  TownHall.allIdsFirebase = []
  TownHall.lengthOfGoogle

  var https = require('https')
  var admin = require('firebase-admin')
  var google = require('googleapis');

  var sendgrid = require('sendgrid')(
    process.env.SENDGRID_USERNAME,
    process.env.SENDGRID_PASSWORD
  )
  // Initialize the app with a custom auth variable, limiting the server's access
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
  admin.database.enableLogging(true)

  TownHall.isCurrentContext = false
  TownHall.isMap = false

  // writes to townhall, can take a key for update
  TownHall.prototype.updateFB = function (key) {
    var newEvent = this
    var metaData = { eventId: newEvent.eventId, lastUpdated: newEvent.lastUpdated }
    var updates = {}
    updates['/townHalls/' + key] = newEvent
    updates['/townHallIds/' + key] = metaData
    console.log(`writing ${newEvent.eventId}`);
    return firebasedb.ref().update(updates).catch(function (error) {
      console.log('could not update', newEvent.eventId, error)
    })
  }

  // DATA PROCESSING BEFORE WRITE
  // check if there is a time zone, if not, looks up on google
  TownHall.prototype.validateZone = function () {
    var newTownHall = this
    var time = Date.parse(newTownHall.Date + ' ' + newTownHall.Time) / 1000
    var loc = newTownHall.lat + ',' + newTownHall.lng
    return new Promise(function (resolve, reject) {
      if (newTownHall.meetingType.slice(0, 4) === 'Tele') {
        newTownHall.formatDateTime()
        resolve(newTownHall)
      } else {
        var options = {
          hostname: 'maps.googleapis.com',
          path: `/maps/api/timezone/json?location=${loc}&timestamp=${time}&key=AIzaSyB868a1cMyPOQyzKoUrzbw894xeoUhx9MM`,
          method: 'GET',
        }
        var str = ''
        var req = https.request(options, (res) => {
          res.setEncoding('utf8')
          res.on('data', (chunk) => {
            str += chunk
          })
          res.on('end', () => {
            var r = JSON.parse(str)
            if (!r.timeZoneName) {
              console.log('no timezone results', newTownHall.eventId, r)
            } else {
              newTownHall.zoneString = r.timeZoneId
              var timezoneAb = r.timeZoneName.split(' ')
              newTownHall.timeZone = timezoneAb[0][0]
              for (var i = 1; i < timezoneAb.length; i++) {
                newTownHall.timeZone = newTownHall.timeZone + timezoneAb[i][0]
                newTownHall.formatDateTime()
              }
            }
            resolve(newTownHall)
          })
        })
      }
      req.on('error', (e) => {
        console.error('error requests', e, newTownHall.eventId)
      })
      req.end()
    })
  }


  TownHall.prototype.findLinks = function () {
    var $regExUrl = /(https?:\/\/[^\s]+)/g
   // make the urls hyper links
    if (this.Notes && this.Notes.length > 0) {
      var withAnchors = this.Notes.replace($regExUrl, '<a href="$1" target="_blank">More Information</a>')
      this.Notes = '<p>' + withAnchors + '</p>'
    }
    if (this.RSVP && this.RSVP.length > 0) {
      var withAnchors = this.RSVP.replace($regExUrl, '<a href="$1" target="_blank">RSVP here</a>')
      this.RSVP = '<p>' + withAnchors + '</p>'
    }
  }

  // converts time to 24hour time
  TownHall.toTwentyFour = function (time) {
    var hourmin = time.split(' ')[0]
    var ampm = time.split(' ')[1]
    if (ampm === 'PM') {
      var hour = hourmin.split(':')[0]
      if (Number(hour) !== 12) {
        hour = Number(hour) + 12
      }
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
    timeZone = this.timeZone === 'HAST' ? timeZone = 'UTC-1000':  timeZone = this.timeZone
    this.dateObj = timeZone ? new Date(this.Date + ' ' + time + ' ' + timeZone): new Date(this.Date + ' ' + time)
    this.dateString = this.dateObj.toDateString()
    if (this.dateString !== 'Invalid Date') {
      this.dateValid = true
      console.log('got date', this.dateString, this.eventId);
      var month = this.dateObj.getMonth() + 1
      month = month.toString().length === 1 ? (0 + month.toString()) : month.toString()
      var day = this.dateObj.getDate()
      day = day.toString().length === 1 ? (0 + day.toString()) : day.toString()
      var yearMonthDay = this.dateObj.getFullYear() + '-' + month + '-' + day
      this.timeStart24 = TownHall.toTwentyFour(this.Time)
      // If no ending time, just add 2 hours
      if (timeEnd && timeEnd.split(':').length > 0) {
        this.timeEnd24 = TownHall.toTwentyFour(timeEnd)
      } else {
        var hour = parseInt(this.timeStart24.split(':')[0]) + 2
        this.timeEnd24 = hour + ':' + this.timeStart24.split(':')[1] + ':' + '00'
      }
      this.yearMonthDay = yearMonthDay
      this.dateObj = this.dateObj.getTime()
    } else {
      console.log('no date', this.dateString, this.eventId)
    }
    return this
  }

  TownHall.prototype.isInFuture = function () {
    this.dateObj = new Date(this.Date)
    var now = new Date()
    if (now - this.dateObj < 0) {
      return true
    }
  }

  // geocodes an address
  TownHall.prototype.getLatandLog = function (address, type) {
    var addressQuery = escape(address)
    var addresskey = address.replace(/\W/g, '')
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
          firebasedb.ref('/townHallsErrors/geocoding/' + newTownHall.eventId).set({ eventId: newTownHall.eventId })
        } else {
          newTownHall.lat = r.results[0].geometry.location.lat
          newTownHall.lng = r.results[0].geometry.location.lng
          newTownHall.address = r.results[0].formatted_address.split(', USA')[0]
          addresskey.trim()
          firebasedb.ref('/townHallsErrors/geocoding/' + newTownHall.eventId).remove()
          firebasedb.ref('geolocate/' + type + '/' +  addresskey).set(
            {
              lat: newTownHall.lat,
              lng: newTownHall.lng,
              formatted_address: newTownHall.address,
            })
        }
        newTownHall.finalParsing()
      })
    })
    req.on('error', (e) => {
      console.error('error requests', e, newTownHall.eventId)
      newTownHall.finalParsing()
      firebasedb.ref('/townHallsErrors/geocoding/' + newTownHall.eventId).set({ eventId: newTownHall.eventId })
    })
    req.end()
  }

  // checks firebase for address, if it's not there, calls google geocode
  TownHall.prototype.geoCodeFirebase = function (address, type) {
    var newTownHall = this
    var addresskey = address.replace(/\W/g, '')
    addresskey.trim()
    firebasedb.ref('geolocate/' + type + '/' + addresskey).once('value').then(function (snapshot) {
      if (snapshot.child('lat').exists() === true) {
        newTownHall.lat = snapshot.val().lat
        newTownHall.lng = snapshot.val().lng
        newTownHall.address = snapshot.val().formatted_address
        newTownHall.finalParsing()
      } else if (snapshot.child('lat').exists() === false) {
        firebasedb.ref('/townHallsErrors/geocoding/' + newTownHall.eventId).once('value').then(function (snapID) {
          if (snapID.child('eventId').val() === newTownHall.eventId) {
            console.log('known geocoding problem', newTownHall.eventId)
            newTownHall.finalParsing()
          } else {
            newTownHall.getLatandLog(address, type)
          }
        })
      }
    })
    .catch(function (error) {
      console.log(error)
    })
  }

  TownHall.fetchAllGoogle = function (next) {
    TownHall.allTownHalls = []
    return new Promise(function (resolve, reject) {
      var sheets = google.sheets('v4')
      sheets.spreadsheets.values.get({
        spreadsheetId: '1yq1NT9DZ2z3B8ixhid894e77u9rN5XIgOwWtTW72IYA',
        range: 'Upcoming%20Events!C:T',
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
      console.log();
      if (rowObj.eventId) {
        if (parseInt(rowObj.eventId) | rowObj.eventId[0] === 'x') {
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
    }
    return encodedArray
  }

  TownHall.prototype.isInDatabase = function () {
    var newTownHall = this
    console.log('checking', newTownHall.eventId);
    var ref = firebasedb.ref('/townHallIds/' + newTownHall.eventId)
    ref.once('value', function (snapshot) {
      if (snapshot.exists()) {
        var firebaseUpdate = new Date(snapshot.val().lastUpdated).getTime()
        var googleUpdate = new Date(newTownHall.lastUpdated).getTime()
        // If the google doc timestamp is the same or older, don't update
        if (firebaseUpdate >= googleUpdate || !(googleUpdate)) {
          // console.log('already in database', 'firebase: ', new Date(snapshot.val().lastUpdated),'google: ', new Date(newTownHall.lastUpdated) );
        } else {
          console.log('already in database, but updated', firebaseUpdate, 'google: ', googleUpdate);
          newTownHall.formattAddressQuery()
        }
      } else if (snapshot.child('lat').exists() === false) {
        newTownHall.formattAddressQuery()
      }
    }).catch(function (error) {
      newTownHall.formattAddressQuery()
    })
  }

  TownHall.prototype.formattAddressQuery = function () {
    var newTownHall = this
    var address
    var type
    if (newTownHall.meetingType.slice(0, 4) === 'Tele') {
      newTownHall.meetingType = 'Tele-Town Hall'
      address = newTownHall.State
      type = 'state'
    } else if (newTownHall.streetAddress && newTownHall.streetAddress.length > 2) {
      address = newTownHall.streetAddress + ' ' + newTownHall.City + ' ' + newTownHall.StateAb
      type = "street"
    } else {
      newTownHall.noLoc = true
      address = newTownHall.State
      type = 'state'
    }
    newTownHall.geoCodeFirebase(address, type)
  }

  TownHall.batchCalls = function (response) {
    var chunck = response.splice(0, 10)
    chunck.forEach(function (ele) {
      ele.isInDatabase()
    })
    if (response.length > 0) {
      setTimeout(function () {
        TownHall.batchCalls(response);
      }, 1000);
    } else {
      // When done, update firebase
      console.log('got all data')
      // TownHall.sendEmail
    }
  }
  // TownHall.sendEmail = function (){
  //   sendgrid.send({
  //   to: 'meganrm@gmail.com',
  //   from: 'herokuadmin@townhallproject-86312.iam.gserviceaccount.com',
  //   subject: 'Updated firebase',
  //   text: 'I just updated firebase'
  // }, function(err, json) {
  //   if (err) {
  //     console.error(err);
  //   }
  //   done()
  // });
  // }

  TownHall.fixOldDB = function fixOldDB() {
    firebasedb.ref('/townHallsOld/').once('value').then(function getSnapShot(snapshot) {
      snapshot.forEach(function (townhall) {
        var key = townhall.key
        var ele = new TownHall(townhall.val())
        if (ele.dateObj) {
          if (townhall.val().eventId) {
            var year = new Date(ele.dateObj).getFullYear()
            var month = new Date(ele.dateObj).getMonth()
            var dateKey = year + '-' + month
            console.log(dateKey);
            firebasedb.ref('/townHallsOld/' + dateKey + '/' + ele.eventId).update(ele).then(function(){
              var oldTownHall = firebasedb.ref('/townHallsOld/' + key)
              console.log('removing',  oldTownHall);
              oldTownHall.remove()
            })
          }
        } else {
          if (townhall.val().eventId) {
            dateKey = 'noDate'
            console.log(dateKey);
            firebasedb.ref('/townHallsOld/' + dateKey + '/' + ele.eventId).update(ele).then(function(){
              var oldTownHall = firebasedb.ref('/townHallsOld/' + key)
              console.log('removing',  oldTownHall);
              oldTownHall.remove()
            })
          }
        }
      })
    })
  }

  TownHall.removeOld = function removeOld() {
    var time = Date.now()
    firebasedb.ref('/townHalls/').once('value').then(function getSnapShot(snapshot) {
      snapshot.forEach(function (townhall) {
        var ele = new TownHall(townhall.val())
        if (ele.dateObj && ele.dateObj < time && !ele.repeatingEvent) {
          console.log('old', ele.eventId)
          if (townhall.val().eventId) {
            var year = new Date(ele.dateObj).getFullYear()
            var month = new Date(ele.dateObj).getMonth()
            var dateKey = year + '-' + month
            var oldTownHall = firebasedb.ref('/townHalls/' + ele.eventId)
            var oldTownHallID = firebasedb.ref('/townHallIds/' + ele.eventId)
            firebasedb.ref('/townHallsOld/' + dateKey + '/' + ele.eventId).update(ele)
            oldTownHall.remove()
            oldTownHallID.remove()
          }
        }
      })
    })
  }

  TownHall.prototype.finalParsing = function finalParsing() {
    var newTownHall = this
    newTownHall.validateZone().then(function (returnedTownHall) {
      returnedTownHall.findLinks()
      returnedTownHall.updateFB(returnedTownHall.eventId)
    })
  }

  TownHall.dataProcess = function dataProcess() {
    firebasedb.ref('/lastupdated/time').set(Date.now())
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
  TownHall.removeOld()
  module.exports = TownHall
