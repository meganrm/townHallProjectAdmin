const fs = require('fs');

const firebasedb = require('./setupFirebase');
const writeStream = fs.createWriteStream('do-your-job.txt');
            

const getMMs = () => {
    return firebasedb.ref('mocData')
        .once('value')
        .then((snapshot) => {
            let missingMembers = [];
            snapshot.forEach((ele) => {
                let moc = ele.val();
                console.log(moc.displayName, moc.govtrack_id, moc.next_election);
                if (moc.missingMember && moc.in_office && moc.next_election === '2018') {
                    missingMembers.push({state: moc.state, district: moc.district, type: moc.type});
                }
            });
            return missingMembers;
        });
};
const writeOut = (mm, displayName) => {
    writeStream.write([
        mm.state,
        mm.district || 'Senate',
        displayName || 'none',

    ].join(',') + '\n');
};

const getPledgers = (mmArray) => {
    mmArray.forEach(mm => checkPledger(mm));
};

const checkPledger = (mm) => {
    return firebasedb.ref(`town_hall_pledges/${mm.state}`)
        .once('value')
        .then(pledgers => {
            pledgers.forEach(ele => {
                let pledger = ele.val();
                if (!pledger.pledged) {
                    return;
                }
                if (pledger.status !== 'Active Primary Candidate' && pledger.status !== 'Nominee' && !pledger.incumbent) {
                    return;
                }
                if (mm.district && pledger.district) {
                    if (Number(mm.district) === Number(pledger.district)) {
                        return writeOut(mm, pledger.displayName);
                    }
                } else if (!mm.district && !pledger.district) {
                    if (pledger.role === 'Sen' && mm.type === 'sen') {
                        return writeOut(mm, pledger.displayName);
                    }
                } else if (mm.district === 'At-Large' && pledger.role === 'Rep') {
                    return writeOut(mm, pledger.displayName);

                }

            });
        });
};


getMMs()
    .then(getPledgers);
