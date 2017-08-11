// https://github.com/bda-research/node-crawler
var Crawler = require('crawler');

var termsToMatch = ['townhall', 'town hall', 'listening', 'forum', 'conversation', 'coffee'];
var visitedPages = [];
var matchingPages = {};

var crawler = new Crawler({
  maxConnections : 5,
  callback : function (error, res, done) {
    if (error) {
      console.log('An error occured: ' + error);
      process.exit(1);
    } else if (res.headers['content-type'].indexOf('html') === -1) {
      console.log('Ignorning non html page: ' + res.request.uri.href);
      process.exit(0);
    }

    var $ = res.$;
    console.log(res.request.uri.href);
    let host = res.request.uri.host.replace('www.', '');
    let text = $('body').text().toLowerCase();
    let foundMatches = termsToMatch.some(term => text.indexOf(term.toLowerCase()) !== -1);
    if (foundMatches) {
      if (!matchingPages.hasOwnProperty('MoCName')) {
        matchingPages['MoCName'] = [];
      }
      matchingPages['MoCName'].push(res.request.uri.href);
    }
    console.log('Any Matches? ', foundMatches);
    let internalLinks = $('a[href*="' + host + '"], a[href]:not(a[href^="http"], a[href^="#"])');
    internalLinks.each((index, link) => {
      let url = $(link).attr('href');
      url = url.indexOf(host) === -1 ? 'http://' + host + url : url;
      if (visitedPages.indexOf(url) === -1) {
        visitedPages.push(url);
        console.log(url);
        crawler.queue(url);
      }
    });

    done();
  }
});

crawler.queue('https://www.schumer.senate.gov/');

crawler.on('drain', function() {
  console.log('-----------------------------------------');
  console.log(matchingPages);
});
