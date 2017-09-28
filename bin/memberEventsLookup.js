// write program that finds all events by Moc name
// make sure if same name, you are getting correct member
// (maybe check govtrack_id)

// first, find all events (including date) from Paul Gosar in database
date_list = [
  "2017-0",
  "2017-1",
  "2017-2",
  "2017-3",
  "2017-4",
  "2017-5",
  "2017-6",
  "2017-7",
  "2017-8"
];

function getData(dates) {
  return new Promise(function(resolve, reject) {
    let events = [];
    for (var i = 0; i < dates.length; i++) {
      let date_key = dates[i];

      firebase
        .database()
        .ref("/townHallsOld/" + date_key)
        .once("value")
        .then(function(snapshot) {
          snapshot.forEach(function(element) {
            let town_hall = element.val();
            if (town_hall["Member"] === "Paul Gosar") {
              events.push(town_hall);
            }
          });
        });
      resolve(events);
    }
  });
}

// function csv(array) {
//   var keys = Object.keys(array[0]);

//   var result = keys.join(",") + "\n";

//   array.forEach(function(obj) {
//     keys.forEach(function(k, ix) {
//       if (ix) result += ",";
//       result += obj[k];
//     });
//     result += "\n";
//   });
//   console.log(result);
// }

getData(date_list)
  .then(function(value) {
    console.log(value);
    // csv(value);
  })
  .catch(function(err) {
    console.log(err);
  });
