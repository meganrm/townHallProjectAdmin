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
                if (moc.missingMember === "true"){
                    moc.missingMember = true;
                }
                if (moc.missingMember === "false") {
                    moc.missingMember = false;
                }
                if (moc.next_election && moc.next_election !== '2018') {
                    return;
                }
                if (moc.missingMember && moc.in_office && !moc.retiring) {
                    const mmDistrict = {
                        state: moc.state,
                        district: moc.district,
                        type: moc.type,
                        mmName:  moc.displayName,
                    };
                    missingMembers.push(mmDistrict);
                }
            });
            return missingMembers;
        });
};
const writeOut = (mm, displayName) => {
    writeStream.write([
        mm.state,
        mm.district || 'Senate',
        mm.mmName,
        displayName || 'none',

    ].join(',') + '\n');
};

const getPledgers = (mmArray) => {
    console.log(mmArray)
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
                if (pledger.status !== 'Nominee') {
                    return;
                }
                if (pledger.incumbent) {
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
