const firebasedb = require('../lib/setupFirebase.js');
var statesAb = require('../data/stateMap.js');

class Moc {
  constructor(opts) {
    if (!opts.member_id) {
      return;
    }
    for (let keys in opts) {
      this[keys] = opts[keys];
    }
    this.propublica_id = opts.member_id;
    this.propublica_facebook = opts.facebook_account;
    if (parseInt(this.propublica_facebook)) {
      this.propublica_facebook = parseInt(this.propublica_facebook);
    }
    if (opts.current_party && opts.current_party.toLowerCase() === 'd') {
      this.party = 'Democratic';
    } else if (opts.current_party && opts.current_party.toLowerCase() === 'r') {
      this.party = 'Republican';
    } else if (opts.current_party) {
      this.party = 'Independent';
    }
    if (opts.state) {
      this.state = opts.state;
      this.stateName = statesAb[opts.state];
    } else if (opts.roles[0].state) {
      let data = opts.roles[0];
      this.state = data.state;
      this.stateName = statesAb[this.state];
      if (data.chamber === 'House') {
        this.chamber = 'House';
        this.district = data.district ;
      }
      if (data.chamber === 'Senate') {
        this.chamber = 'Senate';
      }
    }
    delete this.roles;
    delete this.facebook_account;
    delete this.member_id;
    delete this.current_party;
  }

  createNew(newPropublicaMember) {
    let updates = {};
    this.displayName = this.first_name + ' ' + this.last_name;
    // this.state = newPropublicaMember.state;
    // this.district = newPropublicaMember.district;
    // this.stateName = statesAb[newPropublicaMember.state];
    console.log(this.state, this.stateName);
    const lastname = this.last_name.replace(/\W/g, '');
    const firstname = this.first_name.replace(/\W/g, '');
    const memberKey = lastname.toLowerCase() + '_' + firstname.toLowerCase();

    const memberIDObject = {
      id : this.govtrack_id,
      nameEntered: this.displayName,
    };

    updates['/mocData/' + this.govtrack_id] = this;
    updates['/mocID/' + memberKey] = memberIDObject;
    return firebasedb.ref().update(updates);
  }

  update(path) {
    // if match - update only fields that may change (social media)
    console.log('existing member', this.govtrack_id);
    // return firebasedb.ref(path).update(this);
  }
}

module.exports = Moc;
