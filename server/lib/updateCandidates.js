const firebasedb = require('./setupFirebase');
const states = require('../data/stateMap');

const updateCandidates = () => {
    firebasedb.ref('town_hall_pledges')
    .once('value')
    .then(snapshot => {
        snapshot.forEach(state => {
            state.forEach(pledgerSnapshot => {
                let pledger = pledgerSnapshot.val();
                if (!pledger.incubment && (pledger.status === 'Nominee' || pledger.status === 'Active Primary Candidate')){
                    let member = pledger.displayName;
                    let memberKey;
                    let nameArray = member.split(' ');
                    if (nameArray.length > 2) {
                        let firstname = nameArray[0];
                        let middlename = nameArray[1];
                        let lastname = nameArray[2];
                        if (firstname.length === 1 || middlename.length === 1) {
                            memberKey = lastname.toLowerCase().replace(/\,/g, '') + '_' + firstname.toLowerCase() + '_' + middlename.toLowerCase();
                        } else {
                            memberKey = middlename.toLowerCase() + lastname.toLowerCase().replace(/\,/g, '') + '_' + firstname.toLowerCase();
                        }
                    } else {
                        memberKey = nameArray[1].toLowerCase().replace(/\,/g, '') + '_' + nameArray[0].toLowerCase();
                    }

                    firebasedb.ref(`candidate_keys/${memberKey.replace(/\./g, '')}`)
                    .once('value')
                    .then(snapshot => {
                        let id = pledgerSnapshot.key + pledger.state;
                        pledger.is_candidate = true;
                        pledger.in_office = false;
                        pledger.thp_key = id;
                        const parties = {
                            D: 'Democratic',
                            R: 'Republican',
                            I: 'Independent',

                        }
                        pledger.stateName = states[pledger.state]
                        pledger.party = parties[pledger.party] || pledger.party;
                        if (!snapshot.exists()) {
                            let lookupData = {
                                id: id,
                                nameEntered: pledger.displayName,
                            };
                            firebasedb.ref(`candidate_keys/${memberKey.replace(/\./g, '')}`).update(lookupData);
                            console.log(pledger.displayName);
                            return firebasedb.ref(`candidate_data/${id}`).update(pledger);
                        } else {
                            console.log('already there', pledger.displayName);
                            firebasedb.ref(`candidate_keys/${memberKey.replace(/\./g, '')}`).update({id: id});
                            firebasedb.ref(`candidate_data/${id}`).update(pledger);
                        }
                    });
                }
            });
        });
    });
};

updateCandidates();