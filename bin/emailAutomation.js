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
  User.usersByDistrict = []
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
      privateKey: firebasekey,
      databaseAuthVariableOverride: {
        uid: "read-only"
      }
    }),
    databaseURL: 'https://townhallproject-86312.firebaseio.com'
  });
  
  var firebasedb = admin.database()
  // // admin.database.enableLogging(true)


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



function UserDistricts(users) {
  // console.log(users)
  users.forEach(function(user) {
    var zip = user.postal_addresses[0].postal_code
    firebasedb.ref('zipToDistrict/' + zip).once('value')
    .then(function(snapshot){
      snapshot.forEach(function(ele){
      var currentUser = user;
      var district = ele.val()['abr'] + '-' + ele.val()['dis']

      if (!User.usersByDistrict[district]) {
        User.usersByDistrict[district] = []
      }
      User.usersByDistrict[district].push(user)
      console.log(User.usersByDistrict)
    })
  })

  })
  console.log(User.usersByDistrict)

}


User.getUsers().then(function( returnedData) {
  var people = returnedData['_embedded']['osdi:people']
  for (const key of Object.keys(people)) {
    var user = new User(people[key])
    User.allUsers.push(user)

    }
    }).then(function(){
        UserDistricts(User.allUsers)
      // console.log(User.usersByDistrict)
      // console.log(User.userByDistrict[0])
    })


    // if (user.postal_addresses[0].hasOwnProperty(address_lines)) {
    //   console.log(user.postal_addresses.address_lines);
    // }
   .catch(function(error){
  console.log(error);
});

// firebasedb.ref('zipToDistrict/98122').once('value', function(snapshot){snapshot.forEach(function(ele){
// console.log(ele.val())
// var district = ele.val()['abr'] + '-' + ele.val()['dis']
//       console.log(district)
// })})

  module.exports = User
