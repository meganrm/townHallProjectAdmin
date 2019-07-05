var https = require('https');
const moment = require('moment-timezone');
const firebasedb = require('../lib/setupFirebase');

const startMonth = '0';
const startYear = '2017';
let current = moment([startYear, startMonth]);
let DATES = [];
while (current.isSameOrBefore(moment(), 'month')){
    DATES.push(current.format('YYYY-M'));
    current = current.add(1, 'month');
}

class TownHall {
    static updateEvent(key, update, path) {
        console.log('updating event!', path + key, update);
        if (!key) {
            return console.log('no event id');
        }
        firebasedb.ref(path + key).update(update);
    }

    constructor(opts){
        for (let keys in opts) {
            this[keys] = opts[keys];
        }
    }

    //geocodes an address
    getLatandLog(address, path) {
        var addressQuery = escape(address);
        var addresskey = address.replace(/\W/g, '');
        var options = {
            hostname: 'maps.googleapis.com',
            path: `/maps/api/geocode/json?address=${addressQuery}&key=AIzaSyDP8q2OVisSLyFyOUU6OTgGjNNQCq7Q3rE`,
            method: 'GET',
        };
        var str = '';
        var newTownHall = this;
        var req = https.request(options, (res) => {
            res.setEncoding('utf8');
            res.on('data', (chunk) => {
                str += chunk;
            });
            res.on('end', () => {
                var r = JSON.parse(str);
                if (!r.results[0]) {
                    console.log('no geocode results', newTownHall.eventId);
                } else {
                    newTownHall.lat = r.results[0].geometry.location.lat;
                    newTownHall.lng = r.results[0].geometry.location.lng;
                    newTownHall.address = r.results[0].formatted_address.split(', USA')[0];
                    addresskey.trim();
                    const update =  {
                        lat: newTownHall.lat,
                        lng: newTownHall.lng,
                        formatted_address: newTownHall.address,
                    };
                    console.log('got lat log', newTownHall.eventId);
                    TownHall.updateEvent(newTownHall.eventId, update, path);
                }
            });
        });
        req.on('error', (e) => {
            console.error('error requests', e, newTownHall.eventId);
        });
        req.end();
    }
}

module.exports = TownHall;