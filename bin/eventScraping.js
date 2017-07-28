#!/usr/bin/env node
var admin = require('firebase-admin');
var https = require('https');
var request = require('request-promise'); // NB:  This is isn't the default request library!

var eventBriteToken = process.envE.VENTBRITE_TOKEN;
var facebookToken = process.env.FACEBOOK_TOKEN;
var firebaseKey = process.env.FIREBASE_TOKEN.replace(/\\n/g, '\n');

var existingTownHallIds = [];

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
firebasedb.ref('/towhHallIDs/').once('value').then(function(snapshot){
	// TODO:  Change this to actual map
	existingTownHallIds.push(...snapshot.val().map(event => event.id));
	getTownhalls();
});

function getTownhalls() {
	firebase.database().ref('mocData/').once('value').then((snapshot) => {
		getFacebookEvents(snapshot.val(), existingTownHallIds)
	});
}

function submitTownhall(townhall) {
	firebasedb.ref('/UserSubmission/' + townhall.eventId).set(townhall);
}

