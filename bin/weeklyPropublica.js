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

function getNewSenate() {
    let url = 'https://api.propublica.org/congress/v1/116/senate/members.json';
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

function getNewReps() {
  let url = 'https://api.propublica.org/congress/v1/116/house/members.json';
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
          // return console.log('no govtrack_id', fullPropPublicaMember)
              newMember.govtrack_id = fullPropPublicaMember.member_id === 'H001079' ? 412743 : 412744;
              fullPropPublicaMember.govtrack_id = fullPropPublicaMember.member_id === 'H001079' ? 412743 : 412744;
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
// getNewMembers()
//     .then(function(newMembers) {
//       console.log('got all new members');
//       updateDatabaseWithNewMembers(newMembers);
//     })
//     .catch(function(error) {
//       console.log('Uh oh, something went wrong getting new members ', error);
//     });

getNewSenate()
  .then(newSenators => {
      newSenators.forEach(senator => {
          let newSenator = new Moc(senator);
          newSenator.type = 'sen';
          if (!newSenator.govtrack_id) {
              return console.log('no govtrack_id', newSenator.id);
          }
          var path = '/mocData/' + newSenator.govtrack_id;
          firebasedb.ref(path).once('value').then(function (snapshot) {
              if (!snapshot.exists()) {
                  newSenator.createNew();
              }
              console.log('already have', newSenator.first_name, newSenator.last_name);
              return newSenator.update(path)
            .then(function () {
                console.log('done');
            }).catch(function (error) {
                let errorEmail = new ErrorReport(newSenator.govtrack_id + ':' + error, 'Could not find propublica member');
                errorEmail.sendEmail('Megan Riel-Mehan <meganrm@townhallproject.com>');
            });
          });
      });
  });

// getNewReps()
//     .then(newReps => {
//       console.log(newReps)
//       newReps.forEach(rep => {
//         let newRep = new Moc(rep);
//         newRep.type = 'rep';
//         if (!newRep.govtrack_id) {
//           return console.log('no govtrack_id', newRep.id);
//         }
//         var path = '/mocData/' + newRep.govtrack_id;
//         firebasedb.ref(path).once('value').then(function (snapshot) {
//           if (!snapshot.exists()) {
//             newRep.createNew();
//           }
//           console.log('already have', newRep.first_name, newRep.last_name);
//           return newRep.update(path)
//             .then(function () {
//               console.log('done');
//             }).catch(function (error) {
//               let errorEmail = new ErrorReport(newRep.govtrack_id + ':' + error, 'Could not find propublica member');
//               errorEmail.sendEmail('Megan Riel-Mehan <meganrm@townhallproject.com>');
//             });
//         });
//       });
//     });