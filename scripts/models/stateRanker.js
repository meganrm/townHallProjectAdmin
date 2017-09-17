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
// (also think about ranking by parameter - town halls or office hours, etc)
//
// Participation Activity Rankings for U.S. States
//
// Colorado [Rank 1]
// -Town Hall             : 160
// -Ticketed Event        : 79
// -Tele-Town Hall        : 100
// -Office Hours          : 24
// -Empty Chair Town Hall : 24
// -Other                 : 24
// Total:                 : 300
// ----------------------------
// California [Rank 2]
// -Town Hall             : 147
// -Ticketed Event        : 70
// -Tele-Town Hall        : 100
// -Office Hours          : 24
// -Empty Chair Town Hall : 24
// -Other : 24
// Total:                 : 280
// ----------------------------
// Washington [Rank 3]
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

var states_obj = {
  states_array: []
};

// build state report object
// may not need all those parameters
function StateReport(
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

function getMetaData(date_list) {
  return new Promise(function(resolve, reject) {
    var mem_exists;

    for (var j = 0; j < date_list.length; j++) {
      let date_key = date_list[j];
      firebase
        .database()
        .ref("/townHallsOld/" + date_key)
        .once("value")
        .then(function(snapshot) {
          snapshot.forEach(function(oldTownHall) {
            town_hall = oldTownHall.val();
            mem_exists = false;

            for (var k = 0; k < states_obj.states_array.length; k++) {
              if (states_obj.states_array[k].name === town_hall.State) {  // once updated, this will be 'stateName'
                mem_exists = true;
                current_state_report = states_obj.states_array[k];
              }
            }

            if (mem_exists === false) {
              current_state_report = new StateReport(
                town_hall.State,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0
              );
              states_obj.states_array.push(current_state_report);
            }

            switch (town_hall.meetingType) {
              case "Town Hall":
                current_state_report.townHall++;
                current_state_report.totalEvents++;
                break;
              case "Ticketed Event":
                current_state_report.ticketedEvent++;
                current_state_report.totalEvents++;
                break;
              case "Tele-Town Hall":
                current_state_report.teleTownHall++;
                current_state_report.totalEvents++;
                break;
              case "Office Hours":
                current_state_report.officeHour++;
                current_state_report.totalEvents++;
                break;
              case "Empty Chair Town Hall":
                current_state_report.emptyChair++;
                current_state_report.totalEvents++;
                break;
              case "Other":
                // console.log(town_hall.meetingType);
                current_state_report.other++;
                current_state_report.totalEvents++;
                break;
              default:
                break;
            }
          });
        });
    }
    resolve(states_obj);
  });
}

// function to calculate rank
function rankStates(statesObj) {
  // create new array with 'ranking'
  // in order of most to least number
  // of events by state
  // return new Promise(function(resolve, reject) {

  // states_obj.states_array.sort(function(a, b){
  //   return b.totalEvents - a.totalEvents;
  // });

  console.log(statesObj);
  console.log(statesObj.states_array.length);

  // });
}

// display output function
function outputReport(orderedStates) {
  // format string output
  // based on design at top
  // output for each
  // value in array parameter
}

getMetaData(date_list)
  .then(function(states) {
    rankStates(states);
  })
  .catch(function(error) {
    console.log("something went wrong ", error);
  });
