#!/usr/bin/env node

// unpacks data from action network
  function User(opts) {
    if (opts.given_name && opts.family_name) {
      this.fullname = `${opts.given_name} ${opts.family_name}`
    }
    this.zip = opts.postal_addresses[0].postal_code;
    this.state = opts.postal_addresses[0].region;
    this.lat = opts.postal_addresses[0].location.latitude;
    this.lng = opts.postal_addresses[0].location.longitude;
    var sendEmail
    opts.email_addresses.forEach(function(ele){
      if (ele.primary === true && ele.status === 'subscribed') {
        sendEmail = ele.address
      }
    })
    this.sendEmail = sendEmail
  }

  // Global data state
  User.usersByDistrict = {}
  User.allUsers = []

  var https = require('https')
  var admin = require('firebase-admin')
  var google = require('googleapis')
  var TownHall = require('../bin/emailAutomation_events.js')
  var Distance = require('geo-distance')

// settings for mailgun
  var mailgun_api_key = process.env.MAILGUN_API_KEY2;
  var domain = 'updates.townhallproject.com';
  var mailgun = require('mailgun-js')({apiKey: mailgun_api_key, domain: domain});
  var firebasedb = admin.database()

  // admin.database.enableLogging(true)

// gets users 25 people at a time
  User.getUsers = function (path) {
    return new Promise(function (resolve, reject) {
      var options = {
        hostname: 'actionnetwork.org',
        path: path,
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

// get senate events given we already know the district of a user
  User.prototype.getSenateEvents = function(district) {
    var state = district.split('-')[0]
    var user = this
    if (TownHall.senateEvents[state]) {
      var senateEvents = TownHall.senateEvents[state].reduce(function(acc, cur){
        // if it's a senate phone call, everyone in the state should get the notification
        if (cur.meetingType === 'Tele-Town Hall') {
          acc.push(cur)
        // otherwise only add the event if it's within 50 miles of the person's zip
        } else {
          var dist = Distance.between({ lat: user.lat, lon: user.long }, { lat: cur.lat, lon: cur.long })
          if (dist < Distance('80 km')) {
            acc.push(cur)
          }
        }
        return acc;
      }, [])
      return senateEvents
    }
  }

  // sends email
  User.sendEmail = function(user, data){
    mailgun.messages().send(data, function (error, body) {
      User.usersByDistrict[user.district] = User.usersByDistrict[user.district].filter(function(ele){
        return ele.fullname !== user.fullname
      })
    })
  }

  // composes email using the list of events
  User.prototype.composeEmail = function(district, events, senateEvents){
    var username
    var user = this;
    if (user.fullname) {
      username = user.fullname
    } else {
      username = 'Friend'
    }
    var htmltext = `<body style="color:#1E2528; font-size:14px; line-height: 27px;">Hi ${username} - ` +
    '<p>It looks like there\'s one or more Town Hall events coming up near you! We hope you can attend the event below and bring as many of your community members as possible to amplify your voice. </p>' +
    '<p>There is no better way to influence your representatives than in-person conversations. Town halls are a longstanding American tradition--where our elected representatives must listen and respond to the concerns of their constituents. <strong>Remember: you are their boss.</strong></p>'
    events.forEach(function(townhall){
      var townhallHtml = townhall.emailText()
      htmltext = htmltext + townhallHtml
    })
    if (senateEvents) {
      senateEvents.forEach(function(townhall){
        var townhallHtml = townhall.emailText()
        htmltext = htmltext + townhallHtml
      })
    }

    htmltext = htmltext + `<p>Quick notes:</p>
      <ul>
      <li>Not sure what to do at a town hall meeting? Our friends at Indivisible have written a terrific guide which we highly recommend: https://www.indivisibleguide.com/
      </li>
      <li>Bring your friends with you. Forward this email to them and ask them to attend.</li>
      <li>Share your <a href="https://goo.gl/forms/JS1mkhMwgPutm5Fh2">Town Hall Stories</a> with us!</li>
      <li>And if you attend, tweet us pictures at @townhallproject or email them to info@townhallproject.com. We’d love to see and hear how it went.</li>
      <li>If you aren’t sure if this is your member of Congress, visit http://www.house.gov/representatives/find/ and enter your address to confirm.</li>
    </ul>
    <p>Thank you for your support. <strong>Stand up. Speak out.</strong></p>

    <p>Nathan</p>
    <section style="line-height: 16px; margin-bottom:25px;">
    Nathan Williams<br>
    Managing Director<br>
    Town Hall Project<br>
    townhallproject.com<br>
    </section>
    <p style="text-align:center"><a href="https://secure.actblue.com/contribute/page/townhallprojectemail">Donate here</a></p>
    <footer style="line-height:14px; font-size: 12px;">
    <p>(Paid for by Town Hall Project. All donations to THP are not tax-deductible but help us keep this vital resource sustainable in the months ahead.)</p>
    <small style="font-size: 10px; line-height:12px;">*Compiled by Town Hall Project volunteers. All efforts are made to verify accuracy of events. Event details can change at short notice, please contact your representative to confirm.<small><br>
    </footer>

    </body>`

    var data = {
      from: 'Town Hall Updates <update@updates.townhallproject.com>',
      to: 'meganrm@gmail.com',
      subject: `${district} Town Hall events this week`,
      html: htmltext
    };
    User.sendEmail(user, data)
  }

  // saves chunk of data, resolves when all the people in the list have been assigned a district
  User.makeListbyDistrict = function(peopleList) {
    return new Promise(function(resolve, reject){
      peopleList.forEach(function(ele){
        ele.getDistricts(User.usersByDistrict).then(function(){
          if (peopleList.indexOf(ele) + 1 === peopleList.length) {
            resolve(true)
          }
        }).catch(function(error){
          console.log('zip was wrong', error);
        })
      })
    })
  }

  User.getAllUsers = function(page){
    // first time call page will not be defined
    var basepath = '/api/v2/people'
    var path
    if (page) {
      path = basepath + page
    } else {
      path = basepath
    }
    // get 25 users, then add them to the object under their district
    User.getUsers(path).then(function(returnedData) {
      var people = returnedData['_embedded']['osdi:people']
      var peopleList = []
      for (const key of Object.keys(people)) {
        var user = new User(people[key])
        if (user.sendEmail) {
          peopleList.push(user)
        }
      }
      User.makeListbyDistrict(peopleList).then(function(done){
        console.log('done', done);
        if (returnedData['_links']['next']) {
          var nextPage = returnedData['_links']['next']['href'].split('people')[1]
          console.log(nextPage);
          if (nextPage === '?page=2') {
            // go through all district grouping of events, and send emails
            // TODO: go through all senate events too.
              for (const key of Object.keys(TownHall.townHallbyDistrict)) {
                if (User.usersByDistrict[key]) {
                  User.usersByDistrict[key].forEach(function(user){
                    var senateEvents = user.getSenateEvents(key)
                    user.composeEmail(key, TownHall.townHallbyDistrict[key], senateEvents)
                  })
                  // console.log(key, User.usersByDistrict[key]);
                }
              }
          } else {
            User.getAllUsers(nextPage)
          }
        }
        // TODO: actually load all data when done testing
        // else {
        //   console.log('got all data');
        //   User.makeListbyDistrict()
        // }
      })
    })
  }

  // look up a district based on zip
  // rejects zips that aren't 5 digits
  User.prototype.getDistricts = function(acc){
    var user = this;
    var zip = user.zip;
    return new Promise(function (resolve, reject) {
      if (!zip.match(/\b\d{5}\b/g)) {
        reject(zip)
      }
      firebasedb.ref('zipToDistrict/' + zip).once('value')
      .then(function (snapshot) {
        snapshot.forEach(function (ele) {
          var district = ele.val()['abr'] + '-' + parseInt(ele.val()['dis']);
          user.district = district
          if (!acc[district]) {
            acc[district] = []
          }
          acc[district].push(user)
        });
        resolve(acc)
      }).catch(function(error){
        console.log('zip lookup failed', user, (error))
      })
    })
  }

  User.getAllUsers()
  module.exports = User
