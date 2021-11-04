const google = require('googleapis');
const keys = require('../creds-google-sheet.json');
const googleMethods = require('../server/recess-events/google-methods');
const firebasedb = require('../server/lib/setupFirebase.js').realtimedb;

const SHEETS_ID = process.env.SHEETS_ID_MOC_EB_IDS;
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

// TODO: change this to actual path
const ROOT_PATH_MOC = 'test_moc';

// TODO: move this into models script
class MOC {
    constructor({ id, name, district, is_incumbent, eventbrite_ids, campaign_eventbrite_ids, is_congress_115, is_congress_116 }) {
        this.id = id;
        [this.first_name, this.last_name] = name.trim().split(' ', 2);
        this.district = district;
        this.is_incumbent = is_incumbent ? (is_incumbent.toLowerCase() == 'true') : false;
        this.eventbrite_ids = (eventbrite_ids || '').split(',').map(id => id.trim());
        this.campaign_eventbrite_ids = (campaign_eventbrite_ids || '').split(',').map(id => id.trim());
        this.is_congress_115 = is_congress_115 ? (is_congress_115.toLowerCase() == 'true') : false;
        this.is_congress_116 = is_congress_116 ? (is_congress_116.toLowerCase() == 'true') : false;
    }
}

// configure JWT auth client
let jwtClient = new google.auth.JWT(
    keys.client_email,
    null,
    keys.private_key,
    SCOPES);

//authenticate request
jwtClient.authorize(function (err) {
    if (err) {
        console.log(err);
        return;
    } else {
        console.log('Successfully connected!');
    }
});

// update firebase with google sheets data
googleMethods.read(jwtClient, SHEETS_ID, 'Sheet1!A:H')
    .then(data => {
        let newMocPromises = data
            // skip the header row
            .slice(1)
            // create an new record for each row
            .map(item => {
                let moc = new MOC({
                    id: item[2],
                    name: item[0],
                    district: item[1],
                    is_incombent: item[3],
                    eventbrite_ids: item[4],
                    campaign_eventbrite_ids: item[5],
                    is_congress_115: item[6],
                    is_congress_116: item[7],
                });

                // TODO: handle missing ids
                if (!moc.id) {
                    console.log('Missing id. Record will not be added.');
                    return;
                }

                let newMocRef = firebasedb.ref(`${ROOT_PATH_MOC}/${moc.id}`);
                return newMocRef.set(moc);

            });
        Promise.all(newMocPromises).then(() => process.exit(0));
    })
    .catch(e => console.log(e));
