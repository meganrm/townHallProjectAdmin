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
    return new Promise(function (resolve, reject) {
      firebase.database().ref('mocData/').once('value').then(function(snapshot){
        snapshot.forEach(function(member){
          var memberobj = new Moc(member.val());
          var name = memberobj.ballotpedia_id ? memberobj.ballotpedia_id: memberobj.first_name + ' ' + memberobj.last_name;
          var lastUpdated = memberobj.lastUpdated? moment(memberobj.lastUpdated).fromNow(): 'Never';
          var days;
          if (memberobj.lastUpdated) {
            var now = moment();
            var timeAgo = moment(memberobj.lastUpdated);
            days = now.diff(timeAgo, 'days');
          }
          Moc.allMocsObjs[member.key] = memberobj;
          allupdated.push({
            id: member.key,
            name: name,
            chamber : memberobj.type,
            state: memberobj.state,
            lastUpdatedBy : memberobj.lastUpdatedBy,
            lastUpdated : lastUpdated,
            daysAgo: days
          });
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

  module.Moc = Moc;
})(window);
