/* globals eventHandler PartnerCsvTownHall */
(function (module) {
  const eventLookUpToolsView = {};

  eventLookUpToolsView.createUILoader = function () {
    $('#load-modal').modal('show');
  };

  eventLookUpToolsView.deleteUILoader = function () {
    $('#load-modal').modal('hide');
  };

  eventLookUpToolsView.setupTypeaheadsAllMocs = function (input) {
    var typeaheadConfig = {
      fitToElement: true,
      delay: 200,
      highlighter: function (item) {
        return item;
      }, // Kill ugly highlight
      filter: function (selection) {
        $(input).val(selection);
      },
      updater: function (selection) {
        const memberKey = Moc.converNameToKey(selection);
        const member = Moc.allMocsObjsByName[memberKey];
        if (member){
          eventLookUpToolsView.govtrack_id = member.id;
        }
      },
    };
      
    Moc.loadAllByName().then(function (allnames) {
      Moc.allNames = allnames;
      $(input).each(function () {
        $(this).typeahead({
          source: allnames,
        }, typeaheadConfig);
      });
    });
  };

  eventLookUpToolsView.searchEvents = function searchEvents(searchObj) {
    eventLookUpToolsView.createUILoader();
    var dateObj = eventHandler.getDateRange();
    var dates = dateObj.dates;
    let promiseArray = dates.map(date => {
      return TownHall.getMatchingData(`townHallsOld/${date}`, searchObj);
    });
    Promise.all(promiseArray).then((returnedSets) => {
      var allEvents = returnedSets.reduce((acc, cur) => {
        return acc.concat(Array.from(cur));
      }, []);
      if (allEvents.length === 0) {
        eventLookUpToolsView.deleteUILoader();
        alert('No data found');
        $('#search-total').html(``);
        return;
      }
      $('#search-total').html(`Search returned ${allEvents.length} events`);
      var fileDownloadName = eventHandler.createFileName(searchObj);
      eventHandler.deleteUILoader();
      PartnerCsvTownHall.makeDownloadButton('Download CSV', allEvents.map(townhall => townhall.convertToCsvTownHall()), fileDownloadName, 'download-csv-events-list');
    });
  };

  const clearCSVOutput = function clearCSVOutput() {
    var list = document.getElementById('download-csv-events-list');
    while (list.firstChild) {
      list.removeChild(list.firstChild);
    }
  };

  eventLookUpToolsView.lookupEvents = function (searchObj) {
    clearCSVOutput();
    if (searchObj['Member']) {
      searchObj.govtrack_id = eventLookUpToolsView.govtrack_id;
      eventLookUpToolsView.searchEvents(searchObj);
    } else {
      eventLookUpToolsView.searchEvents(searchObj);
    }
  };

  eventLookUpToolsView.lookupOldStateEvents = function (event) {
    event.preventDefault();
    clearCSVOutput();
    var para = document.createTextNode('Loading...');
    document.getElementById('download-csv-events-list').appendChild(para);
    var date = '2018-2';
    var state = 'NC';
    console.log('state');
    TownHall.getOldStateData(state, date).then(function (returnedSet) {
      console.log(returnedSet);
      var returnedArr = Array.from(returnedSet);

      var fileDownloadName = 'nc state' + '.csv';
      PartnerCsvTownHall.makeDownloadButton('Download CSV', returnedArr, fileDownloadName, 'state-buttons');
    });
  };
  module.eventLookUpToolsView = eventLookUpToolsView;
})(window);