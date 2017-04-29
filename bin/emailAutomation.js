#!/usr/bin/env node
  function User(opts) {
    for (keys in opts) {
      this[keys] = opts[keys]
    }
  }

  function Address(opts) {
    for (keys in opts) {
      this[keys] = opts[keys]
    }
  }

  // Global data state
  User.allUsers = []

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
          hostname: 'actionnetwork.org',
          path: '/api/v2/people',
          method: 'GET',
          headers: {
            'OSDI-API-Token': process.env.ACTION_NETWORK_KEY,
            'Content-Type': 'application/json' }
        }
        var str = ''
        var req = https.request(options, (res) => {
          res.setEncoding('utf8')
          res.on('data', (chunk) => {
            str += chunk
            // console.log(chunk);
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


User.getUsers().then(function( returnedData) {
  var people = returnedData['_embedded']['osdi:people']

  for (const key of Object.keys(people)) {
    var user = new User(people[key])
    console.log(user);
    // if (user.postal_addresses[0].hasOwnProperty(address_lines)) {
    //   console.log(user.postal_addresses.address_lines);
    // }
    User.allUsers.push(user)
   }
}).catch(function(error){
  console.log(error);
});


  module.exports = User
