#!/usr/bin/env node
  function TownHall(opts) {
    for (keys in opts) {
      this[keys] = opts[keys]
    }
  }

  // Global data state
  TownHall.townHallbyDistrict = []

  var https = require('https')
  var google = require('googleapis')
  var admin = require('firebase-admin')

  var sendgrid = require('sendgrid')(
    process.env.SENDGRID_USERNAME,
    process.env.SENDGRID_PASSWORD
  )

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


  var api_key = 'key-736af2349a81df7c92ef91cf2a89eb0a';
  var domain = 'sandbox030fd45a82d8484db05cf333ea740ce0.mailgun.org';
  var mailgun = require('mailgun-js')({apiKey: api_key, domain: domain});

  var data = {
    from: 'Excited User <me@sandbox030fd45a82d8484db05cf333ea740ce0.mailgun.org>',
    to: 'meganrm@gmail.com',
    subject: 'Hello',
    text: 'Testing some Mailgun awesomness!'
  };

  mailgun.messages().send(data, function (error, body) {
    console.log('email', body, error);
});


  firebasedb.ref('townHalls').once('value').then(function (snapshot) {
    snapshot.forEach(function(ele) {
      var townhall = ele.val()
      if (townhall.District) {
        if (!TownHall.townHallbyDistrict[townhall.District]) {
          TownHall.townHallbyDistrict[townhall.District] = []
        }
          TownHall.townHallbyDistrict[townhall.District].push(townhall)
      }
    })
  }).then(function(){
    // console.log(TownHall.townHallbyDistrict);
  }).catch(function (error) {
    console.log(error);
  });

  module.exports = TownHall
