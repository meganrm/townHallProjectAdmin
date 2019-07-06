const eventListeners = require('./server/database-listeners');
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

eventListeners();
mocInOfficeListener();
