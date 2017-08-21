var express = require('express'),
  // NOTE: require in our request proxy module
  // requestProxy = require('express-request-proxy'),
  port = process.env.PORT || 3000,
  app = express();

// var https = require('https');

app.use(express.static('./'));

app.get('*', function(request, response) {
  console.log('New request:', request.url);
  response.sendFile('index.html', { root: '.' });
});

var Partner = require('./bin/eventScraping.js');

app.listen(port, function() {
  console.log('Server started on port ' + port + '!');
});

// settings for mailgun
var mailgun_api_key = process.env.MAILGUN_API_KEY2;
var domain = 'updates.townhallproject.com';
var mailgun = require('mailgun-js')({apiKey: mailgun_api_key, domain: domain});
var moment = require('moment');
// var firebasedb = require('./bin/setupFirebase.js');
var request = require('request');
var errorReport = require('./bin/errorReporting.js');

// IndTownHall.prototype.submitEvent = function submitEvent(eventID) {
//   var townHall = this;
//   var user = process.env.ACTION_KIT_USERNAME;
//   var password = process.env.ACTION_KIT_PASS;
//   var url = 'https://act.indivisibleguide.com/rest/v1/action/';
//   // var data = JSON.stringify(townHall);
//   request.post(
//       url,
//     {
//       json: townHall,
//       auth:
//       {"user" : user,
//         "pass" : password,
//       }
//     },
//       function (error, response, body) {
//         if (!error && response.statusCode == 201) {
//           var path = body['event'].toString();
//           firebasedb.ref(`townHallIds/${eventID}`).update({indivisiblepath : path});
//           firebasedb.ref(`townHalls/${eventID}`).update({indivisiblepath : path});
//         }
//         if (error) {
//           errorEmail = new errorReport(error);
//           errorEmail.sendEmail();
//         }
//       });
// };
//
// function IndTownHall(cur) {
//   var address,
//     zip,
//     city;
//   if (cur.address) {
//     var addList = cur.address.split(', ');
//     if (addList[addList.length - 1] === 'United States') {
//       addList.splice(addList.length - 1);
//     }
//
//     zip = addList[addList.length - 1].split(' ')[1];
//     city = addList[addList.length - 2];
//     addList.splice(addList.length - 2, 2);
//     address = addList.join(', ');
//   }
//   this.event_title;
//   var prefix;
//   if (cur.District === 'Senate') {
//     prefix = 'Sen.';
//   } else {
//     prefix = 'Rep.';
//   }
//   if (cur.iconFlag === 'staff') {
//     this.event_title = 'Staff Office Hours: ' + cur.Member + ' (' + cur.District + ')';
//   } else if (cur.meetingType === 'Other') {
//     this.event_title = prefix + ' ' + cur.Member + ' (' + cur.District + ') ';
//   } else {
//     this.event_title = prefix + ' ' + cur.Member + ' (' + cur.District + ') ' + cur.meetingType;
//   }
//   this.event_starts_at_date = moment(cur.dateObj).format('L');
//   this.event_starts_at_time = cur.Time.split(' ')[0];
//   this.event_starts_at_ampm = cur.Time.split(' ')[1].toLowerCase();
//   this.event_venue = cur.Location ? cur.Location: ' ';
//   this.event_address1 = address;
//   this.event_host_ground_rules = '1';
//   this.event_host_requirements = '1';
//   this.event_city = city;
//   this.event_postal = zip;
//   this.email = 'field@indivisibleguide.com';
//   this.name = 'MoC';
//   this.event_public_description = cur.eventName ? cur.eventName : cur.Notes;
//   this.event_public_description = this.event_public_description ? this.event_public_description: this.event_title;
//   this.action_meeting_type = cur.meetingType;
//   if (cur.link) {
//     this.action_link_to_event_information = cur.link;
//   } else {
//     this.action_link_to_event_information = 'https://townhallproject.com/?eventId=' + cur.eventId;
//   }
//   this.page = 'register-event-august-recess_townhalls';
//   this.campaign = '/rest/v1/campaign/9/';
// }
//
// IndTownHall.prepTownHall = function(townhall){
//   if (!townhall.repeatingEvent && townhall.meetingType != 'Tele-Town Hall' && moment(townhall.dateObj).isAfter() && townhall.meetingType !=='Tele-town Hall') {
//     obj = new IndTownHall(townhall);
//     if (obj.event_address1 ) {
//       obj.submitEvent(townhall.eventId);
//     }
//   }
// };
//
// firebasedb.ref('townHalls/').on('child_added', function(snapshot){
//   var townhall = snapshot.val();
//   firebasedb.ref(`townHallIds/${townhall.eventId}`).once('value').then(function(ele){
//     var idObj = ele.val();
//     if (!idObj) {
//       console.log('no id');
//     }
//     if (idObj && !idObj.indivisiblepath) {
//       IndTownHall.prepTownHall(townhall);
//     } else {
//       console.log('already added');
//     }
//   });
//
//   if (townhall.userID) {
//     firebasedb.ref(`users/${townhall.userID}`).once('value', function(usersnap){
//       var user = usersnap.val();
//       if (user[townhall.eventId] !== 'sent') {
//         var data = {
//           from: 'Town Hall Updates <update@updates.townhallproject.com>',
//           to: `${townhall.enteredBy}`,
//           subject: 'Event approved',
//           html: `
//           <p>Thank you for your event submission to Town Hall Project. We have approved your event:</p>
//           <ul>
//             <li>Member of Congress: ${townhall.Member}</li>
//             <li>Date: ${townhall.Date}</li>
//             <li>Time: ${townhall.Time}</li>
//             <li>Location: ${townhall.Location}</li>
//             <li>Address: ${townhall.address}</li>
//           </ul>
//           <p>Your event is now live on townhallproject.com. Keep up the great work!</p>
//           <br>
//           <br>
//           <br>
//           <br>
//           <footer><p><a href="%tag_unsubscribe_url%">Click to stop getting email updates about your submitted events</a></p></footer>`
//         };
//         data['h:Reply-To']='TownHall Project <info@townhallproject.com>';
//         data['o:tag']='researcher-update';
//         mailgun.messages().send(data, function () {
//           console.log('sent email');
//           firebasedb.ref(`users/${townhall.userID}/${townhall.eventId}`).set('sent');
//         });
//       }
//     });
//   }
// });
//
// firebasedb.ref('deletedTownHalls/').on('child_added', function(snapshot){
//   var key = snapshot.key;
//   var metaData = snapshot.val();
//   var townhall = metaData.townHall;
//   var reason = metaData.reason;
//   var user = metaData.user;
//   var data = {
//     from: 'Town Hall Updates <update@updates.townhallproject.com>',
//     to: `${user}`,
//     cc: 'meganrm@townhallproject.com',
//     subject: 'Event was not approved',
//     html: `
//     <p>Thank you for your event submission to Town Hall Project. We were not able to approve your event for the following reason: <br>${reason}</p>
//     <ul>
//       <li>Member of Congress: ${townhall.Member}</li>
//       <li>Date: ${townhall.Date}</li>
//       <li>Time: ${townhall.Time}</li>
//       <li>Location: ${townhall.Location}</li>
//       <li>Address: ${townhall.address}</li>
//     </ul>
//     <p>Feel free to re-submit when you have corrections and/or additional info. Or contact info@townhallproject.com. Thank you for your hard work!</p>
//     <br>
//     <br>
//     <br>
//     <br>
//     <footer><p><a href="%tag_unsubscribe_url%">Click to stop getting email updates about your submitted events</a></p></footer>`
//   };
//   data['h:Reply-To']='TownHall Project <info@townhallproject.com>';
//   data['o:tag']='researcher-update';
//   mailgun.messages().send(data, function () {
//     oldTownHall = firebasedb.ref(`deletedTownHalls/${key}`).remove();
//     if (oldTownHall) {
//       console.log('sent email, removed record');
//     }
//   });
// });
