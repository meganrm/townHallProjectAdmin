/*globals firebasedb dataviz*/
(function (module) {
  function MoStateLeg(opts) {
    this.level = 'state';
    this.chamber = opts.chamber;
    this.district = opts.district || null;
    this.party = opts.party;
    this.state = opts.thp_id.split('-')[0];
    this.stateName = statesAb[this.state];
    this.phone_capitol = opts.phone_capitol || null;
    this.phone_district = opts.phone_district || null;
    if (this.state === 'AZ' && this.chamber != 'statewide') {
      this.email = opts.email.split('Email: ')[1].toLowerCase() + '@azleg.gov';
    } else {
      this.email = opts.email;
    }
    this.in_office = true;
    this.role = opts.role || null;
    this.url = opts.url || null;
    this.thp_id = opts.thp_id;
    this.displayName = opts.displayName.replace(/\./g, '');
    this.lastUpdated = opts.lastUpdated || null;
    this.lastUpdatedBy = opts.lastUpdatedBy || null;
  }

  MoStateLeg.allMoStateLegsObjs = {};
  MoStateLeg.mocUpdated = [];

  // MoStateLeg.getMember = function (member) {
  //   var memberKey;
  //   if (member.split(' ').length === 3) {
  //     if (member.split(' ')[0].length === 1) {
  //       memberKey = member.split(' ')[2].toLowerCase().replace(/\./g, '') + member.split(' ')[0].toLowerCase() + '_' + member.split(' ')[1].toLowerCase();
  //     } else {
  //       memberKey = member.split(' ')[1].toLowerCase() + member.split(' ')[2].toLowerCase() + '_' + member.split(' ')[0].toLowerCase();
  //     }
  //   } else {
  //     memberKey = member.split(' ')[1].toLowerCase() + '_' + member.split(' ')[0].toLowerCase();
  //   }
  //   var memberid = MoStateLeg.allMoStateLegsObjs[memberKey].id;
  //   return new Promise(function(resolve, reject){
  //     firebasedb.ref('mocData/' + memberid).once('value').then(function (snapshot) {
  //       if (snapshot.exists()) {
  //         resolve(snapshot.val());
  //       } else {
  //         reject('That member is not in our database, please check the spelling, and only use first and last name.');
  //       }
  //     });
  //   });
  // };

  MoStateLeg.updateWithArray = function(array){
    array.forEach(function(ele){
      if (!ele.thp_id) {
        return;
      }
      let newMember = new MoStateLeg(ele);
      let memberKey;
      let member = newMember.displayName;
      let nameArray = member.split(' ');
      if (nameArray.length === 0 ) {
        return console.log('only one name', member);
      }
      if (nameArray.length > 2) {
        let firstname = nameArray[0];
        let middlename = nameArray[1];
        let lastname = nameArray[2];
        if (firstname.length === 1 || middlename.length === 1) {
          memberKey = lastname.toLowerCase().replace(/\,/g, '') + '_' + firstname.toLowerCase() + '_' + middlename.toLowerCase();
        } else {
          memberKey = middlename.toLowerCase() + lastname.toLowerCase().replace(/\,/g, '') + '_' + firstname.toLowerCase();
        }
      } else {
        memberKey = nameArray[1].toLowerCase().replace(/\,/g, '') + '_' + nameArray[0].toLowerCase();
      }

      let memberLookup = {id: newMember.thp_id, nameEntered: newMember.displayName};
      firebasedb.ref(`state_legislators_data/${newMember.state}/${newMember.thp_id}`).update(newMember);
      firebasedb.ref(`state_legislators_id/${newMember.state}/${memberKey}`).update(memberLookup);
    });
  };

  function zeropadding(num) {
    let padding = '00';
    let tobepadded = num.toString();
    let padded = padding.slice(0, padding.length - tobepadded.length) + tobepadded;
    return padded;
  }

  MoStateLeg.makeNewEndpoints = function(){
    MoStateLeg.loadAllData()
      .then((allMoStateLegs) => {
        allMoStateLegs.forEach((moc) => {
          let obj = {
            govtrack_id : moc.govtrack_id || null,
            propublica_id : moc.propublica_id || null,
            displayName : moc.displayName || null,
          };
          if (moc.type === 'sen') {
            var path = `mocByStateDistrict/${moc.state}/${moc.state_rank}/`;
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


  MoStateLeg.loadAllUpdated = function(path){
    var allupdated = [];
    return new Promise(function (resolve, reject) {
      firebasedb.ref(path).once('value').then(function(snapshot){
        snapshot.forEach(function(member){
          var memberobj = new MoStateLeg(member.val());
          if (memberobj.in_office) {
            var name = memberobj.displayName;
            var lastUpdated = memberobj.lastUpdated? moment(memberobj.lastUpdated).fromNow(): 'Never';
            var days;
            if (memberobj.lastUpdated) {
              dataviz.stateLawmakerProgress(memberobj, true);
              var now = moment();
              var timeAgo = moment(memberobj.lastUpdated);
              days = now.diff(timeAgo, 'days');
            } else {
              dataviz.stateLawmakerProgress(memberobj, false);

            }
            MoStateLeg.allMoStateLegsObjs[member.key] = memberobj;
            allupdated.push({
              id: member.key,
              name: name,
              chamber : memberobj.type,
              party : memberobj.party,
              state: memberobj.state,
              lastUpdatedBy : memberobj.lastUpdatedBy,
              lastUpdated : lastUpdated,
              daysAgo: days,
              missingMember: memberobj.missingMember,
            });
          }
        });
        MoStateLeg.download();
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

  MoStateLeg.loadAll = function(){
    var allNames = [];
    return new Promise(function (resolve, reject) {
      firebasedb.ref('mocID/').once('value').then(function(snapshot){
        snapshot.forEach(function(member){
          var memberobj = new MoStateLeg(member.val());
          MoStateLeg.allMoStateLegsObjs[member.key] = memberobj;
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

  MoStateLeg.loadAllData = function(){
    var allMoStateLegs = [];
    return new Promise(function (resolve, reject) {
      firebasedb.ref('mocData/').once('value').then(function(snapshot){
        snapshot.forEach(function(member){
          var memberobj = new MoStateLeg(member.val());
          allMoStateLegs.push(memberobj);
        });
        resolve(allMoStateLegs);
      });
    });
  };

  MoStateLeg.prototype.updateFB = function () {
    var mocObj = this;
    return new Promise(function (resolve, reject) {
      firebasedb.ref('/mocData/' + mocObj.govtrack_id).update(mocObj).then(function(){
        resolve(mocObj);
      }).catch(function (error) {
        reject('could not update', mocObj, error);
      });
    });
  };

  MoStateLeg.prototype.updateDisplayName = function () {
    var mocObj = this;
    var memberKey = MoStateLeg.getMemberKey(mocObj.nameEntered);
    return new Promise(function (resolve, reject) {
      firebasedb.ref('/mocID/' + memberKey).update(mocObj).then(function(){
        resolve(mocObj);
      }).catch(function (error) {
        reject('could not update', mocObj, error);
      });
    });
  };

  MoStateLeg.getMemberKey = function (member) {
    var memberKey;
    if (member.split(' ').length === 3) {
      memberKey = member.split(' ')[1].toLowerCase() + member.split(' ')[2].toLowerCase() + '_' + member.split(' ')[0].toLowerCase();
    } else {
      memberKey = member.split(' ')[1].toLowerCase() + '_' + member.split(' ')[0].toLowerCase();
    }
    return memberKey;
  };

  MoStateLeg.download = function(){
    var data = Object.keys(MoStateLeg.allMoStateLegsObjs).map(function(key){
      return MoStateLeg.allMoStateLegsObjs[key];
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
      'type': 'text/csv;charset=utf8;',
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
    link.innerHTML = 'Download MoStateLegs';
    document.getElementById('THP-downloads').appendChild(link);
  };

  module.MoStateLeg = MoStateLeg;
})(window);
