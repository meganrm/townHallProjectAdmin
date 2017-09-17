// Goal:
//
// Participation Activity Rankings for U.S. States
//
// Ro Khanna [Rank 1]
// -Town Hall             : 160
// -Ticketed Event        : 79
// -Tele-Town Hall        : 100
// -Office Hours          : 24
// -Empty Chair Town Hall : 24
// -Other                 : 24
// Total:                 : 300
// ----------------------------
// Rodney Davis [Rank 2]
// -Town Hall             : 147
// -Ticketed Event        : 70
// -Tele-Town Hall        : 100
// -Office Hours          : 24
// -Empty Chair Town Hall : 24
// -Other : 24
// Total:                 : 280
// ----------------------------
// Bill Foster [Rank 3]
// -TownHall              : 120
// -Ticketed Event        : 85
// -Tele-Town Hall        : 111
// -Office Hours          : 24
// -Empty Chair Town Hall : 24
// -Other                 : 24
// Total:                 : 270
// ----------------------------

(function(module) {
  memberRanker = {};

  // let date_list = ['2017-0', '2017-1', '2017-2', '2017-3', '2017-4', '2017-5', '2017-6', '2017-7'];
  let date_list = ["2017-0", "2017-1", "2017-4", "2017-7"];

  // build state report object
  function MemberReport(
    name,
    rank,
    totalEvents,
    townHall,
    ticketedEvent,
    teleTownHall,
    officeHour,
    emptyChair,
    other
  ) {
    this.name = name;
    this.rank = rank;
    this.totalEvents = totalEvents;
    this.townHall = townHall;
    this.ticketedEvent = ticketedEvent;
    this.teleTownHall = teleTownHall;
    this.officeHour = officeHour;
    this.emptyChair = emptyChair;
    this.other = other;
  }

  function getMetaData(dateList, members_obj) {
    return new Promise(function(resolve, reject) {
      var mem_exists;

      for (var j = 0; j < dateList.length; j++) {
        let date_key = dateList[j];
        firebase
          .database()
          .ref("/townHallsOld/" + date_key)
          .once("value")
          .then(function(snapshot) {
            snapshot.forEach(function(oldTownHall) {
              town_hall = oldTownHall.val();
              mem_exists = false;

              for (var k = 0; k < members_obj.members_array.length; k++) {
                if (members_obj.members_array[k].name === town_hall.Member) {
                  // once updated, this will be 'stateName'
                  mem_exists = true;
                  current_state_report = members_obj.members_array[k];
                }
              }

              if (mem_exists === false) {
                current_state_report = new MemberReport(
                  town_hall.Member,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0
                );
                members_obj.members_array.push(current_state_report);
              }

              if (town_hall.meetingType) {
                current_state_report.totalEvents++;
              }

              switch (town_hall.meetingType) {
                case "Town Hall":
                  current_state_report.townHall++;
                  break;
                case "Ticketed Event":
                  current_state_report.ticketedEvent++;
                  break;
                case "Tele-Town Hall":
                  current_state_report.teleTownHall++;
                  break;
                case "Office Hours":
                  current_state_report.officeHour++;
                  break;
                case "Empty Chair Town Hall":
                  current_state_report.emptyChair++;
                  break;
                default:
                  // console.log(town_hall.meetingType);
                  current_state_report.other++;
                  break;
              }
            });
          });
      }
      resolve(members_obj);
    });
  }

  // function to calculate rank
  function rank(membersObj, eventType) {
    var currentType = eventType ? eventType : "totalEvents";
    return new Promise(function(resolve, reject) {
      setTimeout(function() {
        membersObj.members_array.sort(function(a, b) {
          return b[currentType] - a[currentType];
        });
        resolve(membersObj);
      }, 4000);
    });
  }

  // display output function
  function outputReport(orderedMembers, listAmount) {
    var num = listAmount ? listAmount : orderedMembers.members_array.length;

    for (var i = 1; i <= num; i++) {
      var mem = orderedMembers.members_array[i - 1];
      mem.rank = i;
      console.log(mem.name + " [Rank: " + mem.rank + "]");
      console.log("Town Halls             : " + mem.townHall);
      console.log("Ticketed Events        : " + mem.ticketedEvent);
      console.log("Tele-Town Halls        : " + mem.teleTownHall);
      console.log("Office Hours           : " + mem.officeHour);
      console.log("Empty Chair Town Halls : " + mem.emptyChair);
      console.log("Other                  : " + mem.other);
      console.log("Total                  : " + mem.totalEvents);
      console.log("---------------------------");
    }

    // write to csv file
    var segment = orderedMembers.members_array.slice(0, num);
    // csv(segment);
  }

  // write to csv format
  function csv(array) {
    var keys = Object.keys(array[0]);

    var result = keys.join(",") + "\n";

    array.forEach(function(obj) {
      keys.forEach(function(k, ix) {
        if (ix) result += ",";
        result += obj[k];
      });
      result += "\n";
    });
    console.log(result);
    // fs.writeFile('rankddata.csv', result, (err) => {
    //   if (err) throw err;
    //   console.log('the file has been saved!');
    // })
  }

  function getAbsentMembers(membersObj) {
    return new Promise(function(resolve, reject) {
      firebase
        .database()
        .ref("mocData/")
        .once("value")
        .then(function(snapshot) {
          var totalMembers = snapshot.numChildren();
          snapshot.forEach(function(member) {
            var match = false;
            var mocDataName = member.val().displayName;
            for (var i = 0; i < totalMembers; i++) {
              var memName;
              if (membersObj.members_array[i]) {
                memName = membersObj.members_array[i].name;
              } else {
                memName = "";
              }
              if (mocDataName === memName) {
                match = true;
              }
            }
            if (!match) {
              var memberToAdd = new MemberReport(
                member.val().displayName,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0
              );
              membersObj.members_array.push(memberToAdd);
            }
          });
        });
      resolve(membersObj);
    });
  }

  memberRanker.rankMembers = function(eventType, listAmount) {
    var members_obj = {
      members_array: []
    };
    getMetaData(date_list, members_obj)
      .then(function(members) {
        getAbsentMembers(members)
          .then(function(allMembers) {
            rank(allMembers, eventType)
              .then(function(rankedMembers) {
                outputReport(rankedMembers, listAmount);
              })
              .catch(function(error) {
                console.log("oh, shit..", error);
              });
          })
          .catch(function(error) {
            console.log("something went wrong ", error);
          });
      })
      .catch(function(error) {
        console.log("last one ", error);
      });
  };

  module.memberRanker = memberRanker;
})(window);
