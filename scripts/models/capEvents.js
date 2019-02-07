(function (module) {

  function PartnerCsvTownHall(cur) {
    if (!cur.eventId) {
      return;
    }
    this.event_title;
    var district = cur.district ? `${cur.state}-${cur.district}` : 'Senate';
    if (cur.iconFlag === 'staff') {
      this.event_title = 'Staff Office Hours: ' + cur.Member + ' (' + district + ')';
    } else {
      this.event_title = cur.Member + ' (' + district + ') ' + cur.meetingType;
    }
    this.eventName = cur.eventName ? cur.eventName: ' ';
    this.Location = cur.Location ? cur.Location: ' ';
    this.meetingType = cur.meetingType;
    this.Member = cur.Member;
    this.District = district;
    this.Party = cur.party;
    this.State = cur.state;
    if (cur.repeatingEvent) {
      this.repeatingEvent = cur.repeatingEvent;
      this.Date = ' ';
    } else if (cur.dateString) {
      this.repeatingEvent = ' ';
      this.Date = cur.dateString;
    } else {
      this.repeatingEvent = ' ';
      this.Date = moment(cur.dateObj).format('ddd, MMM D YYYY');
    }
    this.timeStart = cur.Time;
    this.timeEnd = cur.timeEnd;
    this.timeZone = cur.timeZone ? cur.timeZone: ' ';
    this.zoneString = cur.zoneString ? cur.zoneString: ' ';
    this.address = cur.address;
    this.Notes = cur.Notes ? cur.Notes.replace(/\"/g, '\''): ' ';

    this.link = cur.link ? cur.link : 'https://townhallproject.com/?eventId=' + cur.eventId;
    this.linkName = cur.linkName ? cur.linkName: ' ';
    this.lat = cur.lat;
    this.lng = cur.lng;
    this.lastUpdatedHuman = cur.lastUpdatedHuman;
  }

  PartnerCsvTownHall.download = function(buttonName){
    var $date = $('#dateInput').val();
    if ($date && moment($date).isValid) {
      var cutoff = moment($date);
    }
    var states = ['CO', 'AZ', 'VA', 'NC', 'OR'];
    var promises = states.map((state) => firebasedb.ref(`state_townhalls/${state}`).once('value'));
    Promise.all(promises)
      .then((snapshot) => {
        return unpacked = snapshot.reduce((acc, cur) => {
          var townHallObjects = cur.val();
          var townhalls = Object.keys(townHallObjects).map(key => townHallObjects[key]);
          acc = acc.concat(townhalls);
          return acc;
        }, [])
      }).then((allStateEvents) => {
        var stateAndFederal = TownHall.allTownHalls.concat(allStateEvents);
        var data = stateAndFederal.filter(function (ele) {
          return moment(ele.dateObj).isValid();}).reduce(function(acc, cur){
            let obj = new PartnerCsvTownHall(cur);
            if (obj.address) {
              if (cutoff) {
                var lastUpdated = moment(cur.lastUpdated);
                if (cutoff.isBefore(lastUpdated)) {
                  acc.push(obj);
                } else {
                  console.log('not updated recently');
                }
              } else {
                acc.push(obj);
              }
            }
            return acc;
          },[]);
        // prepare CSV data
        var csvData = [];
        csvData.push(Object.keys(data[0]).join(', '));
    
        data.forEach(function(item) {
          var row = '"' + item['event_title'] + '"';
          Object.keys(item);
          for (var i = 1; i < Object.keys(item).length; i++) {
            row = row +  ',' +  '"' + item[Object.keys(item)[i]] + '"';
          }
          // row = row + '\n';
          csvData.push(row);
        });
    
    
        // download stuff
        var fileName = 'townhalls.csv';
        var buffer = csvData.join('\n');
        var blob = new Blob([buffer], {
          'type': 'text/csv;charset=utf8;',
        });
        var link = document.createElement('a');
        var li = document.createElement('li');
        if(link.download !== undefined) { // feature detection
          // Browsers that support HTML5 download attribute
          link.setAttribute('href', window.URL.createObjectURL(blob));
          link.setAttribute('download', fileName);
        }
        else {
          // it needs to implement server side export
          link.setAttribute('href', 'http://www.example.com/export');
        }
        link.setAttribute('class', 'btn btn-blue');
        link.innerHTML = buttonName;
        li.appendChild(link);
        document.getElementById('ACLU-buttons').appendChild(li);
      })
  };

  module.PartnerCsvTownHall = PartnerCsvTownHall;
})(window);
