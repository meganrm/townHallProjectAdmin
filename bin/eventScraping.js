#!/usr/bin/env node
var admin = require('firebase-admin');
var https = require('https');
var request = require('request-promise'); // NB:  This is isn't the default request library!

var eventBriteToken = process.env.EVENTBRITE_TOKEN;
var facebookToken = process.env.FACEBOOK_TOKEN;
var firebaseKey = process.env.FIREBASE_TOKEN.replace(/\\n/g, '\n');

admin.initializeApp({
	credential: admin.credential.cert({
	  projectId: 'townhallproject-86312',
	  clientEmail: 'herokuadmin@townhallproject-86312.iam.gserviceaccount.com',
	  privateKey: firebaseKey
	}),
	databaseURL: 'https://townhallproject-86312.firebaseio.com'
});

var firebasedb = admin.database();
admin.database.enableLogging(true);

// Get list of existing townhalls so we don't submit duplicates
var existingTownHallIds = [];
firebasedb.ref('/towhHallIDs/').once('value').then(function(snapshot){
	// TODO:  Change this to actual map
	existingTownHallIds.push(...snapshot.val().map(event => event.id));
	getTownhalls();
});

function getTownhalls() {
	firebase.database().ref('mocData/').once('value').then((snapshot) => {
		getFacebookEvents(snapshot.val())
	});
}

function getFacebookEvents(MoCs) {
	var facebookPromises = [];
	var startDate = Math.floor(new Date() / 1000); //Needs to be in Unix timestamp form
	Object.keys(MoCs).forEach(id => {
		let MoC = MoCs[id];
		if (MoC.hasOwnProperty('facebook') && MoC.facebook) {
			createFacebookQuery(MoC.facebook, startDate).then(res => {
				// Create references to MoCs for easy data lookup later
				res.data.forEach(event => event.MoC = Moc);
				return res.data;
			}).catch(err => {
				// Most / all of these will be 404s unless we hit rate limiting.
			});
		}
	});

	Promise.all(facebookPromises).then(res => {
		var facebookEvents = [].concat.apply([], res);
		var newEventIds = removeExistingIds(facebookEvents.map(event => event.id));

		facebookEvents.forEach(event => {
			if (newEventIds.indexOf(event.id) !== -1) {
				submitTownhall(transformFacebookTownhall(event));
			}
		});
	});
}

function removeExistingIds(eventIds) {
	existingTownHallIds.forEach(existingId => {
		let position = eventIds.indexOf(existingId);
		if (position !== -1) {
			eventIds.splace(position, 1);
		}
	});
}

function submitTownhall(townhall) {
	firebasedb.ref('/UserSubmission/' + townhall.eventId).set(townhall);
}

function createFacebookQuery(facebookID, startDate) {
	return request({
		uri: 'https://graph.facebook.com/v2.10/' + facebookID + '/events?since=' + startDate +'&access_token=' + facebookToken,
		json: true
	})
}

function transformFacebookTownhall(event) {
	let start = event.start_time;
	let end = event.end_time;
	var townhall = {
		eventId: event.id,
		Member: event.MoC.displayName,
		govtrack_id: event.MoC.govtrack_id,
		Party: event.MoC.party,
		District: event.MoC.state + '-' + event.MoC.district,
		StateAb: event.MoC.state,
		eventName: event.name,
		meetingType: 'unknown',
		link: 'https://www.facebook.com/events/' + event.id + '/',
		linkName: 'Facebook Link',
		dateObj: Date.parse(date),
		dateString: date.toDateString(),
		Time: start.toLocaleString('en-US', { hour: 'numeric',minute:'numeric', hour12: true }),
		timeStart24: start.toLocaleString('en-US', { hour: 'numeric', minute:'numeric', second: 'numeric', hour12: false }),
		timeEnd24: end.toLocaleString('en-US', { hour: 'numeric', minute:'numeric', second: 'numeric', hour12: false }),
		yearMonthDay: date.toISOString().substring(0, 10),
		lastUpdated: Date.now()
	};

	if (event.hasOwnProperty('place')) {
		townhall.Location = event.place.name;
		if (event.place.hasOwnProperty('location')) {
			var location = event.place.location;
			townhall.lat = location.latitude;
			townhall.lng = location.longitude;
			townhall.address = location.street + ', ' + location.city + ', ' + location.state + ' ' + location.zip;
		}
	}

	return townhall;
}
