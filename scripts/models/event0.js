/* globals firebasedb */

(function (module) {
  function makeDisplayDistrict (opts) {
    const constants = {
      HD: 'House District',
      SD: 'Senate District',
      GOV: 'Governor',
      LTGOV: 'Lt. Governor',
      upper: 'Sen.',
      lower: 'Rep.',
    };
    if (!opts){
      return;
    }
    if (opts.level && opts.level === 'state') {
      //state leg or statewide office
      var title;
      if (opts.district) {
        //state leg
        //"VA HD-08" (Virginia House District 8)
        var chamber = opts.district.split('-')[0];
        var number = opts.district.split('-')[1];
        var sentence = [opts.district, '(' + opts.stateName, constants[chamber], parseInt(number) + ')'];
        opts.displayDistrict = sentence.join(' ');
      } else {
        //statewide office, ie Governor
        var office = opts.thp_id.split('-')[1];
        title = constants[office];
        opts.displayDistrict = title;
      }
    } else if (opts.level && opts.level === 'federal') {
      var state = opts.state;
      if (opts.district && parseInt(opts.district)) {
        //House
        opts.displayDistrict = state + '-' + parseInt(opts.district);
      } else if (opts.chamber === 'upper') {
        //Senator
        opts.displayDistrict = state + ', ' + 'Senate';
      } else if (opts.chamber === 'statewide' && opts.office) {
        opts.displayDistrict = opts.office.toUpperCase() + ' ' + state;
      } else {
        opts.displayDistrict = state;
      }
      if (opts.meetingType === 'Campaign Town Hall') {
        opts.displayDistrict = 'Running for: ' + opts.displayDistrict;
      }
    }
  }

  class TownHall {
    constructor(opts) {
      for (var keys in opts) {
        this[keys] = opts[keys];
      }
      if (opts.level && opts.state) {
        this.displayDistrict = makeDisplayDistrict(opts);
      }
    }
    // writes to townhall, can take a key for update
    updateFB(key, path) {
      var newEvent = this;
      var metaData = { eventId: key, lastUpdated: newEvent.lastUpdated };
      var updates = {};
      var townhallPath = path || '/townHalls/';
      return new Promise(function (resolve, reject) {
        updates['/townHallIds/' + key] = metaData;
        return firebasedb.ref(townhallPath + key).update(newEvent).then(function () {
          console.log('wrote');
          console.log(townhallPath + key, newEvent);
          firebasedb.ref().update(updates);
          resolve(newEvent);
        }).catch(function (error) {
          reject(error);
        });
      });
    }
    updateUserSubmission(key) {
      var newEvent = this;
      key = key ? key : newEvent.eventId;
      return new Promise(function (resolve, reject) {
        if (!key) {
          reject('needs key');
        }
        firebasedb.ref('/UserSubmission/' + key).update(newEvent);
        resolve(newEvent);
      });
    }
    eventApproved(key) {
      var newEvent = this;
      return new Promise(function (resolve) {
        firebasedb.ref('/UserSubmission/' + key).update(newEvent);
        resolve(newEvent);
      });
    }
    //   firebasedb.ref('zipToDistrict/').once('value').then(function(snapshot){
    //     snapshot.forEach(function(zip){
    //       if (zip.numChildren() > 1) {
    //         var acc = {}
    //         zip.forEach(function(cur){
    //           var district = cur.val().abr + cur.val().dis
    //           acc[district] = cur.key
    //         });
    //         if (Object.keys(acc).length !== zip.numChildren()) {
    //           console.log(Object.keys(acc).length, zip.numChildren(), acc, zip.val());
    //
    //         }
    //       }
    //     })
    // })
    // DATA PROCESSING BEFORE WRITE
    // gets time zone with location and date
    validateZone(id) {
      var newTownHall = this;
      if (id) {
        var databaseTH = TownHall.allTownHallsFB[id];
      }
      else {
        databaseTH = this;
      }
      var time = Date.parse(newTownHall.Date + ' ' + databaseTH.Time) / 1000;
      var loc = databaseTH.lat + ',' + databaseTH.lng;
      return new Promise(function (resolve, reject) {
        var url = `https://maps.googleapis.com/maps/api/timezone/json?location=${loc}&timestamp=${time}&key=AIzaSyB868a1cMyPOQyzKoUrzbw894xeoUhx9MM`;
        $.get(url, function (response) {
          if (!response.timeZoneName) {
            reject('no timezone results', id, response);
          }
          else {
            // console.log(response);
            newTownHall.zoneString = response.timeZoneId;
            var timezoneAb = response.timeZoneName.split(' ');
            newTownHall.timeZone = timezoneAb.reduce(function (acc, cur) {
              acc = acc + cur[0];
              return acc;
            }, '');
            if (newTownHall.timeZone === 'HST' | newTownHall.timeZone === 'HAST') {
              var hawaiiTime = 'UTC-1000';
            }
            var zone = hawaiiTime ? hawaiiTime : newTownHall.timeZone;
            // console.log(newTownHall.Date.replace(/-/g, '/') + ' ' + databaseTH.Time + ' ' + zone);
            newTownHall.dateObj = new Date(newTownHall.Date.replace(/-/g, '/') + ' ' + databaseTH.Time + ' ' + zone).getTime();
            resolve(newTownHall);
          }
        });
      });
    }
    findLinks() {
      var $reg_exUrl = /(https?:\/\/[^\s]+)/g;
      // make the urls hyper links
      if (this.Notes && this.Notes.length > 0) {
        var withAnchors = this.Notes.replace($reg_exUrl, '<a href="$1" target="_blank">Link</a>');
        this.Notes = '<p>' + withAnchors + '</p>';
      }
    }
    isInFuture() {
      this.dateObj = new Date(this.Date);
      var now = Date.now();
      if (now - this.dateObj < 0) {
        return true;
      }
    }
    // Handlebars write
    toHtml(templateid) {
      var source = $(templateid).html();
      var renderTemplate = Handlebars.compile(source);
      return renderTemplate(this);
    }
    getLatandLog(address, type) {
      var newTownHall = this;
      return new Promise(function (resolve, reject) {
        $.ajax({
          url: 'https://maps.googleapis.com/maps/api/geocode/json?key=AIzaSyDP8q2OVisSLyFyOUU6OTgGjNNQCq7Q3rE',
          data: {
            'address': address,
          },
          dataType: 'json',
          success: function (r) {
            if (r.results[0]) {
              newTownHall.lat = r.results[0].geometry.location.lat;
              newTownHall.lng = r.results[0].geometry.location.lng;
              newTownHall.address = r.results[0].formatted_address.split(', USA')[0];
              var addresskey = address.replace(/\W/g, '');
              addresskey.trim();
              // firebasedb.ref('/townHallsErrors/geocoding/' + newTownHall.eventId).remove();
              TownHall.cacheGeocode(addresskey, newTownHall.lat, newTownHall.lng, newTownHall.address, type);
              resolve(newTownHall);
            }
            else {
              firebasedb.ref('/townHallsErrors/geocoding/' + newTownHall.eventId).set(newTownHall);
              reject('error geocoding', newTownHall);
            }
          },
          error: function (e) {
            console.log('we got an error', e);
          },
        });
      });
    }
    // checks firebase for address, if it's not there, calls google geocode
    geoCodeFirebase(address) {
      var newTownHall = this;
      var addresskey = address.replace(/\W/g, '');
      addresskey.trim();
      firebasedb.ref('geolocate/' + addresskey).once('value').then(function (snapshot) {
        if (snapshot.child('lat').exists() === true) {
          newTownHall.lat = snapshot.val().lat;
          newTownHall.lng = snapshot.val().lng;
          newTownHall.address = snapshot.val().formatted_address;
          TownHall.allTownHalls.push(newTownHall);
        }
        else if (snapshot.child('lat').exists() === false) {
          firebasedb.ref('/townHallsErrors/geocoding/' + newTownHall.eventId).once('value').then(function (snap) {
            if (snap.child('streetAddress').exists() === newTownHall.streetAddress) {
              console.log('known eror');
            }
            else {
              newTownHall.getLatandLog(address);
            }
          });
        }
      })
        .catch(function (error) {
          console.log(error);
        });
    }
    removeOld() {
      var ele = this;
      var oldTownHall = firebasedb.ref('/townHalls/' + ele.eventId);
      var oldTownHallID = firebasedb.ref('/townHallIds/' + ele.eventId);
      var dateKey = 'noDate';
      console.log('removing', ele);
      if (ele.dateObj) {
        var year = new Date(ele.dateObj).getFullYear();
        var month = new Date(ele.dateObj).getMonth();
        dateKey = year + '-' + month;
      }
      firebasedb.ref('/townHallsOld/' + dateKey + '/' + ele.eventId).update(ele);
      return new Promise(function (resolve, reject) {
        var removed = oldTownHall.remove();
        if (removed) {
          oldTownHallID.remove();
          resolve(ele);
        }
        else {
          reject('could not remove');
        }
      });
    }
    deleteEvent(path) {
      var ele = this;
      var oldTownHall = firebasedb.ref(path + '/' + ele.eventId);
      if (path === 'TownHalls') {
        firebasedb.ref('/townHallIds/' + ele.eventId + '/lastUpdated').set(Date.now());
      }
      return new Promise(function (resolve, reject) {
        var removed = oldTownHall.remove();
        if (removed) {
          resolve(ele);
          console.log('deleting', ele);
        }
        else {
          reject('delete');
        }
      });
    }
    convertToCsvTownHall() {
      if (!this.eventId) {
        return;
      }
      const convertedTownHall = {};

      convertedTownHall.Member = this.Member;
      convertedTownHall.Event_Name = this.eventName ? this.eventName : ' ';
      convertedTownHall.Location = this.Location ? this.Location : ' ';
      convertedTownHall.Meeting_Type = this.meetingType;
      let district = this.district ? '-' + this.district : ' ';
      convertedTownHall.District = this.state + district;
      convertedTownHall.govtrack_id = this.govtrack_id || ' ';
      convertedTownHall.Party = this.party;
      convertedTownHall.state = this.state;
      convertedTownHall.State = this.stateName ? this.stateName : this.State;
      if (this.repeatingEvent) {
        convertedTownHall.Repeating_Event = this.repeatingEvent;
        convertedTownHall.Date = ' ';
      }
      else if (this.dateString) {
        convertedTownHall.Repeating_Event = ' ';
        convertedTownHall.Date = this.dateString;
      }
      else {
        convertedTownHall.Repeating_Event = ' ';
        convertedTownHall.Date = moment(this.dateObj).format('ddd, MMM D YYYY');
      }
      convertedTownHall.Time_Start = this.Time;
      convertedTownHall.Time_End = this.timeEnd || ' ';
      convertedTownHall.Time_Zone = this.timeZone || ' ';
      convertedTownHall.Zone_ID = this.zoneString || ' ';
      convertedTownHall.Address = this.address;
      convertedTownHall.Notes = this.Notes ? this.Notes.replace(/\"/g, '\'') : ' ';
      convertedTownHall.Map_Icon = this.iconFlag;
      convertedTownHall.Link = this.link || 'https://townhallproject.com/?eventId=' + this.eventId;
      convertedTownHall.Link_Name = this.linkName || ' ';
      convertedTownHall.dateNumber = this.yearMonthDay;
      return convertedTownHall;
    }

    static getDataByDate(path, dateStart, dateEnd) {
      var ref = firebase.database().ref(path);
      return ref.orderByChild('dateObj').startAt(dateStart).endAt(dateEnd).once('value')
        .then(snapshot => {
          let toReturn =[];
          snapshot.forEach(ele => {
            toReturn.push(new TownHall(ele.val()));
          });
          return toReturn;
        });
    }

    checkDistrictForMatch(dist) {
      let districtMatcher = Number(dist);
      let thisDistrict = Number(this.district);
      if (!isNaN(thisDistrict) && !isNaN(districtMatcher) && thisDistrict === districtMatcher) {
        return true;
      } else if (dist === 'At-Large' && this.district === 'At-Large') {
        return true;
      }
      return false;
    }

    isMatch(searchParams) {
      const townHall = this;
      for (let prop in searchParams) {
        if (prop === 'start_time' || prop === 'end_time' || prop === 'Member') {
          continue;
        }
        if (!townHall[prop]) {
          return false;
        }
        else if (prop === 'district' && !townHall.checkDistrictForMatch(searchParams[prop])) {
          return false;
        }
        else if (prop === 'govtrack_id' && townHall[prop].toString() !== searchParams[prop].toString()) { // govtrack doesn't match
          return false;
        }
        // number check
        // (also boolean)
        else if (!isNaN(townHall[prop]) &&
                 !isNaN(searchParams[prop]) &&
                 Number(townHall[prop]) !== Number(searchParams[prop])) {
            return false;
        }
        // string check
        else if (isNaN(townHall[prop]) &&
                 isNaN(searchParams[prop]) &&
                 townHall[prop].toLowerCase() !== searchParams[prop].toLowerCase()) {
            return false;
        }
      }
      return true;
    }

    static getOldStateData(state, dateKey) {
      var db = firebasedb;
      var ref = db.ref(`/state_townhalls_archive/${state}/${dateKey}`);
      var totals = new Set();
      return new Promise(function (resolve) {
        ref.once('value').then(function (snapshot) {
          snapshot.forEach(function (oldTownHall) {
            let townHall = (new TownHall(oldTownHall.val())).convertToCsvTownHall();
            totals.add(townHall);
          });
          resolve(totals);
        });
      });
    }
    // Takes an array of TownHalls and sorts by sortOn field
    static sortFunction(a, b) {
      if (a[TownHall.sortOn] && b[TownHall.sortOn]) {
        if (parseInt(b[TownHall.sortOn])) {
          return a[TownHall.sortOn] - b[TownHall.sortOn];
        }
        else {
          return a[TownHall.sortOn].toLowerCase().localeCompare(b[TownHall.sortOn].toLowerCase());
        }
      }
    }
    static getFilteredResults(data) {
      // Itterate through all active filters and pull out any townhalls that match them
      // At least one attribute from within each filter group must match
      return TownHall.filteredResults = Object.keys(TownHall.filters).reduce(function (filteredData, key) {
        return filteredData.filter(function (townhall) {
          return TownHall.filters[key].some(function (filter) {
            return filter.slice(0, 8) === townhall[key].slice(0, 8);
          });
        });
      }, data).sort(TownHall.sortFunction);
    }
    static addFilter(filter, value) {
      if (!TownHall.filters.hasOwnProperty(filter)) {
        TownHall.filters[filter] = [value];
      }
      else {
        TownHall.filters[filter].push(value);
      }
    }
    static removeFilter(filter, value) {
      var index = TownHall.filters[filter].indexOf(value);
      if (index !== -1) {
        TownHall.filters[filter].splice(index, 1);
      }
      if (TownHall.filters[filter].length === 0) {
        delete TownHall.filters[filter];
      }
    }
    static resetFilters() {
      Object.keys(TownHall.filters).forEach(function (key) {
        delete TownHall.filters[key];
      });
    }
    static addFilterIndexes(townhall) {
      if (TownHall.allStates.indexOf(townhall.State) === -1) {
        TownHall.allStates.push(townhall.State);
      }
      if (TownHall.allMoCs.indexOf(townhall.Member) === -1) {
        TownHall.allMoCs.push(townhall.Member);
      }
    }
    static lookupMoreZips(zip) {
      var obj = {};
      $.get('https://www.googleapis.com/civicinfo/v2/representatives?key=AIzaSyAcogkW06HYmZnbEttHs9xcs_vOqMjzBzE&includeOffices=false&roles=legislatorLowerBody&address=' + zip, function (response) {
        if (response.divisions) {
          var r = Object.keys(response.divisions)[0].split('/');
          if (r[2] === 'district:dc') {
            obj.abr = 'DC';
            obj.dis = '0';
            obj.zip = zip.toString();
          }
          else if (r.length === 4) {
            obj.abr = r[2].split(':')[1].toUpperCase();
            obj.dis = r[3].split(':')[1];
            obj.zip = zip;
          }
          else {
            var aka = response.divisions[Object.keys(response.divisions)[0]].alsoKnownAs[0];
            var ls = aka.split('/');
            if (ls.length === 4) {
              obj.abr = ls[2].split(':')[1].toUpperCase();
              obj.dis = ls[3].split(':')[1];
              obj.zip = zip;
            }
          }
          var dup = false;
          if (obj) {
            firebasedb.ref('zipToDistrict/' + zip).once('value').then(function (snapshot) {
              snapshot.forEach(function (ele) {
                if (ele.val().abr === obj.abr && parseInt(ele.val().dis) === parseInt(obj.dis)) {
                  dup = true;
                }
              });
              if (!dup) {
                // firebasedb.ref('zipToDistrict/' + zip).push(obj).then(function(){
                console.log('wrote', obj);
                // });
              }
              else {
                console.log('already there', zip);
              }
            });
          }
          else {
            console.log('couldnt make obj', response.divisions);
          }
        }
      });
    }
    // converts time to 24hour time
    static toTwentyFour(time) {
      var hourmin = time.split(' ')[0];
      var ampm = time.split(' ')[1];
      if (ampm === 'PM') {
        var hour = hourmin.split(':')[0];
        hour = Number(hour) + 12;
        hourmin = hour + ':' + hourmin.split(':')[1];
      }
      return hourmin + ':' + '00';
    }
    static cacheGeocode(addresskey, lat, lng, address, type) {
      firebasedb.ref('geolocate/' + type + '/' + addresskey).set({
        lat: lat,
        lng: lng,
        formatted_address: address,
      });
    }
  }

  // Global data state
  TownHall.allTownHalls = [];
  TownHall.allTownHallsFB = {};
  TownHall.currentUser = null;
  TownHall.allMoCs = [];
  TownHall.allStates = [];
  TownHall.currentContext = [];
  TownHall.filteredResults = [];
  TownHall.filters = {};
  TownHall.sortOn = 'State';
  TownHall.filterIds = {
    meetingType: '',
    Party: '',
    State: '',
  };
  TownHall.isCurrentContext = false;
  TownHall.allIdsGoogle = [];
  TownHall.allIdsFirebase = [];

  module.TownHall = TownHall;
})(window);
