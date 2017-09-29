// write program that finds all events by Moc name
// make sure if same name, you are getting correct member
// (maybe check govtrack_id)

// First iteration
// -type in member name in console,
// get output for their events
// also, console.log the csv of all the data

// Second Iteration
// -have input form for search
// console.log output

// third iteration
// after search is complete -->
// have button for downloading csv file
// BONUS: have a parameter for type of downloadable file
// JSON, csv, table separated

(function(module) {
  var memberEvents = {};

  function searchMemberData(memberName) {
    let date_list = [];
    let d = new Date();
    let date_key;
    let year = d.getFullYear();
    let current_month_index = d.getMonth();

    do {
      date_key = year + "-" + current_month_index;
      date_list.push(date_key);
      if (current_month_index === 0 && year != 2017) {
        year--;
        current_month_index = 11;
      }
      current_month_index--;
    } while (date_key != "2017-5"); // change this back to 2017-0 when ready

    return new Promise(function(resolve, reject) {
      let events_obj = {
        events: []
      };
      date_list.forEach(function(date) {
        firebase
          .database()
          .ref("/townHallsOld/" + date)
          .once("value")
          .then(function(snapshot) {
            snapshot.forEach(function(element) {
              let town_hall = element.val();
              if (town_hall["Member"] === memberName) {
                events_obj.events.push(town_hall);
              }
            });
          });
      });
      resolve(events_obj);
    });
  }

  function ConvertToCSV(arr) {
    const items = arr;
    const replacer = (key, value) => value === null ? '' : value; // specify how you want to handle null values here
    const header = Object.keys(items[0])
    let csv = items.map(row => header.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(','));
    csv.unshift(header.join(','))
    csv = csv.join('\r\n')
    
    console.log(csv)
  }

  memberEvents.getData = function(memberName) {
    searchMemberData(memberName)
      .then(function(arr) {
        console.log(arr.events);
        ConvertToCSV(arr.events);
      })
      .catch(function(err) {
        console.log(err);
      });
  };

  module.memberEvents = memberEvents;
})(window);
