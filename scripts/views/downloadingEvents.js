(function (module) {

  function ACLUTownHall(cur) {
    var address,
      state,
      zip,
      city
    if (cur.address) {
      var addList = cur.address.split(', ')
      state = addList[addList.length - 1].split(' ')[0]
      zip = addList[addList.length - 1].split(' ')[1]
      city = addList[addList.length - 2]
      addList.splice(addList.length - 2, 2)
      address = addList.join(', ')
    }
    this.Title = cur.Member + ' (' + cur.District + ')';
    this.Date = cur.Date;
    this.Time = cur.Time;
    this.Venue = cur.Location;
    this.Address = address;
    this.City = city
    this.State = state;
    this.Zip = zip;
    this.Host = 'info@townhallproject.com';
    this.Description = cur.Notes
    this.Categories = cur.meetingType;
    this.Directions = 'https://www.google.com/maps/dir/Current+Location/' + escape(cur.address);
  }

  ACLUTownHall.download = function(){

    data = TownHall.allTownHalls.filter(function(ele){return !ele.repeatingEvent && ele.meetingType != 'Tele-Town Hall' && ele.meetingType !=='Tele-town Hall'}).reduce(function(acc, cur){
    obj = new ACLUTownHall(cur)

    acc.push(obj)
    return acc
    },[])

    // prepare CSV data
    var csvData = new Array();
    csvData.push('"Title","Venue", "Address", "City", "State", "Zip","Categories","Date","Description","Time","Host", "Directions"');
    data.forEach(function(item, index, array) {
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
    var fileName = "townhalls.csv";
    var buffer = csvData.join("\n");
    var blob = new Blob([buffer], {
      "type": "text/csv;charset=utf8;"
    });
    var link = document.createElement("a");

    if(link.download !== undefined) { // feature detection
      // Browsers that support HTML5 download attribute
      link.setAttribute("href", window.URL.createObjectURL(blob));
      link.setAttribute("download", fileName);
     }
    else {
      // it needs to implement server side export
      link.setAttribute("href", "http://www.example.com/export");
    }
    link.innerHTML = "ACLU download CSV of Data";
    document.getElementById('ACLU-buttons').appendChild(link);
  }

  $('#ACLU-download').on('click', ACLUTownHall.download)
  module.ACLUTownHall = ACLUTownHall;
})(window);
