const moment = require('moment-timezone');

var firebasedb = require('../lib/setupFirebase.js');
const eventValidation = require('../events/eventValidation');
const TownHall = require('../events');

const FEDERAL_TOWNHALLS = '/townHalls/';
const STATE_TOWNHALLS = '/state_townhalls/';

const FEDERAL_SUBMISSION_PATH = '/UserSubmission/';
const STATE_SUBMISSION_PATH = '/state_legislators_user_submission/';


function databaseListeners(states) {
    firebasedb.ref(FEDERAL_TOWNHALLS).on('child_changed', function (snapshot) {
        var townhall = snapshot.val();
        eventValidation.dateTimeValidation(townhall, FEDERAL_TOWNHALLS);
    });

    firebasedb.ref(FEDERAL_TOWNHALLS).on('child_added', function (snapshot) {
        var townhall = new TownHall(snapshot.val());
        eventValidation.checkMemberDisplayName(townhall, FEDERAL_TOWNHALLS);

        if (townhall.meetingType === 'Tele-Town Hall' && townhall.chamber === 'upper') {
            townhall.getLatandLog(townhall.State, 'state', FEDERAL_TOWNHALLS);
        }
        if (townhall.govtrack_id && townhall.dateObj && townhall.zoneString) {
            firebasedb.ref(`mocData/${townhall.govtrack_id}/confirmed_events`)
                .update({
                    [townhall.meetingType.replace(/\./g, '')]: {
                        [townhall.eventId]: moment.tz(townhall.dateObj, townhall.zoneString).format(),
                    },
                })
                .catch(console.log);
        }
    });

    firebasedb.ref(FEDERAL_SUBMISSION_PATH).on('child_added', function (snapshot) {
        var townhall = snapshot.val();
        eventValidation.dateTimeValidation(townhall, FEDERAL_SUBMISSION_PATH);
        eventValidation.checkDistrictAndState(townhall, FEDERAL_SUBMISSION_PATH);
        eventValidation.checkMemberDisplayName(townhall, FEDERAL_SUBMISSION_PATH);
    });

    states.forEach((state) => {
        let path = `${STATE_SUBMISSION_PATH}${state}/`;
        firebasedb.ref(path).on('child_added', function (snapshot) {
            var townhall = snapshot.val();
            eventValidation.dateTimeValidation(townhall, path);
            eventValidation.checkMemberDisplayName(townhall, path);
        });
    });

    states.forEach((state) => {
        let path = `${STATE_TOWNHALLS}${state}/`;
        firebasedb.ref(path).on('child_added', function (snapshot) {
            var townhall = snapshot.val();
            eventValidation.dateTimeValidation(townhall, path);
            eventValidation.checkMemberDisplayName(townhall, path);
        });
    });

}

function getStates() {
    return firebasedb.ref('states').once('value')
        .then((snapshot) => {
            let toReturn = [];
            snapshot.forEach((state) => {
                const stateInfo = state.val();
                if (stateInfo.state_legislature_covered) {
                    toReturn.push(stateInfo.state);
                }
            });
            return toReturn;
        });
}

function startListeners() {
    return getStates()
        .then(states => {
            console.log(states)
            databaseListeners(states);
        });
}

startListeners();
module.exports = startListeners;