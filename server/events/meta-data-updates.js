const moment = require('moment');
const firebasedb = require('../lib/setupFirebase');

function getUserId(townHall) {
    if (townHall.userID && townHall.enteredBy.includes('@')) {
        return townHall.userID;
    }
    if (townHall.enteredBy && townHall.enteredBy.includes('@')) {
        return;
    }
    return townHall.enteredBy;
}

const saveMocUpdatedBy = (mocDataPath, townhall) => {
    const uid = getUserId(townhall);
    if (!uid) {
        return Promise.resolve();
    }
    const memberId = townhall.govtrack_id || townhall.thp_id;

    if (!memberId) {
        return Promise.resolve();
    }
    const updates = {
        lastUpdated: townhall.dateCreated || moment(townhall.lastUpdated).format() || moment().format(),
        lastUpdatedBy: uid,
    };
    // quick reference for 'days since last town hall' 
    if (townhall.meetingType === 'Town Hall') {
        updates.lastTownHall = townhall.dateObj;
    }

    return firebasedb.ref(`${mocDataPath}/${memberId}`).update(updates);
};

const updateUserWhenEventApproved = (townhall) => {
    const uid = getUserId(townhall);
    if (!uid){
        return Promise.resolve();
    }
    const path = `users/${uid}`;
    const currentEvent = {
        status: 'approved',
    };

    return firebasedb.ref(`${path}/events/${townhall.eventId}`).update(currentEvent);
};

const checkIfAlreadySet = (metaData) => {
    const path = `users/${metaData.uid}/events/${metaData.eventId}`;
    return firebasedb.ref(path).once('value')
        .then(snapshot => {
            return snapshot.exists();
        });
};

const updateUserWhenEventSubmitted = (townhall) => {
    const uid = getUserId(townhall);
    if (!uid) {
        return Promise.resolve();
    }
    const metaData = {
        eventId: townhall.eventId,
        govtrack_id: townhall.govtrack_id || null,
        thp_id: townhall.thp_id || null,
        memberId: townhall.govtrack_id || townhall.thp_id,
        uid,
    };
    checkIfAlreadySet(metaData)
        .then(exists => {
            if (exists) {
                return Promise.resolve(); 
            }
            const path = `users/${metaData.uid}`;
            const updates = {};
            const currentEvent = {
                status: 'pending',
                date_created: moment().format(),
                time_start: moment.tz(`${townhall.dateString} ${townhall.Time}`, 'ddd, MMM D YYYY, h:mm A', townhall.zoneString).format(),
                // TODO: flip this once all working
                email_sent: true,
            };
            const mocData = {
                govtrack_id: metaData.govtrack_id || null,
                lastUpdated: Date.now(),
                thp_id: metaData.thp_id || null,
            };
            let id = metaData.govtrack_id ? metaData.govtrack_id : metaData.thp_id;
            id = id || 'candidate';
            updates[`${path}/events/${metaData.eventId}`] = currentEvent;
            updates[`${path}/mocs/${id}`] = mocData;
            return firebasedb.ref().update(updates);
        });
};

module.exports = {
    updateUserWhenEventSubmitted,
    saveMocUpdatedBy,
    updateUserWhenEventApproved,
};