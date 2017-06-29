(function (module) {
  function Moc(opts) {
    for (keys in opts) {
      this[keys] = opts[keys];
    }
  }

  Moc.allMocsObjs = {};
  Moc.mocUpdated = [];

  Moc.loadAll = function(){
    var allupdated = [];
    return new Promise(function (resolve, reject) {
      firebase.database().ref('mocData/').once('value').then(function(snapshot){
        snapshot.forEach(function(member){
          var memberobj = new Moc(member.val());
          var name = memberobj.ballotpedia_id ? memberobj.ballotpedia_id: memberobj.first_name + ' ' + memberobj.last_name;
          var lastUpdated = memberobj.lastUpdated? moment(memberobj.lastUpdated).fromNow(): 'Never';
          Moc.allMocsObjs[member.key] = memberobj;
          allupdated.push({
            id: member.key,
            name: name,
            chamber : memberobj.type,
            lastUpdated : lastUpdated
          })
        });
        console.log(allupdated.length);
        resolve(allupdated);
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
