const moment = require('moment');

class Pledger {
  constructor(row, state) {
    this.state = state;
    this.displayName = row.Candidate;
    this.missingMember = row['Missing Member'] === 'TRUE';
    this.hoverText = row['Hover Text'];
    this.district = Number(row.District) ? Number(row.District) : null;
    this.level = row.District.split('-').length > 1 ? 'state' : 'federal';
    this.role = Number(row.District) ? 'Rep' : row.District;
    this.chamber = Number(row.District) ? 'lower' : 'upper';
    let plegedDate = row['Pledge Returned Date'] ? row['Pledge Returned Date'] : '';
    if (!moment(plegedDate).isValid()){
      console.log(state, row.Candidate);
    }
    this.pledged = moment(plegedDate).isValid() ? true : false;
    this.incumbent = row['Incumbent'] && row['Incumbent'].toLowerCase() === 'x' ? true : false;
    this.party = row.Party;
    this.status = row.Status && row.Status.length > 0 ? row.Status: null;
  }
}

module.exports = Pledger;
