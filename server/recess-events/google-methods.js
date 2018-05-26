require('dotenv').load();

const google = require('googleapis');

const sheets = google.sheets('v4');
// getNewToken(oauth2Client, read);
const googleMethods = {};
googleMethods.read = (auth, spreadsheetId, range) => {
  return new Promise(function(resolve, reject) {
    sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: range,
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

googleMethods.readMultipleRanges = (auth, spreadsheetId, ranges) => {
  return new Promise(function (resolve, reject) {
    sheets.spreadsheets.values.batchGet({
      spreadsheetId: spreadsheetId,
      ranges: ranges,
      auth: auth,
    }, function (err, result) {
      if (err) {
        // Handle error
        console.log(err);
        reject(err);
      } else {
        var numRows = result.valueRanges ? result.valueRanges.length : 0;
        console.log('%d rows retrieved.', numRows);
        resolve(result.valueRanges);
      }
    });
  });
};

googleMethods.getSheets = (auth, spreadsheetId) => {
  return new Promise(function (resolve, reject) {
    sheets.spreadsheets.get({
      spreadsheetId: spreadsheetId,
      auth: auth,
      includeGridData: false,
      ranges: [],
    }, function (err, result) {
      if (err) {
        // Handle error
        console.log(err);
        reject(err);
      } else {
        let toReturn = result.sheets.map(ele => {
          return ele.properties.title;
        });
        resolve(toReturn);
      }
    });
  });
};

googleMethods.write = (auth, sheetId, data) => {
  sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: sheetId,
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
