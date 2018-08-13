(function (module) {

  function CsvTownHall(cur) {
    if (!cur.eventId) {
      return;
    }
    // if (cur.thp_id) {
    //   console.log('state evet');
    //   return;
    // }
    this.Member = cur.Member;
    this.Event_Name = cur.eventName ? cur.eventName: ' ';
    this.Location = cur.Location ? cur.Location: ' ';
    this.Meeting_Type = cur.meetingType;
    var district = cur.district ? '-' + cur.district : ' ';
    this.District = cur.state + district;
    this.govtrack_id = cur.govtrack_id || ' ';
    this.Party = cur.party ? cur.party: cur.Party;
    this.state = cur.state;
    this.State = cur.stateName? cur.stateName: cur.State;
    if (cur.repeatingEvent) {
      this.Repeating_Event = cur.repeatingEvent;
      this.Date = ' ';
    } else if (cur.dateString) {
      this.Repeating_Event = ' ';
      this.Date = cur.dateString;
    } else {
      this.Repeating_Event = ' ';
      this.Date = moment(cur.dateObj).format('ddd, MMM D YYYY');
    }
    this.Time_Start = cur.Time;
    this.Time_End = cur.timeEnd ? cur.timeEnd : ' ';
    this.Time_Zone = cur.timeZone ? cur.timeZone: ' ';
    this.Zone_ID = cur.zoneString ? cur.zoneString: ' ';
    this.Address = cur.address;
    this.Notes = cur.Notes ? cur.Notes.replace(/\"/g, '\''): ' ';
    this.Map_Icon = cur.iconFlag;
    this.Link = cur.link ? cur.link : 'https://townhallproject.com/?eventId=' + cur.eventId;
    this.Link_Name = cur.linkName ? cur.linkName: ' ';
    this.dateNumber = cur.yearMonthDay;
  }

  module.CsvTownHall = CsvTownHall;
})(window);
