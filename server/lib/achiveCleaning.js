const uniq = require('lodash').uniq;
const includes = require('lodash').includes;
var moment = require('moment-timezone');

const firebasedb = require('./setupFirebase');
const createDateObj = (dateString, zone) => {
    const dateTime = moment.tz(dateString, 'ddd, MMM D YYYY, h:mm A', zone).format();
    return moment(dateTime).utc().unix();
};

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
    let total = 0;
    const promises = [];
    let path;

    firebasedb.ref('archive_clean').once('value')
    .then((snapshot) => {
        snapshot.forEach( (dateSnapshot) => {
            dateSnapshot.forEach(function(eventSnapShot) {
                let archivePath;
                var townHall = eventSnapShot.val();
                let eventDate;
                try {
                    eventDate = moment(townHall.dateString);
                } catch (error) {

                }
                const isAfterNewCongress = eventDate && eventDate.isValid && eventDate.isSameOrAfter('2019-01-03');
                const isBeforeNewCongress = eventDate && eventDate.isValid && eventDate.isBefore('2019-01-03');
                const isInNewCongress = townHall.govtrack_id && includes(congress116, townHall.govtrack_id);
                const isInOldCongress = townHall.govtrack_id && includes(congress115, townHall.govtrack_id);

                const isStateEvent = !!townHall.thp_id && townHall.thp_id.split('-').length > 3;
                if (isStateEvent) {
                    archivePath = 'state_fixes';
                } else if (isAfterNewCongress || (townHall.repeatingEvent && isInNewCongress)) {
                    archivePath = 'archive_116th_congress_session';
                }
                else if (isBeforeNewCongress || (townHall.repeatingEvent && isInOldCongress)) {
                    archivePath = 'archive_115th_congress_session';
                } 
                else {
                    archivePath = 'archive_other';
                }
                
                if (townHall.eventId && archivePath) {
            
                    if (townHall.repeatingEvent) {
                        path = `${archivePath}/repeating_event`;
                    } else if (eventDate.isValid()) {
                        var year = eventDate.get('year');
                        var month = eventDate.get('month');
                        var dateKey = year + '-' + month;
                        if (year.toString().length === 4) {
                            path = `${archivePath}/${dateKey}`;
                        }
                    } else {
                        path =`${archivePath}/no_date`;
                    }
                    total = total + 1;
                    promises.push(firebasedb.ref(`${path}/${townHall.eventId}`).update(townHall));
                    
                } else {
                    console.log('no path', dateSnapshot.key, townHall.eventId, townHall.thp_id)
                }

            });
        });
    })
    .then(() => {
        Promise.all(promises)
            .then(() => console.log('done'))
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
