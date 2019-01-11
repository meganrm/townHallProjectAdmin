/* globals eventHandler */
(function (module) {
// For handling user submitted events.

  var updateEventView = {};
  TownHall.currentKey =  null;

  updateEventView.updatedView = function updatedView($form, $listgroup) {
    var preview = Handlebars.getTemplate('previewEvent');
    var updated = $form.find('.edited').get();
    var id = $form.attr('id').split('-form')[0];
    var timeFormats = ['hh:mm A', 'h:mm A'];
    var updates = updated.reduce(function (newObj, cur) {
      var $curValue = $(cur).val();
      switch (cur.id) {
      case 'timeStart24':
        newObj.timeStart24 = moment($curValue, timeFormats).format('HH:mm:ss');
        newObj.Time = moment($curValue, timeFormats).format('h:mm A');
        var tempEnd = moment($curValue, timeFormats).add(2, 'h');
        newObj.timeEnd24 = moment(tempEnd).format('HH:mm:ss');
        newObj.timeEnd = moment(tempEnd).format('h:mm A');
        break;
      case 'timeEnd24':
        newObj.timeEnd24 = moment($curValue, timeFormats).format('HH:mm:ss');
        newObj.timeEnd = moment($curValue, timeFormats).format('h:mm A');
        break;
      case 'yearMonthDay':
        newObj[cur.id] = $curValue;
        var dateFormats = ['YYYY-MM-DD', 'MM/DD/YYYY', 'MM-DD-YYYY', 'MMMM D, YYYY'];
        newObj.dateString = moment($curValue, dateFormats).format('ddd, MMM D YYYY');
        // newObj.Date = moment($curValue, dateFormats).format('ddd, MMM D YYYY');
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
      $(`#for-archive #${id}`).remove();
      $(`#all-events-table #${id}`).remove();
    });
  };

  updateEventView.saveDeleteReason = function(id, reason) {
    var oldTownHall = TownHall.allTownHallsFB[id];
    firebase.database().ref(`deletedTownHalls/${oldTownHall.userID}`).update({
      user: oldTownHall.enteredBy,
      reason: reason,
      townHall: oldTownHall,
    }).catch((e) => {
      console.log(e);
    });
  };

  updateEventView.deleteEvent = function (event) {
    event.preventDefault();
    var $deleteButton = $(this);
    var id = $deleteButton.attr('data-id');
    var oldTownHall = TownHall.allTownHallsFB[id];
    var path = $deleteButton.attr('data-path');
    var listID = $deleteButton.closest('.events-table').attr('id');
    var reason;
    console.log(listID);
    if (listID === 'for-approval' || listID === 'for-approval-state') {
      reason = $deleteButton.attr('data-delete-reason');
      console.log(reason);
      if (reason) {
        updateEventView.saveDeleteReason(id, reason);
      }
    }
    console.log(id, path, oldTownHall);
    oldTownHall.deleteEvent(path).then(function () {
      delete TownHall.allTownHallsFB[id];
      $(`.${id}`).remove();
    }).catch((e) => {
      console.log(e);
    });
  };

  updateEventView.validateDate = function (id, databaseTH, newTownHall) {
    var dateUpdated = newTownHall;
    if (databaseTH.timeZone || databaseTH.meetingType.slice(0, 4) === 'Tele') {
      var timeZone = databaseTH.timeZone;
      dateUpdated.dateObj = timeZone ? new Date(dateUpdated.dateString.replace(/-/g, '/') + ' ' + databaseTH.Time + ' ' + timeZone).getTime() : new Date(newTownHall.dateString.replace(/-/g, '/') + ' ' + databaseTH.Time).getTime();
      dateUpdated.dateValid = dateUpdated.dateObj ? true : false;
      return (dateUpdated);
    } else if (databaseTH.lat) {
      console.log('getting time zone');
      dateUpdated.validateZone(id).then(function (returnedTH) {
        returnedTH.updateFB(id);
        console.log('writing to database: ', returnedTH);
      }).catch(function (error) {
        console.log('could not get timezone', error);
      });
    } else {
      dateUpdated.dateObj = new Date(dateUpdated.dateString.replace(/-/g, '/') + ' ' + databaseTH.Time).getTime();
      dateUpdated.dateValid = newTownHall.dateObj ? true : false;
      return (dateUpdated);
    }
  };

  updateEventView.updateMOCEvents = function (dataWritten) {
    if (dataWritten.govtrack_id) {
      console.log('govtrack_id', dataWritten);
      firebase.database().ref('mocData/' + dataWritten.govtrack_id + '/' + dataWritten.meetingType + '/' + dataWritten.eventId).set(dataWritten.eventId);
      if (dataWritten.meetingType === 'Town Hall' && moment(dataWritten.dateObj).isBefore('2018-8-8')) {
        firebase.database().ref('mocData/' + dataWritten.govtrack_id + '/missingMember').set(false);
      }
    }
  };

  updateEventView.approveNewEvent = function($form, preview) {
    var key = $form.closest('.list-group-item').attr('id');
    var approvedTH = TownHall.allTownHallsFB[key];
    if (!approvedTH.Member) {
      return console.log('Needs a member');
    }
    approvedTH.displayDistrict = null;
    delete approvedTH.displayDistrict;
    approvedTH.updateFB(key).then(function (dataWritten) {
      if (dataWritten.eventId) {
        console.log(dataWritten);
        var print = dataWritten;
        updateEventView.updateMOCEvents(dataWritten);
        print.writtenId = key;
        print.edit = 'updated';
        $('#edited').append(preview(print));
        dataWritten.deleteEvent('UserSubmission').then(function () {
          $(`#for-approval #${key}`).remove();
        });
      }
    }).catch(function(error){
      $form.find('.write-error').removeClass('hidden');
      console.log(error);
    });
    $form.find('#update-button').removeClass('btn-blue');
  };

  updateEventView.approveNewStateEvent = function($form, preview) {
    var key = $form.closest('.list-group-item').attr('id');
    var approvedTH = TownHall.allTownHallsFB[key];
    if (!approvedTH.Member) {
      return console.log('Needs a member');
    }
    if (!approvedTH.state) {
      return console.log('Needs state');
    }
    approvedTH.displayDistrict = null;
    delete approvedTH.displayDistrict;
    approvedTH.updateFB(key, `state_townhalls/${approvedTH.state}/`).then(function (dataWritten) {
      if (dataWritten.eventId) {
        console.log(dataWritten);
        var print = dataWritten;
        updateEventView.updateMOCEvents(dataWritten);
        print.writtenId = key;
        print.edit = 'updated';
        $('#edited').append(preview(print));
        dataWritten.deleteEvent(`state_legislators_user_submission/${approvedTH.state}`).then(function () {
          $(`#for-approval-state #${key}`).remove();
        });
      }
    }).catch(function(error){
      $form.find('.write-error').removeClass('hidden');
      console.log(error);
    });
    $form.find('#update-button').removeClass('btn-blue');
  };


  updateEventView.submitUpdateForm = function (event) {
    event.preventDefault();
    var $form = $(this);
    var listID = $form.closest('.events-table').attr('id');
    var preview = Handlebars.getTemplate('previewEvent');
    if (listID === 'for-approval') {
      console.log('Approving US event');
      updateEventView.approveNewEvent($form, preview);

    } else if (listID === 'for-approval-state') {
      console.log('Approving state event');
      updateEventView.approveNewStateEvent($form, preview);

    } else {
      var $listgroup = $(this).parents('.list-group-item');
      var updated = $form.find('.edited').get();
      var id = $form.attr('id').split('-form')[0];
      var databaseTH = TownHall.allTownHallsFB[id];
      console.log('updating: ', updated);
      if (updated.length > 0) {
        var newTownHall = updateEventView.updatedView($form, $listgroup);
        newTownHall.lastUpdatedHuman = $form.find('#lastUpdatedHuman').val();
        newTownHall.lastUpdated = Date.now();
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
        if (newTownHall.dateString) {
          newTownHall = updateEventView.validateDate(id, databaseTH, newTownHall);
        }
        if (newTownHall) {
          var path = '/townHalls/';
          if (listID === 'state-events-table') {
            var state = $('#' + listID).attr('data-state');
            path = '/state_townhalls/' + state + '/';
          }
          newTownHall.updateFB(id, path).then(function (dataWritten) {
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
      $form.find('#locationCheck').val('');
      updateEventView.geoCode($input);
      $form.find('#location-form-group').removeClass('has-success');
      $form.find('#address-feedback').html('Enter a valid street address, if there isn\'t one, leave this blank');
    }
  };

  updateEventView.dateChanged = function () {
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
    var id = $listgroup.attr('id');
    let newTownHall = new TownHall();
    let type = $form.find('#addressType').val();
    newTownHall.getLatandLog(address, type).then(function (geotownHall) {
      console.log('geocoding!', geotownHall);
      $form.find('#locationCheck').val('Location is valid');
      $form.find('#address').val(geotownHall.address);
      if (id) {
        TownHall.allTownHallsFB[id].lat = geotownHall.lat;
        TownHall.allTownHallsFB[id].lng = geotownHall.lng;
        console.log('updating datbase lat lng', TownHall.allTownHallsFB[id]);
        updateEventView.updatedView($form, $listgroup);
      } else {
        console.log('something has gone terribly wrong, email megan');
      }
    }).catch(function () {
      $form.find('#locationCheck').val('Geocoding failed');
    });
  };

  updateEventView.changeMeetingType = function (event) {
    event.preventDefault();
    let $form = $(this).parents('form');
    var value = $(this).attr('data-value');
    $form.find('#meetingType').val(value).addClass('edited');
    $form.find('#meetingType').change();
  };

  updateEventView.changeChamberType = function (event) {
    event.preventDefault();
    let $form = $(this).parents('form');
    var value = $(this).attr('data-value');
    $form.find('#chamber').val(value).addClass('edited');
    $form.find('#chamber').change();
    var $listgroup = $(this).parents('.list-group-item');
    let $districtForm = $(this).parents('.input-group').prev();
    if (value === 'upper') {
      $districtForm.addClass('hidden');
      $districtForm.find('#district').val(null);
      updateEventView.formChanged.call($districtForm.find('#district'));
    } else {
      $districtForm.removeClass('hidden');
    }

    updateEventView.updatedView($form, $listgroup);
  };

  updateEventView.changeDeleteReason = function (event) {
    event.preventDefault();
    let $form = $(this).parents('form');
    var value = $(this).attr('data-value');
    $form.find('#delete-reason').val(value);
    $form.find('#delete-error').addClass('hidden');
    $form.find('#delete').attr('data-delete-reason', value);
  };

  updateEventView.changeIconFlag = function (event) {
    event.preventDefault();
    console.log(this);
    let $form = $(this).parents('form');
    var value = $(this).attr('data-value');
    $form.find('#iconFlag').val(value);
    $form.find('#iconFlag').change();
  };

  updateEventView.changeParty = function(event) {
    event.preventDefault();
    console.log(this);
    let $form = $(this).parents('form');
    var value = $(this).attr('data-value');
    $form.find('#party').val(value);
    $form.find('#party').change();
  };

  updateEventView.showHideMeetingTypeFields = function(value, $form) {
    switch (value) {
    case 'Tele-Town Hall':
      $form.find('.general-inputs').addClass('hidden');
      $form.find('.tele-inputs').removeClass('hidden');
      $form.find('#iconFlag').val('tele').addClass('edited');
      //TODO: regeocode
      // newEventView.geoCodeOnState();
      break;
    case 'Adopt-A-District/State':
      $form.find('.general-inputs').removeClass('hidden');
      $form.find('.adopter-data').removeClass('hidden');
      if ($form.find('#iconFlag').val().length === 0) {
        $form.find('#iconFlag').val('activism').addClass('edited');
      }
      // setupTypeaheads('#districtAdopter');
      break;
    case 'Ticketed Event':
      $form.find('#iconFlag').val('in-person').addClass('edited');
      $form.find('.general-inputs').removeClass('hidden');
      break;
    case 'Office Hours':
      $form.find('#iconFlag').val('staff').addClass('edited');
      $form.find('.general-inputs').removeClass('hidden');
      break;
    case 'Town Hall':
      $form.find('.general-inputs').removeClass('hidden');
      if ($form.find('#iconFlag').val().length === 0) {
        $form.find('#iconFlag').val('in-person').addClass('edited');
      }
      break;
    case 'Candidate Town Hall':
      $form.find('.general-inputs').removeClass('hidden');
      if ($form.find('#iconFlag').val().length === 0) {
        $form.find('#iconFlag').val('campaign').addClass('edited');
      }
      break;
    case 'Hearing':
      $('.general-inputs').removeClass('hidden');
      if ($form.find('#iconFlag').val().length === 0) {
        $form.find('#iconFlag').val('').addClass('edited');
      }
      break;
    case 'Empty Chair Town Hall':
      $form.find('.general-inputs').removeClass('hidden');
      if ($form.find('#iconFlag').val().length === 0) {
        $form.find('#iconFlag').val('activism').addClass('edited');
      }
      break;
    default:
      $form.find('.general-inputs').removeClass('hidden');
    }
  };

  updateEventView.meetingTypeChanged = function (event) {
    event.preventDefault();
    var $form = $(this).parents('form');
    var value = $(this).val();
    $form.find('.non-standard').addClass('hidden');
    $form.find('#meetingType-error').addClass('hidden');
    $form.find('#meetingType').parent().removeClass('has-error');
    var $listgroup = $(this).parents('.list-group-item');
    updateEventView.showHideMeetingTypeFields(value, $form);
    updateEventView.updatedView($form, $listgroup);
  };

  updateEventView.loadOldEvents = function() {
  };

  updateEventView.validateMember = function (member, $errorMessage, $memberformgroup) {
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

  updateEventView.memberChanged = function () {
    var $memberInput = $(this);
    var member = $memberInput.val();
    var $listgroup = $(this).parents('.list-group-item');
    var id = $listgroup.attr('id');
    var $form = $(this).parents('form');
    var $errorMessage = $('.new-event-form #member-help-block');
    var $memberformgroup = $('#member-form-group');

    if (updateEventView.validateMember(member, $errorMessage, $memberformgroup)) {
      var District = $form.find('#District');

      Moc.getMember(member).then(function(mocdata){
        var districtV0;
        var districtV1;
        if (mocdata.type === 'sen') {
          districtV0 = 'Senate';
          districtV1 = false;
        } else if (mocdata.type === 'rep') {
          districtV0 = mocdata.state + '-' + mocdata.district;
          districtV1 = mocdata.district;
        }
        District.val(districtV0);
        var fullname = mocdata.displayName;
        $memberInput.val(fullname);
        TownHall.allTownHallsFB[id].Member = fullname;
        TownHall.allTownHallsFB[id].District = districtV0;
        TownHall.allTownHallsFB[id].district = districtV1;
        TownHall.allTownHallsFB[id].govtrack_id = mocdata.govtrack_id;
        TownHall.allTownHallsFB[id].Party = mocdata.party;
        TownHall.allTownHallsFB[id].state = mocdata.state;
        TownHall.allTownHallsFB[id].stateName = statesAb[mocdata.state];
        TownHall.allTownHallsFB[id].State = statesAb[mocdata.state];

        $errorMessage.html('');
        $memberformgroup.removeClass('has-error').addClass('has-success');
      }).catch(function(errorMessage){
        $('#member-form-group').addClass('has-error');
        $('.new-event-form #member-help-block').html('You can still submit this event, but the lookup failed. Please email meganrm@townhallproject.com this message: ', errorMessage);
      });
    }
  };

  // event listeners for table interactions
  $('.events-table').on('click', '#geocode-button', updateEventView.geoCode);
  $('.events-table').on('click', '.chamber-dropdown a', updateEventView.changeChamberType);
  $('.events-table').on('click', '.meeting-type-dropdown a', updateEventView.changeMeetingType);
  $('.events-table').on('click', '.delete-reason-choice a', updateEventView.changeDeleteReason);
  $('.events-table').on('click', '.icon-flag-dropdown a', updateEventView.changeIconFlag);
  $('.events-table').on('click', '.party-dropdown a', updateEventView.changeParty);
  $('.events-table').on('change', '#meetingType', updateEventView.meetingTypeChanged);
  $('.events-table').on('change', '#iconFlag', updateEventView.formChanged);
  $('.events-table').on('change', '#party', updateEventView.formChanged);
  $('.events-table').on('keyup', '.event-input', updateEventView.formChanged);
  $('.events-table').on('change', '.datetime', updateEventView.dateChanged);
  $('.events-table').on('change', '.date-string', updateEventView.dateString);
  $('.events-table').on('click', '#archive', updateEventView.archiveEvent);
  $('.events-table').on('submit', 'form', updateEventView.submitUpdateForm);
  $('.events-table').on('click', '#delete', updateEventView.deleteEvent);
  $('.events-table').on('click', '#archive-button', eventHandler.archiveSubmission);
  $('#archived-lookup').on('submit', updateEventView.loadOldEvents);
  $('#for-approval').on('change', '#Member', updateEventView.memberChanged);
  $('#for-approval').on('click', '.icon-flag-dropdown a', updateEventView.changeIconFlag);

  $('#scroll-to-top').on('click', function () {
    $('html, body').animate({ scrollTop: 0 }, 'slow');
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

  // DownLoadCenter.downloadButtonHandler('user-download', User.download, 'isAdmin');

  module.updateEventView = updateEventView;
})(window);
