// FIREBASE METHODS
// Initialize Firebase
// var config = {
//   apiKey: 'AIzaSyDwZ41RWIytGELNBnVpDr7Y_k1ox2F2Heg',
//   authDomain: 'townhallproject-86312.firebaseapp.com',
//   databaseURL: 'https://townhallproject-86312.firebaseio.com',
//   storageBucket: 'townhallproject-86312.appspot.com',
//   messagingSenderId: '208752196071',
// };

 var config = {
   apiKey: 'AIzaSyCcdiq0zOlnw9dWobNp-dU7vsD_0cC8acM',
   authDomain: 'townhall-testing-db.firebaseapp.com',
   databaseURL: 'https://townhall-testing-db.firebaseio.com',
   storageBucket: 'townhall-testing-db.appspot.com',
   messagingSenderId: '49136206007',
 };

firebase.initializeApp(config);
var firebasedb = firebase.database();
var provider = new firebase.auth.GoogleAuthProvider();