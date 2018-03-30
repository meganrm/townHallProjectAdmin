require('dotenv').load();

const google = require('googleapis');

const sheets = google.sheets('v4');
// getNewToken(oauth2Client, read);
const googleMethods = {};
googleMethods.read = (auth) => {
  return new Promise(function(resolve, reject) {
    sheets.spreadsheets.values.get({
      spreadsheetId: process.env.RECESS_SPREADSHEETID,
      range: 'all MOCS!A1:R538',
      auth: auth,
    }, function(err, result) {
      if(err) {
        // Handle error
        console.log(err);
        reject(err);
      } else {
        var numRows = result.values ? result.values.length : 0;
        console.log('%d rows retrieved.', numRows);
        resolve(result.values);
      }
    });
  });
};

googleMethods.write = (auth, data) => {
  sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: process.env.RECESS_SPREADSHEETID,
    auth: auth,
    resource: {
      valueInputOption: 'USER_ENTERED',
      data: data,

    },
  }, function(err, result) {
    if(err) {
    // Handle error
      console.log(err);
    } else {
      console.log('total updated rows:', result.totalUpdatedRows);
    }
  });
};
module.exports = googleMethods;
