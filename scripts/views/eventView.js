/*globals PartnerCsvTownHall ACLUTownHall updateEventView DownLoadCenter */

(function (module) {
  // object to hold the front end view functions
  var eventHandler = {};

  eventHandler.setupTypeaheads = function setupTypeaheads() {
    var typeaheadConfig = {
      fitToElement: true,
      delay: 250,
      highlighter: function (item) { return item; }, // Kill ugly highlight
      updater: function (selection) {
        eventHandler.addFilter(this.$element.attr('data-filter'), selection);
        eventHandler.renderTableWithArray(eventHandler.getFilterState());
      },
    };

    $('#stateTypeahead').typeahead($.extend({ source: TownHall.allStates }, typeaheadConfig));
    $('#memberTypeahead').typeahead($.extend({ source: TownHall.allMoCs }, typeaheadConfig));
  };

  eventHandler.setupTypeaheadsAllMocs = function(input) {
    var typeaheadConfig = {
      fitToElement: true,
      delay: 200,
      highlighter: function(item) { return item; }, // Kill ugly highlight
      filter: function(selection) {
        $(input).val(selection);
      },
    };
    Moc.loadAllByName().then(function(allnames){
      Moc.allNames = allnames;
      $(input).each(function(){
        $(this).typeahead({source: allnames}, typeaheadConfig);
      });
    });
  };

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
    var $table = $('#all-events-table');
    $table.empty();
    $('#resetTable').hide();
    TownHall.filterIds = {};
    TownHall.filteredResults = [];
    var data = TownHall.isCurrentContext ? TownHall.currentContext : TownHall.allTownHalls;
    eventHandler.renderTableWithArray(data, $table);
  };

  eventHandler.getDateRange = function() {
    var dateStart = moment($('#start-date').val()).startOf('day').isValid() ? moment($('#start-date').val()).startOf('day') : moment($('#download-start-date').val()).startOf('day');
    dateStart = dateStart.isValid() ? dateStart : moment('2017-01-01').startOf('day');
    var dateEnd = moment($('#end-date').val()).endOf('day').isValid() ? moment($('#end-date').val()).endOf('day') : moment($('#download-end-date').val()).endOf('day');
    dateEnd = dateEnd.isValid() ? dateEnd : moment().endOf('day');
    var start = dateStart.valueOf();
    var end = dateEnd.valueOf();
    var dates = [];

    while (dateEnd > dateStart || dateStart.isSame(dateEnd, 'month') === true) {
      var monthZeroIndex = dateStart.month();
      dates.push(dateStart.format('YYYY-' + monthZeroIndex));
      dateStart.add(1,'month');
    }
    return {
      dates: dates,
      start: start,
      end: end,
    };
  };



  eventHandler.createFileName = function(searchObj) {
    let fileName = 'Results';
    if (searchObj['Member']) {
      fileName = searchObj['Member'];
    } else if (searchObj['state']) {
      fileName = searchObj['state'];
    } else if (searchObj['Meeting_Type']) {
      fileName = searchObj['Meeting_Type'];
    } else if (searchObj['District']) {
      fileName = searchObj['Meeting_Type'];
    } else if (searchObj['Party']) {
      fileName = searchObj['Party'];
    }
    fileName = fileName.concat('.csv');

    return fileName;
  };

// url hash for direct links to subtabs
// slightly hacky routing


  eventHandler.metaData = function () {

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
      var newhours = hours + 2 <= 24 ? hours + 2 : hours - 22;
      updatingDate.timeEnd24 = `${newhours}:${mins}:00`;
      updatingDate.lastUpdated = new Date(ele.lastUpdated).valueOf();
      console.log('wrting' , updatingDate);
      updatingDate.updateFB(updatingDate.eventId).then(function (dataWritten) {
        console.log(dataWritten);
      });
    }
  };

  eventHandler.checkEndTime = function (ele) {
    if (!ele.timeEnd24 && ele.timeStart24) {
      var updatingDate = new TownHall();
      updatingDate.eventId = ele.eventId;
      updatingDate.timeEnd = '';
      var hours = parseInt(ele.timeStart24.split(':')[0]);
      var mins = ele.timeStart24.split(':')[1];
      var newhours = hours + 2 <= 24 ? hours + 2 : hours - 22;
      updatingDate.timeEnd24 = `${newhours}:${mins}:00`;
      updatingDate.lastUpdated = new Date(ele.lastUpdated).valueOf();
      console.log('wrting', updatingDate);
      updatingDate.updateFB(updatingDate.eventId).then(function (dataWritten) {
        console.log(dataWritten);
      });
    } else if (!ele.timeStart24) {
      console.log('no start time', ele.eventId);
    }
  };
  eventHandler.renderNav = function(flag) {
    if (!flag) {
      $('.var-nav').addClass('hidden');
      return;
    }
    $('.var-nav.' + flag).removeClass('hidden');
  };

  eventHandler.readData = function (path) {
    var $currentState = $('#current-state');
    firebase.database().ref(path).on('child_added', function getSnapShot(snapshot) {
      var total = parseInt($currentState.attr('data-total')) + 1;
      $currentState.attr('data-total', total);
      var ele = new TownHall(snapshot.val());
      // dataviz.recessProgress(ele, dataviz.membersEvents);
      eventHandler.checkLastUpdated(ele);
      eventHandler.checkEndTime(ele);
      TownHall.allTownHallsFB[ele.eventId] = ele;
      TownHall.allTownHalls.push(ele);
      TownHall.addFilterIndexes(ele);
      eventHandler.checkTimeFormat(ele);
      var tableRowTemplate = Handlebars.getTemplate('eventTableRow');

      var $toAppend = $(tableRowTemplate(ele));
      if (!ele.meetingType) {
        console.log('no meeting type', ele);
      } else {
        updateEventView.showHideMeetingTypeFields(ele.meetingType, $toAppend);
      }
      $('#all-events-table').append($toAppend);
    });
    firebase.database().ref(path).once('value').then(function(){
      eventHandler.setupTypeaheadsAllMocs('#for-approval .member-input');
      eventHandler.setupTypeaheadsAllMocs('#searchInput');
      eventHandler.setupTypeaheads();
      DownLoadCenter.downloadButtonHandler('ACLU-download', ACLUTownHall.download, false);
      DownLoadCenter.downloadButtonHandler('CAP-download', PartnerCsvTownHall.download, false, 'CAP CSV download');
      DownLoadCenter.downloadButtonHandler('SC-download', PartnerCsvTownHall.download, false, 'Sierra Club CSV download');
    });
    $('[data-toggle="tooltip"]').tooltip();
  };

  eventHandler.readStateData = function (path) {
    var $currentState = $('#current-state');
    firebase.database().ref(path).on('child_added', function getSnapShot(snapshot) {
      var total = parseInt($currentState.attr('data-total')) + 1;
      $currentState.attr('data-total', total);
      var ele = new TownHall(snapshot.val());
      // eventHandler.checkLastUpdated(ele);
      // eventHandler.checkEndTime(ele);
      // eventHandler.checkTimeFormat(ele);

      TownHall.allTownHallsFB[ele.eventId] = ele;
      TownHall.allTownHalls.push(ele);
      TownHall.addFilterIndexes(ele);
      var tableRowTemplate = Handlebars.getTemplate('eventTableRow');

      var $toAppend = $(tableRowTemplate(ele));
      if (!ele.meetingType) {
        console.log('no meeting type', ele);
      } else {
        updateEventView.showHideMeetingTypeFields(ele.meetingType, $toAppend);
      }
      $('#state-events-table').append($toAppend);
    });
    $('[data-toggle="tooltip"]').tooltip();
  };


  eventHandler.readDataUsers = function (path, table) {
    firebase.database().ref(path).on('child_added', function getSnapShot(snapshot) {
      var ele = new TownHall(snapshot.val());
      TownHall.allTownHallsFB[ele.eventId] = ele;
      var tableRowTemplate = Handlebars.getTemplate('eventTableRow');
      var approveButtons = Handlebars.getTemplate('approveButtons');
      ele.lastUpdatedHuman = new Date(ele.lastUpdated).toDateString();
      var $toAppend = $(tableRowTemplate(ele));
      if (!ele.meetingType) {
        console.log('no meeting type', ele);
      } else {
        updateEventView.showHideMeetingTypeFields(ele.meetingType, $toAppend);
      }
      if (!ele.lat) {
        $toAppend.find('#geocode-button').removeClass('disabled');
        $toAppend.find('#geocode-button').addClass('btn-blue');
        $toAppend.find('#locationCheck').val('');
      }
      var buttonInfo = {
        eventId: ele.eventId,
        path: path,
      };
      $toAppend.find('.btns').html(approveButtons(buttonInfo));
      $(table).append($toAppend);
    });
  };

  ///Archive userSubmissions
  eventHandler.archiveSubmission = function(event){ 
    firebase.database().ref(event.target.dataset.path).child(event.target.dataset.id).once('value')
      .then(function (snapshot) {
        var townHall = snapshot.val();
        var year = new Date(townHall.dateObj).getFullYear();
        var month = new Date(townHall.dateObj).getMonth();
        var dateKey = year + '-' + month;

        firebase.database().ref('/townHallsOld/' + dateKey + '/' + event.target.dataset.id).update(townHall);

        firebase.database().ref(event.target.dataset.path).child(event.target.dataset.id).remove();
        $(`#${event.target.dataset.id}`).remove();
        console.log('Event archived');
      })
      .catch(console.log);
  };


  module.eventHandler = eventHandler;
})(window);
