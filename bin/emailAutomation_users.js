#!/usr/bin/env node

// unpacks data from action network
  function User(opts) {
    if (opts.given_name) {
      this.fullname = opts.given_name
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
  User.sentEmails = []

  var https = require('https')
  var admin = require('firebase-admin')
  var TownHall = require('../bin/emailAutomation_events.js')
  var Distance = require('geo-distance')


// settings for mailgun
  var mailgun_api_key = process.env.MAILGUN_API_KEY2;
  var domain = 'updates.townhallproject.com';
  var mailgun = require('mailgun-js')({apiKey: mailgun_api_key, domain: domain});
  var firebasedb = admin.database()

  // admin.database.enableLogging(true)

  User.prototype.removeUser = function(){
    var user = this
    user.districts.forEach(function(district){
      User.usersByDistrict[district] = User.usersByDistrict[district]
      .filter(function(ele){
        return ele.sendEmail !== user.sendEmail
      })
    })
  }

  // sends email, removes user from group
  User.sendEmail = function(user, data){
    mailgun.messages().send(data, function (error, body) {
    })
  }

  // composes email using the list of events
  User.prototype.composeEmail = function(district, allevents){
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
    allevents.forEach(function(townhall){
      var townhallHtml = townhall.emailText()
      htmltext = htmltext + townhallHtml
    })

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
      subject: `Town Hall events this week near you`,
      html: htmltext
    };
    User.sentEmails.push(user.sendEmail)
    user.removeUser()
    // User.sendEmail(user, data)
  }

  User.prototype.checkOtherDistrictEvents = function(district) {
    var allOtherEvents = []
    var user = this
    var districts = user.districts
    districts.splice(user.districts.indexOf(district), 1)
    if (districts.length > 0) {
      districts.forEach(function(otherDistrict){
        if (TownHall.townHallbyDistrict[otherDistrict]) {
          allOtherEvents = allOtherEvents.concat(TownHall.townHallbyDistrict[otherDistrict])
        }
      })
    }
    console.log('number other district events', allOtherEvents.length, user.sendEmail);
    return allOtherEvents
  }

  // get senate events given we already know the district of a user
  User.prototype.getSenateEvents = function() {
    var user = this
    var state
    if (user.state) {
      state = user.state
    } else if (user.districts[0]) {
      state = user.districts[0].split('-')[0]
    }
    var state = user.state
    var senateEvents = []
    if (TownHall.senateEvents[state]) {
      senateEvents = TownHall.senateEvents[state].reduce(function(acc, cur){
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
      console.log('number of senate events', senateEvents.length, this.sendEmail);
    }
    return senateEvents
  }

  User.getDataForUsers = function() {
    // starting with district events,find all users in district
    // for each user in the group, also get other district and senate events
    // once an email is sent, they'll be removed from the user object
    for (const key of Object.keys(TownHall.townHallbyDistrict)) {
      if (User.usersByDistrict[key]) {
        User.usersByDistrict[key].forEach(function(user){
          if (User.sentEmails.indexOf(user.sendEmail) > 0) {
              console.log('user already got email', user.sendEmail);
          } else {
            var allevents = TownHall.townHallbyDistrict[key]
            console.log('starting', user.sendEmail, key, allevents.length);
            var otherDistrict = user.checkOtherDistrictEvents(key)
            var senateEvents = user.getSenateEvents()
            allevents = otherDistrict.length > 0? allevents.concat(otherDistrict): allevents
            allevents = senateEvents.length > 0 ? allevents.concat(senateEvents): allevents
            console.log('final length', allevents.length);
            user.composeEmail(key, allevents)
          }
        })
      }
    }
    // for all senate events, send emails to who haven't already gotten one.
    for (const state of Object.keys(TownHall.senateEvents)) {
      var usersInState = []
      for (const district of Object.keys(User.usersByDistrict)) {
        if (district.split('-')[0] === state) {
          usersInState = usersInState.concat(User.usersByDistrict[district])
        }
      }
      usersInState.forEach(function(user){
        if ( User.sentEmails.indexOf(user.sendEmail) === -1 ) {
          console.log('has only senate events', state, user.sendEmail);
          var senateEvents = user.getSenateEvents()
            if (senateEvents.length > 0) {
              user.composeEmail(state, senateEvents)
            }
        } else {
          // TODO: this check shouldn't be needed.
          console.log('user already had a email sent',  user.sendEmail);
        }

      })
    }
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
        user.districts = []
        snapshot.forEach(function (ele) {
          var district = ele.val()['abr'] + '-' + parseInt(ele.val()['dis']);
          user.districts.push(district)
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

  User.getAllUsers = function(page){
    // first time call page will not be defined
    var basepath = '/api/v2/people'
    var path = page ? basepath + page : basepath
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
        // if no more new pages, or we set a break point for testing
        if (!returnedData['_links']['next'] || returnedData['_links']['next']['href'].split('people')[1] === '?page=50') {
          console.log('got all data');
          User.getDataForUsers()
        }  else {
          var nextPage = returnedData['_links']['next']['href'].split('people')[1]
          console.log(nextPage);
          User.getAllUsers(nextPage)
        }
      })
    })
  }

  User.getAllUsers()
  module.exports = User
