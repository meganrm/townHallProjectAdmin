// types of meetings:
//
// Other
// Tele-Town Hall
// Ticketed Event
// Office Hours
// Empty Chair Town Hall
// DC Event
// (just blank)


// Goal:
// be able to sort by given field of interest
// ex. --> town hall, ticketed event, etc.
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

// var date_list = ['2017-0', '2017-1', '2017-2', '2017-3', '2017-4', '2017-5', '2017-6', '2017-7'];
var date_list = ["2017-0", "2017-1", "2017-4", "2017-7"];

var members_obj = {
  members_array: []
};

// build state report object
// may not need all those parameters
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

function getMetaData(dateList) {
    var mem_exists;
    let promises = [];

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


            // evaluate if member exists and set to current_state_report //
            let current_state_report = getCurrentReport();

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
            ////////////////////////////////////////////////




            // add meta data information to memberReport object //
            addEventToReport(town_hall, current_state_report);

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
            //////////////////////////////////////////////////

            // push current report to some array

          });
        });
    }
  // return list of all reports 
  Promise.all(promises);
}

// function to calculate rank
function rankStates(membersObj) {
  // create new array with 'ranking'
  // in order of most to least number
  // of events by member
  // return new Promise(function(resolve, reject) {

    // members_obj.members_array.sort(function(a, b){
    //   return b.totalEvents - a.totalEvents;
    // });

  //   members_obj.members_array.sort(function(a, b){
  //     return b.townHall - a.townHall;
  //   });

  console.log(membersObj);
  console.log(membersObj.members_array.length);

  // });
}

// display output function
function outputReport(orderedMembers) {
  // format string output
  // based on design at top
  // output for each
  // value in array parameter
}

getMetaData(date_list)
  .then(function(members) {
    rankStates(members);
  })
  .catch(function(error) {
    console.log("something went wrong ", error);
  });
