const firebasedb = require('./setupFirebase');
const states = require('../data/stateMap');

class Candidate {
    constructor(props) {
        this.displayName = props.displayName || props.Candidate;
        this.in_office = false;
        this.incubment = false;
        this.pledged = props.pledged ? true:  false;
        this.is_candidate = true;
        this.party = props.party;
        this.status = props.status || null;
        this.role = props.role;
        this.govtrack_id = props.govtrack_id || null;
        this.thp_id = props.thp_id || null;
        this.chamber = props.chamber || 'citywide';
        this.city = props.city || null;
    }

    update(nameKey){
        const id = this.govtrack_id || this.thp_id;
        firebasedb.ref(`candidate_keys/${nameKey}`).update({
            id,
            nameEntered: this.displayName,
        });
        firebasedb.ref(`candidate_data/${id}`).update(this);
    }
}
const createKeyFromName = (member) => {
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
    return memberKey;
};

const updateCandidatesFromPledgeDatabase = () => {
    firebasedb.ref('town_hall_pledges')
    .once('value')
    .then(snapshot => {
        snapshot.forEach(state => {
            state.forEach(pledgerSnapshot => {
              let pledger = pledgerSnapshot.val();
              if (!pledger.incubment && (pledger.status === 'Nominee' || pledger.status === 'Active Primary Candidate')){
                let member = pledger.displayName;
                const memberKey = createKeyFromName(member);
              
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

                        };
                        pledger.stateName = states[pledger.state];
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

// updateCandidatesFromPledgeDatabase();


const updateFromJSONArray = (peopleFromArray) => {
    peopleFromArray.forEach(person => {
        const newId = firebasedb.ref().child('candidate_data').push().key;
        person.thp_id = newId;
        const newCandidate = new Candidate(person);
        console.log(newCandidate)
        console.log(createKeyFromName(person.displayName))
        newCandidate.update(createKeyFromName(person.displayName));
    });
};

// updateFromJSONArray(mayorCandidates);
