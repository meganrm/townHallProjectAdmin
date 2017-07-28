(function (module) {

  function User(cur, key) {
    this.userid = key;
    this.email = cur.email;
    this.username = cur.username;
    if (cur.mocs) {
      var user = this
      user.num = Object.keys(cur.mocs).length
      console.log(user.num);
      Object.keys(cur.mocs).forEach(function(id, i){
        govtrack_id = parseInt(id);
        if (govtrack_id) {
          user['moc_id_' + i] = govtrack_id;
          user['moc_name_' + i] = Moc.allMocsObjs[govtrack_id].displayName;
        }
      })
    } else {
      this.num = 0;
    }
  }

  User.getUser = function(userID){
    return new Promise(function(resolve, reject) {
      firebase.database().ref('users/' + userID).once('value').then(function(snapshot){
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
    firebase.database().ref('users/').once('value').then(function(snapshot){
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
