#!/usr/bin/env node

// unpacks data from action network
  function PartnerEmail(opts) {
    for (keys in opts){
      this[key] = opts[key]
    }
  }

  var admin = require('firebase-admin')
  var TownHall = require('../bin/emailAutomation_events.js')


// settings for mailgun
  var mailgun_api_key = process.env.MAILGUN_API_KEY2;
  var domain = 'updates.townhallproject.com';
  var mailgun = require('mailgun-js')({apiKey: mailgun_api_key, domain: domain});
  var firebasedb = admin.database()

  PartnerEmail.sendEmail = function(user, data){
    mailgun.messages().send(data, function (error, body) {
    })
  }
  // composes email using the list of events
  PartnerEmail.prototype.composeEmail = function(district, events){
    var username = ''
    var partner = this
    var htmltext = `<body style="color:#1E2528; font-size:14px; line-height: 27px;">Hi ${username} - ` +
    '<p>It looks like there\'s one or more events coming up near you! We hope you can attend the event below and bring as many of your community members as possible to amplify your voice.</p>' +
    '<p><span style="text-decoration: underline;">Please read the event details</span> carefully. Note that not all events feature in-person members of Congress.</p>'
    events.forEach(function(townhall){
      if (!townhall.emailText()) {
        console.log(townhall);
      } else {
        var townhallHtml = townhall.emailText()
        htmltext = htmltext + townhallHtml
      }

    })
    htmltext = htmltext + `<small>
                    <div><span style="color:#ff4741">Town Hall</span><span> - A forum where members of Congress give updates on the current affairs of Congress and answer questions from constituents.</span></div>
                    <div><span style="color:#ff4741">Empty Chair Town Hall</span><span> - A citizen-organized town hall held with or without the invited lawmaker.</span></div>
                    <div><span style="color:#ff4741">Tele-Town Hall Meeting</span><span> - A town hall conducted by conference call.</span></div>
                    <div><span style="color:#ff4741">Other</span><span> - Other opportunities to engage with members of Congress or their staff. Please read details carefully—events in this category can vary.</span></div>
                </small>`

    htmltext = htmltext + `<p>Quick notes:</p>
      <ul>
      <li>Not sure what to do at a town hall meeting? Our friends at Indivisible have written a terrific guide which we highly recommend: https://www.indivisibleguide.com/
      </li>
      <li>Bring your friends with you. Forward this email to them and ask them to attend.</li>
      <li>Share your <a href="https://goo.gl/forms/JS1mkhMwgPutm5Fh2">Town Hall Stories</a> with us!</li>
      <li>And if you attend, tweet us pictures at @townhallproject or email them to info@townhallproject.com. We’d love to see and hear how it went.</li>
      <li>If you aren’t sure if this is your member of Congress, visit http://www.house.gov/representatives/find/ and enter your address to confirm.</li>
    </ul>
    <p>Thank you for your support. <strong>Stand up. Speak out.</strong></p>

    <p>Nathan</p>
    <section style="line-height: 16px; margin-bottom:25px;">
    Nathan Williams<br>
    Managing Director<br>
    Town Hall Project<br>
    townhallproject.com<br>
    </section>
    <p style="text-align:center"><a href="https://secure.actblue.com/contribute/page/townhallprojectemail">Donate here</a></p>
    <footer style="line-height:14px; font-size: 12px;">
    <p>(Paid for by Town Hall Project. All donations to THP are not tax-deductible but help us keep this vital resource sustainable in the months ahead.)</p>
    <small style="font-size: 10px; line-height:12px;">*Compiled by Town Hall Project volunteers. All efforts are made to verify accuracy of events. Event details can change at short notice, please contact your representative to confirm.<small><br>
    </footer>

    </body>`
    var subject
    var today = new Date().getDay()
    if (today === 3) {
      subject = `${district} Town Hall events this week`
    } else {
      subject = `Recently added or updated Town Hall events in ${district}`
    }
    var data = {
      from: 'Town Hall Updates <update@updates.townhallproject.com>',
      to: 'Megan Riel-Mehan <meganrm@townhallproject.com>',
      // cc: 'Nathan Williams <nwilliams@townhallproject.com> , <patriotnewstracking@gmail.com>',
      subject: subject,
      html: htmltext
    };
    PartnerEmail.sendEmail(partner, data)
  }

  TownHall.getLastSent().then(function(lastUpdated){
    TownHall.getAll(lastUpdated).then(function(){
      console.log('got events');
      for (const key of Object.keys(TownHall.townHallbyDistrict)) {
        var thispartnerEmail = new PartnerEmail()
        thispartnerEmail.composeEmail(key, TownHall.townHallbyDistrict[key])
      }
      for (const key of Object.keys(TownHall.senateEvents)) {
        var newuser = new PartnerEmail()
        newuser.composeEmail(key, TownHall.senateEvents[key])
      }
    })
  })

  module.exports = PartnerEmail
