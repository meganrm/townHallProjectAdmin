const firebasedb = require('./setupFirebase');
const zeropadding = require('../util').zeropadding;      
const ErrorReport = require('./errorReporting');

const getMMs = () => {
  return firebasedb.ref('mocData')
        .once('value')
        .then((snapshot) => {
          let missingMembers = [];
          snapshot.forEach((ele) => {
            let moc = ele.val();
            if (moc.missingMember === 'true'){
              moc.missingMember = true;
            }
            if (moc.missingMember === 'false') {
              moc.missingMember = false;
            }
            if (moc.next_election && Number(moc.next_election) !== 2018) {
              return;
            }
            if (moc.missingMember && moc.in_office && !moc.retiring) {
              const mmDistrict = {
                state: moc.state,
                district: moc.district,
                type: moc.type,
                mmName:  moc.displayName,
                mmParty: moc.party,
                state_rank: moc.state_rank || null,
              };
              missingMembers.push(mmDistrict);
            }
          });
          return missingMembers;
        });
};

const writeOut = (mm, displayName, party) => {
  let district;
  let updateObject = {
    state: mm.state,
    sitting_missing_member: mm.mmName,
    missing_member_party: mm.mmParty[0],
    pledger: displayName,
    pledger_party: party,
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
    firebasedb.ref(`do_your_job_districts/${mm.state}-${district}`)
      .once('value')
      .then(snapshot => {
        updateObject.district = district;
        if (!snapshot.exists()) {
          const email = new ErrorReport(`new do your job district: ${mm.state}-${district} ${JSON.stringify(updateObject)}`, 'new do your job');
          firebasedb.ref(`do_your_job_districts/${mm.state}-${district}`)
            .update(updateObject)
            .then(() => email.sendEmail());
        } else {
          console.log('already in there', updateObject.state, updateObject.district);
        }
      });
  } else {
    firebasedb.ref(`do_your_job_districts/${mm.state}-${mm.state_rank}`)
      .once('value')
      .then(snapshot => {
        updateObject.district = 'Senate';

        if (!snapshot.exists() && mm.state_rank) {
          const email = new ErrorReport(`new do your job Senate: ${JSON.stringify(updateObject)}`, 'new do your job');
          firebasedb.ref(`do_your_job_districts/${mm.state}-${mm.state_rank}`)
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
                return writeOut(mm, pledger.displayName, pledger.party);
              }
            } else if (!mm.district && !pledger.district) {
              if (pledger.role === 'Sen' && mm.type === 'sen') {
                return writeOut(mm, pledger.displayName, pledger.party);
              }
              else if (
                pledger.role.split(' ')[0] === 'Sen' &&
                 mm.type === 'sen' &&
                pledger.role.split(' ')[1] === mm.state_rank
                ) {
                return writeOut(mm, pledger.displayName, pledger.party);
              }
            } else if (mm.district === 'At-Large' && pledger.role === 'Rep') {
              return writeOut(mm, pledger.displayName, pledger.party);
            }

          });
        });
};


getMMs()
    .then(getPledgers);
