const uniq = require('lodash').uniq;
const includes = require('lodash').includes;
const moment = require('moment');

const firebasedb = require('./setupFirebase');

const getMemberList = (number) => {
    return firebasedb.ref(`moc_by_congress/${number}`).once('value')
        .then((snapshot) => {
            const allMembers = [];
            snapshot.forEach(member => {
                allMembers.push(member.val());
            });
            return allMembers;
        });
};

function addToArchive(congress115, congress116) {
    const paths = [];
    let path;
    firebasedb.ref('archive_115th_congress').set(null);
    firebasedb.ref('archive_116th_congress').set(null);
    firebasedb.ref('townHallsOld').once('value')
    .then((snapshot) => {

        snapshot.forEach( (dateSnapshot) => {
            dateSnapshot.forEach(function(eventSnapShot) {
                let archivePath;
                var townHall = eventSnapShot.val();
                let eventDate = moment(townHall.dateString);
                if (includes(congress116, townHall.govtrack_id) && eventDate.isValid && eventDate.isSameOrAfter('2019-01-03')){
                    archivePath = 'archive_116th_congress';      
                } else if (includes(congress115, townHall.govtrack_id) ) {
                    archivePath = 'archive_115th_congress';
                } else if (townHall.thp_id && townHall.state) {
                    archivePath = `state_townhalls_archive/${townHall.state}`;
                } else {
                    console.log('not in any congress', townHall.govtrack_id, townHall.thp_id, eventSnapShot.key);
                    archivePath = 'no_member_id';
                }
                if (!townHall.eventId || !archivePath) {
                    return;
                }
                if (townHall.repeatingEvent) {
                    console.log('repeating event', archivePath)
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
                return firebasedb.ref(`${path}/${townHall.eventId}`).update(townHall);

            });
        });
    })
    .then(()=> {
        console.log('done');
    })
    .catch(console.log);
}

let congress115;
let congress116;

Promise.all([getMemberList(115), getMemberList(116)])
    .then(returned => {
        congress115 = returned[0];
        congress116 = returned[1];
        addToArchive(congress115, congress116);

    });
