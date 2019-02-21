const firebasedb = require('./setupFirebase');
const states = require('../data/stateMap');

class PresCandidate {
    constructor(props) {
        this.displayName = props.displayName;
        this.in_office = false;
        this.title = props.title || null;
        this.incubment = false;
        this.is_candidate = true;
        this.party = props.party;
        this.role = 'Pres';
        this.govtrack_id = props.govtrack_id || null;
        this.chamber = 'nationwide';
        this.thp_id = props.thp_id || null;
    }

    update(nameKey){
        const id = this.govtrack_id || this.thp_id;
        firebasedb.ref(`candidate_keys/${nameKey}`).update({
            id,
            nameEntered: this.displayName,
        });
        firebasedb.ref(`candidate_data/${id}`).update(this)
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

const updateCandidates = () => {
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

// updateCandidates();
const presCandidatesData = [{
    "title": "Sen",
    "displayName": "Amy Klobuchar",
    "party": "D",
    "GovTrackID": "",
    "Pledge Sent Date": "",
    "Follow Up Date": "",
    "Pledge Returned Date": "",
    "declared": "",
    "Newletter": "",
    "Notes": "",
    "in_database": "yes"
  },
  {
    "title": "Sen",
    "displayName": "Bernie Sanders",
    "party": "D",
    "GovTrackID": "",
    "Pledge Sent Date": "",
    "Follow Up Date": "",
    "Pledge Returned Date": "",
    "declared": "",
    "Newletter": "",
    "Notes": "",
    "in_database": "yes"
  },
  {
    "title": "Rep",
    "displayName": "Beto O'Rourke",
    "party": "D",
    "GovTrackID": "",
    "Pledge Sent Date": "",
    "Follow Up Date": "",
    "Pledge Returned Date": "",
    "declared": "",
    "Newletter": "",
    "Notes": "",
    "in_database": "(need to update)"
  },
  {
    "title": "Sen",
    "displayName": "Cory Booker",
    "party": "D",
    "GovTrackID": "",
    "Pledge Sent Date": "",
    "Follow Up Date": "",
    "Pledge Returned Date": "",
    "declared": "",
    "Newletter": "",
    "Notes": "",
    "in_database": "yes"
  },
  {
    "title": "Sen",
    "displayName": "Elizabeth Warren",
    "party": "D",
    "GovTrackID": "",
    "Pledge Sent Date": "",
    "Follow Up Date": "",
    "Pledge Returned Date": "",
    "declared": "Y",
    "Newletter": "Y",
    "Notes": "",
    "in_database": "yes"
  },
  {
    "title": "Rep",
    "displayName": "Eric Swalwell",
    "party": "D",
    "GovTrackID": "",
    "Pledge Sent Date": "",
    "Follow Up Date": "",
    "Pledge Returned Date": "",
    "declared": "",
    "Newletter": "",
    "Notes": "",
    "in_database": "yes"
  },
  {
    "title": "Gov",
    "displayName": "Jay Inslee",
    "party": "D",
    "GovTrackID": "",
    "Pledge Sent Date": "",
    "Follow Up Date": "",
    "Pledge Returned Date": "",
    "declared": "",
    "Newletter": "",
    "Notes": "",
    "in_database": "no"
  },
  {
    "title": "Sen",
    "displayName": "Jeff Merkley",
    "party": "D",
    "GovTrackID": "",
    "Pledge Sent Date": "",
    "Follow Up Date": "",
    "Pledge Returned Date": "",
    "declared": "",
    "Newletter": "",
    "Notes": "",
    "in_database": "yes"
  },
  {
    "title": "Vice Pres",
    "displayName": "Joe Biden",
    "party": "D",
    "GovTrackID": "",
    "Pledge Sent Date": "",
    "Follow Up Date": "",
    "Pledge Returned Date": "",
    "declared": "",
    "Newletter": "",
    "Notes": "",
    "in_database": "no"
  },
  {
    "title": "Rep",
    "displayName": "John Delaney",
    "party": "D",
    "GovTrackID": "",
    "Pledge Sent Date": "",
    "Follow Up Date": "",
    "Pledge Returned Date": "",
    "declared": "Y",
    "Newletter": "Y",
    "Notes": "",
    "in_database": "yes"
  },
  {
    "title": "Gov",
    "displayName": "John Hickenlooper",
    "party": "D",
    "GovTrackID": "",
    "Pledge Sent Date": "",
    "Follow Up Date": "",
    "Pledge Returned Date": "",
    "declared": "",
    "Newletter": "",
    "Notes": "",
    "in_database": "no"
  },
  {
    "title": "Gov",
    "displayName": "John Kasich",
    "party": "R",
    "GovTrackID": "",
    "Pledge Sent Date": "",
    "Follow Up Date": "",
    "Pledge Returned Date": "",
    "declared": "",
    "Newletter": "",
    "Notes": "",
    "in_database": "no"
  },
  {
    "title": "Sec",
    "displayName": "Julian Castro",
    "party": "D",
    "GovTrackID": "",
    "Pledge Sent Date": "",
    "Follow Up Date": "",
    "Pledge Returned Date": "",
    "declared": "Y",
    "Newletter": "Y",
    "Notes": "",
    "in_database": "no"
  },
  {
    "title": "Sen",
    "displayName": "Kamala Harris",
    "party": "D",
    "GovTrackID": "",
    "Pledge Sent Date": "",
    "Follow Up Date": "",
    "Pledge Returned Date": "",
    "declared": "Y",
    "Newletter": "",
    "Notes": "",
    "in_database": "yes"
  },
  {
    "title": "Sen",
    "displayName": "Kirsten Gillibrand",
    "party": "D",
    "GovTrackID": "",
    "Pledge Sent Date": "",
    "Follow Up Date": "",
    "Pledge Returned Date": "",
    "declared": "Y",
    "Newletter": "",
    "Notes": "",
    "in_database": "yes"
  },
  {
    "title": "Mayor",
    "displayName": "Michael Bloomberg",
    "party": "D",
    "GovTrackID": "",
    "Pledge Sent Date": "",
    "Follow Up Date": "",
    "Pledge Returned Date": "",
    "declared": "",
    "Newletter": "",
    "Notes": "",
    "in_database": "no"
  },
  {
    "title": "Mayor",
    "displayName": "Pete Buttigieg",
    "party": "D",
    "GovTrackID": "",
    "Pledge Sent Date": "",
    "Follow Up Date": "",
    "Pledge Returned Date": "",
    "declared": "Y",
    "Newletter": "",
    "Notes": "",
    "in_database": "no"
  },
  {
    "title": "Rep",
    "displayName": "Richard Ojeda",
    "party": "D",
    "GovTrackID": "",
    "Pledge Sent Date": "",
    "Follow Up Date": "",
    "Pledge Returned Date": "",
    "declared": "Y",
    "Newletter": "Y",
    "Notes": "Dropped out",
    "in_database": "yes"
  },
  {
    "title": "Sen",
    "displayName": "Sherrod Brown",
    "party": "D",
    "GovTrackID": "",
    "Pledge Sent Date": "",
    "Follow Up Date": "",
    "Pledge Returned Date": "",
    "declared": "",
    "Newletter": "",
    "Notes": "",
    "in_database": "yes"
  },
  {
    "title": "Gov",
    "displayName": "Terry McAuliffe",
    "party": "D",
    "GovTrackID": "",
    "Pledge Sent Date": "",
    "Follow Up Date": "",
    "Pledge Returned Date": "",
    "declared": "",
    "Newletter": "",
    "Notes": "",
    "in_database": "no"
  },
  {
    "title": "Rep",
    "displayName": "Tulsi Gabbard",
    "party": "D",
    "GovTrackID": "",
    "Pledge Sent Date": "",
    "Follow Up Date": "",
    "Pledge Returned Date": "",
    "declared": "Y",
    "Newletter": "",
    "Notes": "",
    "in_database": "yes"
  }
]



const addCanidateFromName = (member) => {
    const memberKey = createKeyFromName(member);
    firebasedb.ref(`mocID/${memberKey.replace(/\./g, '')}`)
        .once('value')
        .then(snapshot => {
            if (snapshot.exists()){
                const id = snapshot.val().id;
                firebasedb.ref(`mocData/${id}`)
                    .once('value')
                    .then(snapshot => {
                        const memberData = snapshot.val();
                        const candidateData = new PresCandidate(memberData);
                        candidateData.update(memberKey);
                    })
                    .catch(console.log)
            } else {
                console.log(member)
            }
            
        })
         .catch(console.log);


};

presCandidatesData.forEach(candidate => {
  if(candidate.in_database === 'no') {
    const newId = firebasedb.ref().child('candidate_data').push().key;
    candidate.thp_id = newId;
    const newCandidate = new PresCandidate(candidate);
    console.log(newCandidate)
    console.log(createKeyFromName(candidate.displayName));
    newCandidate.update(createKeyFromName(candidate.displayName))
  }
    // addCanidateFromName(candidate)
})

