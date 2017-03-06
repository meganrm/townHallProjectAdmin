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
    $('#button-to-form').hide();
    $('#save-event').on('submit', eventHandler.save);
    $('#look-up').on('submit', eventHandler.lookup);
    $('#view-all').on('click', TownHall.viewAll);
    $('#sort-date').on('click', eventHandler.viewByDate);
    $('#resetTable').on('click', eventHandler.resetTable);
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
      if (hashid === '#home' && TownHall.isMap === false) {
        history.replaceState({}, document.title, '.');
        setTimeout( function(){
          onResizeMap();
          if (location.pathname ='/') {
            eventHandler.resetHome();
            TownHall.isMap = true;
          }
        }, 50);
      }
      else if (hashid === '#home' && TownHall.isMap === true) {
        console.log('going home and map');
        history.replaceState({}, document.title, '.');
        eventHandler.resetHome();
      }
      else {
        location.hash = this.getAttribute('href');
      }
      $('[data-toggle="popover"]').popover('hide');
    });
  });

  eventHandler.metaData = function(){
    metaDataObj = new TownHall();
    metaDataObj.topZeroResults = []
    firebase.database().ref('/lastupdated/time').on('child_added', function(snapshot){
      metaDataObj.time = new Date(snapshot.val())
      metaDataObj.total = TownHall.allTownHallsFB.length
      var topZeros = firebase.database().ref('zipZeroResults/').orderByValue().limitToLast(10);
      topZeros.once('value',function(snapshot){
        console.log(snapshot.val());
        Object.keys(snapshot.val()).forEach(function(key) {
          console.log(key, snapshot.val()[key]);
          metaDataObj.topZeroResults.push ({zip:key, count: snapshot.val()[key]})

        })
      }).then(function(ele){
        $('.metadata').append(metaDataObj.toHtml($('#meta-data-template')));

      })

    })
  }

  eventHandler.readData = function (){
    firebase.database().ref('/townHalls/').on('child_added', function getSnapShot(snapshot) {
      var ele = new TownHall(snapshot.val());
      var id = ele.eventId;
      obj = {};
      TownHall.allTownHallsFB[ele.eventId] = ele;
      var tableRowTemplate = Handlebars.getTemplate('eventTableRow');
      var teleInputsTemplate = Handlebars.getTemplate('teleInputs');
      var ticketInputsTemplate = Handlebars.getTemplate('ticketInputs');

      var $toAppend = $(tableRowTemplate(ele));
      switch (ele.meetingType.slice(0,4)) {
        case 'Tele':
          $toAppend.find('.location-data').html(teleInputsTemplate(ele));
          break;
        case 'Tick':
          $toAppend.find('.location-data').html(ticketInputsTemplate(ele));
          break;
      }

      if (!ele.lat) {
        $('#location-errors').append($toAppend.clone());
      }
      if (!ele.dateValid) {
        $('#date-errors').append($toAppend.clone());
      }
      $('#all-events-table').append($toAppend);
    });
  };

  eventHandler.readData();
  eventHandler.metaData();


  module.eventHandler = eventHandler;
})(window);
