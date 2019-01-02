const uniq = require('lodash').uniq;

const firebasedb = require('./setupFirebase');

function addToArchive() {
    const archivePath = 'archive_115th_congress';
    const paths = [];
    let path;
    firebasedb.ref('townHallsOld').once('value')
    .then((snapshot) => {

        snapshot.forEach( (dateSnapshot) => {
            dateSnapshot.forEach(function(eventSnapShot) {
                var townHall = eventSnapShot.val();
                if (!townHall.eventId) {
                    return;
                }
                if (townHall.repeatingEvent) {
                    path = `${archivePath}/repeating_event`;
                } else if (townHall.dateString) {
                    let eventDate = moment(townHall.dateString);
                    if (eventDate.isValid()) {
                        var year = eventDate.get('year');
                        var month = eventDate.get('month');
                        var dateKey = year + '-' + month;
                        if (year.toString().length === 4) {
                            path = `${archivePath}/${dateKey}`;
                        } else {
                            path = `${archivePath}/date_error`;

                        }
                    }
                } else {
                    path =`${archivePath}/no_date`;
                }
                paths.push(path)
                //return firebasedb.ref(`${path}/${townHall.eventId}`).update(townHall);

            });
        });
    })
    .then(()=> {
        console.log([...new Set(paths)]);
    })
    .catch(console.log);
}

addToArchive();