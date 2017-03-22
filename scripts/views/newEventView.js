
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

  newEventView.geoCodeOnState = function () {
    var state = TownHall.currentEvent.State;
    newTownHall = new TownHall();
    newTownHall.getLatandLog(state, 'state').then(function (geotownHall) {
      console.log('geocoding!', geotownHall);
      TownHall.currentEvent.address = geotownHall.address;
      TownHall.currentEvent.lat = geotownHall.lat;
      TownHall.currentEvent.lng = geotownHall.lng;
      $form.find('#locationCheck').val('Location is valid');
    }).catch(function (error) {
      $feedback.addClass('has-error');
      $form.find('#locationCheck').val('Geocoding failed').addClass('has-error');
    });
  };

  newEventView.geoCode = function ($input) {
    var $form = $($input).parents('form');
    var address = $form.find('#address').val();
    newTownHall = new TownHall();
    type = $form.find('#addressType').val();
    if (TownHall.currentEvent.lat && TownHall.currentEvent.lng) {
      delete TownHall.currentEvent.lat;
      delete TownHall.currentEvent.lng;
    }
    newTownHall.getLatandLog(address, type).then(function (geotownHall) {
      console.log('geocoding!', geotownHall);
      var $feedback = $form.find('#location-form-group');
      $feedback.removeClass('has-error');
      $feedback.addClass('has-success');
      $form.find('#address').val(geotownHall.address);
      TownHall.currentEvent.lat = geotownHall.lat;
      TownHall.currentEvent.lng = geotownHall.lng;
      $form.find('#locationCheck').val('Location is valid');
      $form.find('#address-feedback').html(`Location is valid, make sure the address is correct:<br> ${geotownHall.address}`);
    }).catch(function (error) {
      $feedback.addClass('has-error');
      $form.find('#locationCheck').val('Geocoding failed').addClass('has-error');
    });
  };

  newEventView.addressChanged = function () {
    var $input = $(this);
    var $form = $input.parents('form');
    if (this.id === 'address') {
      $form.find('#locationCheck').val('');
      newEventView.geoCode($input);
      $form.find('#location-form-group').removeClass('has-success');
      $form.find('#address-feedback').html('Enter a valid street address, if there isn\'t one, leave this blank');
    }
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
    $location = $form.find('.location-data');
    var value = $(this).val();
    $('#meetingType-error').addClass('hidden');
    $('#meetingType').parent().removeClass('has-error');
    var teleInputsTemplate = Handlebars.getTemplate('teleInputs');
    var ticketInputsTemplate = Handlebars.getTemplate('ticketInputs');
    var defaultLocationTemplate = Handlebars.getTemplate('generalinputs');
    if ($form.attr('id')) {
      var thisTownHall = TownHall.allTownHallsFB[$form.attr('id').split('-form')[0]];
    } else {
      var thisTownHall = TownHall.currentEvent;
    }
    switch (value.slice(0, 4)) {
      case 'Tele':
        $location.html(teleInputsTemplate(thisTownHall));
        newEventView.geoCodeOnState();
        break;
      case 'Tick':
        $location.html(ticketInputsTemplate(thisTownHall));
        break;
      default:
        $location.html(defaultLocationTemplate(thisTownHall));
    }
  };

  // New Event METHODS
  newEventView.validatePhoneNumber = function(phonenumber){
    var $phoneNumberError = $('#phoneNumber-error');
    regEx = /^(1\s|1|)?((\(\d{3}\))|\d{3})(\-|\s)?(\d{3})(\-|\s)?(\d{4})$/;
    var testNumber = regEx.test(phonenumber);
    if (testNumber) {
      $phoneNumberError.addClass('hidden');
      $phoneNumberError.parent().removeClass('has-error');
      $phoneNumberError.parent().addClass('has-success');
      phonenumber = phonenumber.replace(/[^\d]/g, '');
      if (phonenumber.length === 10) {
        $('#phoneNumber').val(phonenumber.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3'));
      }
      return null;
    } else {
      $phoneNumberError.removeClass('hidden');
      $phoneNumberError.parent().addClass('has-error');
      $phoneNumberError.parent().removeClass('has-success');
    }
  };

  newEventView.updatedNewTownHallObject = function updatedNewTownHallObject($form) {
    var updated = $form.find('.edited').get();
    var databaseTH = TownHall.currentEvent;
    var updates = updated.reduce(function (newObj, cur) {
      var $curValue = $(cur).val();
      switch (cur.id) {
        case 'timeStart24':
          newObj.timeStart24 = $curValue + ':00';
          newObj.Time = newEventView.humanTime($curValue);
          $('#timeStart24-error').addClass('hidden');
          $('#timeStart24').parent().removeClass('has-error');
          break;
        case 'timeEnd24':
          newObj.timeEnd24 = $curValue + ':00';
          newObj.timeEnd = newEventView.humanTime($curValue);
          break;
        case 'yearMonthDay':
          newObj[cur.id] = $curValue;
          newObj.Date = new Date($curValue.replace(/-/g, '/')).toDateString();
          $('#yearMonthDay-error').addClass('hidden');
          $('#yearMonthDay').parent().removeClass('has-error');
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
    } else if (this.id === 'phoneNumber') {
      newEventView.validatePhoneNumber($input.val())
    }
    $input.addClass('edited');
    newEventView.updatedNewTownHallObject($form);
  };

  newEventView.validateMember = function (member) {
    var $errorMessage = $('.new-event-form #member-help-block');
    var $memberformgroup = $('#member-form-group');
    if (member.length < 1) {
      $errorMessage.html('Please enter a member of congress name');
      $memberformgroup.addClass('has-error');
    } else if (parseInt(member)) {
      $errorMessage.html('Please enter a member of congress name');
      $memberformgroup.addClass('has-error');
    } else if (member.split(' ').length === 1) {
      $errorMessage.html('Please enter both a first and last name');
      $memberformgroup.addClass('has-error');
    } else {
      return true;
    }
  };

  newEventView.showSubmittedEvents = function (currentEvents, $list) {
    var previewEventTemplate = Handlebars.getTemplate('pendingEvents');
    $('#list-of-current-pending').removeClass('hidden').hide().fadeIn();
    for (key in currentEvents) {
      var eventId = currentEvents[key];
      var ele = TownHall.allTownHallsFB[eventId];
      $list.append(previewEventTemplate(ele));
    }
  };

  newEventView.lookupMember = function (event) {
    var $memberInput = $(this);
    var member = $memberInput.val();
    $form = $(this).parents('form');
    var $list = $('#current-pending');
    $('#list-of-current-pending').addClass('hidden')
    $list.empty();
    var $errorMessage = $('.new-event-form #member-help-block');
    var $memberformgroup = $('#member-form-group');
    if (newEventView.validateMember(member)) {
      TownHall.currentKey = firebase.database().ref('townHallIds').push().key;
      TownHall.currentEvent.eventId = TownHall.currentKey;
      var District = $form.find('#District');
      var State = $form.find('#State');
      var Party = $form.find('#Party');
      var memberKey;
      if (member.split(' ').length === 3) {
        memberKey = member.split(' ')[1].toLowerCase() + member.split(' ')[2].toLowerCase() + '_' + member.split(' ')[0].toLowerCase();
      } else {
        memberKey = member.split(' ')[1].toLowerCase() + '_' + member.split(' ')[0].toLowerCase();
      }
      console.log(memberKey);
      firebase.database().ref('MOCs/' + memberKey).once('value').then(function (snapshot) {
        if (snapshot.exists()) {
          mocdata = snapshot.val();
          if (mocdata.type === 'sen') {
            District.val('Senate').addClass('edited').parent().addClass('has-success');
          } else if (mocdata.type === 'rep') {
            District.val(mocdata.state + '-' + mocdata.district).addClass('edited').parent().addClass('has-success');
          }
          Party.val(mocdata.party).addClass('edited').parent().addClass('has-success');
          State.val(statesAb[mocdata.state]).addClass('edited').parent().addClass('has-success');
          newEventView.updatedNewTownHallObject($form);
          $errorMessage.html('');
          $memberformgroup.removeClass('has-error').addClass('has-success');
          if (mocdata.currentEvents) {
            newEventView.showSubmittedEvents(mocdata.currentEvents, $list);
          }
        } else {
          $('#member-form-group').addClass('has-error');
          $('.new-event-form #member-help-block').html('That member is not in our database, please check the spelling, and only use first and last name.');
        }
      })
      .catch(function (error) {
        console.error(error)
      });
    }
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
        returnedTH.updateUserSubmission(TownHall.currentKey).then(function (writtenTH) {
          newEventView.resetData();
          console.log('wrote to database: ', writtenTH);
        });
        TownHall.allTownHallsFB[returnedTH.eventId] = returnedTH;
        console.log('writing to database: ', returnedTH);
      }).catch(function (error) {
        console.log('could not get timezone', error);
      });
    } else {
      newTownHall.dateObj = new Date(newTownHall.Date.replace(/-/g, '/') + ' ' + newTownHall.Time).getTime();
      newTownHall.dateValid = newTownHall.dateObj ? true : false;
      return (newTownHall);
    }
  };

  newEventView.checkForFields = function () {
    var requiredFields = true;
    if (!Object.prototype.hasOwnProperty.call(TownHall.currentEvent, 'meetingType')) {
      $('#meetingType').parent().addClass('has-error');
      $('#meetingType-error').removeClass('hidden');
      requiredFields = false;
    }
    if (!Object.prototype.hasOwnProperty.call(TownHall.currentEvent, 'yearMonthDay')) {
      $('#yearMonthDay').parent().addClass('has-error');
      $('#yearMonthDay-error').removeClass('hidden');
      requiredFields = false;
    }
    if (!Object.prototype.hasOwnProperty.call(TownHall.currentEvent, 'timeStart24')) {
      $('#timeStart24').parent().addClass('has-error');
      $('#timeStart24-error').removeClass('hidden');
      requiredFields = false;
    }
    return requiredFields;
  };

  newEventView.updateMOCEvents = function () {
    var memberKey = TownHall.currentEvent.Member.split(' ')[1].toLowerCase() + '_' + TownHall.currentEvent.Member.split(' ')[0].toLowerCase();
    firebase.database().ref('MOCs/' + memberKey + '/currentEvents/').push(TownHall.currentKey);
  };

  newEventView.resetData = function () {
    newEventView.updateMOCEvents();
    document.getElementById('new-event-form-element').reset();
    delete TownHall.currentKey;
    TownHall.currentEvent = new TownHall();
  }

  newEventView.submitNewEvent = function (event) {
    event.preventDefault();
    $form = $(this);
    var id = TownHall.currentKey;
    newEventView.updatedNewTownHallObject($form);
    var newTownHall = TownHall.currentEvent;
    if (newEventView.checkForFields()) {
      newTownHall.lastUpdated = Date.now();
      newTownHall.enteredBy = firebase.auth().currentUser.email;
      newTownHall = newEventView.validateDateNew(id, newTownHall);
      if (newTownHall) {
        newTownHall.updateUserSubmission(TownHall.currentKey).then(function (dataWritten) {
          TownHall.allTownHallsFB[dataWritten.eventId] = dataWritten;
          newEventView.resetData();
          console.log('wrote to database: ', newTownHall);
        });
      }
    } else {
      console.log('missing fields');
    }
  };

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

  module.newEventView = newEventView;
})(window);
