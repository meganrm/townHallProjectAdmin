/* globals eventHandler PartnerCsvTownHall */
(function (module) {
  const eventLookUpToolsView = {};

  const createUILoader = function () {
    $('#load-modal').modal('show');
  };

  const deleteUILoader = function () {
    $('#load-modal').modal('hide');
  };

  eventLookUpToolsView.setupTypeaheadsAllMocs = function (input) {
    var typeaheadConfig = {
      fitToElement: true,
      delay: 200,
      highlighter: function (item) {
        return item;
      }, // Kill ugly highlight
      filter(selection) {
        $(input).val(selection);
      },
      afterSelect(selection) {
        const memberKey = Moc.convertNameToKey(selection);
        const member = Moc.allMocsObjsByName[memberKey];
        if (member){
          eventLookUpToolsView.govtrack_id = member.id;
        }
      },
    };
    Moc.loadAllByName().then(function (allnames) {
      Moc.allNames = allnames;
      $(input).attr('readonly', false);
      $(input).typeahead($.extend({
        source: allnames,
      }, typeaheadConfig));
    });

  };

  const createFileName = function createFileName(searchObj) {
    let fileName = 'Results';
    if (searchObj.Member) {
      fileName = searchObj.Member;
    } else if (searchObj.district && searchObj.state) {
      fileName = `${searchObj.state}-${searchObj.district}`;
    } else if (searchObj.state) {
      fileName = searchObj.state;
    } else if (searchObj.meetingType) {
      fileName = searchObj.meetingType;
    } else if (searchObj.party) {
      fileName = searchObj.party;
    }
    fileName = fileName.concat('.csv');
    return fileName;
  };

  eventLookUpToolsView.searchEvents = function searchEvents(searchObj) {
    createUILoader();
    var dateObj = eventHandler.getDateRange();
    var dates = dateObj.dates;
    let promiseArray = dates.map(date => {
      return TownHall.getDataByDate(`townHallsOld/${date}`, dateObj.start, dateObj.end);
    });
    promiseArray.push(TownHall.getDataByDate(`townHalls/`, dateObj.start, dateObj.end));
    Promise.all(promiseArray).then((returnedSets) => {

      var allEvents = returnedSets
      .reduce((acc, cur) => {
        return acc.concat(Array.from(cur));
      }, [])
      .filter(currentTownHall => {
        return currentTownHall.isMatch(searchObj);
      });

      if (allEvents.length === 0) {
        deleteUILoader();
        alert('No data found');
        $('#search-total').html(``);
        return;
      }
      $('#search-total').html(`Search returned ${allEvents.length} events`);
      var fileDownloadName = createFileName(searchObj);
      deleteUILoader();
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