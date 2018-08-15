/*globals firebasedb dataviz */

(function (module) {
  class Moc {
    constructor(opts) {
      Object.keys(opts)
        .forEach(key => {
          this[key] = opts[key];
        });
    }

    updateFB() {
      var mocObj = this;
      return new Promise(function (resolve, reject) {
        firebasedb.ref('/mocData/' + mocObj.govtrack_id).update(mocObj).then(function () {
          resolve(mocObj);
        }).catch(function (error) {
          reject('could not update', mocObj, error);
        });
      });
    }
    updateDisplayName() {
      var mocObj = this;
      const memberKey = Moc.getMemberKey(mocObj.nameEntered);
      return new Promise(function (resolve, reject) {
        firebasedb.ref('/mocID/' + memberKey).update(mocObj).then(function () {
          resolve(mocObj);
        }).catch(function (error) {
          reject('could not update', mocObj, error);
        });
      });
    }

    convertNameToKey(nameEntered){
      var memberKey;
      if (nameEntered.split(' ').length === 3) {
        memberKey = nameEntered.split(' ')[1].toLowerCase() + nameEntered.split(' ')[2].toLowerCase() + '_' + nameEntered.split(' ')[0].toLowerCase();
      } else {
        memberKey = nameEntered.split(' ')[1].toLowerCase() + '_' + nameEntered.split(' ')[0].toLowerCase();
      }
      return memberKey;
    }

    static getMember(member) {
      const memberKey = Moc.convertNameToKey(member);
      var memberid = Moc.allMocsObjsByName[memberKey].id;
      return new Promise(function (resolve, reject) {
        firebasedb.ref('mocData/' + memberid).once('value').then(function (snapshot) {
          if (snapshot.exists()) {
            resolve(snapshot.val());
          }
          else {
            reject('That member is not in our database, please check the spelling, and only use first and last name.');
          }
        });
      });
    }
    
    static updateWithArray(array) {
      array.forEach(function (ele) {
        if (!ele.id) {
          return;
        }
        let cleanedObj = Object.keys(ele).reduce(function (acc, cur) {
          if (ele[cur].length > 0) {
            console.log(ele[cur]);
            if (ele[cur] === 'true' || ele[cur] === 'yes') {
              acc[cur] = true;
              console.log('fixing', ele[cur]);
            }
            else {
              acc[cur] = ele[cur];
            }
          }
          return acc;
        }, {});
        firebasedb.ref('mocData/' + ele.id).update(cleanedObj);
      });
    }
    static makeNewEndpoints() {
      let path;
      Moc.loadAllData()
        .then((allMocs) => {
          allMocs.forEach((moc) => {
            if (!moc.in_office) {
              return;
            }
            let obj = {
              govtrack_id: moc.govtrack_id || null,
              propublica_id: moc.propublica_id || null,
              displayName: moc.displayName || null,
            };
            if (moc.type === 'sen') {
              path = `mocByStateDistrict/${moc.state}/${moc.state_rank}/`;
            }
            else if (moc.type === 'rep') {
              let district;
              if (moc.at_large === true) {
                district = '00';
              }
              else {
                district = zeropadding(moc.district);
              }
              path = `mocByStateDistrict/${moc.state}-${district}/`;
            }
            console.log(path, obj);
            return firebasedb.ref(path).update(obj);
          });
        });
    }
    static loadAllUpdated() {
      var allupdated = [];
      return firebasedb.ref('mocData/').once('value').then(function (snapshot) {
        snapshot.forEach(function (member) {
          var memberobj = new Moc(member.val());
          if (memberobj.in_office) {
            var name = memberobj.displayName;
            var lastUpdated = memberobj.lastUpdated ? moment(memberobj.lastUpdated).fromNow() : 'Never';
            var days;
            if (memberobj.lastUpdated) {
              dataviz.mocReportProgress(memberobj);
              var now = moment();
              var timeAgo = moment(memberobj.lastUpdated);
              days = now.diff(timeAgo, 'days');
            }
            Moc.allMocsObjsByID[member.key] = memberobj;
            allupdated.push({
              id: member.key,
              name: name,
              chamber: memberobj.type,
              party: memberobj.party,
              state: memberobj.state,
              lastUpdatedBy: memberobj.lastUpdatedBy,
              lastUpdated: lastUpdated,
              daysAgo: days,
              missingMember: memberobj.missingMember,
            });
          }
        });
        Moc.download();
        console.log(allupdated.length);
        allupdated.sort(function (a, b) {
          if (a.state < b.state) {
            return -1;
          } else if (a.state > b.state) {
            return 1;
          } else {
            return 0;
          }
        });
        return allupdated;
      });
    }

    static loadAllByName() {
      var allNames = [];
      return firebasedb.ref('mocID/').once('value')
      .then(function (snapshot) {
        snapshot.forEach(function (member) {
          var memberobj = new Moc(member.val());
          Moc.allMocsObjsByName[member.key] = memberobj;
          var name = memberobj.nameEntered;
          if (!name) {
            console.log(member.key);
          }
          else {
            if (allNames.indexOf(name) === -1) {
              allNames.push(name);
            }
          }
        });
        return allNames;
      });
    }
    static loadAllData() {
      var allMocs = [];
      return firebasedb.ref('mocData/').once('value').then(function (snapshot) {
        snapshot.forEach(function (member) {
          var memberobj = new Moc(member.val());
          Moc.allMocsObjsByID[memberobj.govtrack_id] = memberobj;
          allMocs.push(memberobj);
        });
        return allMocs;
      });
    }
    static getMemberKey(member) {
      var memberKey;
      if (member.split(' ').length === 3) {
        memberKey = member.split(' ')[1].toLowerCase() + member.split(' ')[2].toLowerCase() + '_' + member.split(' ')[0].toLowerCase();
      }
      else {
        memberKey = member.split(' ')[1].toLowerCase() + '_' + member.split(' ')[0].toLowerCase();
      }
      return memberKey;
    }

    static download() {
      let data;
      Moc.loadAllData()
        .then(() => {
          data = Object.keys(Moc.allMocsObjsByID)
            .map(function (key) {
              return Moc.allMocsObjsByID[key];
            })
            .filter((moc) => {
              return moc.in_office;
            });
          // prepare CSV data
          var csvData = [];
          csvData.push('id, name, party, chamber, state, district, missing_member');
          data.forEach(function (item) {
            csvData.push('"' + item.govtrack_id +
              '","' + item.displayName +
              '","' + item.party +
              '","' + item.type +
              '","' + item.state +
              '","' + item.district +
              '","' + item.missingMember +
              '"');
          });
          // download stuff
          var fileName = 'mocs.csv';
          var buffer = csvData.join('\n');
          var blob = new Blob([buffer], {
            'type': 'text/csv;charset=utf8;',
          });
          var link = document.createElement('a');
          if (link.download !== undefined) { // feature detection
            // Browsers that support HTML5 download attribute
            link.setAttribute('href', window.URL.createObjectURL(blob));
            link.setAttribute('download', fileName);
          }
          else {
            // it needs to implement server side export
            link.setAttribute('href', 'http://www.example.com/export');
          }
          link.innerHTML = 'Download Mocs';
          document.getElementById('THP-downloads').appendChild(link);
        });
    }
  }

  Moc.allMocsObjsByID = {};
  Moc.allMocsObjsByName = {};
  Moc.mocUpdated = [];



  function zeropadding(num) {
    let padding = '00';
    let tobepadded = num.toString();
    let padded = padding.slice(0, padding.length - tobepadded.length) + tobepadded;
    return padded;
  }










  module.Moc = Moc;
})(window);