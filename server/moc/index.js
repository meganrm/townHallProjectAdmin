const firebasedb = require('../lib/setupFirebase.js').realtimedb;
const statesAb = require('../data/stateMap.js');
const zeropadding = require('../util').zeropadding;

class Moc {
    constructor(opts) {
        // if (!opts.member_id) {
        //     return;
        // }
        for (let keys in opts) {
            this[keys] = opts[keys];
        }
        this.propublica_id = opts.member_id || opts.id;
        this.end_date = opts.end_date || null;
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

    updateMocByStateDistrict() {
        let path;
        let district;
        if (this.type === 'sen') {
            path = `mocByStateDistrict/${this.state}/${this.state_rank}`;
        } else if (this.type === 'rep') {
            district = this.at_large ? '00' : zeropadding(this.district);
            path = `mocByStateDistrict/${this.state}-${district}/`;
        } else {
            console.log('No Moc Type');
            return false;
        }
        if (!this.displayName) {
            return Promise.reject('no display name', this)
        }
        let updateObject = {
            govtrack_id: this.govtrack_id || null,
            propublica_id: this.propublica_id || null,
            displayName: this.displayName,
        };
        console.log('updating moc by district', path, updateObject)
        return firebasedb.ref(path).update(updateObject);
    }

    createNew(newPropublicaMember) {
        let updates = {};
        this.displayName = this.first_name + ' ' + this.last_name;
        this.state = this.state || newPropublicaMember.roles[0].state;
        this.end_date = newPropublicaMember ? newPropublicaMember.roles[0].end_date : this.end_date;

        // this.district = this.type === 'rep' && newPropublicaMember ? newPropublicaMember.roles[0].district : null;
        this.stateName = statesAb[this.state];
        const lastname = this.last_name.replace(/\W/g, '');
        const firstname = this.first_name.replace(/\W/g, '');
        const memberKey = lastname.toLowerCase() + '_' + firstname.toLowerCase();

        const memberIDObject = {
            id : this.govtrack_id,
            nameEntered: this.displayName,
        };

        updates['/mocData/' + this.govtrack_id] = this;
        updates['/mocID/' + memberKey] = memberIDObject;
        this.updateMocByStateDistrict();
        return firebasedb.ref().update(updates);
    }

    update(path) {
    // if match - update only fields that may change (social media)
        console.log('existing member', this.govtrack_id);
        if (!this.displayName){
            this.displayName = this.first_name + ' ' + this.last_name;
        }
        this.updateMocByStateDistrict();
        return firebasedb.ref(path).update(this);
    }
}

module.exports = Moc;
