const moment = require('moment-timezone');
const firebasedb = require('../lib/setupFirebase.js').realtimedb;
const getStateLegs = require('../data/get-states').getStateLegs;
const eventValidation = require('../events/eventValidation');
const TownHall = require('../events');
const emailConfirmation = require('../emailTriggers').emailConfirmation;
const metaDataUpdates = require('../events/meta-data-updates');

const FEDERAL_TOWNHALLS = '/townHalls/';
const STATE_TOWNHALLS = '/state_townhalls/';
const FEDERAL_MOC_DATA = 'mocData';
const STATE_LEG_DATA = 'state_legislators_data';

const FEDERAL_SUBMISSION_PATH = '/UserSubmission/';
const STATE_SUBMISSION_PATH = '/state_legislators_user_submission/';


function databaseListeners(states) {

    // LIVE FEDERAL EVENTS CREATED
    firebasedb.ref(FEDERAL_TOWNHALLS).on('child_added', function (snapshot) {
        var townhall = new TownHall(snapshot.val());
        //send email confirmation
        emailConfirmation(townhall);
        
        eventValidation.checkMemberDisplayName(townhall, FEDERAL_TOWNHALLS);
        metaDataUpdates.updateUserWhenEventApproved(townhall);
        if (townhall.meetingType === 'Tele-Town Hall' && townhall.chamber === 'upper') {
            townhall.getLatandLog(townhall.state, 'state', FEDERAL_TOWNHALLS);
        }

        // UPDATING MOC DATA
        // if (townhall.govtrack_id && townhall.dateObj && townhall.zoneString) {
        //     firebasedb.ref(`mocData/${townhall.govtrack_id}/confirmed_events`)
        //         .update({
        //             [townhall.meetingType.replace(/\./g, '')]: {
        //                 [townhall.eventId]: moment.tz(townhall.dateObj, townhall.zoneString).format(),
        //             },
        //         })
        //         .catch(console.log);
        // }
    });

    // LIVE STATE EVENTS CREATED

    states.forEach((state) => {
        let path = `${STATE_TOWNHALLS}${state}/`;
        firebasedb.ref(path).on('child_added', function (snapshot) {
            var townhall = snapshot.val();
            //send email confirmation
            emailConfirmation(townhall);
            metaDataUpdates.updateUserWhenEventApproved(townhall);
            eventValidation.dateTimeValidation(townhall, path);
            eventValidation.checkMemberDisplayName(townhall, path);
        });
    });

    // PENDING FEDERAL EVENTS CREATED

    firebasedb.ref(FEDERAL_SUBMISSION_PATH).on('child_added', function (snapshot) {
        var townhall = snapshot.val();

        metaDataUpdates.updateUserWhenEventSubmitted(townhall);
        metaDataUpdates.saveMocUpdatedBy(FEDERAL_MOC_DATA, townhall);

        eventValidation.dateTimeValidation(townhall, FEDERAL_SUBMISSION_PATH);
        eventValidation.checkDistrictAndState(townhall, FEDERAL_SUBMISSION_PATH);
        eventValidation.checkMemberDisplayName(townhall, FEDERAL_SUBMISSION_PATH);
    });

    // PENDING STATE EVENTS CREATED

    states.forEach((state) => {
        let path = `${STATE_SUBMISSION_PATH}${state}/`;
        firebasedb.ref(path).on('child_added', function (snapshot) {
            var townhall = snapshot.val();

            metaDataUpdates.updateUserWhenEventSubmitted(townhall);
            metaDataUpdates.saveMocUpdatedBy(STATE_LEG_DATA, townhall);

            eventValidation.dateTimeValidation(townhall, path);
            eventValidation.checkMemberDisplayName(townhall, path);
        });
    });

    // LIVE FEDERAL EVENTS CHANGED
    firebasedb.ref(FEDERAL_TOWNHALLS).on('child_changed', function (snapshot) {
        var townhall = snapshot.val();
        eventValidation.dateTimeValidation(townhall, FEDERAL_TOWNHALLS);
    });

    // LIVE STATE EVENTS CHANGED

    states.forEach((state) => {
        let path = `${STATE_TOWNHALLS}${state}/`;
        firebasedb.ref(path).on('child_changed', function (snapshot) {
            var townhall = snapshot.val();
            eventValidation.dateTimeValidation(townhall, STATE_TOWNHALLS);
        });
    });

}

function startListeners() {
    return getStateLegs()
        .then(states => {
            databaseListeners(states);
        });
}

module.exports = startListeners;