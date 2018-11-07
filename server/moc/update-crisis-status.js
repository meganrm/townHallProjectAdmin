const firebasedb = require('../lib/setupFirebase');

const convertDataAndUpdate = (row) => {
  const govtrackId = row[0];
  const crisis_status = row[5].match(/\d/g) ? row[5].match(/\d/g)[0] : NaN;
  if (isNaN(govtrackId) || isNaN(crisis_status)) {
    return;
  }

  const moc = {
    crisis_status: Number(crisis_status),
    crisis_status_source: row[6] || '',
  };

  const ref = firebasedb.ref(`mocData/${govtrackId}`);

  ref.once('value')
        .then((snapshot) => {
          if (snapshot.exists()) {
            ref.update(moc);
          }
        });
};

module.exports = convertDataAndUpdate;
