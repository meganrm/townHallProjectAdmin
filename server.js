const mailgun_api_key = process.env.MAILGUN_API_KEY2;
const domain = 'updates.townhallproject.com';

const firebasedb = require('./server/lib/setupFirebase.js');
const eventValid = require('./server/eventValidation.js');

let mailgun;
if (process.env.NODE_ENV==='production'){
  mailgun = require('mailgun-js')({apiKey: mailgun_api_key, domain: domain});
}

const express = require('express'),
  port = process.env.PORT || 3000,
  app = express();

app.use(express.static('./'));

app.get('*', function(request, response) {
  console.log('New request:', request.url);
  response.sendFile('index.html', { root: '.' });
});

app.listen(port, function() {
  console.log('Server started on port ' + port + '!');
});

if (process.env.NODE_ENV === 'production') {
  eventValid();
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
              <li>Lawmaker: ${townhall.Member}</li>
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
            <footer><p><a href="%tag_unsubscribe_url%">Click to stop getting email updates about your submitted events</a></p></footer>`,
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
        <li>Lawmaker: ${townhall.Member}</li>
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
      <footer><p><a href="%tag_unsubscribe_url%">Click to stop getting email updates about your submitted events</a></p></footer>`,
    };
    data['h:Reply-To']='TownHall Project <info@townhallproject.com>';
    data['o:tag']='researcher-update';
    mailgun.messages().send(data, function () {
      var oldTownHall = firebasedb.ref(`deletedTownHalls/${key}`).remove();
      if (oldTownHall) {
        console.log('sent email, removed record');
      }
    });
  });
}

///Checks for changes on MOC in mocData to remove members from mocByStateDistrict when in_office is false
  firebasedb.ref('mocData/').on('child_changed', function(snapshot){
    var path;
    var district;
    var changedMoc = snapshot.val();
    if (changedMoc.in_office === false){
      if(changedMoc.type === 'sen'){
        path = `mocByStateDistrict/${changedMoc.state}/${changedMoc.state_rank}`;
      } else if(changedMoc.type === 'rep') {
        district = changedMoc.at_large ? '00' : '0' + changedMoc.district;
        path = `mocByStateDistrict/${changedMoc.state}-${district}/`;
      } else { console.log('No Moc Type');}
      firebasedb.ref(path).on('value', function(snapshot){
        let moc = snapshot.val();
        if(moc.govtrack_id === changedMoc.govtrack_id){
          console.log('This MOC will be deleted: ', moc); 
          firebasedb.ref(path).set({
            displayName: false,
            govtrack_id: false,
            propublica_id: false
          })
        }
      })
    }
  });