#!/usr/bin/env node

String.prototype.toProperCase = function () {
  return this.replace(/\w\S*/g, function(txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
};
// unpacks data from action network
function User(opts) {
  this.firstname = false;
  this.lastname = false;
  this.zip = false;
  this.state = false;
  this.lat = false;
  this.lng = false;
  this.primaryEmail = false;
  if (opts.given_name) {
    this.firstname = opts.given_name.trim().toProperCase();
  }
  if (opts.family_name) {
    this.lastname = opts.family_name.trim().toProperCase();
  }
  if (opts.postal_addresses[0].postal_code) {
    this.zip = opts.postal_addresses[0].postal_code.toString();
  }
  if (opts.postal_addresses[0].region) {
    this.state = opts.postal_addresses[0].region;
  }
  if (opts.postal_addresses[0].location.latitude) {
    this.lat = opts.postal_addresses[0].location.latitude;
  }
  if (opts.postal_addresses[0].location.latitude) {
    this.lat = opts.postal_addresses[0].location.latitude;
    this.lng = opts.postal_addresses[0].location.longitude;
  }
  var primaryEmail = false;
  if (opts.email_addresses) {
    opts.email_addresses.forEach(function(ele){
      if (ele.primary === true && ele.status === 'subscribed') {
        primaryEmail = ele.address;
      }
    });
    this.primaryEmail = primaryEmail;
  }
}


  // Global data state
User.usersByDistrict = {};
User.allUsers = [];
User.sentEmails = [];
User.zipErrors = [];
User.zipsNotInDatabase = [];

var https = require('https');
var admin = require('firebase-admin');
var TownHall = require('../bin/emailAutomation_events.js');
var Distance = require('geo-distance');


// settings for mailgun
var mailgun_api_key = process.env.MAILGUN_API_KEY2;
var domain = 'updates.townhallproject.com';
var mailgun = require('mailgun-js')({apiKey: mailgun_api_key, domain: domain});
var firebasedb = admin.database();

  // admin.database.enableLogging(true)

User.prototype.removeUser = function(){
  var user = this;
  user.districts.forEach(function(district){
    User.usersByDistrict[district] = User.usersByDistrict[district]
    .filter(function(ele){
      return ele.primaryEmail !== user.primaryEmail;
    });
  });
};

// sends email, removes user from group
User.sendEmail = function(user, data){
  mailgun.messages().send(data, function () {
    console.log('sent');
  });
};

User.prototype.userReport =function(){
  var user = this;
  var userTemplate =
  `<div>${user.firstname}, ${user.primaryEmail}, ${user.zip} </div>`;
  return userTemplate;
};

User.composeSummary = function(user) {
  var districtreport = 'Districts with events this week: ';
  for (const key of Object.keys(TownHall.townHallbyDistrict)) {
    districtreport = districtreport + `<li>District ${key}, No. of events: ${TownHall.townHallbyDistrict[key].length}</li>`;
  }
  for (const key of Object.keys(TownHall.senateEvents)) {
    districtreport = districtreport + `<li>District ${key}, No. of events: ${TownHall.senateEvents[key].length}</li>`;
  }
  var badZipsReport = 'Users with bad zips: ';
  User.zipErrors.forEach(function(person){
    badZipsReport = badZipsReport + person.userReport();
  });
  badZipsReport = badZipsReport + 'Zips not in database: ';
  User.zipsNotInDatabase.forEach(function(zip){
    badZipsReport = badZipsReport + `<span>'${zip}', </span>`;
  });

  var data = {
    from: 'Town Hall Updates <update@updates.townhallproject.com>',
    to: 'meganrm@gmail.com',
    cc: 'nwilliams@townhallproject.com',
    subject: 'Sent town hall update emails',
    html: `<p>Sent emails to: ${User.sentEmails.length} people</p> <p>${districtreport}</p><p>${badZipsReport}</p>`,
  };
  User.sendEmail(user, data);
};

User.composeErrorEmail = function(user, error) {
  var data = {
    from: 'Town Hall Updates <update@updates.townhallproject.com>',
    to: 'meganrm@townhallproject.com',
    subject: `Error sending emails`,
    html: `${user} ${error}`,
  };
  User.sendEmail(user, data);
};

// composes email using the list of events
User.prototype.composeEmail = function(district, allevents){
  var username;
  var fullname;
  var user = this;
  if (user.firstname) {
    username = user.firstname;
    if (user.lastname) {
      fullname = `${user.firstname} ${user.lastname}`;
    } else {
      fullname = `${user.firstname}`;
    }
  } else {
    username = 'Friend';
    fullname = '';
  }

  var htmltext = `<body style="color:#1E2528; font-size:14px; line-height: 27px;">Hi ${username} - ` +
  '<p>It looks like there\'s one or more events coming up near you! We hope you can attend the event below and bring as many of your community members as possible to amplify your voice.</p>' +
  '<p><span style="text-decoration: underline;">Please read the event details</span> carefully. Note that not all events feature in-person members of Congress.</p>';
  allevents.forEach(function(townhall){
    var townhallHtml = townhall.emailText();
    htmltext = htmltext + townhallHtml;
  });
  htmltext = htmltext +
              `<small>
                  <div><span style="color:#ff4741">Town Hall</span><span> - A forum where members of Congress give updates on the current affairs of Congress and answer questions from constituents.</span></div>
                  <div><span style="color:#ff4741">Empty Chair Town Hall</span><span> - A citizen-organized town hall held with or without the invited lawmaker.</span></div>
                  <div><span style="color:#ff4741">Tele-Town Hall Meeting</span><span> - A town hall conducted by conference call or online.</span></div>
                  <div><span style="color:#ff4741">Other</span><span> - Other opportunities to engage with members of Congress or their staff. Please read details carefully—events in this category can vary.</span></div>
              </small>`;

  htmltext = htmltext + `<p>Quick notes:</p>
  <ul>
    <li>Not sure what to do at a town hall meeting? Our friends at Indivisible have written a terrific guide which we highly recommend: https://www.indivisibleguide.com/
    </li>
    <li>Bring your friends with you. Forward this email to them and ask them to attend.</li>
    <li>Share your <a href="https://goo.gl/forms/JS1mkhMwgPutm5Fh2">Town Hall Stories</a> with us!</li>
    <li>And if you attend, tweet us pictures at @townhallproject or email them to info@townhallproject.com. We'd love to see and hear how it went.</li>
    <li>If you aren't sure if this is your member of Congress, visit http://www.house.gov/representatives/find/ and enter your address to confirm.</li>
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

  </body>`;

  var subject;
  var today = new Date().getDay();
  if (today === 4) {
    subject = `Upcoming Town Hall events near you`;
  } else {
    subject = `Recently added or updated Town Hall events near you`;
  }

  var data = {
    from: 'Town Hall Updates <update@updates.townhallproject.com>',
    to: `${fullname} <${user.primaryEmail}>`,
    // to: 'Megan Riel-Mehan <meganrm@townhallproject.com>',
    subject: subject,
    html: htmltext,
  };
  data['h:Reply-To']='TownHall Project <info@townhallproject.com>';
  User.sentEmails.push(user.primaryEmail);
  user.removeUser();
  setTimeout(function () {
    console.log('queuing', user.primaryEmail);
    User.sendEmail(user, data);
  }, 1000 * (User.sentEmails.length));
};

User.prototype.checkOtherDistrictEvents = function(district) {
  var allOtherEvents = [];
  var user = this;
  var districts = user.districts;
  districts.splice(user.districts.indexOf(district), 1);
  if (districts.length > 0) {
    districts.forEach(function(otherDistrict){
      if (TownHall.townHallbyDistrict[otherDistrict]) {
        allOtherEvents = allOtherEvents.concat(TownHall.townHallbyDistrict[otherDistrict]);
      }
    });
  }
  return allOtherEvents;
};

// get senate events given we already know the district of a user
User.prototype.getSenateEvents = function() {
  var user = this;
  var state;
  if (user.state) {
    state = user.state;
  } else if (user.districts[0]) {
    state = user.districts[0].split('-')[0];
  }
  state = user.state;
  var senateEvents = [];
  if (TownHall.senateEvents[state]) {
    senateEvents = TownHall.senateEvents[state].reduce(function(acc, cur){
      // if it's a senate phone call, everyone in the state should get the notification
      if (cur.meetingType === 'Tele-Town Hall') {
        acc.push(cur);
      // otherwise only add the event if it's within 50 miles of the person's zip
      } else {
        var dist = Distance.between({ lat: user.lat, lon: user.lng}, { lat: cur.lat, lon: cur.lng});
        if (dist < Distance('80 km')) {
          acc.push(cur);
        }
      }
      return acc;
    }, []);
  }
  return senateEvents;
};

User.getDataForUsers = function() {
  // starting with district events,find all users in district
  // for each user in the group, also get other district and senate events
  // once an email is sent, they'll be removed from the user object
  for (const key of Object.keys(TownHall.townHallbyDistrict)) {
    if (User.usersByDistrict[key]) {
      console.log('sending district emails', key, User.usersByDistrict[key].length);
      User.usersByDistrict[key].forEach(function(user, index){
        if (User.sentEmails.indexOf(user.primaryEmail) > 0 ) {
          console.warn('user already got email', user.primaryEmail);
        } else {
          var allevents = TownHall.townHallbyDistrict[key];
          var otherDistrict = user.checkOtherDistrictEvents(key);
          var senateEvents = user.getSenateEvents();
          allevents = otherDistrict.length > 0? allevents.concat(otherDistrict): allevents;
          allevents = senateEvents.length > 0 ? allevents.concat(senateEvents): allevents;
          user.composeEmail(key, allevents, index);
        }
      });
    }
  }
  // for all senate events, send emails to who haven't already gotten one.
  for (const state of Object.keys(TownHall.senateEvents)) {
    var usersInState = [];
    for (const district of Object.keys(User.usersByDistrict)) {
      if (district.split('-')[0] === state) {
        usersInState = usersInState.concat(User.usersByDistrict[district]);
      }
    }
    console.log('sending senate emails', state, usersInState.length);
    usersInState.forEach(function(user, index){
      if ( User.sentEmails.indexOf(user.primaryEmail) === -1 ) {
        var senateEvents = user.getSenateEvents();
        if (senateEvents.length > 0) {
          user.composeEmail(state, senateEvents, index);
        }
      } else {
        // TODO: this check shouldn't be needed.
        console.warn('user already had a email sent',  user.primaryEmail);
      }

    });
  }
  TownHall.setLastEmailTime();
  User.composeSummary();
};

User.prototype.mergeData = function(duplicate) {
  var user = this;
  for (const key in Object.keys(user)) {
    if (key !== 'districts' && user[key] !== duplicate[key]) {
      if (duplicate[key]) {
        user[key] = duplicate[key];
        console.log('new item', user[key]);
      }
    }
  }
  return user;
};

User.prototype.checkForDup = function(array){
  var user = this;
  var  alreadyInArray = array.reduce(function(acc, cur, index){
    var obj = {};
    if (cur.primaryEmail === user.primaryEmail) {
      obj.indexInMaster = index;
      obj.person = cur;
      acc.push(obj);
    }
    return acc;
  }, []);
  if (alreadyInArray.length > 0 ) {
    console.log('found duplicate', user.primaryEmail);
    alreadyInArray.forEach(function(ele){
      array[ele.indexInMaster] = ele.person.mergeData(user);
    });
  } else {
    array.push(user);
  }
};

// look up a district based on zip
// rejects zips that aren't 5 digits
User.prototype.getDistricts = function(acc, index){
  var user = this;
  var zipMatch = user.zip.match(/\b\d{5}\b/g);
  return new Promise(function (resolve, reject) {
    if (!zipMatch) {
      User.zipErrors.push(user);
      resolve(index);
    } else {
      var zip = zipMatch[0];
      firebasedb.ref('zipToDistrict/' + zip).once('value')
      .then(function (snapshot) {
        if (!snapshot.exists()) {
          if (User.zipsNotInDatabase.indexOf(zip) < 0) {
            User.zipsNotInDatabase.push(zip);
          }
          resolve(index);
        } else {
          user.districts = [];
          snapshot.forEach(function (ele) {
            if (parseInt(ele.val()['dis']) || parseInt(ele.val()['dis']) === 0 ) {
              var district = ele.val()['abr'] + '-' + parseInt(ele.val()['dis']);
              user.districts.push(district);
            } else {
              console.log(ele.val());
              if (User.zipsNotInDatabase.indexOf(zip) < 0) {
                User.zipsNotInDatabase.push(zip);
              }
            }
          });
          user.districts.forEach(function(district){
            if (!acc[district]) {
              acc[district] = [];
            }
            user.checkForDup(acc[district]);
          });
          resolve(index);
        }
      }).catch(function(error){
        User.sendEmail(user, 'zip lookup failed' + error);
        console.error('zip lookup failed', error);
        reject(error);
      });
    }

  });
};

// saves chunk of data, resolves when all the people in the list have been assigned a district
User.makeListbyDistrict = function(peopleList) {
  return new Promise(function(resolve){
    peopleList.forEach(function(ele, index){
      if (!ele.zip) {
        User.zipErrors.push(ele);
        if (index + 1 === peopleList.length) {
          resolve(true);
        } else {
          return;
        }
      }
      ele.getDistricts(User.usersByDistrict, index).then(function(curIndex){
        if (curIndex + 1 === peopleList.length) {
          resolve(true);
        }
      }).catch(function(error){
        User.zipErrors.push(ele);
        console.error('couldnt get district', error);
      });
    });
  });
};

https.globalAgent.maxSockets = Infinity;

// gets users 25 people at a time
User.getUsers = function (path) {
  return new Promise(function (resolve, reject) {
    var options = {
      hostname: 'actionnetwork.org',
      path: path,
      method: 'GET',
      headers: {
        'OSDI-API-Token': process.env.ACTION_NETWORK_KEY,
        'Content-Type': 'application/json' },
    };
    var str = '';
    var req = https.request(options, (res) => {
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        str += chunk;
      });
      res.on('end', () => {
        var r = JSON.parse(str);
        if (r) {
          resolve(r);
        } else {
          reject('no users');
        }
      });
    });
    req.on('error', (e) => {
      console.error('error requests', e);
    });
    req.end();
  });
};

