#!/usr/bin/env node
var firebase = require('firebase');
var Crawler = require('crawler'); // https://github.com/bda-research/node-crawler
var fs = require('fs');
var config = {
  apiKey: 'AIzaSyDwZ41RWIytGELNBnVpDr7Y_k1ox2F2Heg',
  authDomain: 'townhallproject-86312.firebaseapp.com',
  databaseURL: 'https://townhallproject-86312.firebaseio.com',
  storageBucket: 'townhallproject-86312.appspot.com',
  messagingSenderId: '208752196071'
};
firebase.initializeApp(config);

var termsToMatch = ['townhall', 'town hall'];
var visitedPages = [];
var matchingPages = [];
var MoCs = {};
var currentMoC = {index: 0, name: ''};
const today = new Date();
const msPerDay = 1000*60*60*24;

var crawler = new Crawler({
  maxConnections : 5,
  callback : function (error, res, done) {
    if (error) {
      console.log('An error occured: ' + error);
      done();
      return;
    } else if (res.headers['content-type'].indexOf('html') === -1) {
      done();
      return;
    } else if (res.request.uri.search !== null || res.request.uri.query !== null) {
      done();
      return;
    }
    let currentUrl = res.request.uri.href;
    // Avoid following 404s/redirects/etc
    if (res.statusCode !== 200 || currentUrl.indexOf('www.senate.gov') !== -1 || currentUrl.indexOf('//senate.gov') !== -1 ||
               currentUrl.indexOf('www.house.gov') !== -1 || currentUrl.indexOf('//house.gov') !== -1 ||
               currentUrl.indexOf('www.congress.gov') !== -1 || currentUrl.indexOf('//congress.gov') !== -1) {
      done();
      return;
    }

    var $ = res.$;
    let MoC = res.options.name;
    let host = res.request.uri.host.replace('www.', '');
    let text = $('body').text().toLowerCase();

    let foundMatches = termsToMatch.some(term => text.indexOf(term.toLowerCase()) !== -1);
    let lastModified = res.headers.hasOwnProperty('last-modified') ? new Date(res.headers['last-modified']) : null;
    if (foundMatches && !lastModified || ((today - lastModified)/msPerDay) <= 90) {
      matchingPages.push({'url': currentUrl, 'date': lastModified ? lastModified.toISOString().substring(0, 10) : null });
    }
    let re = new RegExp('^(?!mailto:|javascript:|..\/..\/|#)(?:http.?:\/\/(?:www\.)?' + host + '(?!http)).*', 'im');
    let internalLinks = $('a[href]').map(function() {
      // :not doesn't seem to be consitently implimented in cheerio so we manually filter down to internal links
      let href = $(this).attr('href');
      href = href.replace(' ', '');
      if (re.test(href)) {
        return href;
      }
    }).get();

    internalLinks.forEach((url) => {
      url = url.indexOf(host) === -1 ? 'http://' + host + url : url;
      url = url.split('?')[0];
      if (visitedPages.indexOf(url) === -1) {
        visitedPages.push(url);
        crawler.queue({uri: url, name: MoC});
      }
    });
    done();
  }
});

crawler.on('drain', function() {
  // Ensure the queue is actually finished
  setTimeout(function() {
    if (crawler.queueSize === 0) {
      console.log('================================================');
      console.log('writing out', currentMoC.name);
      console.log('================================================');
      let data = '';
      matchingPages.forEach(obj => data += currentMoC.name + '~' + obj.url + '~' + (obj.date  !== null ? obj.date : '') + '\r\n');
      fs.appendFile('MoCUrls.csv', data);
      nextMoC();
    } else {
      console.log('Queue not empty:', crawler.queue);
    }
  }, 10000);
});

firebase.database().ref('mocData/').once('value').then((snapshot) => {
  MoCs = snapshot.val();
  nextMoC();
});

function nextMoC() {
  let MoC = MoCs[Object.keys(MoCs)[currentMoC.index]];
  currentMoC.name = MoC.displayName;
  currentMoC.index++;

  if (MoC.url && MoC.displayName) {
    console.log(currentMoC.index-1 + '/' + Object.keys(MoCs).length, ((currentMoC.index-2)/Object.keys(MoCs).length).toFixed(2)*100 + '% done.');
    console.log('Staring to crawl', currentMoC.name);
    matchingPages = [];
    visitedPages = [];
    crawler.queue({uri: MoC.url, name: MoC.displayName});
  } else {
    nextMoC();
  }
}