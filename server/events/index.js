var https = require('https');
const request = require('superagent');
const moment = require('moment-timezone');
const firebasedb = require('../lib/setupFirebase').realtimedb;

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
                        address: newTownHall.address,
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
    getTimeZone (dateString, startTime, lat, lng, path) {
        const time = Date.parse(`${dateString} ${startTime}`) / 1000;
        const loc = `${lat},${lng}`;
        console.log(time, loc);
        const newTownHall = this;
        const url = `https://maps.googleapis.com/maps/api/timezone/json?location=${loc}&timestamp=${time}&key=AIzaSyBvs-ugD9uydf8lUBwiwvN4dB5X9lbgpLw`;
        return request
            .get(url)
            .then((r) => {
                const response = r.body;
                if (!response.timeZoneName) {
                    return Error('no timezone results', response);
                }
                const zoneString = response.timeZoneId;
                const timezoneAb = response.timeZoneName.split(' ');
                const timeZone = timezoneAb.reduce((acc, cur) => {
                    acc += cur[0];
                    return acc;
                }, '');
                const offset = response.rawOffset / 60 / 60 + response.dstOffset / 60 / 60;
                let utcoffset;
                if (Number(offset) === offset) {
                    utcoffset = `UTC${offset}00`;
                } else {
                    const fract = ((offset * 10) % 10) / 10;
                    const integr = Math.trunc(offset);
                    let mins = (Math.abs(fract * 60)).toString();
                    const zeros = '00';
                    mins = zeros.slice(mins.length) + mins;
                    utcoffset = `UTC${integr}${mins}`;
                }

                const dateObj = moment(`${dateString} ${startTime} ${utcoffset}`).utc().valueOf();
                console.log(dateObj, moment(dateObj).format());
                const update = {
                    dateObj,
                    timeZone,
                    zoneString,
                };
                console.log(update)

                TownHall.updateEvent(newTownHall.eventId, update, path);
            
            }).catch((error) => {
                console.log(error);
            });
    }
}

module.exports = TownHall;