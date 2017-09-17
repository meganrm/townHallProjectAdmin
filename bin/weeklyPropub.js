function WeeklyPropublicaUpdate(opts) {
  for (keys in opts) {
    this[keys] = opts[keys];
  }
}

var https = require("https");
// var statesAb = require('../bin/stateMap.js');

var statesAb = {
  AL: 'Alabama',
  AK: 'Alaska',
  AS: 'American Samoa',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  DC: 'District Of Columbia',
  FM: 'Federated States Of Micronesia',
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



// check eventbrite accounts need to be parsed as #'s
function Moc(opts) {
  if (!opts.member_id) {
    return;
  }
  for (keys in opts) {
    this[keys] = opts[keys];
  }
  this.propublica_id = opts.member_id;
  if (parseInt(opts.facebook_account)) {
    this.facebook_account = parseInt(opts.facebook_account);
  }
  if (opts.current_party && opts.current_party.toLowerCase() === "d") {
    this.party = "Democratic";
  } else if (opts.current_party && opts.current_party.toLowerCase() === "r") {
    this.party = "Republican";
  } else if (opts.current_party) {
    this.party = "Independent";
  }
  if (opts.state) {
    this.stateName = statesAb[opts.state];
  }
  delete this.member_id;
  delete this.current_party;
}

//   function weeklyPropublicaUpdate() {
function loadNewMembersRequest() {
  return new Promise(function(resolve, reject) {
    var options = {
      hostname: "api.propublica.org",
      path: "/congress/v1/members/new.json",
      headers: {
        "X-API-Key": "CGreQp3d95C4FLYHkCZRph5Hhs9nqfRCdJNlrxHL"
      },
      method: "GET"
    };

    const req = https.request(options, res => {
      console.log("statusCode:", res.statusCode);
      console.log("headers:", res.headers);

      res.on("data", d => {
        var r = JSON.parse(d);
        console.log(r['results'][0]);
        //process.stdout.write(d);
        resolve(d);
      });
    });

    req.on("error", e => {
      console.error(e);
      reject(e);
    });
    req.end();
  });
}

function findSpecificMemberRequest(member_id) {
  return new Promise(function(resolve, reject) {
    var options = {
      hostname: "api.propublica.org",
      path: "/congress/v1/members/" + member_id + ".json",
      headers: {
        "X-API-Key": "CGreQp3d95C4FLYHkCZRph5Hhs9nqfRCdJNlrxHL"
      },
      method: "GET"
    };

    const req = https.request(options, res => {
      console.log("statusCode:", res.statusCode);
      console.log("headers:", res.headers);

      res.on("data", d => {
        var r = JSON.parse(d);
        console.log(r['results'][0]);
        //process.stdout.write(d);
        resolve(d);
      });
    });

    req.on("error", e => {
      console.error(e);
      reject(e);
    });
    req.end();
  });
}

function updateNewMembers(newPropublicaMembers) {
  newPropublicaMembers.forEach(function(new_propub_member) {
    // store state value here too
    // var state;

    var type;
    if (new_propub_member.chamber == "House") {
      type = "rep";
    } else {
      type = "sen";
    }
    // check against propublica specific member search using id
    findSpecificMemberRequest(new_propub_member.id)
      .then(function(existing_propub_member) {
        // console.log(existing_propub_member);
        var member = new Moc(existing_propub_member);
        member.type = type;
        // check mocData for matches
        var path = "/mocData/" + existing_propub_member.govtrack_id;
      //   firebase.database().ref(path).once("value").then(function(snapshot) {
      //     if (!snapshot.exists()) {
      //       // if no match
      //       // update an entirely new member
      //       member.displayName = member.first_name + " " + member.last_name;
      //       // firebase.database().ref(path).update(member).then(function(done){
      //       //   console.log(done);
      //       // });
      //       console.log(member);

      //       var mocIDPath =
      //         "/mocID/" + member.last_name + "_" + member.first_name;
      //       // ADD NEW MEMBER INFO TO mocID/
      //       // firebase.database().ref(mocIDPath).update(id : existing_propub_member.govtrack_id, nameEntered: member.displayName).then(function(done){
      //       //   console.log("Added member to mocID/ endpoint " + done);
      //       // });
      //     } else {
      //       // if match - update only fields that may change (social media)
      //       console.log(member);
      //       // firebase.database().ref(path).update(
      //       // { facebook_account : member.facebook_account,
      //       //   in_office : member.in_office,
      //       //   youtube_account : member.youtube_account,
      //       //   twitter_account : member.twitter_account}).then(function(done){
      //       //   console.log(done);
      //       // });
      //     }
      //     console.log("---------");
      //   });
      // })
      // .catch(function(error) {
      //   console.log("error ", error);
      });
  });
}

WeeklyPropublicaUpdate.getUpdate = function() {
  // call propublica 'new members' api endpoint
  loadNewMembersRequest()
    .then(function(newMembers) {
      updateNewMembers(newMembers);
    })
    .catch(function(error) {
      console.log("Uh oh, something went wrong getting new members ", error);
    });
};

WeeklyPropublicaUpdate.getUpdate();

module.exports = WeeklyPropublicaUpdate;
