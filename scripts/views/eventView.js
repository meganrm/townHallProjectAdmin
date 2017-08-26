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

  eventHandler.lookupOldEvents = function(event){
    event.preventDefault();
    var currentMonth = moment().get('month');
    var key = $('#lookup-key').val();
    var value = $('#lookup-value').val();
    var dates = [];
    for (var i = 0; i < currentMonth + 1; i++) {
      dates.push('2017-' + i);
    }
    console.log(key, value, dates);
    var totalCount = 0;
    dates.forEach(function(date, index){
      TownHall.getOldData(key, value, date).then(function(returnedSet){
        totalCount = totalCount + returnedSet.size;
        if (index + 1 === dates.length) {
          console.log(totalCount);
          $('#lookup-results').val(totalCount);
        }
      });
    });
  };

// url hash for direct links to subtabs
// slightly hacky routing
  $(document).ready(function () {
    $('#lookup-old-events-form').on('submit', eventHandler.lookupOldEvents);
    $('.sort').on('click', 'a', eventHandler.sortTable);
    $('.filter').on('click', 'a', eventHandler.filterTable);
    $('#filter-info').on('click', 'button.btn', eventHandler.removeFilter);
    eventHandler.resetFilters();
    setupTypeaheads();

    if (location.hash) {
      $('a[href=\'' + location.hash + '\']').tab('show');
    } else {
      TownHall.isMap = true;
    }
    $('nav').on('click', '.hash-link', function onClickGethref() {
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

  eventHandler.initalProgressBar = function initalProgressBar(total, $total){
    currentNoEvents = Number($total.attr('data-count'));
    $total.attr('data-count', currentNoEvents);
    widthNoEvents = currentNoEvents / total * 100;
    $total.width(widthNoEvents + '%');
    $total.text(currentNoEvents);
  };

  var max = 100;

  function updateTotalEventsBar($bar){
    current = Number($bar.attr('data-count'));
    max = Number($bar.attr('data-max'));
    updated = current + 1;
    max = updated > max ? updated : max;
    width = updated / (max + 50) * 100;
    $bar.attr('data-count', updated);
    $bar.width(width + '%');
    $bar.text(updated);
  }

  function updateProgressBar($bar, total, $total){
    current = Number($bar.attr('data-count'));
    updated = current + 1;
    $bar.attr('data-count', updated);
    width = updated / total * 100;
    $bar.width(width + '%');
    $bar.text(updated);

    currentNoEvents = Number($total.attr('data-count'));
    updatedNoEvents = currentNoEvents - 1;
    $total.attr('data-count', updatedNoEvents);
    widthNoEvents = updatedNoEvents / total * 100;
    $total.width(widthNoEvents + '%');
    $total.text(updatedNoEvents);
  }

  function parseBars(party, chamber, newMember, total) {
    if (newMember) {
      $memberBar = $(`.${party}-aug-progress-${chamber}`);
      $total = $(`.${party}-${chamber}`);
      updateProgressBar($memberBar, total, $total);
    }
    $bar = $(`.${party}-aug-total-${chamber}`);
    updateTotalEventsBar($bar);
  }

  eventHandler.membersEvents = new Set();
  eventHandler.recessProgress = function (townhall) {
    var total;
    var  newMember = false;

    if (moment(townhall.dateObj).isBetween('2017-07-29', '2017-09-04', []) && townhall.meetingType ==='Town Hall') {
        if (!eventHandler.membersEvents.has(townhall.Member)) {
          newMember = true;
          eventHandler.membersEvents.add(townhall.Member);
        }
        if (townhall.Party === 'Republican') {
          party = 'rep';
        } else {
          party = 'dem';
        }
        if (townhall.district) {
          total = 434;
          chamber = 'house';
        } else if (townhall.District === 'Senate') {
          total = 100;
          chamber = 'senate';
        } else if (townhall.District.split('-').length > 1){
          total = 434;
          chamber = 'house';
        } else {
          total = 100;
          chamber = 'senate';
        }
      parseBars(party, chamber, newMember, total);
    }
  };

  eventHandler.getPastEvents = function(path, dateStart, dateEnd){
    var ref = firebase.database().ref(path);
    ref.orderByChild('dateObj').startAt(dateStart).endAt(dateEnd).on('child_added', function(snapshot) {
      eventHandler.recessProgress(snapshot.val());
    });
  };

  var dateStart = new Date('2017-07-29').valueOf();
  var dateEnd = new Date('2017-09-04').valueOf();

  eventHandler.getPastEvents('townHallsOld/2017-7', dateStart, dateEnd);
  eventHandler.getPastEvents('townHallsOld/2017-6', dateStart, dateEnd);

  eventHandler.readData = function (path) {
    eventHandler.initalProgressBar(100, $('.dem-senate'));
    eventHandler.initalProgressBar(100, $('.rep-senate'));
    eventHandler.initalProgressBar(434, $('.dem-house'));
    eventHandler.initalProgressBar(434, $('.rep-house'));
    $currentState = $('#current-state');
    firebase.database().ref(path).on('child_added', function getSnapShot(snapshot) {
      var total = parseInt($currentState.attr('data-total')) + 1;
      $currentState.attr('data-total', total);
      var ele = new TownHall(snapshot.val());
      obj = {};
      eventHandler.recessProgress(ele);
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
    $('[data-toggle="tooltip"]').tooltip();
  };


  eventHandler.readDataUsers = function () {
    firebase.database().ref('/UserSubmission/').on('child_added', function getSnapShot(snapshot) {
      var ele = new TownHall(snapshot.val());
      obj = {};
      TownHall.allTownHallsFB[ele.eventId] = ele;
      var tableRowTemplate = Handlebars.getTemplate('eventTableRow');
      var approveButtons = Handlebars.getTemplate('approveButtons');

      if (!ele.zoneString && ele.lat) {
        ele.validateZone(ele.eventId).then(function(returnedTH){
          TownHall.allTownHallsFB[ele.eventId] = returnedTH;
          returnedTH.updateUserSubmission(ele.eventId).then(function(updated){
          });
        });
      }

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
      $('#for-approval').append($toAppend);
    });
  };

  module.eventHandler = eventHandler;
})(window);
