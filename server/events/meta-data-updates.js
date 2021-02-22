const moment = require('moment');
const isEmpty = require('lodash').isEmpty;
const db = require('../lib/setupFirebase');
const firebasedb = db.realtimedb;
const firestore = db.firestore;
const constants = require('../constants');
const {
    STATE_LEG_DATA_PATH,
    MOC_DATA_PATH,
    FEDERAL_LEVEL,
} = constants;

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

    const memberId = townhall.govtrack_id || townhall.thp_id;

    if (!memberId) {
        return Promise.resolve();
    }
    const updates = {};
    if (uid && moment(townhall.dateObj).isAfter()) {
        updates.lastUpdated = townhall.dateCreated || moment(townhall.lastUpdated).format() || moment().format();
        updates.lastUpdatedBy = uid;
    }

    if (townhall.meetingType === 'Town Hall') {
        // quick reference for 'days since last town hall' 
        if (moment(townhall.dateObj).isAfter()) {
            updates.last_town_hall = townhall.dateObj;
        }
        if (mocDataPath === MOC_DATA_PATH) {
            let congressNo;
            if (moment(townhall.dateObj).isAfter('2021-01-04', 'YYYY-MM-DD')) {
                console.log('no longer missing member 117th congress', townhall.displayName);
                congressNo = '117';
            } else {
                congressNo = '116'
            }
            let queryRef;
            if (townhall.officePersonId) {
                console.log('has id')
                queryRef = firestore.collection('office_people').doc(townhall.officePersonId)
            } else {
                let ref = firestore.collection('office_people')
                queryRef = ref.where('displayName', '==', townhall.displayName)
            }
            queryRef.get().then((personSnap) => {
                if (personSnap.data) {
                    let person = personSnap.data();
                    let {
                        roles
                    } = person;
                    if (!roles) {
                        return Promise.resolve();
                    }
                    let newRoles = roles.map((role) => {
                        if (role.congress == congressNo) {
                            return {
                                ...role,
                                missing_member: false
                            }
                        }
                        return role;
                    })
                    return firestore.collection('office_people').doc(person.id).update({
                        roles: newRoles,
                    })
                } else if (!personSnap.empty) {

                    personSnap.forEach((ele) => {

                        let person = ele.data();
                        let {
                            roles
                        } = person;
                        if (!roles) {
                            return Promise.resolve();
                        }
                        let newRoles = roles.map((role) => {
                            if (role.congress == congressNo) {
                                return {
                                    ...role,
                                    missing_member: false
                                }
                            }
                            return role;
                        })
                        return firestore.collection('office_people').doc(person.id).update({
                            roles: newRoles,
                        })
                    })
                } else {
                    console.log('couldnt find', townhall.displayName)
                }
            }).catch(console.log)

        }
        // console.log('true town hall', townhall.eventId, townhall.displayName, moment(townhall.dateObj).format('MM/DD/YYYY'))
    }
    if (!isEmpty(updates)) {
        return firebasedb.ref(`${mocDataPath}/${memberId}`).update(updates);
    }
    return Promise.resolve();

};

const updateUserWhenEventArchived = townhall => {
    const uid = getUserId(townhall);
    if (!uid) {
        return Promise.resolve();
    }
    const path = `users/${uid}`;
    const currentEvent = {
        status: 'archived',
    };

    return firebasedb.ref(`${path}/events/${townhall.eventId}`).update(currentEvent);
};

const updateUserWhenEventApproved = (townhall) => {
    const uid = getUserId(townhall);
    if (!uid) {
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
    return checkIfAlreadySet(metaData)
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
                email_sent: false,
            };
            const mocData = {
                govtrack_id: metaData.govtrack_id || null,
                path: townhall.level === FEDERAL_LEVEL ? MOC_DATA_PATH : `${STATE_LEG_DATA_PATH}/${townhall.state}`,
                lastUpdated: townhall.dateCreated || moment(townhall.lastUpdated).format() || moment().format(),
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
    updateUserWhenEventArchived,
};