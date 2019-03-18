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
const presCandidatesData = [
  {
    "title": "Mr",
    "displayName": "Howard Schultz",
    "party": "I",
    "govtrack_id": "",
    "Pledge Sent Date": "",
    "Follow Up Date": "",
    "Pledge Returned Date": "",
    "Declared": "",
    "Newletter": "",
    "Notes": "",
    "in_database": ""
  },
  {
    "title": "Mr",
    "displayName": "Andrew Yang",
    "party": "D",
    "govtrack_id": "",
    "Pledge Sent Date": "",
    "Follow Up Date": "",
    "Pledge Returned Date": "",
    "Declared": "Y",
    "Newletter": "",
    "Notes": "",
    "in_database": ""
  },
  {
    "title": "Ms",
    "displayName": "Marianne Williamson",
    "party": "D",
    "govtrack_id": "",
    "Pledge Sent Date": "",
    "Follow Up Date": "",
    "Pledge Returned Date": "",
    "Declared": "Y",
    "Newletter": "",
    "Notes": "",
    "in_database": ""
  },
  {
    "title": "Gov",
    "displayName": "Steve Bullock",
    "party": "D",
    "govtrack_id": "",
    "Pledge Sent Date": "",
    "Follow Up Date": "",
    "Pledge Returned Date": "",
    "Declared": "",
    "Newletter": "",
    "Notes": "",
    "in_database": ""
  },
  {
    "title": "Gov",
    "displayName": "Bill Weld",
    "party": "R",
    "govtrack_id": "",
    "Pledge Sent Date": "",
    "Follow Up Date": "",
    "Pledge Returned Date": "",
    "Declared": "",
    "Newletter": "",
    "Notes": "",
    "in_database": ""
  },
  {
    "title": "Mayor",
    "displayName": "Bill de Blasio",
    "party": "D",
    "govtrack_id": "",
    "Pledge Sent Date": "",
    "Follow Up Date": "",
    "Pledge Returned Date": "",
    "Declared": "",
    "Newletter": "",
    "Notes": "",
    "in_database": ""
  },
  {
    "title": "Rep",
    "displayName": "Tim Ryan",
    "party": "D",
    "govtrack_id": "",
    "Pledge Sent Date": "",
    "Follow Up Date": "",
    "Pledge Returned Date": "",
    "Declared": "",
    "Newletter": "",
    "Notes": "",
    "in_database": ""
  },
  {
    "title": "Sen",
    "displayName": "Michael Bennett",
    "party": "D",
    "govtrack_id": "",
    "Pledge Sent Date": "",
    "Follow Up Date": "",
    "Pledge Returned Date": "",
    "Declared": "",
    "Newletter": "",
    "Notes": "",
    "in_database": ""
  },
  {
    "title": "Rep",
    "displayName": "Seth Moulton",
    "party": "D",
    "govtrack_id": "",
    "Pledge Sent Date": "",
    "Follow Up Date": "",
    "Pledge Returned Date": "",
    "Declared": "",
    "Newletter": "",
    "Notes": "",
    "in_database": ""
  },
  {
    "title": "Gov",
    "displayName": "Larry Hogan",
    "party": "R",
    "govtrack_id": "",
    "Pledge Sent Date": "",
    "Follow Up Date": "",
    "Pledge Returned Date": "",
    "Declared": "",
    "Newletter": "",
    "Notes": "",
    "in_database": ""
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
  // if(candidate.in_database === 'no') {
    const newId = firebasedb.ref().child('candidate_data').push().key;
    candidate.thp_id = newId;
    const newCandidate = new PresCandidate(candidate);
    console.log(newCandidate)
    console.log(createKeyFromName(candidate.displayName));
    newCandidate.update(createKeyFromName(candidate.displayName))
  // }
    // addCanidateFromName(candidate)
})

