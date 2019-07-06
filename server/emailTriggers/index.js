const mailgun_api_key = process.env.MAILGUN_API_KEY2;
const domain = 'updates.townhallproject.com';

const firebasedb = require('../lib/setupFirebase.js');

let mailgun;

function getUserId(townHall) {
    if (townHall.userID && townHall.enteredBy.includes('@')) {
        return townHall.userID;
    }
    if (townHall.enteredBy && townHall.enteredBy.includes('@')) {
        return;
    }
    return townHall.enteredBy;
}

const emailConfirmation = (townHall) => {
    if (process.env.NODE_ENV !== 'production') {
        return;
    }
    const mailgun = require('mailgun-js')({
        apiKey: mailgun_api_key,
        domain: domain,
    });
    const userId = getUserId(townHall);
    if (userId) {
        firebasedb.ref(`users/${userId}`).once('value', function (usersnap) {
            var user = usersnap.val();
            const { eventId } = townHall;
            if (user.events && user.events[eventId] && !user.events[eventId].email_sent) {
                var data = {
                    from: 'Town Hall Updates <update@updates.townhallproject.com>',
                    to: `${user.email}`,
                    subject: 'Event approved',
                    html: `
            <p>Thank you for your event submission to Town Hall Project. We have approved your event:</p>
            <ul>
            <li>Lawmaker: ${townHall.displayName}</li>
            <li>Date: ${townHall.dateString}</li>
            <li>Time: ${townHall.Time}</li>
            <li>Location: ${townHall.Location}</li>
            <li>Address: ${townHall.address}</li>
            </ul>
            <p>Your event is now live on townhallproject.com. Keep up the great work!</p>
            <br>
            <br>
            <br>
            <br>
            <footer><p><a href="%tag_unsubscribe_url%">Click to stop getting email updates about your submitted events</a></p></footer>`,
                };
                data['h:Reply-To'] = 'TownHall Project <info@townhallproject.com>';
                data['o:tag'] = 'researcher-update';
                mailgun.messages().send(data, function () {
                    console.log('sent email');
                    firebasedb.ref(`users/${userId}/events/${townHall.eventId}`).update({ email_sent: true });
                });
            }
        });
    }
};

const emailEventRejection = () =>{
    firebasedb.ref('deletedTownHalls/').on('child_added', function (snapshot) {
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
            <li>Lawmaker: ${townhall.displayName}</li>
            <li>Date: ${townhall.dateString}</li>
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
        data['h:Reply-To'] = 'TownHall Project <info@townhallproject.com>';
        data['o:tag'] = 'researcher-update';
        mailgun.messages().send(data, function () {
            var oldTownHall = firebasedb.ref(`deletedTownHalls/${key}`).remove();
            if (oldTownHall) {
                console.log('sent email, removed record');
            }
        });
    });
};

module.exports = {
    emailConfirmation,
    emailEventRejection,
};
