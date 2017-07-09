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
          to: 'meganrm@gmail.com',
          subject: 'Event approved',
          html: `<p>Send to ${townhall.enteredBy} </p>
          <p>The event you submitted was approved and is now live on townhallproject.com. Thank you so much for your work.</p>
          <ul>
            <li>Member of Congress: ${townhall.Member}</li>
            <li>Date: ${townhall.Date}</li>
            <li>Time: ${townhall.Time}</li>
            <li>Location: ${townhall.Location}</li>
            <li>Address: ${townhall.address}</li>
          </ul>
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
