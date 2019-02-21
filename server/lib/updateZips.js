const fs = require('fs');
const csv = require('csv-parser');

const firebasedb = require('./setupFirebase');
const zeropadding = require('../util').zeropadding;

const path = '/Users/meganriel-mehan/dev/thp/map-data-maker/pa-zip-files';

for (let i = 1; i <= 18; i++) {
    const district = zeropadding(i);
    const results = [];
    fs.createReadStream(`${path}/42${district}-properties.csv`)
        .pipe(csv())
        .on('data', (data) => {
            results.push(data)})
        .on('end', () => {
            results.forEach((row) => {
                const toUpdate = {
                    abr: 'PA',
                    dis: district,
                    zip: row.ZCTA5CE10,
                };
                console.log(toUpdate);
                // firebasedb.ref(`zipToDistrict/${row.ZCTA5CE10}`).push(toUpdate)
            });
        });
    
}


