(function (module) {
  function TownHall(opts) {
    for (keys in opts) {
      this[keys] = opts[keys];
    }
  }

  // Global data stete
  TownHall.allTownHalls = [];
  TownHall.allTownHallsFB = {};
  TownHall.currentContext = [];
  TownHall.filteredResults = [];
  TownHall.filterIds = {
    meetingType: '',
    Party: '',
    State: ''
  };
  TownHall.isCurrentContext = false;
  TownHall.isMap = false;

  // FIREBASE METHODS
  // Initialize Firebase
  var config = {
    apiKey: 'AIzaSyDwZ41RWIytGELNBnVpDr7Y_k1ox2F2Heg',
    authDomain: 'townhallproject-86312.firebaseapp.com',
    databaseURL: 'https://townhallproject-86312.firebaseio.com',
    storageBucket: 'townhallproject-86312.appspot.com',
    messagingSenderId: '208752196071'
  };

  firebase.initializeApp(config);
  var firebasedb = firebase.database();
  var provider = new firebase.auth.GoogleAuthProvider();

  // writes to townhall, can take a key for update
  TownHall.prototype.updateFB = function (key) {
    var newEvent = this;
    var metaData = { eventId: key, lastUpdated: newEvent.lastUpdated };
    var updates = {};
    return new Promise(function (resolve, reject) {
      firebase.database().ref('/townHalls/' + key).update(newEvent);
      updates['/townHallIds/' + key] = metaData;
      resolve(newEvent);
      return firebase.database().ref().update(updates).catch(function (error) {
        reject('could not update', newEvent);
      });
    });
  };

  TownHall.prototype.updateUserSubmission = function (key) {
    var newEvent = this;
    return new Promise(function (resolve, reject) {
      firebase.database().ref('/UserSubmission/' + key).update(newEvent);
      resolve(newEvent);
    });
  };

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
      url = `https://maps.googleapis.com/maps/api/timezone/json?location=${loc}&timestamp=${time}&key=AIzaSyB868a1cMyPOQyzKoUrzbw894xeoUhx9MM`;
      $.get(url, function (response) {
        if (!response.timeZoneName) {
          reject('no timezone results', id, response);
        } else {
          console.log(response);
          newTownHall.zoneString = response.timeZoneId;
          var timezoneAb = response.timeZoneName.split(' ');
          newTownHall.timeZone = timezoneAb.reduce(function (acc, cur) {
            acc = acc + cur[0];
            return acc;
          }, '');
          console.log(newTownHall.Date.replace(/-/g, '/') + ' ' + databaseTH.Time + ' ' + newTownHall.timeZone);
          newTownHall.dateObj = new Date(newTownHall.Date.replace(/-/g, '/') + ' ' + databaseTH.Time + ' ' + newTownHall.timeZone).getTime();

          resolve(newTownHall);
        }
      });
    });
  };

  TownHall.prototype.findLinks = function () {
    $reg_exUrl = /(https?:\/\/[^\s]+)/g;
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
        formatted_address: address
      });
  };

  TownHall.prototype.getLatandLog = function (address, type) {
    var newTownHall = this;
    return new Promise(function (resolve, reject) {
      $.ajax({
        url: 'https://maps.googleapis.com/maps/api/geocode/json?key=AIzaSyB868a1cMyPOQyzKoUrzbw894xeoUhx9MM',
        data: {
          'address': address
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
        }
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
        var errorTownHall = firebasedb.ref('/townHallsErrors/geocoding/' + newTownHall.eventId).once('value').then(function (snap) {
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
    console.log('removing', ele);
    firebasedb.ref('/townHallsOld/').push(ele);
    return new Promise(function (resolve, reject) {
      var removed = oldTownHall.remove();
      if (removed) {
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
      var oldTownHallID = firebasedb.ref('/townHallIds/' + ele.eventId + '/lastUpdated').set(Date.now());
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
