#!/usr/bin/env node

function Researcher(opts) {
  for (keys in opts) {
    this[keys] = opts[keys];
  }
}

var firebasedb = require('../bin/setupFirebase.js');

// settings for mailgun
var mailgun_api_key = process.env.MAILGUN_API_KEY2;
var domain = 'updates.townhallproject.com';
var mailgun = require('mailgun-js')({apiKey: mailgun_api_key, domain: domain});
var moment = require('moment');

Researcher.sendEmail = function(data){
  mailgun.messages().send(data, function () {
    console.log('sent');
  });
};

Researcher.prototype.composeEmail = function(html) {
  var researcher = this;
  var data = {
    from: 'Town Hall Updates <update@updates.townhallproject.com>',
    to: 'meganrm@gmail.com',
    // cc: 'nwilliams@townhallproject.com',
    subject: `Sample Researcher Email + ${researcher.email}`,
    html: html
  };
  Researcher.sendEmail(data);
};

function getmocName(mocID, days){
  return new Promise(function(resolve, reject) {
    firebasedb.ref(`mocData/${mocID}`).once('value').then(function(moc){
      resolve({name: moc.val().displayName, days: days});
    });
  });
}

function compileMocReport(days, moc){
  return `<p>It's been ${days} since you submitted an update on ${moc}.</p>`;
}

function loopThroughMocs(mocs){
  var report = '';
  return new Promise(function(resolve, reject) {
    var mocIDs = Object.keys(mocs);
    mocIDs.forEach(function(mocID, index){
      if (mocs[mocID].isAssigned){
        var now = moment();
        var timeAgo = moment(mocs[mocID].lastUpdated);
        days = now.diff(timeAgo, 'days');
        if (days > 7 && days < 30) {
          getmocName(mocID, days).then(function(result){
            report = report + compileMocReport(result.days, result.name);
            if (index + 1 === mocIDs.length){
              resolve(report);
            }
          });
        }
      }
    });
  });

}


firebasedb.ref('users/').once('value').then(function(snapshot){
  snapshot.forEach(function(researcher){
    var researcherObj = new Researcher(researcher.val());
    var mocs = researcherObj.mocs;
    if (mocs) {
      loopThroughMocs(mocs).then(function(report){
        researcherObj.composeEmail(report);
      });
    }
  });
});

module.exports = Researcher;