User.getAllUsers = function(page){
  // first time call page will not be defined
  var basepath = '/api/v2/people';
  var path = page ? basepath + page : basepath;
  // get 25 users, then add them to the object under their district
  User.getUsers(path).then(function(returnedData) {
    var people = returnedData['_embedded']['osdi:people'];
    var peopleList = [];
    for (const key of Object.keys(people)) {
      var user = new User(people[key]);
      if (user.primaryEmail) {
        peopleList.push(user);
      }
    }
    if (peopleList.length === 0) {
      User.getDataForUsers();
      return;
    }
    User.makeListbyDistrict(peopleList).then(function(){
      // if no more new pages, or we set a break point for testing
      if (!returnedData['_links']['next']) {
        console.log('got all data');
        User.getDataForUsers();
      }  else {
        var nextPage = returnedData['_links']['next']['href'].split('people')[1];
        console.log(nextPage);
        User.getAllUsers(nextPage);
      }
    }).catch(function(error){
      console.error(error);
      User.sendEmail('making people list ', error);
    });
  }).catch(function(error){
    console.error(error);
    User.sendEmail('get users error', error);
  });
};


TownHall.getLastSent().then(function(lastUpdated){
  TownHall.getAll(lastUpdated).then(function(){
    console.log('got events');
    // enter '?page=200' if you want to start at specific page
    User.getAllUsers();
  });
});

module.exports = User;
