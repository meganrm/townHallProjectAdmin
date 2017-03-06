
(function (module) {
// For handling user submitted events.
// Not being used yet.
  var provider = new firebase.auth.GoogleAuthProvider();

  var newEventView = {};

  newEventView.humanTime = function(time) {
    var timeSplit = time.split(':');
    var hours;
    var minutes;
    var meridian;
    hours = timeSplit[0];
    minutes = timeSplit[1];
    if (hours > 12) {
      meridian = 'PM';
      hours -= 12;
    } else if (hours < 12) {
      meridian = 'AM';
      if (hours == 0) {
        hours = 12;
      }
    } else {
      meridian = 'PM';
    }
    return hours + ':' + minutes + ' ' + meridian;
  }

  newEventView.updatedView = function updatedView($form, $listgroup) {
    var preview = Handlebars.getTemplate('previewEvent');
    var updated = $form.find('.edited').get();
    var updates = updated.reduce(function (newObj, cur) {
      var $curValue = $(cur).val()
      switch (cur.id) {
        case 'timeStart24':
        newObj.timeStart24 = $curValue + ':00';
        newObj.Time = newEventView.humanTime($curValue)
        console.log(newObj.Time);
          break;
        case 'timeEnd24':
        newObj.timeEnd24 = $curValue + ':00';
        newObj.timeEnd = newEventView.humanTime($curValue)
          break;
        default:
          newObj[cur.id] = $curValue;
      }
      return newObj;
    }, {});
    var currentTH = TownHall.allTownHallsFB[$form.attr('id').split('-')[0]];
    var updatedTH = Object.assign(currentTH, updates);
    TownHall.allTownHallsFB[$form.attr('id').split('-')[0]] = updatedTH;
    $listgroup.find('.preview').html(preview(updatedTH));
    return new TownHall(updates);
  };

  newEventView.formChanged = function () {
    var $input = $(this);
    var $form = $input.parents('form');
    var $listgroup = $(this).parents('.list-group-item');
    if (this.id === 'address') {
      $form.find('#geocode-button').removeClass('disabled');
      $form.find('#geocode-button').addClass('btn-blue');
      $form.find('#locationCheck').val('');
    }
    $input.addClass('edited');
    $form.find('#update-button').addClass('btn-blue');
    $form.find('.timestamp').val(new Date());
    newEventView.updatedView($form, $listgroup);
  };

  newEventView.dateChanged = function (event) {
    var $input = $(this);
    var $form = $input.parents('form');
    var $listgroup = $(this).parents('.list-group-item');
    $form.find('#dateChanged').addClass('edited');
    $input.addClass('edited');
    $form.find('#update-button').addClass('btn-blue');
    $form.find('.timestamp').val(new Date());
    newEventView.updatedView($form, $listgroup);
  };

  newEventView.dateString = function (event) {
    event.preventDefault();
    var $input = $(this);
    var $form = $input.parents('form');
    var $dateInput = $form.find('.date');
    var $checkbox = $form.find('.checkbox-label');
    if (this.checked) {
      $dateInput.attr('type', 'text').attr('id', 'dateString');
      $checkbox.text('Click to enter formatted date');
      console.log('checked');
    } else {
      $dateInput.attr('type', 'date').attr('id', 'yearMonthDay');
      $checkbox.text('Click to enter repeating event description');
      console.log('not checked');
    }
  };

  newEventView.submitForm = function (event) {
    event.preventDefault();
    $form = $(this);
    var $listgroup = $(this).parents('.list-group-item');
    var updated = $form.find('.edited').get();
    if (updated.length > 0) {
      var newTownHall = newEventView.updatedView($form, $listgroup);
      newTownHall.lastUpdated = $form.find('#lastUpdated').val();
      newTownHall.updatedBy = firebase.auth().currentUser.email;
      console.log('writing to database: ', newTownHall);
      newTownHall.updateFB($form.attr('id').split('-')[0]);
      $form.find('#update-button').addClass('btn-blue');
    }
  };

  $('.events-table').on('submit', 'form', newEventView.submitForm);
  $('.events-table').on('keyup', '.form-control', newEventView.formChanged);
  $('.events-table').on('change', '.datetime', newEventView.dateChanged);
  $('.events-table').on('change', '.date-string', newEventView.dateString);


  $('.events-table').on('click', '#geocode-button', function (event) {
    event.preventDefault();
    var $form = $(this).parents('form');
    var address = $form.find('#address').val();
    var $listgroup = $(this).parents('.list-group-item');
    newTownHall = new TownHall();
    type = $form.find('#addressType').val();
    newTownHall.getLatandLog(address, type).then(function (geotownHall) {
      console.log('geocoding!', geotownHall);
      $form.find('#locationCheck').val('Location is value');
      $form.find('#address').val(geotownHall.address);
      newEventView.updatedView($form, $listgroup);
    }).catch(function (error) {
      $form.find('#locationCheck').val('Geocoding failed');
    });
  });

  $('.events-table').on('click', '.dropdown-menu a', function (event) {
    event.preventDefault();
    $form = $(this).parents('form');
    var value = $(this).attr('data-value');
    $form.find('#meetingType').val(value);
    $form.find('#meetingType').change();
  });

  $('.events-table').on('change', '#meetingType', function(event) {
    event.preventDefault();
    $form = $(this).parents('form');
    var value = $(this).val();
    var teleInputsTemplate = Handlebars.getTemplate('teleInputs');
    var ticketInputsTemplate = Handlebars.getTemplate('ticketInputs');
    var thisTownHall = TownHall.allTownHallsFB[$form.attr('id').split('-')[0]];
    switch (value.slice(0,4)) {
      case 'Tele':
        $form.find('.location-data').html(teleInputsTemplate(thisTownHall));
        break;
      case 'Tick':
        $form.find('.location-data').html(ticketInputsTemplate(thisTownHall));
        break;
    }
  });

  firebase.auth().onAuthStateChanged(function (user) {
    if (user) {
    // User is signed in.
      console.log(user.displayName, ' is signed in');
    } else {
      newEventView.signIn();
      // No user is signed in.
    }
  });

  // Sign in fuction for firebase
  newEventView.signIn = function signIn() {
    firebase.auth().signInWithRedirect(provider);
    firebase.auth().getRedirectResult().then(function (result) {
      // This gives you a Google Access Token. You can use it to access the Google API.
      var token = result.credential.accessToken;
      // The signed-in user info.
      var user = result.user;
    }).catch(function(error) {
      // Handle Errors here.
      var errorCode = error.code;
      var errorMessage = error.message;
      console.log(errorCode, errorMessage);
    });
  };

  module.eventHandler = eventHandler;
})(window);
