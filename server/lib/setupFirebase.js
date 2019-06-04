require('dotenv').load();
var admin = require('firebase-admin');
const testing = process.env.NODE_ENV != 'production';
console.log('testing', testing);
var firebasekey = testing ? process.env.TESTING_FIREBASE_TOKEN.replace(/\\n/g, '\n') : process.env.FIREBASE_TOKEN.replace(/\\n/g, '\n');

admin.initializeApp({
    credential: admin.credential.cert({
        projectId: testing ? process.env.TESTING_PROJECT_ID : process.env.FIREBASE_ID,
        clientEmail: testing ? process.env.TESTING_CLIENT_EMAIL : process.env.FIREBASE_EMAIL,
        privateKey: firebasekey,
        databaseAuthVariableOverride: {
            uid: 'read-only',
        },
    }),
    databaseURL: testing ? process.env.TESTING_DATABASE_URL : process.env.FIREBASE_DB_URL,
});
// admin.database.enableLogging(true)

module.exports = admin.database();
