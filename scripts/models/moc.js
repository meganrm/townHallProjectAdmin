(function (module) {
  function Moc(opts) {
    for (keys in opts) {
      this[keys] = opts[keys];
    }
  }

  Moc.allMocsObjs = {};
  Moc.mocUpdated = [];

  Moc.getMember = function (member) {
    var memberKey;
    if (member.split(' ').length === 3) {
      memberKey = member.split(' ')[1].toLowerCase() + member.split(' ')[2].toLowerCase() + '_' + member.split(' ')[0].toLowerCase();
    } else {
      memberKey = member.split(' ')[1].toLowerCase() + '_' + member.split(' ')[0].toLowerCase();
    }
    var memberid = Moc.allMocsObjs[memberKey].id;
    return new Promise(function(resolve, reject){
      firebasedb.ref('mocData/' + memberid).once('value').then(function (snapshot) {
        if (snapshot.exists()) {
          resolve(snapshot.val());
        } else {
          reject('That member is not in our database, please check the spelling, and only use first and last name.');
        }
      });
    });
  };

  Moc.updateWithArray = function(array){
    array.forEach(function(ele){
      if (!ele.id) {
        return;
      }
      let cleanedObj = Object.keys(ele).reduce(function(acc, cur){
        if (ele[cur].length > 0) {
          console.log(ele[cur]);
          if (ele[cur] === 'true' || ele[cur] === 'yes'){
            acc[cur] = true;
            console.log('fixing', ele[cur]);
          } else {
            acc[cur] = ele[cur];
          }
        }
        return acc;
      }, {});

      firebasedb.ref('mocData/' + ele.id).update(cleanedObj);
    });
  };

  function zeropadding(num) {
    let padding = '00';
    let tobepadded = num.toString();
    let padded = padding.slice(0, padding.length - tobepadded.length) + tobepadded;
    return padded;
  }

  Moc.makeNewEndpoints = function(){
    Moc.loadAllData()
      .then((allMocs) => {
        allMocs.forEach((moc) => {
          let obj = {
            govtrack_id : moc.govtrack_id || null,
            propublica_id : moc.propublica_id || null,
            displayName : moc.displayName || null
          };
          if (moc.type === 'sen') {
            path = `mocByStateDistrict/${moc.state}/${moc.state_rank}/`;
          } else if (moc.type === 'rep') {
            let district;
            if (moc.at_large === true) {
              district = '00';
            } else {
              district =  zeropadding(moc.district);
            }
            path = `mocByStateDistrict/${moc.state}-${district}/`;
          }
          console.log(path, obj);
          // return firebasedb.ref(path).update(obj);
        });
      });
  };


  Moc.loadAllUpdated = function(){
    var allupdated = [];
    return new Promise(function (resolve, reject) {
      firebasedb.ref('mocData/').once('value').then(function(snapshot){
        snapshot.forEach(function(member){
          var memberobj = new Moc(member.val());
          if (memberobj.in_office) {
            var name = memberobj.displayName;
            var lastUpdated = memberobj.lastUpdated? moment(memberobj.lastUpdated).fromNow(): 'Never';
            var days;
            if (memberobj.lastUpdated) {
              dataviz.mocReportProgress(memberobj);
              var now = moment();
              var timeAgo = moment(memberobj.lastUpdated);
              days = now.diff(timeAgo, 'days');
            }
            Moc.allMocsObjs[member.key] = memberobj;
            allupdated.push({
              id: member.key,
              name: name,
              chamber : memberobj.type,
              party : memberobj.party,
              state: memberobj.state,
              lastUpdatedBy : memberobj.lastUpdatedBy,
              lastUpdated : lastUpdated,
              daysAgo: days,
              missingMember: memberobj.missingMember
            });
          }
        });
        Moc.download();
        console.log(allupdated.length);
        allupdated.sort(function(a, b) {
          if (a.state < b.state ) {
            return -1;
          } else if (a.state > b.state) {
            return 1;
          } else {
            return 0;
          }
        });
        resolve(allupdated);
      });
    });
  };

  Moc.loadAll = function(){
    var allNames = [];
    return new Promise(function (resolve, reject) {
      firebasedb.ref('mocID/').once('value').then(function(snapshot){
        snapshot.forEach(function(member){
          var memberobj = new Moc(member.val());
          Moc.allMocsObjs[member.key] = memberobj;
          var name = memberobj.nameEntered;
          if (!name) {
            console.log(member.key);
          } else {
            if (allNames.indexOf(name) === -1){
              allNames.push(name);
            }
          }
        });
        resolve(allNames);
      });
    });
  };

  Moc.loadAllData = function(){
    var allMocs = [];
    return new Promise(function (resolve, reject) {
      firebasedb.ref('mocData/').once('value').then(function(snapshot){
        snapshot.forEach(function(member){
          var memberobj = new Moc(member.val());
          allMocs.push(memberobj);
        });
        resolve(allMocs);
      });
    });
  };

  Moc.prototype.updateFB = function () {
    var mocObj = this;
    return new Promise(function (resolve, reject) {
      firebasedb.ref('/mocData/' + mocObj.govtrack_id).update(mocObj).then(function(){
        resolve(mocObj);
      }).catch(function (error) {
        reject('could not update', mocObj, error);
      });
    });
  };

  Moc.prototype.updateDisplayName = function () {
    var mocObj = this;
    memberKey = Moc.getMemberKey(mocObj.nameEntered);
    return new Promise(function (resolve, reject) {
      firebasedb.ref('/mocID/' + memberKey).update(mocObj).then(function(){
        resolve(mocObj);
      }).catch(function (error) {
        reject('could not update', mocObj, error);
      });
    });
  };

  Moc.getMemberKey = function (member) {
    var memberKey;
    if (member.split(' ').length === 3) {
      memberKey = member.split(' ')[1].toLowerCase() + member.split(' ')[2].toLowerCase() + '_' + member.split(' ')[0].toLowerCase();
    } else {
      memberKey = member.split(' ')[1].toLowerCase() + '_' + member.split(' ')[0].toLowerCase();
    }
    return memberKey;
  };

  Moc.download = function(){
    data = Object.keys(Moc.allMocsObjs).map(function(key){
      return Moc.allMocsObjs[key];
    });
    // prepare CSV data
    var csvData = new Array();
    csvData.push('id, name, party, chamber, state, district, facebook_account');
    data.forEach(function(item) {
      csvData.push(
        '"' + item.govtrack_id +
      '","' + item.displayName +
      '","' + item.party +
      '","' + item.type +
      '","' + item.state +
      '","' + item.district +
      '","' + item.facebook_account +

      '"');
    });

    // download stuff
    var fileName = 'mocs.csv';
    var buffer = csvData.join('\n');
    var blob = new Blob([buffer], {
      'type': 'text/csv;charset=utf8;'
    });
    var link = document.createElement('a');

    if(link.download !== undefined) { // feature detection
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
  };

  module.Moc = Moc;
})(window);
