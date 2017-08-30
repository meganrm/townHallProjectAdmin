(function (module) {
  function Moc(opts) {
    for (keys in opts) {
      this[keys] = opts[keys];
    }
  }

  Moc.allMocsObjs = {};
  Moc.mocUpdated = [];

  Moc.loadAllUpdated = function(){
    var allupdated = [];
    dataviz.initalProgressBar(100, $('.dem-senate-report'));
    dataviz.initalProgressBar(100, $('.rep-senate-report'));
    dataviz.initalProgressBar(434, $('.dem-house-report'));
    dataviz.initalProgressBar(434, $('.rep-house-report'));
    return new Promise(function (resolve, reject) {
      firebase.database().ref('mocData/').once('value').then(function(snapshot){
        snapshot.forEach(function(member){
          var memberobj = new Moc(member.val());
          if (memberobj.in_office) {
            var name = memberobj.displayName;
            var lastUpdated = memberobj.lastUpdated? moment(memberobj.lastUpdated).fromNow(): 'Never';
            var days;
            if (memberobj.lastUpdated) {
              dataviz.mocReportProgress(memberobj)
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
      firebase.database().ref('mocID/').once('value').then(function(snapshot){
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
  Moc.prototype.updateFB = function () {
    var mocObj = this;
    return new Promise(function (resolve, reject) {
      firebase.database().ref('/mocData/' + mocObj.govtrack_id).update(mocObj).then(function(){
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
      firebase.database().ref('/mocID/' + memberKey).update(mocObj).then(function(){
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

  module.Moc = Moc;
})(window);
