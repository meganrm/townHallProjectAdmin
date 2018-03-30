(function (module) {
  // var moment = require('moment');

  function IndTownHall(cur) {
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
    this.event_starts_at_ampm = cur.Time.split(' ')[1].toLowerCase();
    this.event_venue = cur.Location ? cur.Location: ' ';
    this.event_address1 = address;
    this.event_host_ground_rules = '1';
    this.event_host_requirements = '1';
    this.event_city = city;
    this.event_postal = zip;
    this.email = 'field@indivisibleguide.com';
    this.name = cur.Member;
    this.event_public_description = cur.eventName ? cur.eventName : cur.Notes;
    this.event_public_description = this.event_public_description ? this.event_public_description: this.event_title;
    this.action_meeting_type = cur.meetingType;
    this.action_link_to_event_information = cur.link ? cur.link : ' ';
    this.page = 'register-event-august-recess_townhalls';
    this.campaign = '/rest/v1/campaign/9/';
  }

  IndTownHall.download = function(){
    let data = TownHall.allTownHalls.filter(function(ele){
      return !ele.repeatingEvent && ele.meetingType != 'Tele-Town Hall' && moment(ele.dateObj).isAfter() && ele.meetingType !=='Tele-town Hall';}).reduce(function(acc, cur){
        obj = new IndTownHall(cur);
        if (obj.event_address1 ) {
          acc.push(obj);
        }
        return acc;
      },[]);
    // prepare CSV data
    var csvData = new Array();
    csvData.push('"email", "name", "event_public_description","event_title", "event_starts_at_date", "event_starts_at_time", "event_starts_at_ampm","event_address1","event_city","event_postal", "event_venue", "action_meeting_type", "action_link_to_event_information"');
    data.forEach(function(item, index) {
      csvData.push(
        '"' + item.email +
      '","' + item.name +
      '","' + item.event_public_description +
      '","' + item.event_title +
      '","' + item.event_starts_at_date +
      '","' + item.event_starts_at_time +
      '","' + item.event_starts_at_ampm +
      '","' + item.event_address1 +
      '","' + item.event_city +
      '","' + item.event_postal +
      '","' + item.event_venue +
      '","' + item.action_meeting_type +
      '","' + item.action_link_to_event_information +
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
    link.innerHTML = 'Indivisible download CSV of Data';
    document.getElementById('ACLU-buttons').appendChild(link);
  };

  module.IndTownHall = IndTownHall;
})(window);
