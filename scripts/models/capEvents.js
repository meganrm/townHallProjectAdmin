(function (module) {

  function CSVTownHall(cur) {
    var address,
      zip,
      city;
    if (cur.address) {
      var addList = cur.address.split(', ');
      if (addList[addList.length - 1] === 'United States') {
        addList.splice(addList.length - 1);
      }
      zip = addList[addList.length - 1].split(' ')[1];
      city = addList[addList.length - 2];
      addList.splice(addList.length - 2, 2);
      address = addList.join(', ');
    }
    this.event_title;
    if (cur.iconFlag === 'staff') {
      this.event_title = 'Staff Office Hours: ' + cur.Member + ' (' + cur.District + ')';
    } else {
      this.event_title = cur.Member + ' (' + cur.District + ') ' + cur.meetingType;
    }
    this.event_starts_at_date = moment(cur.dateObj).format('L');
    this.event_starts_at_time = cur.Time.split(' ')[0];
    if (cur.Time.split(' ')[1]) {
      this.event_starts_at_ampm = cur.Time.split(' ')[1].toLowerCase();
    } else {
      this.event_starts_at_ampm = ' '
    }
    this.event_venue = cur.Location ? cur.Location: ' ';
    this.event_address1 = address;
    this.event_city = city;
    this.event_postal = zip;
    this.MOC = cur.Member;
    this.event_public_description = cur.eventName ? cur.eventName : cur.Notes;
    this.event_public_description = this.event_public_description ? this.event_public_description: this.event_title;
    this.action_meeting_type = cur.meetingType;
    this.action_link_to_event_information = cur.link ? cur.link : 'https://townhallproject.com/?eventId=' + cur.eventId;
  }

  CSVTownHall.download = function(buttonName){
    var $date = $('#dateInput').val();
    console.log($date);
    if ($date && moment($date).isValid) {
      var cutoff = moment($date)
    }
    data = TownHall.allTownHalls.filter(function(ele){
      return moment(ele.dateObj).isValid()}).reduce(function(acc, cur){
        obj = new CSVTownHall(cur);
        if (obj.event_address1 ) {
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
    var csvData = new Array();

    csvData.push(Object.keys(data[0]).join(', '));
    data.forEach(function(item, index) {
      csvData.push(
        '"' + item.event_title +
      '","' + item.event_starts_at_date +
      '","' + item.event_starts_at_time +
      '","' + item.event_starts_at_ampm +
      '","' + item.event_venue +
      '","' + item.event_address1 +
      '","' + item.event_city +
      '","' + item.event_postal +
      '","' + item.MOC +
      '","' + item.event_public_description +
      '","' + item.action_meeting_type +
      '","' + item.action_link_to_event_information +
      '"');
    });

    // download stuff
    var fileName = 'townhalls.csv';
    var buffer = csvData.join('\n');
    var blob = new Blob([buffer], {
      'type': 'text/csv;charset=utf8;'
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
    link.setAttribute('class', 'btn btn-blue')
    link.innerHTML = buttonName;
    li.appendChild(link)
    document.getElementById('ACLU-buttons').appendChild(li);
  };

  module.CSVTownHall = CSVTownHall;
})(window);
