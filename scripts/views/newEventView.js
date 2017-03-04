
(function (module) {
// For handling user submitted events.
// Not being used yet.
  var provider = new firebase.auth.GoogleAuthProvider();

  var newEventView = {}
  $('.events-table').on('change', '.form-control', function(){
    $input = $(this);
    $input.addClass('edited');
    $input.parents('form').find('.timestamp').val(new Date())
  });

  $('.events-table').on('submit', 'form', function(event){
    event.preventDefault()
    var id = this.id.split('-')[0];
    $form = $(this);
    var updated = $form.find('.edited').get()
    if (updated.length > 0) {
      var updates = updated.reduce(function(newObj, cur){
        newObj[cur.id] = $(cur).val();
        return newObj;
      }, {});
      var newTownHall = new TownHall(updates);
      newTownHall.eventId = id;
      newTownHall.lastUpdated = $form.find('#lastUpdated').val();
      console.log('writing to database: ', newTownHall);
      // eventHandler.update(newTownHall , id);
    }
  });

$('.events-table').on('click', '#geocode-button', function(event){
  event.preventDefault();
  var $form = $(this).parents('form');
  var address = $form.find('#address').val();
  newTownHall = new TownHall();
  type = $form.find('#addressType').val();
  newTownHall.getLatandLog (address, type).then(function(geotownHall){
    console.log('geocoding!', geotownHall);
  })
})

$('.events-table').on('click', '.dropdown-menu a', function(event){
  event.preventDefault();
  $form = $(this).parents('form');
  var value = $(this).attr('data-value');
  $form.find('#meetingType').val(value);
  $form.find('#meetingType').change();
})

$('.events-table').on('change', '#meetingType', function(event){
  event.preventDefault();
  $form = $(this).parents('form');
  var value = $(this).val();
})


  TownHall.viewAll = function () {
    var locations = [];
    firebase.database().ref('/townHalls').once('value').then(function(snapshot) {
      snapshot.forEach(function(ele){
        var newTownHall = new TownHall(ele.val());
        var $newRow = $(newTownHall.toHtml($('#view-firebase-template')));
        $newRow.attr('id' , ele.key);
        $('#all-events').append($newRow);
      });
    });
  };

  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
    // User is signed in.
      console.log(user.displayName, ' is signed in');
    } else {
      newEventView.signIn();
      // No user is signed in.
    }
  });

  //Sign in fuction for firebase
  newEventView.signIn = function (){
    firebase.auth().signInWithRedirect(provider);
    firebase.auth().getRedirectResult().then(function(result) {
      // This gives you a Google Access Token. You can use it to access the Google API.
      var token = result.credential.accessToken;
      // The signed-in user info.
      var user = result.user;
    }).catch(function(error) {
      // Handle Errors here.
      var errorCode = error.code;
      var errorMessage = error.message;
      console.log(errorCode, errorMessage);
      // The email of the user's account used.
      var email = error.email;
      // The firebase.auth.AuthCredential type that was used.
      var credential = error.credential;
    });
  };

  module.eventHandler = eventHandler;
})(window);
