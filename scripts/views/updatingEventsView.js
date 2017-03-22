
(function (module) {
// For handling user submitted events.
// Not being used yet.
  var provider = new firebase.auth.GoogleAuthProvider();

  var updateEventView = {};
  TownHall.currentKey;
  TownHall.currentEvent = new TownHall();

  updateEventView.updatedView = function updatedView($form, $listgroup) {
    var preview = Handlebars.getTemplate('previewEvent');
    var updated = $form.find('.edited').get();
    var id = $form.attr('id').split('-form')[0];
    var databaseTH = TownHall.allTownHallsFB[id];
    var updates = updated.reduce(function (newObj, cur) {
      var $curValue = $(cur).val();
      switch (cur.id) {
        case 'timeStart24':
          newObj.timeStart24 = $curValue + ':00';
          newObj.Time = updateEventView.humanTime($curValue);
          break;
        case 'timeEnd24':
          newObj.timeEnd24 = $curValue + ':00';
          newObj.timeEnd = updateEventView.humanTime($curValue);
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
    var currentTH = TownHall.allTownHallsFB[id];
    var updatedTH = Object.assign(currentTH, updates);
    TownHall.allTownHallsFB[id] = updatedTH;
    $listgroup.find('.preview').html(preview(updatedTH));
    return new TownHall(updates);
  };

  // ADMIN ONLY METHODS
  updateEventView.archiveEvent = function (event) {
    event.preventDefault();
    var preview = Handlebars.getTemplate('editedResults');
    var id = $(this).attr('data-id');
    var oldTownHall = TownHall.allTownHallsFB[id];
    oldTownHall.removeOld().then(function (removed) {
      console.log(removed);
      print.writtenId = removed.eventId;
      print.edit = 'archived';
      print.Date = removed.Date;
      $('#edited').append(preview(print));
    });
  };

  updateEventView.deleteEvent = function (event) {
    event.preventDefault();
    var id = $(this).attr('data-id');
    var path = $(this).attr('data-path');
    var oldTownHall = TownHall.allTownHallsFB[id];
    console.log(id, path, oldTownHall);
    oldTownHall.deleteEvent(path).then(function(deletedEvent){
      $(`#${id}`).remove();
    });
  };

  updateEventView.validateDate = function (id, databaseTH, newTownHall) {
    var dateUpdated = newTownHall;
    if (databaseTH.timeZone || databaseTH.meetingType.slice(0, 4) === 'Tele') {
      var timeZone = databaseTH.timeZone;
      dateUpdated.dateObj = timeZone ? new Date(dateUpdated.Date.replace(/-/g, '/') + ' ' + databaseTH.Time + ' ' + timeZone).getTime() : new Date(newTownHall.Date.replace(/-/g, '/') + ' ' + databaseTH.Time).getTime();
      dateUpdated.dateValid = dateUpdated.dateObj ? true : false;
      return (dateUpdated);
    } else if (databaseTH.lat) {
      console.log('getting time zone');
      dateUpdated.validateZone(id).then(function (returnedTH) {
        // returnedTH.updateFB(id);
        console.log('writing to database: ', returnedTH);
      }).catch(function (error) {
        console.log('could not get timezone', error);
      });
    } else {
      dateUpdated.dateObj = new Date(dateUpdated.Date.replace(/-/g, '/') + ' ' + databaseTH.Time).getTime();
      dateUpdated.dateValid = newTownHall.dateObj ? true : false;
      return (dateUpdated);
    }
  };

  // updateEventView.CleanTH = function (obj){
  //   var cleanTownHall = new TownHall();
  //   for (prop in obj) {
  //     if (obj.hasOwnProperty(prop)) {
  //       cleanTownHall[prop] = obj[prop];
  //     }
  //   }
  //   return cleanTownHall;
  // };

  updateEventView.submitUpdateForm = function (event) {
    event.preventDefault();
    $form = $(this);
    var listID = $form.closest('.events-table').attr('id');
    var preview = Handlebars.getTemplate('previewEvent');
    if (listID === 'for-approval') {
      var key = $form.closest('.list-group-item').attr('id');
      var approvedTH = TownHall.allTownHallsFB[key];
      approvedTH.updateFB(key).then(function (dataWritten) {
        var print = dataWritten;
        print.writtenId = key;
        print.edit = 'updated';
        $('#edited').append(preview(print));
        dataWritten.deleteEvent('UserSubmission').then(function (deletedEvent) {
          $(`#for-approval #${key}`).remove();
        });
      });
      $form.find('#update-button').removeClass('btn-blue');
    } else {
      var $listgroup = $(this).parents('.list-group-item');
      var updated = $form.find('.edited').get();
      var id = $form.attr('id').split('-form')[0];
      var databaseTH = TownHall.allTownHallsFB[id];
      if (updated.length > 0) {
        var newTownHall = updateEventView.updatedView($form, $listgroup);
        newTownHall.lastUpdated = $form.find('#lastUpdated').val();
        newTownHall.updatedBy = firebase.auth().currentUser.email;
        if (newTownHall.address) {
          if ($form.find('#locationCheck').val() === 'Location is valid') {
            newTownHall.lat = databaseTH.lat;
            newTownHall.lng = databaseTH.lng;
          } else {
            alert('Please Geocode the address');
            return false;
          }
        }
        if (newTownHall.Date) {
          newTownHall = updateEventView.validateDate(id, databaseTH, newTownHall);
        }
        if (newTownHall) {
          newTownHall.updateFB(id).then(function (dataWritten) {
            var print = dataWritten;
            print.writtenId = id;
            print.edit = 'updated';
            $('#edited').append(preview(print));
          });
          console.log('writing to database: ', newTownHall);
          $form.find('#update-button').removeClass('btn-blue');
        }
      }
    }
  };

  // METHODS FOR BOTH

  updateEventView.humanTime = function (time) {
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

  updateEventView.formChanged = function () {
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
    updateEventView.updatedView($form, $listgroup);
  };

  updateEventView.addressChanged = function () {
    var $input = $(this);
    var $form = $input.parents('form');
    if (this.id === 'address') {
      $form.find('#geocode-button').removeClass('disabled');
      $form.find('#geocode-button').addClass('btn-blue');
      $form.find('#locationCheck').val('');
    }
  };

  updateEventView.dateChanged = function (event) {
    var $input = $(this);
    var $form = $input.parents('form');
    var $listgroup = $(this).parents('.list-group-item');
    $form.find('#dateChanged').addClass('edited');
    $input.addClass('edited');
    $form.find('#update-button').addClass('btn-blue');
    $form.find('.timestamp').val(new Date());
    updateEventView.updatedView($form, $listgroup);
  };

  updateEventView.dateString = function (event) {
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

  updateEventView.geoCode = function (event) {
    event.preventDefault();
    var $form = $(this).parents('form');
    var address = $form.find('#address').val();
    var $listgroup = $(this).parents('.list-group-item');
    if ($form.attr('id') && $form.attr('id').split('-form').length > 1) {
      var id = $form.attr('id').split('-')[0];
    }
    newTownHall = new TownHall();
    type = $form.find('#addressType').val();
    newTownHall.getLatandLog(address, type).then(function (geotownHall) {
      console.log('geocoding!', geotownHall);
      $form.find('#locationCheck').val('Location is valid');
      $form.find('#address').val(geotownHall.address);
      if (id) {
        TownHall.allTownHallsFB[id].lat = geotownHall.lat;
        TownHall.allTownHallsFB[id].lng = geotownHall.lng;
        updateEventView.updatedView($form, $listgroup);
      } else {
        TownHall.currentEvent.lat = geotownHall.lat;
        TownHall.currentEvent.lng = geotownHall.lng;
      }
    }).catch(function (error) {
      $form.find('#locationCheck').val('Geocoding failed');
    });
  };

  updateEventView.changeMeetingType = function (event) {
    event.preventDefault();
    $form = $(this).parents('form');
    var value = $(this).attr('data-value');
    $form.find('#meetingType').val(value);
    $form.find('#meetingType').change();
  };

  updateEventView.meetingTypeChanged = function (event) {
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

  // event listeners for table interactions
  $('.events-table').on('click', '#geocode-button', updateEventView.geoCode);
  $('.events-table').on('click', '.dropdown-menu a', updateEventView.changeMeetingType);
  $('.events-table').on('change', '#meetingType', updateEventView.meetingTypeChanged);
  $('.events-table').on('keyup', '.form-control', updateEventView.formChanged);
  $('.events-table').on('change', '.datetime', updateEventView.dateChanged);
  $('.events-table').on('change', '.date-string', updateEventView.dateString);
  $('.events-table').on('click', '#archive', updateEventView.archiveEvent);
  $('.events-table').on('submit', 'form', updateEventView.submitUpdateForm);
  $('.events-table').on('click', '#delete', updateEventView.deleteEvent);


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
      updateEventView.signIn();
      // No user is signed in.
    }
  });

  // Sign in fuction for firebase
  updateEventView.signIn = function signIn() {
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

  module.updateEventView = updateEventView;
})(window);
