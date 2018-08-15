(function (module) {

  function ACLUTownHall(cur) {
    var address,
      state,
      zip,
      city;
    if (cur.address) {
      var addList = cur.address.split(', ');
      state = addList[addList.length - 1].split(' ')[0];
      zip = addList[addList.length - 1].split(' ')[1];
      city = addList[addList.length - 2];
      addList.splice(addList.length - 2, 2);
      address = addList.join(', ');
    }
    if (cur.meetingType === 'Office Hours') {
      this.Title = 'Staff Office Hours: ' + cur.Member + ' (' + cur.District + ')';
    } else {
      this.Title = cur.Member + ' (' + cur.District + ') ' + cur.meetingType;
    }
    this.Date = cur.dateString ? cur.dateString: cur.Date;
    this.Time = cur.Time;
    this.Venue = cur.Location;
    this.Address = address;
    this.City = city;
    this.State = state;
    this.Zip = zip;
    this.Host = 'info@townhallproject.com';
    this.Description = cur.Notes ? cur.Notes.replace(/â€“/g, '-'): '';
    this.Categories = cur.meetingType;
    this.Directions = 'https://www.google.com/maps/dir/Current+Location/' + escape(cur.address);
  }

  ACLUTownHall.include = function(meetingType) {
    if (
        meetingType === 'Tele-Town Hall' ||
        meetingType === 'Tele-town Hall' ||
        meetingType === 'DC Event' ||
        meetingType === 'Ticketed Event'
      ) {
      return false;
    }
    return true;
  };

  ACLUTownHall.download = function(){
    let data = TownHall.allTownHalls.filter(function(ele){
      return !ele.repeatingEvent && ACLUTownHall.include(ele.meetingType);
    }).reduce(function(acc, cur){
      let obj = new ACLUTownHall(cur);

      acc.push(obj);
      return acc;
    },[]);

    // prepare CSV data
    var csvData = [];
    csvData.push('"Title","Venue","Address","City","State","Zip","Categories","Date","Description","Time","Host","Directions"');
    data.forEach(function(item) {
      csvData.push(
        '"' + item.Title +
      '","' + item.Venue +
      '","' + item.Address +
      '","' + item.City +
      '","' + item.State +
      '","' + item.Zip +
      '","' + item.Categories +
      '","' + item.Date +
      '","' + item.Description +
      '","' + item.Time +
      '","' + item.Host +
      '","' + item.Directions +
      '"');
    });

    // download stuff
    var fileName = 'townhalls.csv';
    var buffer = csvData.join('\n');
    var blob = new Blob([buffer], {
      'type': 'text/csv;charset=utf8;',
    });
    var link = document.createElement('a');

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
    link.innerHTML = 'ACLU CSV Download';
    document.getElementById('ACLU-buttons').appendChild(link);
  };

  module.ACLUTownHall = ACLUTownHall;
})(window);
