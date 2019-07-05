const firebasedb = require('./server/lib/setupFirebase.js');
const eventValid = require('./server/eventValidation');
const zeropadding = require('./server/util').zeropadding; 
const emailTriggers = require('./server/emailTriggers');
const mocInOfficeListener = require('./server/moc/in-office-listener');

const express = require('express'),
    port = process.env.PORT || 3000,
    app = express();

app.use(express.static('./'));

app.get('*', function(request, response) {
    console.log('New request:', request.url);
    response.sendFile('index.html', { root: '.' });
});

app.listen(port, function() {
    console.log('Server started on port ' + port + '!');
});

eventValid();
emailTriggers();
mocInOfficeListener();
