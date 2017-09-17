// FIREBASE METHODS
// Initialize Firebase
var config = {
  apiKey: 'AIzaSyDwZ41RWIytGELNBnVpDr7Y_k1ox2F2Heg',
  authDomain: 'townhallproject-86312.firebaseapp.com',
  databaseURL: 'https://townhallproject-86312.firebaseio.com',
  storageBucket: 'townhallproject-86312.appspot.com',
  messagingSenderId: '208752196071'
};

firebase.initializeApp(config);
var firebasedb = firebase.database();
var provider = new firebase.auth.GoogleAuthProvider();

function routes(location){
  switch (location) {
    case '#moc-update':
      adminSiteController.initMOCReport()
      break;
    default:

  }
}

$('nav').on('click', '.hash-link', function onClickGethref() {
  var hashid = this.getAttribute('href');
  if (hashid === '#home') {
    history.replaceState({}, document.title, '.');
  } else {
    location.hash = hashid
  }
  routes(hashid)
});
