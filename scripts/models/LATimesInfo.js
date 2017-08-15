// LA Times is asking if we can give them the data for the California delegation. 
// They want to know if we could give them a list of all the CA MOC who have held town halls, 
// and the dates they were held.


var date_list = ['2017-0', '2017-1', '2017-2', '2017-3', '2017-4', '2017-5', '2017-6', '2017-7'];

var mocs = {
    cal_moc : []
}; 

function Member(name, townHalls) {
    this.name = name;
    this.townHalls = [];
}

function TownHall(date) {
    this.date = date;
}

// function to get meta data
function getCalData(dateList) {
    return new Promise(function(resolve, reject) {
        var date_key;
        var mem_exists;

        for (var i = 0; i < date_list.length; i++) {
            var date_key = date_list[i];
            firebase.database().ref('/townHallsOld/' + date_key).once('value').then(function(snapshot) {
                snapshot.forEach(function(oldTownHall) {
                    town_hall = oldTownHall.val();
                    if (town_hall.State == 'California' && town_hall.meetingType == "Town Hall" ||
                        town_hall.State == 'CA' && town_hall.meetingType == "Town Hall") { 
                        var new_match = new TownHall(town_hall.Date);
                        mem_exists = false;

                        for (var j = 0; j < mocs.cal_moc.length; j++) {
                            if (mocs.cal_moc[j].name == town_hall.Member) {
                                mem_exists = true;
                                mocs.cal_moc[j].townHalls.push(new_match);
                            }
                        }

                        if (!mem_exists) {
                            var new_rep = new Member(town_hall.Member);
                            new_rep.townHalls.push(new_match);
                            mocs.cal_moc.push(new_rep);
                        }
                    }
                })
            })
        }
        resolve(mocs);
    })
}

var getData = function() {
    getCalData(date_list).then(function(value) {
        console.log(value);
        // var json = JSON.stringify(value);
        // console.log(json);
    }).catch(function() {
        console.log("error with gathering data");
    });
}

getData();