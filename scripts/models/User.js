(function (module) {

  function User(opts) {
    for (keys in opts) {
      this[keys] = opts[keys];
    }
  }

  User.prototype.assignMoc = function(mocID){
    var user = this;
    var ref = firebasedb.ref('users/' + user.ID + '/mocs/' + mocID + '/lastUpdated')
    ref.once('value').then(function(snapshot){
      if (parseInt(snapshot.val()) && moment(snapshot.val()).isValid()){
        lastUpdated = snapshot.val()
        console.log('lastUpdated', lastUpdated);
      } else {
        lastUpdated = ''
      }
      console.log('users/' + user.ID + '/mocs/' + mocID,{lastUpdated : lastUpdated});
      firebasedb.ref('users/' + user.ID + '/mocs/' + mocID).update({lastUpdated : lastUpdated})
    })
  }

  function readResearcherAssignments(array) {
    array.forEach(function(ele){
      if (ele.ID) {
        var user = new User(ele)
        for (var i = 0; i < 9; i++) {
          if (user['isAssigned_' + i] === 'yes') {
            var mocID = user['moc_id_' + i]
            user.assignMoc(mocID)
          }
        }
      }
    })
  }

  User.getUser = function(userID){
    return new Promise(function(resolve, reject) {
      firebasedb.ref('users/' + userID).once('value').then(function(snapshot){
        if (snapshot.exists()) {
          resolve(snapshot.val())
        } else {
          reject('not in database')
        }
      })
    });
  }

  User.download = function(){
    var users = []
    var maxLength = 0
    firebasedb.ref('users/').once('value').then(function(snapshot){
      snapshot.forEach(function(ele){
        obj = new User(ele.val(), ele.key);
        maxLength = obj.num > maxLength ? obj.num : maxLength;
        users.push(obj);
      })
      console.log(maxLength);
      // prepare CSV data
      var csvData = [];
      var titles = '"ID","Name","email"';
      for (var i = 0; i < maxLength; i++) {
        titles = titles + ',' + '"moc_id_' + i + '"' + ',' + '"moc_name_' + i + '"' + ','  + 'is Assigned?';
      }
      csvData.push(titles);
      users.forEach(function(item) {
        var row = item.userid + ',' + item.username + ',' + item.email
        var mocData
        for (var i = 0; i < maxLength; i++) {
          if (item['moc_id_' + i]) {
            mocData = mocData +
            ',' + item['moc_id_' + i] +
            ',' + item['moc_name_' + i] +
            ',' + 'no';
          } else {
            mocData = mocData +
            ',' + ' ' +
            ',' + ' ' +
            ',' + ' ';
        }
      }
      console.log(row + mocData);
      csvData.push(row + mocData)
      });

      // download stuff
      var fileName = 'users.csv';
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
      link.innerHTML = 'User download CSV of Data';
      document.getElementById('ACLU-buttons').appendChild(link);
    });
  };

  module.User = User;
})(window);
