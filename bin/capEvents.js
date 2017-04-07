#!/usr/bin/env node

  function TownHall(opts) {
    for (keys in opts) {
      this[keys] = opts[keys]
    }
  }

  // Global data stete
  TownHall.allTownHalls = []
  TownHall.allTownHallsFB = []
  TownHall.allIdsCap = []
  TownHall.allIdsFirebase = []
  TownHall.lengthOfGoogle

  var https = require('https')
  var admin = require('firebase-admin')
  var google = require('googleapis')

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
  // admin.database.enableLogging(true)

  // writes to townhall, can take a key for update
  TownHall.prototype.updateFB = function (key, path) {
    var newEvent = this
    if (!newEvent.lastUpdated) {
      newEvent.lastUpdated = Date.now()
    }
    var metaData = { eventId: newEvent.eventId, lastUpdated: newEvent.lastUpdated }
    var updates = {}
    updates['/' + path + '/' + key] = newEvent
    updates['/townHallIds/' + key] = metaData
    console.log(`writing ${newEvent.eventId}`);
    return firebasedb.ref().update(updates).catch(function (error) {
      console.log('could not update', newEvent.eventId)
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


  TownHall.prototype.isInFuture = function () {
    this.dateObj = new Date(this.Date)
    var now = new Date()
    if (now - this.dateObj < 0) {
      return true
    }
  }

  TownHall.prototype.isInDatabase = function () {
    var newCapEvent = this
    var ref = firebasedb.ref('/townHallIds/' + newCapEvent.eventId)
    ref.once('value', function (snapshot) {
      if (snapshot.exists()) {
        // var firebaseUpdate = new Date(snapshot.val().lastUpdated).getTime()
        // var capUpdate = new Date(newCapEvent.lastUpdated).getTime()
         var firebaseUpdate = snapshot.val().lastUpdated
         var capUpdate = newCapEvent.lastUpdated ? newCapEvent.lastUpdated : Date.now()
        // If the google doc timestamp is the same or older, don't update
        if (firebaseUpdate !== capUpdate) {
          newCapEvent.updateFB(newCapEvent.eventId, 'capEvents')
        } else {
          // console.log('already in database', firebaseUpdate, 'google: ', capUpdate);
        }
      } else {
        newCapEvent.updateFB(newCapEvent.eventId, 'capEvents')
      }
    }).catch(function (error) {
    })
  }

  TownHall.removeOld = function removeOld() {
      console.log('checking old');
      firebasedb.ref('/capEvents/').once('value').then(function getSnapShot(snapshot) {
        snapshot.forEach(function (townhall) {
          var ele = new TownHall(townhall.val())
          if (TownHall.allIdsCap.indexOf(ele.eventId) < 0) {
            console.log('old', ele.eventId)
            if (townhall.val().eventId) {
              var oldTownHall = firebasedb.ref('/capEvents/' + ele.eventId)
              var oldTownHallID = firebasedb.ref('/townHallIds/' + ele.eventId)
              oldTownHall.remove()
              oldTownHallID.remove()
          }
        }
      })
    })
  }

  TownHall.getCapData = function () {
    return new Promise(function (resolve, reject) {
        var options = {
          hostname: 'www.americanprogressaction.org',
          path: '/content/uploads/thp.extract.json',
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
            resolve(r)
          })
      })
      req.on('error', (e) => {
        console.error('error requests', e)
      })
      req.end()
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

   TownHall.getCapData().then(function (returnedData) {
     for (const key of Object.keys(returnedData)) {
       newCapEvent = new TownHall(returnedData[key])
       TownHall.allIdsCap.push(newCapEvent.eventId)
       newCapEvent.isInDatabase()
     }
   }).then(TownHall.removeOld)

  module.exports = TownHall
