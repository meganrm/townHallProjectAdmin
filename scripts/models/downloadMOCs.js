(function (module) {
  // var moment = require('moment');

  function MOCDownload(cur) {
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



  module.MOCDownload = MOCDownload;
})(window);
