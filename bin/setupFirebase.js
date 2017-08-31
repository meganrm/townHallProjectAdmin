require('dotenv').load();
var admin = require('firebase-admin');
var firebasekey = process.env.FIREBASE_TOKEN.replace(/\\n/g, '\n');

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: 'townhallproject-86312',
    clientEmail: 'herokuadmin@townhallproject-86312.iam.gserviceaccount.com',
    privateKey: firebasekey,
    databaseAuthVariableOverride: {
      uid: 'read-only'
    }
  }),
  databaseURL: 'https://townhallproject-86312.firebaseio.com'
});

module.exports = admin.database();
