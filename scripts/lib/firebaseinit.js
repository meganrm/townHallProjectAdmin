// FIREBASE METHODS
// Initialize Firebase
var config = {
  apiKey: 'AIzaSyCXyjAOvBKDEX5pckTwuI7LODWKNlL21gc',
  authDomain: 'townhallproject-86312.firebaseapp.com',
  databaseURL: 'https://townhallproject-86312.firebaseio.com',
  storageBucket: 'townhallproject-86312.appspot.com',
  messagingSenderId: '208752196071',
};

firebase.initializeApp(config);
var firebasedb = firebase.database();
var provider = new firebase.auth.GoogleAuthProvider();