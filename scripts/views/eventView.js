(function (module) {
  // object to hold the front end view functions
  var eventHandler = {};

  // firebase.database().ref('MOCs').once('value').then(function (snapshot) {
  //   snapshot.forEach(function(ele){
  //     var mocData = ele.val()
  //     if (mocData['govtrack_id']) {
  //       var updates = {};
  //       updates['/mocID/' + ele.key] = mocData['govtrack_id'];
  //       updates['/mocData/' + mocData['govtrack_id']] = mocData;
  //       firebase.database().ref().update(updates);
  //     } else {
  //     }
  //   })
  // })
  function setupTypeaheads() {
    var typeaheadConfig = {
      fitToElement: true,
      delay: 250,
      highlighter: function (item) { return item; }, // Kill ugly highlight
      updater: function (selection) {
        eventHandler.addFilter(this.$element.attr('data-filter'), selection);
        eventHandler.renderTableWithArray(eventHandler.getFilterState());
      }
    };
    $('#stateTypeahead').typeahead($.extend({ source: TownHall.allStates }, typeaheadConfig));
    $('#memberTypeahead').typeahead($.extend({ source: TownHall.allMoCs }, typeaheadConfig));
  }

  // render table row
  eventHandler.renderTable = function renderTable(townhall, $tableid) {
    var compiledTemplate = Handlebars.getTemplate('eventTableRow');
    $($tableid).append(compiledTemplate(townhall));
  };

  eventHandler.renderTableWithArray = function (array) {
    $('#all-events-table .event-row').remove();
    var $table = $('#all-events-table');
    var $currentState = $('#current-state');
    var total = parseInt($currentState.attr('data-total'));
    // var total = parseInt($currentState.attr('data-total'));
    var cur = array.length;
    array.forEach(function (ele) {
      eventHandler.renderTable(ele, $table);
    });
    /* eslint-env es6*/
    /* eslint quotes: ["error", "single", { "allowTemplateLiterals": true }]*/
    $currentState.text(`Viewing ${cur} of ${total} total events`);
  };

  eventHandler.getFilterState = function () {
    var data = TownHall.isCurrentContext ? TownHall.currentContext : TownHall.allTownHalls;
    return TownHall.getFilteredResults(data);
  };

  eventHandler.sortTable = function (e) {
    e.preventDefault();
    TownHall.sortOn = $(this).attr('data-filter');
    eventHandler.renderTableWithArray(eventHandler.getFilterState());
  };

  eventHandler.addFilter = function (filter, value) {
    // Avoid duplicates
    if (TownHall.filters.hasOwnProperty(filter) && TownHall.filters[filter].indexOf(value) !== -1) {
      return;
    }

    TownHall.addFilter(filter, value);

    var button = '<li><button class="btn btn-secondary btn-xs" ' +
                 'data-filter="' + filter + '" data-value="' + value + '" >' +
                    value + '<i class="fa fa-times" aria-hidden="true"></i>' +
                  '</button></li>';
    $('#filter-info').append(button);
  };

  eventHandler.removeFilter = function () {
    var $button = $(this);
    TownHall.removeFilter($button.attr('data-filter'), $button.attr('data-value'));
    eventHandler.renderTableWithArray(eventHandler.getFilterState());
    $button.parent().remove();
  };

  eventHandler.resetFilters = function () {
    TownHall.resetFilters();
    $('#filter-info li button').parent().remove();
  };
// filters the table on click
  eventHandler.filterTable = function (e) {
    e.preventDefault();
    var filter = this.getAttribute('data-filter');
    eventHandler.addFilter(filter, this.id);
    eventHandler.renderTableWithArray(eventHandler.getFilterState());
  };

  eventHandler.resetTable = function (e) {
    e.preventDefault();
    $table = $('#all-events-table');
    $table.empty();
    $('#resetTable').hide();
    TownHall.filterIds = {};
    TownHall.filteredResults = [];
    var data = TownHall.isCurrentContext ? TownHall.currentContext : TownHall.allTownHalls;
    eventHandler.renderTableWithArray(data, $table);
  };

// url hash for direct links to subtabs
// slightly hacky routing
  $(document).ready(function () {
    $('.sort').on('click', 'a', eventHandler.sortTable);
    $('.filter').on('click', 'a', eventHandler.filterTable);
    $('#filter-info').on('click', 'button.btn', eventHandler.removeFilter);
    eventHandler.resetFilters();
    setupTypeaheads();

    if (location.hash) {
      $("a[href='" + location.hash + "']").tab('show');
    } else {
      TownHall.isMap = true;
    }
    $('nav').on('click', '.hash-link', function onClickGethref(event) {
      var hashid = this.getAttribute('href');
      if (hashid === '#home' && TownHall.isMap === true) {
        history.replaceState({}, document.title, '.');
      } else {
        location.hash = this.getAttribute('href');
      }
      $('[data-toggle="popover"]').popover('hide');
    });
  });

  eventHandler.metaData = function () {
    metaDataObj = new TownHall();
    metaDataObj.topZeroResults = [];
    metaDataObj.total = TownHall.allTownHalls.length;
    var metaDataTemplate = Handlebars.getTemplate('metaData');
    $('.metadata').html(metaDataTemplate(metaDataObj));
  };

  eventHandler.checkTime = function (time) {
    var times = time.split(':');
    var hour = times[0];
    var min = times[1];
    if (times[0].length === 1) {
      hour = '0' + hour;
    }
    if (times[1].length === 1) {
      min = '0' + min;
    }
    return hour + ':' + min + ':' + times[2];
  };

  eventHandler.checkLastUpdated = function (ele) {
    if (!ele.lastUpdatedHuman) {
      var updatingDate = new TownHall();
      updatingDate.eventId = ele.eventId;
      updatingDate.lastUpdated = new Date(ele.lastUpdated).valueOf();
      updatingDate.lastUpdatedHuman = new Date(ele.lastUpdated);
      if (!updatingDate.lastUpdated) {
        updatingDate.lastUpdated = Date.now();
        updatingDate.lastUpdatedHuman = updatingDate.lastUpdated.toString();
      }
      updatingDate.updateFB(ele.eventId).then(function (dataWritten) {
        console.log(dataWritten);
      });
    }
  };
  eventHandler.checkTimeFormat = function (ele) {
    // var regEx = /\b((1[0-2]|0?[1-9]):([0-5][0-9]) ([AaPp][Mm]))/g;
    var regEx = /\b(([0-1]?[0-9])|([2][0-3])):([0-5]?[0-9])(:([0-5]?[0-9]))/g;
    if (ele.timeEnd24 && !ele.timeEnd24.match(regEx)) {
      console.log('time is not formatted', ele.timeEnd24);
      var updatingDate = new TownHall();
      updatingDate.eventId = ele.eventId;
      updatingDate.timeEnd = '';
      var hours = parseInt(ele.timeStart24.split(':')[0]);
      var mins = ele.timeStart24.split(':')[1];
      var newhours = hours + 2 <= 24 ? hours + 2 : hours - 22
      updatingDate.timeEnd24 = `${newhours}:${mins}:00`;
      updatingDate.lastUpdated = new Date(ele.lastUpdated).valueOf();
      console.log('wrting' , updatingDate);
      updatingDate.updateFB(updatingDate.eventId).then(function (dataWritten) {
        console.log(dataWritten);
      });
    }
  }

  eventHandler.checkEndTime = function (ele) {
    if (!ele.timeEnd24 && ele.timeStart24) {
      var updatingDate = new TownHall();
      updatingDate.eventId = ele.eventId;
      updatingDate.timeEnd = '';
      var hours = parseInt(ele.timeStart24.split(':')[0]);
      var mins = ele.timeStart24.split(':')[1];
      var newhours = hours + 2 <= 24 ? hours + 2 : hours - 22
      updatingDate.timeEnd24 = `${newhours}:${mins}:00`;
      updatingDate.lastUpdated = new Date(ele.lastUpdated).valueOf();
      console.log('wrting' , updatingDate);
      updatingDate.updateFB(updatingDate.eventId).then(function (dataWritten) {
        console.log(dataWritten);
      });
    } else if (!ele.timeStart24) {
      console.log('no start time', ele.eventId);
    }
  }

  eventHandler.readData = function (path) {
    $currentState = $('#current-state');
    firebase.database().ref(path).on('child_added', function getSnapShot(snapshot) {
      var total = parseInt($currentState.attr('data-total')) + 1;
      $currentState.attr('data-total', total);
      var ele = new TownHall(snapshot.val());
      var id = ele.eventId;
      obj = {};
      eventHandler.checkLastUpdated(ele);
      eventHandler.checkEndTime(ele);
      TownHall.allTownHallsFB[ele.eventId] = ele;
      TownHall.allTownHalls.push(ele);
      TownHall.addFilterIndexes(ele);
      eventHandler.checkTimeFormat(ele);
      var tableRowTemplate = Handlebars.getTemplate('eventTableRow');
      var teleInputsTemplate = Handlebars.getTemplate('teleInputs');
      var ticketInputsTemplate = Handlebars.getTemplate('ticketInputs');
      if (ele.timeStart24 && ele.timeEnd24) {
        if (parseInt(ele.timeStart24.split(':')[0]) > 23 || parseInt(ele.timeEnd24.split(':')[0]) > 23) {
          console.log('24 hour time error: ', ele.eventId);
        } else {
          ele.timeStart24 = eventHandler.checkTime(ele.timeStart24);
          ele.timeEnd24 = eventHandler.checkTime(ele.timeEnd24);
        }
      }
      if (ele.yearMonthDay) {
        var month = ele.yearMonthDay.split('-')[1];
        var day = ele.yearMonthDay.split('-')[2];
        if (!month || !day) {
          console.log('date error', ele.eventId);
        } else {
          if (month.length === 1) {
            month = 0 + month;
          }
          if (day.length === 1) {
            day = 0 + day;
          }
          ele.yearMonthDay = ele.yearMonthDay.split('-')[0] + '-' + month + '-' + day;
        }
      }

      var $toAppend = $(tableRowTemplate(ele));
      if (!ele.meetingType) {
        console.log('missing meeting type: ', ele.eventId);
      } else {
        switch (ele.meetingType.slice(0, 4)) {
          case 'Tele':
            $toAppend.find('.location-data').html(teleInputsTemplate(ele));
            break;
          case 'Tick':
            $toAppend.find('.location-data').html(ticketInputsTemplate(ele));
            break;
        }
      }
      if (!ele.lat) {
        $('#location-errors').append($toAppend.clone());
      }
      if (!ele.zoneString && !ele.repeatingEvent && ele.meetingType !== 'Tele-Town Hall') {
        $('#date-errors').append($toAppend.clone());
      }
      if (ele.dateObj < Date.now() && !ele.repeatingEvent) {
        $('#for-archive').append($toAppend.clone());
      }
      $('#all-events-table').append($toAppend);
    });
    $('[data-toggle="tooltip"]').tooltip();
  };


  eventHandler.readDataUsers = function () {
    firebase.database().ref('/UserSubmission/').on('child_added', function getSnapShot(snapshot) {
      var ele = new TownHall(snapshot.val());
      var id = ele.eventId;
      obj = {};
      TownHall.allTownHallsFB[ele.eventId] = ele;
      var tableRowTemplate = Handlebars.getTemplate('eventTableRow');
      var teleInputsTemplate = Handlebars.getTemplate('teleInputs');
      var ticketInputsTemplate = Handlebars.getTemplate('ticketInputs');
      var approveButtons = Handlebars.getTemplate('approveButtons');

      if (ele.timeStart24 && ele.timeEnd24) {
        if (parseInt(ele.timeStart24.split(':')[0]) > 23 || parseInt(ele.timeEnd24.split(':')[0]) > 23) {
          console.log(ele.eventId);
        } else {
          ele.timeStart24 = eventHandler.checkTime(ele.timeStart24);
          ele.timeEnd24 = eventHandler.checkTime(ele.timeEnd24);
        }
      }

      if (ele.yearMonthDay) {
        var month = ele.yearMonthDay.split('-')[1];
        var day = ele.yearMonthDay.split('-')[2];
        if (month && month.length === 1) {
          month = 0 + month;
        }
        if (day && day.length === 1) {
          day = 0 + day;
        }
        ele.yearMonthDay = ele.yearMonthDay.split('-')[0] + '-' + month + '-' + day;
      }
      ele.lastUpdatedHuman = new Date(ele.lastUpdated).toDateString();
      var $toAppend = $(tableRowTemplate(ele));
      if (!ele.meetingType) {
        console.log('no meeting type', ele);
      } else {
        switch (ele.meetingType.slice(0, 4)) {
          case 'Tele':
            $toAppend.find('.location-data').html(teleInputsTemplate(ele));
            break;
          case 'Tick':
            $toAppend.find('.location-data').html(ticketInputsTemplate(ele));
            break;
        }
      }
      $toAppend.find('.btn-group').html(approveButtons(ele));
      $('#for-approval').append($toAppend);
    });
    $('[data-toggle="tooltip"]').tooltip();
  };

  module.eventHandler = eventHandler;
})(window);
