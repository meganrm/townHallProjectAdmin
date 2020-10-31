const moment = require('moment');
const isNumber = (item) => !isNaN(item);

class Pledger {
    constructor(row, state, year) {
    // If state has not been passed in, we are working on a mayoral candidate
        if (state) {
            if (!row.District && row.District != 0) {
                return {};
            }
            this.level = row.District.split('-').length > 1 ? 'state' : 'federal';
            this.role = isNumber(row.District) ? 'Rep' : row.District.toLowerCase() === 'sen' ? 'Sen' : row.District;
            this.chamber = row.District.toLowerCase().includes('sen') ? 'upper' : 'lower';
        } else {
            this.level = 'city';
            this.role = row.role || 'Mayor';
            this.chamber = 'citywide';
        }
        this.state = row.state || state;
        this.displayName = row.Candidate;
        this.missingMember = row['Missing Member'] === 'TRUE';
        this.hoverText = row['Hover Text'] || null;
        this.district = isNumber(row.District) ? Number(row.District) : null;
        this.year = year;
        this.chamber = isNumber(row.District) ? 'lower' : 'upper';
        this.city = row['City/Municipality'] || null;
        let pledgedDate = row['Pledge Returned Date'] || '';
        this.pledged = moment(pledgedDate, ['M/D/YYYY', 'M/D', 'YYYY']).isValid() ? true : false;
        this.incumbent =
      row['Incumbent'] && row['Incumbent'].toLowerCase() === 'x' ? true : false;
        this.party = row.Party;
        this.status = row.Status && row.Status.length > 0 ? row.Status : null;
    }
}

module.exports = Pledger;
