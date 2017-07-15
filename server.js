var express = require('express'),
  // NOTE: require in our request proxy module
  // requestProxy = require('express-request-proxy'),
  port = process.env.PORT || 3000,
  app = express();

// var https = require('https');
// var users = require('../bin/emailAutomation_users.js');

app.use(express.static('./'));

app.get('*', function(request, response) {
  console.log('New request:', request.url);
  response.sendFile('index.html', { root: '.' });
});

app.listen(port, function() {
  console.log('Server started on port ' + port + '!');
});

// settings for mailgun
var mailgun_api_key = process.env.MAILGUN_API_KEY2;
var domain = 'updates.townhallproject.com';
var mailgun = require('mailgun-js')({apiKey: mailgun_api_key, domain: domain});


var admin = require('firebase-admin');
var firebasekey = process.env.FIREBASE_TOKEN.replace(/\\n/g, '\n');

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: 'townhallproject-86312',
    clientEmail: 'herokuadmin@townhallproject-86312.iam.gserviceaccount.com',
    privateKey: firebasekey
  }),
  databaseURL: 'https://townhallproject-86312.firebaseio.com'
});

var firebasedb = admin.database();


firebasedb.ref('townHalls/').on('child_added', function(snapshot){
  var townhall = snapshot.val();
  if (townhall.userID) {
    firebasedb.ref(`users/${townhall.userID}`).once('value', function(usersnap){
      var user = usersnap.val();
      if (user[townhall.eventId] !== 'sent') {
        var data = {
          from: 'Town Hall Updates <update@updates.townhallproject.com>',
          to: `${townhall.enteredBy}`,
          subject: 'Event approved',
          html: `
          <p>Thank you for your event submission to Town Hall Project. We have approved your event:</p>
          <ul>
            <li>Member of Congress: ${townhall.Member}</li>
            <li>Date: ${townhall.Date}</li>
            <li>Time: ${townhall.Time}</li>
            <li>Location: ${townhall.Location}</li>
            <li>Address: ${townhall.address}</li>
          </ul>
          <p>Your event is now live on townhallproject.com. Keep up the great work!</p>
          <br>
          <br>
          <br>
          <br>
          <footer><p><a href="%tag_unsubscribe_url%">Click to stop getting email updates about your submitted events</a></p></footer>`
        };
        data['h:Reply-To']='TownHall Project <info@townhallproject.com>';
        data['o:tag']='researcher-update';
        mailgun.messages().send(data, function () {
          console.log('sent email');
          firebasedb.ref(`users/${townhall.userID}/${townhall.eventId}`).set('sent');
        });
      }
    });
  }
});

firebasedb.ref('deletedTownHalls/').on('child_added', function(snapshot){
  var key = snapshot.key;
  var metaData = snapshot.val();
  var townhall = metaData.townHall;
  var reason = metaData.reason;
  var user = metaData.user;
  var data = {
    from: 'Town Hall Updates <update@updates.townhallproject.com>',
    to: `${user}`,
    cc: 'meganrm@townhallproject.com',
    subject: 'Event was not approved',
    html: `
    <p>Thank you for your event submission to Town Hall Project. We were not able to approve your event for the following reason: <br>${reason}</p>
    <ul>
      <li>Member of Congress: ${townhall.Member}</li>
      <li>Date: ${townhall.Date}</li>
      <li>Time: ${townhall.Time}</li>
      <li>Location: ${townhall.Location}</li>
      <li>Address: ${townhall.address}</li>
    </ul>
    <p>Feel free to re-submit when you have corrections and/or additional info. Or contact info@townhallproject.com. Thank you for your hard work!</p>
    <br>
    <br>
    <br>
    <br>
    <footer><p><a href="%tag_unsubscribe_url%">Click to stop getting email updates about your submitted events</a></p></footer>`
  };
  data['h:Reply-To']='TownHall Project <info@townhallproject.com>';
  data['o:tag']='researcher-update';
  mailgun.messages().send(data, function () {
    oldTownHall = firebasedb.ref(`deletedTownHalls/${key}`).remove();
    if (oldTownHall) {
      console.log('sent email, removed record');
    }
  });
});
