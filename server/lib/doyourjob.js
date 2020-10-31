const firebasedb = require('./setupFirebase').realtimedb;
const firestore = require('./setupFirebase').firestore;
const includes = require('lodash').includes;

const zeropadding = require('../util').zeropadding;      
const ErrorReport = require('./errorReporting');

const WINNER_STATUS = 'Winner';
const YEAR = 2020;

const getMMs = () => {
    return firestore.collection('116th_congress')
        .get()
        .then((snapshot) => {
            const ids = [];
            snapshot.forEach((ele) => ids.push(ele.id));
            return Promise.all(ids.map(id => firestore.collection('office_people').doc(id).get() ))
                .then(snapshot => {
                    let missingMembers = [];    
                    snapshot.forEach((ele) => {
                        const moc = ele.data();
                        if (!moc) {
                            return;
                        }
                        const role = moc.roles[moc.current_office_index || 0];

            
                        if (role.next_election && Number(role.next_election) !== 2020) {
                            return;
                        }
                        let rank;
                        if (role.title && role.title.includes('1st Class')) {
                            rank = 'junior';
                        } else if (role.title && role.title.includes('2nd Class')) {
                            rank = 'senior';
                        }
                        if (role.missing_member && moc.in_office) {
                            const mmDistrict = {
                                state: role.state,
                                district: role.district,
                                chamber: role.chamber,
                                type: role.short_title.toLowerCase().replace('.', ''),
                                mmName:  moc.displayName,
                                mmParty: moc.party,
                                state_rank: rank || null,
                            };
                            missingMembers.push(mmDistrict);
                        }
                    });
                    return missingMembers;
                });
            });  
};

const writeOut = (mm, displayName, party, winner) => {
    let district;
    let updateObject = {
        state: mm.state,
        sitting_missing_member: mm.mmName,
        missing_member_party: mm.mmParty[0],
        pledger: displayName,
        pledger_party: party,
        winner: winner, 
    };
    if (mm.state === 'PA') {
        if (mm.district == 10 || mm.district == 12){
            return;
        }
        const email = new ErrorReport(`new do your job district in PA ${mm.district}: ${JSON.stringify(updateObject)}`, 'new do your job in PA');
        return;
    }
    if (Number(mm.district)) {
        district = zeropadding(mm.district);
        firebasedb.ref(`do_your_job_districts/${YEAR}/${mm.state}-${district}`)
            .once('value')
            .then(snapshot => {
                updateObject.district = district;
                if (!snapshot.exists()) {
                    const email = new ErrorReport(`new do your job district: ${mm.state}-${district} ${JSON.stringify(updateObject)}`, 'new do your job');
                    firebasedb.ref(`do_your_job_districts/${YEAR}/${mm.state}-${district}`)
                        .update(updateObject)
                        .then(() => email.sendEmail());
                } else {
                    console.log('already in there', updateObject.state, updateObject.district);
                }
            });
    } else {
        firebasedb.ref(`do_your_job_districts/${YEAR}/${mm.state}-${mm.state_rank}`)
            .once('value')
            .then(snapshot => {
                updateObject.district = 'Senate';

                if (!snapshot.exists() && mm.state_rank) {
                    const email = new ErrorReport(`new do your job Senate: ${JSON.stringify(updateObject)}`, 'new do your job');
                    firebasedb.ref(`do_your_job_districts/${YEAR}/${mm.state}-${mm.state_rank}`)
                        .update(updateObject)
                        .then(email.sendEmail);
                } else {
                    console.log('already in there', updateObject.state, updateObject.district);
                }
            });
    }
};

const getPledgers = (mmArray) => {
    mmArray.forEach(mm => checkPledger(mm));
};

const checkPledger = (mm) => {
    return firebasedb.ref(`town_hall_pledges/${YEAR}/${mm.state}`)
        .once('value')
        .then(pledgers => {

            pledgers.forEach(ele => {
                let pledger = ele.val();
                if (!pledger.pledged) {
                    return;
                }
                if (!includes(['Nominee', WINNER_STATUS], pledger.status)) {
                    return;
                }
          
                console.log(pledger.status, pledger.state, pledger.district);
                if (pledger.incumbent) {
                    return;
                }
                if (mm.district && pledger.district) {
                    if (Number(mm.district) === Number(pledger.district)) {
                        return writeOut(mm, pledger.displayName, pledger.party, pledger.status === WINNER_STATUS);
                    }
                } else if (!mm.district && !pledger.district) {
                    if (pledger.role === 'Sen' && mm.type === 'sen') {
                        return writeOut(mm, pledger.displayName, pledger.party, pledger.status === WINNER_STATUS);
                    }
                    else if (
                        pledger.role.split(' ')[0] === 'Sen' &&
                 mm.type === 'sen' &&
                pledger.role.split(' ')[1] === mm.state_rank
                    ) {
                        return writeOut(mm, pledger.displayName, pledger.party, pledger.status === WINNER_STATUS);
                    }
                } else if (mm.district === 'At-Large' && pledger.role === 'Rep') {
                    return writeOut(mm, pledger.displayName, pledger.party, pledger.status === WINNER_STATUS);
                }

            });
        });
};


getMMs()
    .then(getPledgers);
