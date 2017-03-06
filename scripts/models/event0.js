(function(module) {
  function TownHall (opts) {
    for (keys in opts){
      this[keys] = opts[keys];
    }
  }


  //Global data stete
  TownHall.allTownHalls = {};
  TownHall.allTownHallsFB = [];
  TownHall.currentContext = [];
  TownHall.filteredResults = [];
  TownHall.filterIds = {
    meetingType:'',
    Party:'',
    State:''
  };
  TownHall.isCurrentContext = false;
  TownHall.isMap = false;
  TownHall.zipQuery;

  TownHall.timeZones = {
    PST : 'America/Los_Angeles',
    MST : 'America/Denver',
    CST : 'America/Chicago',
    EST : 'America/New_York',
    other : 'no time zone'
  };

  //FIREBASE METHODS
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

  // TownHall.prototype.writetoFB = function () {
  //   console.log('saving to firebase');
  //   firebasedb.ref('/townHalls/' + this.eventId).set(this).then(function(snapshot){
  //     console.log('could not write',error, this);
  //   });
  // };

  // writes to townhall, can take a key for update
  TownHall.prototype.updateFB = function (key) {
    var newEvent = this;
    var metaData = {eventId: key, lastUpdated: newEvent.lastUpdated }
    var updates = {};
    firebase.database().ref('/townHalls/' + key).update(newEvent);
    updates['/townHallIds/' + key] = metaData;
    console.log('updates', updates);
    return firebase.database().ref().update(updates).catch(function(error){
      console.log('could not update', newEvent);
    });
  };

  TownHall.saveZipLookup = function (zip) {
    firebase.database().ref('/zipZeroResults/' + zip).once('value').then(function(snapshot){
      console.log(zip);
      if (snapshot.exists()) {
        newVal = snapshot.val() + 1;
        console.log('new val', newVal);
      }
      else {
        newVal = 1;
      }
      return firebase.database().ref('/zipZeroResults/' + zip).set(newVal);
    });
  };


  // DATA PROCESSING BEFORE WRITE
  // check if there is a time zone, if not, looks up on google
  TownHall.prototype.validateZone = function () {
    var tz = TownHall.timeZones[this.timeZone];
    if (!tz) {
      var time = Date.now();
      var loc = this.lat+','+this.lng;
      url = 'https://maps.googleapis.com/maps/api/timezone/json?location='+loc+'&timestamp=1331766000&key=AIzaSyBlmL9awpTV6AQKQJOmOuUlH1APXWmCHLQ';
      $.get(url, function (response){
        this.zoneString = response.timeZoneId;
        return this;
      });
    }
    else {
      this.zoneString = tz;
      return this;
    }
  };

  TownHall.prototype.findLinks = function() {
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
    if (ampm ==='PM') {
      var hour = hourmin.split(':')[0];
      hour = Number(hour) +12;
      hourmin = hour + ':' + hourmin.split(':')[1];
    }
    return hourmin + ':' + '00';
  };

  // formatting date and time for the calendar app
  TownHall.prototype.formatDateTime = function (){
    timesplit = this.Time.split('-');
    if (timesplit.length === 2) {
      var time = this.Time.split('-')[0];
      var timeEnd = this.Time.split('-')[1];
    }
    else{
      time = this.Time;
    }
    if (this.timeZone === 'HAST') {
      timeZone= 'UTC-1000'
    }
    else {
      timeZone = this.timeZone
    }
    this.dateObj = new Date(this.Date + ' ' + time + ' ' + timeZone);
    this.dateString = this.dateObj.toDateString();
    if (this.dateString !== 'Invalid Date') {
      this.dateValid = true;
      var month = this.dateObj.getMonth() + 1;
      var month = month.toString().length === 1 ? (0 + month.toString()) :month.toString();
      var day = this.dateObj.getDate();
      day = day.toString().length === 1 ? (0 + day.toString()) :day.toString();
      var yearMonthDay = this.dateObj.getFullYear() + '-' + month + '-'+day ;
      this.timeStart24 = TownHall.toTwentyFour(this.Time);
      // If no ending time, just add 2 hours
      if (timeEnd) {
        this.timeEnd24 = TownHall.toTwentyFour(timeEnd);
      }
      else {
        hour = parseInt(this.timeStart24.split(':')[0]) + 2;
        this.timeEnd24 = hour + ':' + this.timeStart24.split(':')[1] + ':' + '00';
      }
      this.validateZone();
      this.yearMonthDay = yearMonthDay;
      this.dateObj = this.dateObj.getTime();
      return this;
    }
    else {
      console.log('no date', this.Date + ' ' + time + ' ' + this.timeZone);
      return this;
    }
  };

  TownHall.prototype.isInFuture = function () {
    this.dateObj = new Date(this.Date);
    var now = new Date();
    if (now - this.dateObj < 0) {
      return true;
    }
  };

  // Handlebars write
  TownHall.prototype.toHtml = function (templateid){
    var source = $(templateid).html();
    var renderTemplate = Handlebars.compile(source);
    return renderTemplate(this);
  };

TownHall.cacheGeocode = function(addresskey, lat, lng, address, type) {
  firebasedb.ref('geolocate/' + type +'/' + addresskey).set(
    {
      lat : lat,
      lng : lng,
      formatted_address : address
    })
  }

  TownHall.prototype.getLatandLog = function(address, type) {
    var newTownHall = this;
    return new Promise(function (resolve, reject) {
      $.ajax({
        url: 'https://maps.googleapis.com/maps/api/geocode/json?key=AIzaSyB868a1cMyPOQyzKoUrzbw894xeoUhx9MM',
        data: {
          'address' : address
        },
        dataType : 'json',
        success: function(r){
          if (r.results[0]) {
            newTownHall.lat = r.results[0].geometry.location.lat;
            newTownHall.lng = r.results[0].geometry.location.lng;
            newTownHall.address = r.results[0].formatted_address.split(', USA')[0];
            var addresskey = address.replace(/\W/g ,'');
            addresskey.trim();
            // firebasedb.ref('/townHallsErrors/geocoding/' + newTownHall.eventId).remove();
            // TownHall.cacheGeocode(addresskey, newTownHall.lat, newTownHall.lng, newTownHall.address, type)
            resolve(newTownHall)
          } else {
            reject('error geocoding', newTownHall)
            // firebasedb.ref('/townHallsErrors/geocoding/' + newTownHall.eventId).set(newTownHall);
          }
        },
        error: function(e){
          console.log('we got an error', e);
        }
      });
    })
  };

  // checks firebase for address, if it's not there, calls google geocode
  TownHall.prototype.geoCodeFirebase = function (address) {
    var newTownHall = this;
    var addresskey = address.replace(/\W/g ,'');
    addresskey.trim();
    firebasedb.ref('geolocate/' + addresskey).once('value').then(function(snapshot){
      if (snapshot.child('lat').exists() === true) {
        newTownHall.lat = snapshot.val().lat;
        newTownHall.lng = snapshot.val().lng;
        newTownHall.address = snapshot.val().formatted_address;
        newTownHall.formatDateTime();
        newTownHall.findLinks();
        TownHall.allTownHalls.push(newTownHall);
        newTownHall.updateFB(newTownHall.eventId);
      }
      else if (snapshot.child('lat').exists() === false) {
        var errorTownHall = firebasedb.ref('/townHallsErrors/geocoding/' + newTownHall.eventId).once('value').then(function(snapshot){
          if (snapshot.child('streetAddress').exists() === newTownHall.streetAddress) {
            console.log('known eror');
          }
          else {
            newTownHall.getLatandLog(address);
          }
        })
      }
    })
    .catch(function(error){
      console.log(error);
    });
  };

  // Gets everything from the google doc and does geo coding in batches
  TownHall.fetchAllGoogle = function(next) {
    TownHall.allTownHalls = [];
    url = 'https://sheets.googleapis.com/v4/spreadsheets/1yq1NT9DZ2z3B8ixhid894e77u9rN5XIgOwWtTW72IYA/values/Upcoming%20Events!C:S?key=AIzaSyBw6HZ7Y4J1dATyC4-_mKmt3u0hLRRqthQ';
    return new Promise(function (resolve, reject) {
      $.ajax({
        url: url,
        success: function (response){
          var range = response.values;
          var encodedArray = TownHall.loadAll(range);
          if (range.length > 0) {
            resolve (encodedArray);
          }
        }
      });
    });
  };

  TownHall.loadAll = function(array){
    var googlekeys = ['eventId','lastUpdated','Member','Party','State','District','meetingType','RSVP','eventName',	'Date', 'Time', 'timeEnd', 'timeZone', 	'Location', 'streetAddress','City','StateAb', 'Zip', 'Notes', 'source'];
    var encodedArray = [];
    for (var j = 0; j < array.length; j++) {
      var row = array[j];
      rowObj = new TownHall;
      for (var k = 0; k < row.length; k++) {
        rowObj[googlekeys[k]] = row[k];
      }
      if (parseInt(rowObj.eventId)) {
        // checks if data is complete
        if (row.length >= 12) {
          encodedArray.push(rowObj);
        }
          // If incomplete store to seperate table
        else {
          firebasedb.ref('/townHallsErrors/missingRows/'+ rowObj.eventId).set(rowObj).catch(function(error){
            console.log('couldnt write', rowObj);
          });
        }
      }
      else {
        // console.log('not id', rowObj);
      }
    }
    return encodedArray;
  };


  TownHall.prototype.isInDatabase = function(){
    var newTownHall = this;
    firebasedb.ref('townHallIds/' + newTownHall.eventId).once('value').then(function(snapshot){
      if (snapshot.exists()) {
        var firebaseUpdate = new Date(snapshot.val().lastUpdated).getTime();
        var googleUpdate = new Date(newTownHall.lastUpdated).getTime();
        if (firebaseUpdate === googleUpdate) {
          console.log('already in database');
          TownHall.allTownHalls.push(newTownHall);
        }
        else {
          console.log('data processing',newTownHall.eventId, snapshot.val().lastUpdated, newTownHall.lastUpdated);
          //data processing
          if (newTownHall.meetingType.slice(0,4)==='Tele') {
            address = newTownHall.State;
          }
          else if (newTownHall.streetAddress.length > 2) {
            address = newTownHall.streetAddress + ' ' + newTownHall.City + ' ' +newTownHall.StateAb;
          }
            // Otherwise, geocode on Home state
          else {
            newTownHall.noLoc = true;
            address = newTownHall.State;
          }
          newTownHall.geoCodeFirebase(address);
        }
      }
      else if (snapshot.child('lat').exists() === false){
        //data processing
        if (newTownHall.meetingType.slice(0,4)==='Tele') {
          address = newTownHall.State;
        }
        else if (newTownHall.streetAddress.length>2) {
          address = newTownHall.streetAddress + ' ' + newTownHall.City + ' ' +newTownHall.StateAb;
        }
          // Otherwise, geocode on Home state
        else {
          newTownHall.noLoc = true;
          address = newTownHall.State;
        }
        newTownHall.geoCodeFirebase(address);
      }
    });
  };

  TownHall.removeOld = function(){
    firebase.database().ref('/townHalls/').on('child_added', function getSnapShot(snapshot) {
      var ele = new TownHall (snapshot.val());
      if (TownHall.allIdsGoogle.indexOf(ele.eventId)<0) {
        console.log('old', ele);
        if (snapshot.val().eventId) {
          var oldTownHall = firebase.database().ref('/townHalls/' + ele.eventId);
          firebase.database().ref('/townHallsOld/' + ele.eventId).set(ele);
          oldTownHall.remove();
        }

      }
    });
  };

  TownHall.allIdsGoogle = [];
  TownHall.allIdsFirebase = [];
  TownHall.lengthOfGoogle;

  TownHall.dataProcess = function (){
    firebase.database().ref('/lastupdated/time').set(Date.now());
    TownHall.fetchAllGoogle().then(function(result) {
      var results = result;
      TownHall.lengthOfGoogle = results.length;
      results.forEach(function(ele){
        TownHall.allIdsGoogle.push(ele.eventId);
        ele.isInDatabase();
      });
      TownHall.removeOld();
    }, function(err) {
      console.log(err);
    });
  };


  TownHall.readGoogle = function (){
    time = 30 * 60 * 1000;
    setInterval(TownHall.dataProcess, time);
  };

  module.TownHall = TownHall;
})(window);
