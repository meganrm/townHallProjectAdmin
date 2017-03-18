(function(module) {
  var firebasedb = firebase.database();
  var provider = new firebase.auth.GoogleAuthProvider();

  // object to hold the front end view functions
  var eventHandler = {};


  // render table row
  eventHandler.renderTable = function renderTable(townhall, $tableid) {
    townhall.dist = Math.round(townhall.dist /1609.344);
    townhall.addressLink = 'https://www.google.com/maps?q=' + escape(townhall.address);
    $($tableid).append(townhall.toHtml($('#table-template')));
  };

  // takes the current set of data in the table and sorts by date
  eventHandler.viewByDate = function (e) {
    e.preventDefault();
    var data = TownHall.isCurrentContext ? TownHall.currentContext:TownHall.allTownHalls;
    var filtereddata = TownHall.filteredResults.length > 0 ? TownHall.filteredResults: data;
    TownHall.currentContext = TownHall.sortDate(filtereddata);
    $table = $('#all-events-table');
    $table.empty();
    eventHandler.renderTableWithArray(TownHall.currentContext, $table );
  };

  // filters the table on click
  eventHandler.filterTable = function (e) {
    e.preventDefault();
    $table = $('#all-events-table');
    $('#resetTable').show();
    var filterID = this.id;
    var filterCol = $(this).attr('data-filter');
    var inputs = $('input[data-filter]');
    $table.empty();
    var data = TownHall.isCurrentContext ? TownHall.currentContext:TownHall.allTownHalls;
    var data = TownHall.filteredResults.length>0 ? TownHall.filteredResults:data;
    if (filterID === 'All') {
      TownHall.filterIds[filterCol] = '';
      eventHandler.renderTableWithArray(data, $table );
      // data.forEach(function(ele){
      //   eventHandler.renderTable(ele, $table);
      // })
    }
    else {
      TownHall.filterIds[filterCol] = filterID;
      Object.keys(TownHall.filterIds).forEach(function(key) {
        if (TownHall.filterIds[key]) {
          data = TownHall.filterByCol(key, TownHall.filterIds[key], data);
        }
      });
      eventHandler.renderTableWithArray(data, $table );
    }
  };

  eventHandler.filterTableByInput = function(e) {
    e.preventDefault();
    $('#resetTable').show();
    $table = $('#all-events-table');
    var query = $(this).val();
    var filterCol = $(this).attr('data-filter');
    $table.empty();
    var data = TownHall.isCurrentContext ? TownHall.currentContext:TownHall.allTownHalls;
    var data = TownHall.filteredResults.length>0 ? TownHall.filteredResults:data;
    Object.keys(TownHall.filterIds).forEach(function(key) {
      if (TownHall.filterIds[key]) {
        data = TownHall.filterByCol(key, TownHall.filterIds[key], data);
      }
    });
    TownHall.filteredResults = TownHall.filterColumnByQuery(filterCol, query, data);
    eventHandler.renderTableWithArray(TownHall.filteredResults, $table);
  };

  eventHandler.resetTable = function (e) {
    e.preventDefault();
    $table = $('#all-events-table');
    $table.empty();
    $('#resetTable').hide();
    TownHall.filterIds = {};
    TownHall.filteredResults = [];
    var data = TownHall.isCurrentContext ? TownHall.currentContext:TownHall.allTownHalls;
    eventHandler.renderTableWithArray(data, $table);
  };

  // url hash for direct links to subtabs
  // slightly hacky routing
  $(document).ready(function(){
    var filterSelector = $('.filter');
    $('[data-toggle="popover"]').popover({ html: true });
    $('#sort-date').on('click', eventHandler.viewByDate);
    $('#resetTable').hide();
    filterSelector.on('click', 'a', eventHandler.filterTable);
    filterSelector.keyup(eventHandler.filterTableByInput);
    if (location.hash) {
      $("a[href='" + location.hash + "']").tab('show');
    }
    else{
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

  eventHandler.metaData = function(){
    metaDataObj = new TownHall();
    metaDataObj.topZeroResults = []
    firebase.database().ref('/lastupdated/').on('child_added', function(snapshot){
      metaDataObj.time = new Date(snapshot.val())
      metaDataObj.total = TownHall.allTownHalls.length
        var metaDataTemplate = Handlebars.getTemplate('metaData');
        $('.metadata').html(metaDataTemplate(metaDataObj));
    });
  };

  eventHandler.checkTime = function (time){
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
  }

  eventHandler.readData = function (){
    firebase.database().ref('/townHalls/').on('child_added', function getSnapShot(snapshot) {
      var ele = new TownHall(snapshot.val());
      var id = ele.eventId;
      obj = {};
      TownHall.allTownHallsFB[ele.eventId] = ele;
      TownHall.allTownHalls.push(ele);
      var tableRowTemplate = Handlebars.getTemplate('eventTableRow');
      var teleInputsTemplate = Handlebars.getTemplate('teleInputs');
      var ticketInputsTemplate = Handlebars.getTemplate('ticketInputs');
      if (ele.timeStart24 && ele.timeEnd24) {
        if (parseInt(ele.timeStart24.split(':')[0]) > 23 || parseInt(ele.timeEnd24.split(':')[0]) > 23) {
          console.log(ele.eventId);
        }
        else {
          ele.timeStart24 = eventHandler.checkTime(ele.timeStart24);
          ele.timeEnd24 = eventHandler.checkTime(ele.timeEnd24);
        }
      }

      if (ele.yearMonthDay) {
        var month = ele.yearMonthDay.split('-')[1];
        var day = ele.yearMonthDay.split('-')[2];
        if (month.length === 1) {
          month = 0 + month;
        }
        if (day.length === 1) {
          day = 0 + day;
        }
        ele.yearMonthDay = ele.yearMonthDay.split('-')[0] + '-' + month + '-' + day;
      }

      var $toAppend = $(tableRowTemplate(ele));
      if (!ele.meetingType) {
        console.log(ele);
      } else {
        switch (ele.meetingType.slice(0,4)) {
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
      if (!ele.dateValid) {
        $('#date-errors').append($toAppend.clone());
      }
      if (ele.dateObj < Date.now()) {
        $('#for-archive').append($toAppend.clone());
      }
      $('#all-events-table').append($toAppend);
    });
      $('[data-toggle="tooltip"]').tooltip()

  };


  eventHandler.readDataUsers = function (){
    firebase.database().ref('/UserSubmission/').on('child_added', function getSnapShot(snapshot) {
      var ele = new TownHall(snapshot.val());
      var id = ele.eventId;
      obj = {};
      TownHall.allTownHallsFB[ele.eventId] = ele;
      TownHall.allTownHalls.push(ele);
      var tableRowTemplate = Handlebars.getTemplate('eventTableRow');
      var teleInputsTemplate = Handlebars.getTemplate('teleInputs');
      var ticketInputsTemplate = Handlebars.getTemplate('ticketInputs');
      var approveButtons = Handlebars.getTemplate('approveButtons');

      if (ele.timeStart24 && ele.timeEnd24) {
        if (parseInt(ele.timeStart24.split(':')[0]) > 23 || parseInt(ele.timeEnd24.split(':')[0]) > 23) {
          console.log(ele.eventId);
        }
        else {
          ele.timeStart24 = eventHandler.checkTime(ele.timeStart24);
          ele.timeEnd24 = eventHandler.checkTime(ele.timeEnd24);
        }
      }

      if (ele.yearMonthDay) {
        var month = ele.yearMonthDay.split('-')[1];
        var day = ele.yearMonthDay.split('-')[2];
        if (month.length === 1) {
          month = 0 + month;
        }
        if (day.length === 1) {
          day = 0 + day;
        }
        ele.yearMonthDay = ele.yearMonthDay.split('-')[0] + '-' + month + '-' + day;
      }
      ele.lastUpdatedHuman = new Date(ele.lastUpdated).toDateString();
      console.log(ele.lastUpdatedHuman);
      var $toAppend = $(tableRowTemplate(ele));
      if (!ele.meetingType) {
        console.log(ele);
      } else {
        switch (ele.meetingType.slice(0,4)) {
          case 'Tele':
            $toAppend.find('.location-data').html(teleInputsTemplate(ele));
            break;
          case 'Tick':
            $toAppend.find('.location-data').html(ticketInputsTemplate(ele));
            break;
        }
      }
      $toAppend.find('.btn-group').html(approveButtons(ele))
      $('#for-approval').append($toAppend);

    });
      $('[data-toggle="tooltip"]').tooltip()

  };


eventHandler.readDataUsers();
  module.eventHandler = eventHandler;
})(window);
