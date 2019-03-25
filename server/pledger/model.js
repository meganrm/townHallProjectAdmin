const moment = require('moment');

class Pledger {
    constructor(row, state, year) {
    // If state has not been passed in, we are working on a mayoral candidate
        if (state) {
            this.level = row.District.split('-').length > 1 ? 'state' : 'federal';
            this.role = Number(row.District) ? 'Rep' : row.District;
            this.chamber = Number(row.District) ? 'lower' : 'upper';
        } else {
            this.level = 'city';
            this.role = 'Mayor';
            this.chamber = 'citywide';
        }
        this.state = row.state || state;
        this.displayName = row.Candidate;
        this.missingMember = row['Missing Member'] === 'TRUE';
        this.hoverText = row['Hover Text'] || null;
        this.district = Number(row.District) ? Number(row.District) : null;
        this.year = year;
        this.chamber = Number(row.District) ? 'lower' : 'upper';
        this.city = row['City/Municipality'] || null;
        let plegedDate = row['Pledge Returned Date'] || '';
        this.pledged = moment(plegedDate, 'MM/DD/YYYY').isValid() ? true : false;
        this.incumbent =
      row['Incumbent'] && row['Incumbent'].toLowerCase() === 'x' ? true : false;
        this.party = row.Party;
        this.status = row.Status && row.Status.length > 0 ? row.Status : null;
    }
}

module.exports = Pledger;
