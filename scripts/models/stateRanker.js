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
// ----------------------------
// California [Rank 2]
// -Town Hall             : 147
// -Ticketed Event        : 70
// -Tele-Town Hall        : 100
// -Office Hours          : 24
// -Empty Chair Town Hall : 24
// -Other : 24
// ----------------------------
// Washington [Rank 3]
// -TownHall              : 120
// -Ticketed Event        : 85
// -Tele-Town Hall        : 111
// -Office Hours          : 24
// -Empty Chair Town Hall : 24
// -Other                 : 24
// ----------------------------

var date_list = ['2017-0', '2017-1', '2017-2', '2017-3', '2017-4', '2017-5', '2017-6', '2017-7'];
//var states = ['Alabama','Alaska','American Samoa','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','District of Columbia','Federated States of Micronesia','Florida','Georgia','Guam','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Marshall Islands','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Northern Mariana Islands','Ohio','Oklahoma','Oregon','Palau','Pennsylvania','Puerto Rico','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virgin Island','Virginia','Washington','West Virginia','Wisconsin','Wyoming'];

var states_obj = {
    states_array : []
};

// build state report object
// may not need all those parameters
function StateReport(name, rank, townHall, ticketedEvent, teleTownHall, officeHour, emptyChair, other) {
    this.name = name;
    this.rank = rank;
    this.townHall = townHall;
    this.ticketedEvent = ticketedEvent;
    this.teleTownHall = teleTownHall;
    this.officeHour = officeHour;
    this.emptyChair = emptyChair;
    this.other = other;
}


// Build function for gathering meta data
// 
// get Name, and number of events including:
// Town Hall
// Ticketed Event
// Tele-Town Hall
// Office Hour
// Empty Chair
// Other
function getMetaData(dateKeys) {
    // var current_state;
    var date_key;
    var mem_exists;

    // for (var i = 0; i < states.length; i++) {
    //     var current_state = states[i];
        for (var j = 0; j < date_list.length; j++) {
            var date_key = date_list[j];
            firebase.database().ref('/townHallsOld/' + date_key).once('value').then(function(snapshot) {
                snapshot.forEach(function(oldTownHall) {
                    town_hall = oldTownHall.val();

                    // counters
                    var town_hall_counter = 0;
                    var ticketed_event_counter = 0;
                    var tele_town_hall_counter = 0;
                    var office_hour_counter = 0;
                    var empty_chair_counter = 0;
                    var other_counter = 0;

                    mem_exists = false;

                    // check if this state already exists in 
                    // states_obj
                    for (var k = 0; k < states_obj.states_array.length; k++) {
                        if (states_obj.states_array[k].name == town_hall.State) {
                            mem_exists = true;   
                            current_state_report = states_obj.states_array[k];
                        }
                    }

                    if (!mem_exists) {
                        current_state_report = new StateReport();
                        current_state_report.name = town_hall.State;
                    }

                    switch(current_state_report.meetingType){
                        case'Town Hall':
                            town_hall_counter++;
                            break;
                        case'Ticketed Event':
                            ticketed_event_counter++;
                            break;
                        case'Tele-Town Hall':
                            tele_town_hall_counter++;
                            break;
                        case'Office Hours':
                            office_hour_counter++;
                            break;
                        case'Empty Chair Town Hall':
                            empty_chair_counter++;
                            break;
                        case'Other':
                            other_counter++;
                            break;
                        default:
                            console.log("DC event");
                            break;
                    }
                    // update current state report object
                    current_state_report.townHall+=town_hall_counter;
                    current_state_report.ticketedEvent+=ticketed_event_counter;
                    current_state_report.teleTownHall+=tele_town_hall_counter;
                    current_state_report.officeHour+=office_hour_counter;
                    current_state_report.emptyChair+=empty_chair_counter;
                    current_state_report.other+=other_counter;

                    // update current_state_report to states_obj
                    states_obj.states_array.push(current_state_report); // shouldn't this happen already with update?
                })
            })
        }
    //}
}

// function to calculate rank
function rankStates() {

}

// display output function
function outputReport() {

}

getMetaData(date_list);