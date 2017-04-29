#!/usr/bin/env node

  function User(opts) {
    for (keys in opts) {
      this[keys] = opts[keys]
    }
  }

  // Global data state

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


  User.getUsers = function () {
    return new Promise(function (resolve, reject) {
        var options = {
          hostname: 'https://actionnetwork.org',
          path: `/api/${process.env.ACTION_NETWORK_KEY}/people`,
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
            console.log(r);
            // resolve(r)
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

User.getUsers();
  //  TownHall.getCapData().then(function (returnedData) {
  //    for (const key of Object.keys(returnedData)) {
  //      newCapEvent = new TownHall(returnedData[key])
  //      TownHall.allIdsCap.push(newCapEvent.eventId)
  //      newCapEvent.isInDatabase()
  //    }
  //  }).then(TownHall.removeOld)

  module.exports = TownHall
