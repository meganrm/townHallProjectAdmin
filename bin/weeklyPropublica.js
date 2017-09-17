#!/usr/bin/env node


var firebasedb = require('../bin/setupFirebase.js');
var ErrorReport = require('../bin/errorReporting.js');

function WeeklyPropublicaUpdate(opts) {
  for (keys in opts) {
    this[keys] = opts[keys];
  }
}

var https = require("https");
var statesAb = require("../bin/stateMap.js");

// check eventbrite accounts need to be parsed as #'s
function Moc(opts) {
  if (!opts.member_id) {
    return;
  }
  for (keys in opts) {
    this[keys] = opts[keys];
  }
  this.propublica_id = opts.member_id;
  this.propublica_facebook = opts.facebook_account;
  if (parseInt(this.propublica_facebook)) {
    this.propublica_facebook = parseInt(this.propublica_facebook);
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
  delete this.roles;
  delete this.facebook_account;
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
      res.on("data", d => {
        // process.stdout.write(d);
        var r = JSON.parse(d);
        if (r['results'][0]['members']) {
          resolve(r['results'][0]['members']);
        } else {
          reject('no data came back from propublica/new')
        }
      });
    });

    req.on("error", e => {
      console.error('error on request', e);
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
    var str = '';
    const req = https.request(options, res => {
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        str += chunk;
      });
      res.on('end', () => {
        var r = JSON.parse(str);
        var member = r['results'][0];
        if (member) {
          resolve(member);
        } else {
          reject('no data came back from propublica/members')
        }
      });
    });

    req.on("error", e => {
      console.error('error getting ', e);
      reject(e);
    });
    req.end();
  });
}

function updateNewMembers(newPropublicaMembers) {
  newPropublicaMembers.forEach(function(new_propub_member) {
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
        firebasedb.ref(path).once("value").then(function(snapshot) {
          if (!snapshot.exists()) {
            // if no match
            // update an entirely new member
            member.displayName = member.first_name + " " + member.last_name;
            member.state = new_propub_member.state;
            member.district = new_propub_member.district;
            member.stateName = statesAb[new_propub_member.state];
            // firebasedb.ref(path).update(member).then(function(done){
            //   console.log(done);
            // });
            var lastname = member.last_name.replace(/\W/g, '')
            var firstname = member.first_name.replace(/\W/g, '')
            var memberKey = lastname.toLowerCase() + '_' + firstname.toLowerCase();
            var mocIDPath = "/mocID/" + memberKey;
            var memberIDObject = {
              id : member.govtrack_id,
              nameEntered: member.displayName
            }
            // ADD NEW MEMBER INFO TO mocID/
            // firebasedb.ref(mocIDPath).update(memberIDObject)
            // .then(function(done){
            //   console.log("Added member to mocID/ endpoint " + done);
            // }).catch(function(error){
            //   errorEmail = new ErrorReport(member.govtrack_id + ':' error, 'Could not save a new mocID');
            //   error.sendEmail('Megan Riel-Mehan <meganrm@townhallproject.com>');
            // });
          } else {
            // if match - update only fields that may change (social media)
            console.log('existing member', member.govtrack_id);
            // firebasedb.ref(path).update(member).then(function(done){
            //   console.log(done);
            // }).catch(function(error){
            //   errorEmail = new ErrorReport(member.govtrack_id + ':' error, 'Could not find propublica member');
            //   error.sendEmail('Megan Riel-Mehan <meganrm@townhallproject.com>');
            // });
          }
          console.log("---------");
        });
      })
      .catch(function(error) {
        errorEmail = new ErrorReport(member.govtrack_id + ':' + error, 'Could not update existing moc');
        error.sendEmail('Megan Riel-Mehan <meganrm@townhallproject.com>');
      });
  });
}

WeeklyPropublicaUpdate.getUpdate = function() {
  // call propublica 'new members' api endpoint
  loadNewMembersRequest()
    .then(function(newMembers) {
      console.log('got all new members');
      updateNewMembers(newMembers);
    })
    .catch(function(error) {
      console.log("Uh oh, something went wrong getting new members ", error);
    });
};

WeeklyPropublicaUpdate.getUpdate();

module.exports = WeeklyPropublicaUpdate;
