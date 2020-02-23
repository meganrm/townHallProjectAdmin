const lodash = require('lodash');
const firebasedb = require('../lib/setupFirebase.js').realtimedb;

const getAllStates = () => firebasedb.ref('states').once('value')
    .then(snapshot => {
        const statesToReturn = [];
        snapshot.forEach((ele) => {
            statesToReturn.push(ele.val());
        });
        return statesToReturn;
    });

const getStateLegs = () => {
    return getAllStates()
        .then((states) => lodash.map(lodash.filter(states, 'state_legislature_covered'), 'state'));
};

module.exports =  {
    getAllStates, 
    getStateLegs,
};