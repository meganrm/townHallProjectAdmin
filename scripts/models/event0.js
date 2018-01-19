/*globals firebasedb*/

(function (module) {

  function TownHall(opts) {
    for (var keys in opts) {
      this[keys] = opts[keys];
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
  TownHall.isMap = false;


  // writes to townhall, can take a key for update
  TownHall.prototype.updateFB = function (key, path) {
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
  };

  TownHall.getOldData = function getOldData (key, value, dateKey) {
    var db = firebasedb;
    var ref = db.ref('/townHallsOld/' + dateKey);
    var totals = new Set();
    return new Promise (function(resolve){
      ref.once('value').then(function(snapshot) {
        snapshot.forEach(function(oldTownHall) {
          let townHall = new TownHall(oldTownHall.val());
          if (townHall[key].toLowerCase() === value.toLowerCase()) {
            totals.add(townHall);
          }
        });
        resolve(totals);
      });
    });
  };

  TownHall.prototype.updateUserSubmission = function (key) {
    var newEvent = this;
    key = key? key : newEvent.eventId;
    return new Promise(function (resolve, reject) {
      if (!key) {
        reject('needs key');
      }
      firebasedb.ref('/UserSubmission/' + key).update(newEvent);
      resolve(newEvent);
    });
  };

  TownHall.prototype.eventApproved = function (key) {
    var newEvent = this;
    return new Promise(function (resolve) {
      firebasedb.ref('/UserSubmission/' + key).update(newEvent);
      resolve(newEvent);
    });
  };

  // Takes an array of TownHalls and sorts by sortOn field
  TownHall.sortFunction = function(a, b) {
    if (a[TownHall.sortOn] && b[TownHall.sortOn]) {
      if (parseInt(b[TownHall.sortOn])) {
        return a[TownHall.sortOn] - b[TownHall.sortOn];
      } else {
        return a[TownHall.sortOn].toLowerCase().localeCompare(b[TownHall.sortOn].toLowerCase());
      }
    }
  };

  TownHall.getFilteredResults = function (data) {
    // Itterate through all active filters and pull out any townhalls that match them
    // At least one attribute from within each filter group must match
    return TownHall.filteredResults = Object.keys(TownHall.filters).reduce(function (filteredData, key) {
      return filteredData.filter(function (townhall) {
        return TownHall.filters[key].some(function (filter) {
          return filter.slice(0, 8) === townhall[key].slice(0, 8);
        });
      });
    }, data).sort(TownHall.sortFunction);
  };

  TownHall.addFilter = function (filter, value) {
    if (!TownHall.filters.hasOwnProperty(filter)) {
      TownHall.filters[filter] = [value];
    } else {
      TownHall.filters[filter].push(value);
    }
  };

  TownHall.removeFilter = function (filter, value) {
    var index = TownHall.filters[filter].indexOf(value);
    if (index !== -1) {
      TownHall.filters[filter].splice(index, 1);
    }
    if (TownHall.filters[filter].length === 0) {
      delete TownHall.filters[filter];
    }
  };

  TownHall.resetFilters = function () {
    Object.keys(TownHall.filters).forEach(function (key) {
      delete TownHall.filters[key];
    });
  };

  TownHall.addFilterIndexes = function(townhall) {
    if (TownHall.allStates.indexOf(townhall.State) === -1) {
      TownHall.allStates.push(townhall.State);
    }
    if (TownHall.allMoCs.indexOf(townhall.Member) === -1) {
      TownHall.allMoCs.push(townhall.Member);
    }
  };

  TownHall.lookupMoreZips = function(zip){
    var obj = {};
    $.get('https://www.googleapis.com/civicinfo/v2/representatives?key=AIzaSyAcogkW06HYmZnbEttHs9xcs_vOqMjzBzE&includeOffices=false&roles=legislatorLowerBody&address=' + zip, function(response){
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

        } else {
          var aka = response.divisions[Object.keys(response.divisions)[0]].alsoKnownAs[0];
          var ls = aka.split('/');
          if (ls.length === 4 ) {
            obj.abr = ls[2].split(':')[1].toUpperCase();
            obj.dis = ls[3].split(':')[1];
            obj.zip = zip;
          }

        }
        var dup = false;
        if (obj) {
          firebasedb.ref('zipToDistrict/' + zip).once('value').then(function(snapshot){
            snapshot.forEach(function(ele){
              if (ele.val().abr === obj.abr && parseInt(ele.val().dis) === parseInt(obj.dis)) {
                dup = true;
              }
            });
            if (!dup) {
              firebasedb.ref('zipToDistrict/' + zip).push(obj).then(function(){
                console.log('wrote', obj);
              });
            } else {
              console.log('already there', zip);
            }
          });
        } else {
          console.log('couldnt make obj', response.divisions);
        }
      }
    });
  };
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
  TownHall.prototype.validateZone = function (id) {
    var newTownHall = this;
    if (id) {
      var databaseTH = TownHall.allTownHallsFB[id];
    } else {
      databaseTH = this;
    }
    var time = Date.parse(newTownHall.Date + ' ' + databaseTH.Time) / 1000;
    var loc = databaseTH.lat + ',' + databaseTH.lng;
    return new Promise(function (resolve, reject) {
      var url = `https://maps.googleapis.com/maps/api/timezone/json?location=${loc}&timestamp=${time}&key=AIzaSyB868a1cMyPOQyzKoUrzbw894xeoUhx9MM`;
      $.get(url, function (response) {
        if (!response.timeZoneName) {
          reject('no timezone results', id, response);
        } else {
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
  };

  TownHall.prototype.findLinks = function () {
    var $reg_exUrl = /(https?:\/\/[^\s]+)/g;
   // make the urls hyper links
    if (this.Notes && this.Notes.length > 0) {
      var withAnchors = this.Notes.replace($reg_exUrl, '<a href="$1" target="_blank">Link</a>');
      this.Notes = '<p>' + withAnchors + '</p>';
    }
  };

  // converts time to 24hour time
  TownHall.toTwentyFour = function (time) {
    var hourmin = time.split(' ')[0];
    var ampm = time.split(' ')[1];
    if (ampm === 'PM') {
      var hour = hourmin.split(':')[0];
      hour = Number(hour) + 12;
      hourmin = hour + ':' + hourmin.split(':')[1];
    }
    return hourmin + ':' + '00';
  };

  TownHall.prototype.isInFuture = function () {
    this.dateObj = new Date(this.Date);
    var now = Date.now();
    if (now - this.dateObj < 0) {
      return true;
    }
  };

  // Handlebars write
  TownHall.prototype.toHtml = function (templateid) {
    var source = $(templateid).html();
    var renderTemplate = Handlebars.compile(source);
    return renderTemplate(this);
  };

  TownHall.cacheGeocode = function (addresskey, lat, lng, address, type) {
    firebasedb.ref('geolocate/' + type + '/' + addresskey).set(
      {
        lat: lat,
        lng: lng,
        formatted_address: address,
      });
  };

  TownHall.prototype.getLatandLog = function (address, type) {
    var newTownHall = this;
    return new Promise(function (resolve, reject) {
      $.ajax({
        url: 'https://maps.googleapis.com/maps/api/geocode/json?key=AIzaSyB868a1cMyPOQyzKoUrzbw894xeoUhx9MM',
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
          } else {
            firebasedb.ref('/townHallsErrors/geocoding/' + newTownHall.eventId).set(newTownHall);
            reject('error geocoding', newTownHall);
          }
        },
        error: function (e) {
          console.log('we got an error', e);
        },
      });
    });
  };

  // checks firebase for address, if it's not there, calls google geocode
  TownHall.prototype.geoCodeFirebase = function (address) {
    var newTownHall = this;
    var addresskey = address.replace(/\W/g, '');
    addresskey.trim();
    firebasedb.ref('geolocate/' + addresskey).once('value').then(function (snapshot) {
      if (snapshot.child('lat').exists() === true) {
        newTownHall.lat = snapshot.val().lat;
        newTownHall.lng = snapshot.val().lng;
        newTownHall.address = snapshot.val().formatted_address;
        TownHall.allTownHalls.push(newTownHall);
      } else if (snapshot.child('lat').exists() === false) {
        firebasedb.ref('/townHallsErrors/geocoding/' + newTownHall.eventId).once('value').then(function (snap) {
          if (snap.child('streetAddress').exists() === newTownHall.streetAddress) {
            console.log('known eror');
          } else {
            newTownHall.getLatandLog(address);
          }
        });
      }
    })
    .catch(function (error) {
      console.log(error);
    });
  };

  TownHall.prototype.removeOld = function () {
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
      } else {
        reject('could not remove');
      }
    });
  };

  TownHall.prototype.deleteEvent = function (path) {
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
      } else {
        reject('delete');
      }
    });
  };

  TownHall.allIdsGoogle = [];
  TownHall.allIdsFirebase = [];

  module.TownHall = TownHall;
})(window);
