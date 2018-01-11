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
  eventHandler.setupTypeaheads = function setupTypeaheads() {
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
  };

  eventHandler.setupTypeaheadsAllMocs = function(input) {
    var typeaheadConfig = {
      fitToElement: true,
      delay: 200,
      highlighter: function(item) { return item; }, // Kill ugly highlight
      filter: function(selection) {
        $(input).val(selection);
      }
    };
    Moc.loadAll().then(function(allnames){
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
    $table = $('#all-events-table');
    $table.empty();
    $('#resetTable').hide();
    TownHall.filterIds = {};
    TownHall.filteredResults = [];
    var data = TownHall.isCurrentContext ? TownHall.currentContext : TownHall.allTownHalls;
    eventHandler.renderTableWithArray(data, $table);
  };

  eventHandler.getDateRange = function() {
    var dateStart = moment($('#start-date').val()).startOf('day');
    dateStart = dateStart.isValid() ? dateStart : moment('2017-01-01').startOf('day');
    var dateEnd = moment($('#end-date').val()).endOf('day');
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

  eventHandler.lookupOldEvents = function(event){
    event.preventDefault();
    clearCSVOutput();
    var para = document.createTextNode('Loading...');
    document.getElementById('download-csv-events-list').appendChild(para);
    var dates = eventHandler.getDateRange().dates;
    var key = $('#lookup-key').val();
    var value = $('#lookup-value').val();
    var totalCount = 0;
    var allEvents = [];
    dates.forEach(function(date, index){
      TownHall.getOldData(key, value, date).then(function(returnedSet){
        totalCount = totalCount + returnedSet.size;
        var returnedArr = Array.from(returnedSet);
        allEvents = allEvents.concat(returnedArr);
        if (index + 1 === dates.length) {
          $('#lookup-results').val(totalCount);
          clearCSVOutput();
          var fileDownloadName = value + '.csv';
          CSVTownHall.makeDownloadButton('Download Events (csv)', allEvents, fileDownloadName, 'download-csv-events-list');
        }
      });
    });
  };

  var clearCSVOutput = function() {
    var list = document.getElementById('download-csv-events-list');
    while(list.firstChild) {
      list.removeChild(list.firstChild);
    }
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
    $('.hash-link.' + flag).removeClass('hidden');
  };

  eventHandler.readData = function (path) {

    $currentState = $('#current-state');
    firebase.database().ref(path).on('child_added', function getSnapShot(snapshot) {
      var total = parseInt($currentState.attr('data-total')) + 1;
      $currentState.attr('data-total', total);
      var ele = new TownHall(snapshot.val());
      obj = {};
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
      eventHandler.setupTypeaheads();
      DownLoadCenter.downloadButtonHandler('ACLU-download', ACLUTownHall.download, false);
      DownLoadCenter.downloadButtonHandler('CAP-download', CSVTownHall.download, false, 'CAP CSV download');
      DownLoadCenter.downloadButtonHandler('SC-download', CSVTownHall.download, false, 'Sierra Club CSV download');
    });
    $('[data-toggle="tooltip"]').tooltip();
  };


  eventHandler.readDataUsers = function (path, table) {
    firebase.database().ref(path).on('child_added', function getSnapShot(snapshot) {
      var ele = new TownHall(snapshot.val());
      obj = {};
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
      $toAppend.find('.btns').html(approveButtons(ele));
      $(table).append($toAppend);
    });
  };


  module.eventHandler = eventHandler;
})(window);
