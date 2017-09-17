#!/usr/bin/env node

function errorReport(error, subject) {
  this.from = 'Town Hall Updates <update@updates.townhallproject.com>';
  this.to = 'Megan Riel-Mehan <meganrm@townhallproject.com>';
  this.subject = subject? subject: 'Something has gone terribly wrong';
  if (typeof(error) === 'object') {
    var str='';
    Object.keys(error).forEach(function(key){
      str+= key + ': ' + error[key]+'; </br>';
    });
    this.html = str;
  } else {
    this.html = error;
  }
}

// settings for mailgun
var mailgun_api_key = process.env.MAILGUN_API_KEY2;
var domain = 'updates.townhallproject.com';
var mailgun = require('mailgun-js')({apiKey: mailgun_api_key, domain: domain});

errorReport.prototype.sendEmail = function(to, cc){
  var data = this;
  data.to = to;
  if (cc) {
    data.cc = cc
  }
  mailgun.messages().send(data, function () {
  });
};

module.exports = errorReport;
