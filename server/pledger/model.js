class Pledger {
  constructor(row, state) {
    this.state = state;
    this.displayName = row.Candidate;
    this.district = Number(row.District) ? Number(row.District) : null;
    this.role = Number(row.District) ? 'Rep' : row.District;
    this.chamber = Number(row.District) ? 'lower' : 'upper';
    let plegedDate = row['Pledge Returned Date'] ? row['Pledge Returned Date'] : '';
    this.pledged = plegedDate.length ? true : false;
    this.incumbent = row['Incumbent'] && row['Incumbent'].toLowerCase() === 'x' ? true : false;
    this.party = row.Party;
    this.status = row.Status && row.Status.length > 0 ? row.Status: null;
  }
}

module.exports = Pledger;
