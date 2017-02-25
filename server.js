var express = require('express'),
  // NOTE: require in our request proxy module
  requestProxy = require('express-request-proxy'),
  port = process.env.PORT || 3000,
  app = express();

var https = require('https');

// var TownHall = require('./bin/event.js')
app.use(express.static('./'));

app.get('*', function(request, response) {
  console.log('New request:', request.url);
  response.sendFile('index.html', { root: '.' });
});

app.listen(port, function() {
  console.log('Server started on port ' + port + '!');
});
