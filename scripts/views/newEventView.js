
(function (module) {
// For handling user submitted events.
// Not being used yet.
  var provider = new firebase.auth.GoogleAuthProvider();

  var newEventView = {};
  TownHall.currentKey;
  TownHall.currentEvent = new TownHall();

  // METHODS FOR BOTH

  newEventView.humanTime = function (time) {
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
      if (hours === 0) {
        hours = 12;
      }
    } else {
      meridian = 'PM';
    }
    return hours + ':' + minutes + ' ' + meridian;
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

  newEventView.addressChanged = function () {
    var $input = $(this);
    var $form = $input.parents('form');
    if (this.id === 'address') {
      $form.find('#locationCheck').val('');
      newEventView.geoCode($input);
      $form.find('#location-form-group').removeClass('has-success');
      $form.find('.form-control-feedback').addClass('hidden');
    }
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
    var $dateInput = $form.find('.repeating');
    var $checkbox = $form.find('.checkbox-label');
    if (this.checked) {
      $dateInput.show().removeClass('hidden');
    } else {
      $dateInput.hide();
      $checkbox.text('Click to enter repeating event description');
    }
  };

  newEventView.geoCode = function ($input) {
    var $form = $($input).parents('form');
    var address = $form.find('#address').val();
    var $listgroup = $($input).parents('.list-group-item');
    newTownHall = new TownHall();
    type = $form.find('#addressType').val();
    newTownHall.getLatandLog(address, type).then(function (geotownHall) {
      console.log('geocoding!', geotownHall);
      var $feedback = $form.find('#location-form-group')
      $feedback.removeClass('has-error');
      $feedback.addClass('has-success');
      $form.find('.form-control-feedback').removeClass('hidden');
      $form.find('#address').val(geotownHall.address);
      TownHall.currentEvent.lat = geotownHall.lat;
      TownHall.currentEvent.lng = geotownHall.lng;
      $form.find('#locationCheck').val('Location is valid');
    }).catch(function (error) {
      $feedback.addClass('has-error');
      $form.find('#locationCheck').val('Geocoding failed').addClass('has-error');
    });
  };

  newEventView.changeMeetingType = function (event) {
    event.preventDefault();
    $form = $(this).parents('form');
    var value = $(this).attr('data-value');
    $form.find('#meetingType').val(value);
    $form.find('#meetingType').change();
  };

  newEventView.meetingTypeChanged = function (event) {
    event.preventDefault();
    $form = $(this).parents('form');
    var value = $(this).val();
    var teleInputsTemplate = Handlebars.getTemplate('teleInputs');
    var ticketInputsTemplate = Handlebars.getTemplate('ticketInputs');
    if ($form.attr('id')) {
      var thisTownHall = TownHall.allTownHallsFB[$form.attr('id').split('-form')[0]];
    } else {
      var thisTownHall = TownHall.currentEvent;
    }
    switch (value.slice(0, 4)) {
      case 'Tele':
        $form.find('.location-data').html(teleInputsTemplate(thisTownHall));
        break;
      case 'Tick':
        $form.find('.location-data').html(ticketInputsTemplate(thisTownHall));
        break;
    }
  };

  // New Event METHODS

  newEventView.updatedNewTownHallObject = function updatedNewTownHallObject($form) {
    var updated = $form.find('.edited').get();
    var databaseTH = TownHall.currentEvent;
    var updates = updated.reduce(function (newObj, cur) {
      var $curValue = $(cur).val();
      switch (cur.id) {
        case 'timeStart24':
          newObj.timeStart24 = $curValue + ':00';
          newObj.Time = newEventView.humanTime($curValue);
          break;
        case 'timeEnd24':
          newObj.timeEnd24 = $curValue + ':00';
          newObj.timeEnd = newEventView.humanTime($curValue);
          break;
        case 'yearMonthDay':
          newObj[cur.id] = $curValue;
          newObj.Date = new Date($curValue.replace(/-/g, '/')).toDateString();
          break;
        default:
          newObj[cur.id] = $curValue;
      }
      return newObj;
    }, {});
    TownHall.currentEvent = Object.assign(databaseTH, updates);
    console.log(TownHall.currentEvent);
  };

  newEventView.newformChanged = function () {
    var $input = $(this);
    var $form = $input.parents('form');
    if (this.id === 'address') {
      $form.find('#geocode-button').removeClass('disabled');
      $form.find('#geocode-button').addClass('btn-blue');
      $form.find('#locationCheck').val('');
    }
    $input.addClass('edited');
    newEventView.updatedNewTownHallObject($form);
  };

  newEventView.lookupMember = function (event) {
    var member = $(this).val();
    $form = $(this).parents('form');
    TownHall.currentKey = firebase.database().ref('townHallIds').push().key;
    TownHall.currentEvent.eventId = TownHall.currentKey;
    var District = $form.find('#District');
    var State = $form.find('#State');
    var Party = $form.find('#Party');
    var memberKey = member.split(' ')[1].toLowerCase() + '_' + member.split(' ')[0].toLowerCase();
    console.log(memberKey);
    firebase.database().ref('MOCs/' + memberKey).once('value').then(function (snapshot) {
      if (snapshot.exists()) {
        mocdata = snapshot.val();
        if (mocdata.type === 'sen') {
          District.val('Senate').addClass('edited');
        } else if (mocdata.type === 'rep') {
          District.val(mocdata.state + '-' + mocdata.district).addClass('edited');
        }
      }
      Party.val(mocdata.party).addClass('edited');
      State.val(statesAb[mocdata.state]).addClass('edited');
    });
  };

  newEventView.validateDateNew = function () {
    var newTownHall = TownHall.currentEvent;
    if (newTownHall.meetingType.slice(0, 4) === 'Tele') {
      newTownHall.dateObj = new Date(newTownHall.Date.replace(/-/g, '/') + ' ' + newTownHall.Time).getTime();
      newTownHall.dateValid = newTownHall.dateObj ? true : false;
      return (newTownHall);
    } else if (newTownHall.lat) {
      console.log('getting time zone');
      newTownHall.validateZone().then(function (returnedTH) {
        returnedTH.updateUserSubmission(TownHall.currentKey);
        console.log('writing to database: ', returnedTH);
      }).catch(function (error) {
        console.log('could not get timezone', error);
      });
    } else {
      newTownHall.dateObj = new Date(dateUpdated.Date.replace(/-/g, '/') + ' ' + newTownHall.Time).getTime();
      newTownHall.dateValid = newTownHall.dateObj ? true : false;
      return (newTownHall);
    }
  };

  newEventView.submitNewEvent = function (event) {
    event.preventDefault();
    $form = $(this);
    var id = TownHall.currentKey;
    newEventView.updatedNewTownHallObject($form);
    var newTownHall = TownHall.currentEvent;
    if (TownHall.currentEvent.hasOwnProperty('Member')) {
      newTownHall.lastUpdated = Date.now();
      newTownHall.enteredBy = firebase.auth().currentUser.email;
      if (newTownHall.address && $form.find('#locationCheck').val() !== 'Location is valid') {
        alert('Please Geocode the address, if there is no address, leave it blank');
        return false;
      }

      newTownHall = newEventView.validateDateNew(id, newTownHall)
      if (newTownHall) {
        newTownHall.updateUserSubmission(TownHall.currentKey).then(function (dataWritten) {
          console.log('wrote to database: ', newTownHall);
        });
      }
    }
  };

  // $('.events-table').on('click', '#delete', newEventView.deleteEvent);

  // event listeners for new form
  $('.new-event-form').on('change', '#Member', newEventView.lookupMember);
  $('.new-event-form').on('click', '#geocode-button', newEventView.geoCode);
  $('.new-event-form').on('click', '.meeting a', newEventView.changeMeetingType);
  $('.new-event-form').on('change', '#meetingType', newEventView.meetingTypeChanged);
  $('.new-event-form').on('change', '.form-control', newEventView.newformChanged);
  $('.new-event-form').on('change', '.date-string', newEventView.dateString);
  $('.new-event-form').on('change', '#address', newEventView.addressChanged);
  $('.new-event-form').on('submit', 'form', newEventView.submitNewEvent);

  $('#scroll-to-top').on('click', function () {
    $("html, body").animate({ scrollTop: 0 }, "slow");
  });

  window.addEventListener('scroll', function () {
    var y = window.scrollY;
     if (y >= 800) {
       if ($('#scroll-to-top').css('visibility') !== 'visible') {
         $('#scroll-to-top').css('visibility', 'visible').hide().fadeIn();
       }
     } else {
       if ($('#scroll-to-top').css('visibility') === 'visible') {
         $('#scroll-to-top').css('visibility', 'hidden').show().fadeOut('slow');
       }
     }
  });

  function writeUserData(userId, name, email) {
    firebase.database().ref('users/' + userId).update({
      username: name,
      email: email
    });
  }

  firebase.auth().onAuthStateChanged(function (user) {
    if (user) {
    // User is signed in.
      console.log(user.displayName, ' is signed in');
      eventHandler.readData();
      eventHandler.metaData();
      writeUserData(user.uid, user.displayName, user.email);
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
    }).catch(function (error) {
      // Handle Errors here.
      var errorCode = error.code;
      var errorMessage = error.message;
      console.log(errorCode, errorMessage);
    });
  };

  module.eventHandler = eventHandler;
})(window);
