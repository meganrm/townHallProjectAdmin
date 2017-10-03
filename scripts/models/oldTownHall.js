(function (module) {
    
      function OldTownHall(cur) {
        if (!cur.eventId) {
          return
        }
        this.Member = cur.Member;
        this.Event_Name = cur.eventName ? cur.eventName: ' ';
        this.Location = cur.Location ? cur.Location: ' ';
        this.Meeting_Type = cur.meetingType;
        this.District = cur.district;
        this.Party = cur.party;
        this.State = cur.stateName;
        if (cur.repeatingEvent) {
          this.Repeating_Event = cur.repeatingEvent
          this.Date = ' ';
        } else if (cur.dateString) {
          this.Repeating_Event = ' '
          this.Date = cur.dateString;
        } else {
          this.Repeating_Event = ' '
          this.Date = moment(cur.dateObj).format('ddd, MMM D YYYY');
        }
        this.Time_Start = cur.Time;
        this.Time_End = cur.timeEnd;
        this.Time_Zone = cur.timeZone ? cur.timeZone: ' ';
        this.Zone_ID = cur.zoneString ? cur.zoneString: ' ';
        this.Address = cur.address;
        this.Notes = cur.Notes ? cur.Notes.replace(/\"/g, "'"): ' ';
    
        this.Link = cur.link ? cur.link : 'https://townhallproject.com/?eventId=' + cur.eventId;
        this.Link_Name = cur.linkName ? cur.linkName: ' ';
      }
    
      module.OldTownHall = OldTownHall;
    })(window);
    