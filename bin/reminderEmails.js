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
    cc: 'nwilliams@townhallproject.com',
    subject: `Sample Researcher Email + ${researcher.email}`,
    html: html
  };
  data['h:Reply-To']='TownHall Project <info@townhallproject.com>, <Emily Blumberg> emilysblumberg@gmail.com';
  Researcher.sendEmail(data);
};

function compileMocReport(mocs){
  var names = mocs.slice(0, -1).join(', ') + ' or ' +  mocs[mocs.length - 1]
  var copy = `Hi!<br>
  <p>We haven't received any event submissions (including "No New Events") for <span style="color:#ff4741">${names}</span> in a week. Remember, you are the only researcher assigned to these members of Congress, so if you aren't able to do the research these constituents could be missing vital opportunities to make their voices heard.</p>
  <p>If you aren't able to continue volunteering with Town Hall Project, please respond to this email with "PLEASE REASSIGN" and we'll assign a new volunteer to these MoCs. No hard feelings!</p>
  <p>If you are able to continue (and we hope you are!) please make sure to submit your research OR a "No New Event" submission for every MoC by end of day each Monday and Friday. As always, my research leads and I are always happy to answer questions about the process or provide best practices on event research.</p>
  <p>Thank you for all you do!</p>
  Best,<br>
  Emily`
  return copy;
}


function getmocName(mocID, days){
  return new Promise(function(resolve, reject) {
    firebasedb.ref(`mocData/${mocID}`).once('value').then(function(moc){
      resolve({name: moc.val().displayName, days: days});
    });
  });
}

function loopThroughMocs(mocs){
  var report = [];
  return new Promise(function(resolve, reject) {
    var mocIDs = Object.keys(mocs);
    mocIDs.forEach(function(mocID, index){
      if (mocs[mocID].isAssigned){
        var now = moment();
        var timeAgo = moment(mocs[mocID].lastUpdated);
        days = now.diff(timeAgo, 'days');
        if (days > 7 ) {
          getmocName(mocID, days).then(function(result){
            report.push(result.name);
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
        var html = compileMocReport(report)
        researcherObj.composeEmail(html);
      });
    }
  });
});

module.exports = Researcher;
