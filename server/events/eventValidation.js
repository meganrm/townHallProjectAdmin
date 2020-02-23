const moment = require('moment-timezone');

var firebasedb = require('../lib/setupFirebase.js').realtimedb;
var ErrorReport = require('../lib/errorReporting.js');
var utils = require('../util');

const stateMap = require('../data/stateMap');

const startMonth = '0';
const startYear = '2017';
let current = moment([startYear, startMonth]);
let DATES = [];
while (current.isSameOrBefore(moment(), 'month')){
    DATES.push(current.format('YYYY-M'));
    current = current.add(1, 'month');
}

function needsGeoCode(townhall){
    if (!townhall.lat && townhall.address) {
        return true;
    } else {
        return false;
    }
}

function dateValid(date) {
    let isValid = false;
    if (moment(date, 'YYYY-MM-DD', true).isValid()) {
        isValid = true;
    }
    return isValid;
}

function timeValid(time) {
    let isValid = false;
    if (moment(time,'HH:mm:ss',true).isValid()) {
        isValid = true;
    }
    return isValid;
}

function dateTimeValidation(townhall, path) {
    let update = {};
    if (townhall.dateObj < 10000000000 && townhall.dateObj > 0) {
        const newDateObj = townhall.dateObj * 1000;
        console.log('bad date obj:', townhall.dateObj);
        updateEvent(townhall.eventId, {
            dateObj: newDateObj,
        }, path);
    }

    if (townhall.dateObj === 0 && townhall.dateString && townhall.Time) {
        const zone = townhall.zoneString || 'America/New_York';
        const newDate = moment.tz(`${townhall.dateString}, ${townhall.Time}`, ['ddd, MMM D YYYY, h:mm A', 'ddd MMM D YYYY, h:mm A'], zone).format();

        const newDateObj = moment(newDate).utc().valueOf();
        console.log(townhall.dateString, townhall.Time, newDateObj, newDate);
        updateEvent(townhall.eventId, {
            dateObj: newDateObj,
        }, path);
    }

    // checking if date valid, set if true
    if (
        !townhall.repeatingEvent &&
    townhall.lat &&
    townhall.zoneString &&
    dateValid(townhall.yearMonthDay) &&
    timeValid(townhall.timeStart24) &&
    timeValid(townhall.timeEnd24)) {
        update = {};
        if (!townhall.dateValid) {
            update.dateValid = true;
            console.log('updating date valid');
            updateEvent(townhall.eventId, update, path);
        }
    } else if (!townhall.repeatingEvent) {
        if (needsGeoCode(townhall)) {
            let error = new ErrorReport(path + townhall.eventId, 'Needs geocode');
            error.sendEmail();
        }
        if (!dateValid(townhall.yearMonthDay)) {
            console.log('date', townhall);
        }
        if (!timeValid(townhall.timeStart24)) {
            if (moment(townhall.timeStart24, 'H:mm:ss', true).isValid()) {
                update = {};
                update.timeStart24 = moment(townhall.timeStart24, 'H:mm:ss').format('HH:mm:ss');
                console.log('updating timeStart24');

                updateEvent(townhall.eventId, update, path);
            }
        }
        if (!timeValid(townhall.timeEnd24)) {
            if (moment(townhall.timeEnd24, 'H:mm:ss', true).isValid()) {
                update = {};
                update.timeEnd24 = moment(townhall.timeEnd24, 'H:mm:ss').format('HH:mm:ss');
                updateEvent(townhall.eventId, update, path);
            }
        }
    } else {
        if (townhall.dateValid) {
            update = {};
            update.dateValid = false;
            console.log('updating date not valid');
            updateEvent(townhall.eventId, update, path);
        }
    }
}

function checkDistrictAndState(townhall, path) {
    if (townhall.district && townhall.state) {
        return;
    }
    if (townhall.District === 'Senate') {
        return;
    }
    let update = {};
    if (!townhall.district && townhall.District) {
        let district = townhall.District.split('-')[1];
        update.district = utils.zeropadding(district);
        console.log('adding district', district);
    }
    if (!townhall.state && townhall.District) {
        let state = townhall.District.split('-')[0];
        update.state = state;
        update.stateName = stateMap[state];
        console.log('adding state', state, stateMap[state]);
    }
    updateEvent(townhall.eventId, update, path);
}

function checkMemberDisplayName(townHall, path) {
    const update = {};
    if (!townHall.displayName && townHall.Member) {
        update.displayName = townHall.Member;
        update.Member = null;
        updateEvent(townHall.eventId, update, path);
    }
}

function updateEvent(key, update, path) {
    console.log('updating event!', path + key, update);
    if (!key) {
        return console.log('no event id');
    }
    firebasedb.ref(path + key).update(update);
}

module.exports = {
    updateEvent,
    checkMemberDisplayName,
    checkDistrictAndState,
    dateTimeValidation,
};
