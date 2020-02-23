const firebasedb = require('../lib/setupFirebase.js').realtimedb;
const zeropadding = require('../util').zeropadding;

///Checks for changes on MOC in mocData to remove members from mocByStateDistrict when in_office is false
module.exports = () => firebasedb.ref('mocData/').on('child_changed', function (snapshot) {
    var path;
    var district;
    var changedMoc = snapshot.val();
    if (changedMoc.in_office === false) {
        if (changedMoc.type === 'sen') {
            path = `mocByStateDistrict/${changedMoc.state}/${changedMoc.state_rank}`;
        } else if (changedMoc.type === 'rep') {
            district = changedMoc.at_large ? '00' : zeropadding(changedMoc.district);
            path = `mocByStateDistrict/${changedMoc.state}-${district}/`;
        } else {
            console.log('No Moc Type');
            return false;
        }
        firebasedb.ref(path).on('value', function (snapshot) {
            let currentMoc = snapshot.val();
            if (currentMoc.govtrack_id === changedMoc.govtrack_id) {
                console.log('This MOC will be deleted: ', currentMoc);
                firebasedb.ref(path).set({
                    displayName: false,
                    govtrack_id: false,
                    propublica_id: false,
                });
                return true;
            }
        });
    }
});