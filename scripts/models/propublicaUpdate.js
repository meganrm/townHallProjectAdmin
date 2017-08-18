(function(module) {

  var states_obj = {
    AL: 'Alabama',
    AK: 'Alaska',
    AS: 'American Samoa',
    AZ: 'Arizona',
    AR: 'Arkansas',
    CA: 'California',
    CO: 'Colorado',
    CT: 'Connecticut',
    DE: 'Delaware',
    DC: 'District of Columbia',
    FM: 'Federated States of Micronesia',
    FL: 'Florida',
    GA: 'Georgia',
    GU: 'Guam',
    HI: 'Hawaii',
    ID: 'Idaho',
    IL: 'Illinois',
    IN: 'Indiana',
    IA: 'Iowa',
    KS: 'Kansas',
    KY: 'Kentucky',
    LA: 'Louisiana',
    ME: 'Maine',
    MH: 'Marshall Islands',
    MD: 'Maryland',
    MA: 'Massachusetts',
    MI: 'Michigan',
    MN: 'Minnesota',
    MS: 'Mississippi',
    MO: 'Missouri',
    MT: 'Montana',
    NE: 'Nebraska',
    NV: 'Nevada',
    NH: 'New Hampshire',
    NJ: 'New Jersey',
    NM: 'New Mexico',
    NY: 'New York',
    NC: 'North Carolina',
    ND: 'North Dakota',
    MP: 'Northern Mariana Islands',
    OH: 'Ohio',
    OK: 'Oklahoma',
    OR: 'Oregon',
    PW: 'Palau',
    PA: 'Pennsylvania',
    PR: 'Puerto Rico',
    RI: 'Rhode Island',
    SC: 'South Carolina',
    SD: 'South Dakota',
    TN: 'Tennessee',
    TX: 'Texas',
    UT: 'Utah',
    VT: 'Vermont',
    VI: 'Virgin Islands',
    VA: 'Virginia',
    WA: 'Washington',
    WV: 'West Virginia',
    WI: 'Wisconsin',
    WY: 'Wyoming'
  };

  function Moc(opts) {
    if (!opts.id) {
      return;
    }
    for (keys in opts) {
      this[keys] = opts[keys];
    }

    this.propublica_id = opts.id;
    delete this.id;
    if (parseInt(opts.facebook_account)) {
      this.facebook_account = parseInt(opts.facebook_account);
    }
    if (opts.party && opts.party.toLowerCase() === 'd') {
      this.party = 'Democratic';
    } else if (opts.party && opts.party.toLowerCase() === 'r') {
      this.party = 'Republican';
    } else if (opts.party){
      this.party = 'Independent';
    }
    if (opts.state) {
      this.stateName = states_obj[opts.state];
    }
  }

  function propublicaUpdate() {
        // api call to ProPublica (accepted parameters : 'senate' or 'house')
    function loadPropublicaData(hoc) {
      return new Promise(function(resolve, reject) {
        url = 'https://api.propublica.org/congress/v1/115/' + hoc + '/members.json';
        $.ajax({
          url: url,
          headers: {'X-API-Key': 'CGreQp3d95C4FLYHkCZRph5Hhs9nqfRCdJNlrxHL'},
          success: function(response){
            if (response['results'][0]['members']) {
              var membersArray = response['results'][0]['members'];
              resolve(membersArray);
            } else {
              reject('something has gone terribly wrong');
            }
          },
          contentType: 'application/json'
        });
      });
    }



    function updateHocValues(propublicaMOCs, type) {
      propublicaMOCs.forEach(function(propub_member) {
        // function returns propub_moc_obj
        var member = new Moc(propub_member);
        member.type = type;
        var path = '/mocData/' + member.govtrack_id;
        firebase.database().ref(path).once('value').then(function(snapshot) {
          if (!snapshot.exists()) {
            member.displayName = member.first_name + ' ' + member.last_name;
          }
          // firebase.database().ref(path).update(member).then(function(done){
          //   console.log(done);
          // });

          // console.log('---------------------');

        });
      });
    }
    // have to call propublica api twice (once for senators, once for representatives)
    loadPropublicaData('senate').then(function (senators) {
      updateHocValues(senators, 'sen');
    }).catch(function(error) {
      console.log('error with retrieving senator values', error);
    });

    loadPropublicaData('house').then(function (representatives) {
      updateHocValues(representatives, 'rep');
    }).catch(function(error) {
      console.log('error with retrieving representative values.', error);
    });

  }

  module.propublicaUpdate = propublicaUpdate;
})(window);
