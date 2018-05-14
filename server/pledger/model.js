class Pledger{
  constructor(row, state){
    this.state = state;
    this.displayName = row.Candidate;
    this.district = Number(row.District) ? Number(row.District) : null;
    this.chamber = Number(row.District) ? 'lower' : 'upper';
    let plegedDate = row['Pledge Returned Date'] ? row['Pledge Returned Date']: '';
    this.pledged = plegedDate.length ? true: false;
    this.incumbent = row['Incumbent'] === 'x' ? true: false;
    this.party = row.Party === 'D' ? 'Democratic' : 'Republican';
    this.nominee = row.Nominee === 'x'? true: false;
  }
}

module.exports = Pledger;
