// FIREBASE METHODS
// Initialize Firebase
var config = {
  apiKey: 'AIzaSyCXyjAOvBKDEX5pckTwuI7LODWKNlL21gc',
  authDomain: 'townhallproject-86312.firebaseapp.com',
  databaseURL: 'https://townhallproject-86312.firebaseio.com',
  storageBucket: 'townhallproject-86312.appspot.com',
  messagingSenderId: '208752196071',
};

var testingConfig = {
  apiKey: "AIzaSyCJncx2G6bUnecl4H2VHSBTDfRRxg7H5Fs",
  authDomain: "townhalltestingsms.firebaseapp.com",
  databaseURL: "https://townhalltestingsms.firebaseio.com",
  projectId: "townhalltestingsms",
  storageBucket: "townhalltestingsms.appspot.com",
  messagingSenderId: "86976100332"
};

firebase.initializeApp(config);
var firebasedb = firebase.database();
var provider = new firebase.auth.GoogleAuthProvider();