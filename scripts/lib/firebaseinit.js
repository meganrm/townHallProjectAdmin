// FIREBASE METHODS
// Initialize Firebase
var config = {
  apiKey: 'AIzaSyAmCMim_2ePjXmiPrFhscbuBOr0updtryc',
  authDomain: 'thp-dev-db.firebaseapp.com',
  databaseURL: 'https://thp-dev-db.firebaseio.com',
  storageBucket: 'thp-dev-db.appspot.com',
  messagingSenderId: '426223839812',
};

firebase.initializeApp(config);
var firebasedb = firebase.database();
var provider = new firebase.auth.GoogleAuthProvider();