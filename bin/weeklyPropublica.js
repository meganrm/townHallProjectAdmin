#!/usr/bin/env node
const request = require('superagent');
const firebasedb = require('../server/lib/setupFirebase.js');
const ErrorReport = require('../server/lib/errorReporting.js');
const Moc = require('../server/moc');

const propublicaAPI = process.env.PROPUBLICA;

function getNewMembers() {
  let url = 'https://api.propublica.org/congress/v1/members/new.json';
  return request
    .get(url)
    .set('X-API-Key', propublicaAPI)
    .then((res) => {
      try {
        let data = JSON.parse(res.text);
        return data.results[0].members;
      } catch (e) {
        console.log(e);
      }
    });
}

function getSpecificMember(url) {
  return request
    .get(url)
    .set('X-API-Key', propublicaAPI)
    .then((res) => {
      try {
        let data = JSON.parse(res.text);
        return data.results[0];
      } catch (e) {
        console.log(e);
      }
    });
}

function updateDatabaseWithNewMembers(newPropublicaMembers) {
  newPropublicaMembers.forEach(function(new_propub_member) {
    var type;
    if (new_propub_member.chamber == 'House') {
      type = 'rep';
    } else {
      type = 'sen';
    }
    // check against propublica specific member search using id
    getSpecificMember(new_propub_member.api_uri)
      .then(function(fullPropPublicaMember) {
        var newMember = new Moc(fullPropPublicaMember);
        newMember.type = type;
        if (!fullPropPublicaMember.govtrack_id) {
          return console.log('no govtrack_id', fullPropPublicaMember.member_id);
        }
        var path = '/mocData/' + fullPropPublicaMember.govtrack_id;
        firebasedb.ref(path).once('value').then(function(snapshot) {
          if (!snapshot.exists()) {
            return newMember.createNew(fullPropPublicaMember);
          }
          // return newMember.update(path)
          // .then(function(){
          //   console.log('done');
          // }).catch(function(error){
          //   let errorEmail = new ErrorReport(newMember.govtrack_id + ':' + error, 'Could not find propublica member');
          //   errorEmail.sendEmail('Megan Riel-Mehan <meganrm@townhallproject.com>');
          // });
        });
      })
      .catch(function(error) {
        let errorEmail = new ErrorReport(new_propub_member.id + ':' + error, 'Could not update existing moc');
        errorEmail.sendEmail('Megan Riel-Mehan <meganrm@townhallproject.com>');
      });
  });
}

  // call propublica 'new members' api endpoint
getNewMembers()
    .then(function(newMembers) {
      console.log('got all new members');
      updateDatabaseWithNewMembers(newMembers);
    })
    .catch(function(error) {
      console.log('Uh oh, something went wrong getting new members ', error);
    });
