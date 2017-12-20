(function (module) {
  DownLoadCenter = {}

  function checkAuth (authFlag) {
    return new Promise(function(resolve, reject) {
      User.getUser(TownHall.currentUser).then(function(user){
        if (user[authFlag]) {
          resolve(true)
        } else {
          reject(false)
        }
      }).catch(function(error){
        console.log(error);
      })
    });
  }

  CSVTownHall.makeDownloadButton = function(buttonName, data, inputFileName, appendToId){
    if (data.length === 0) {
      return;
    }
    // prepare CSV data
    var csvData = new Array();
    csvData.push(Object.keys(data[0]).join(', '));

    data.forEach(function(item, index) {
      var row = '"' + item['Member'] + '"'
      Object.keys(item)
      for (var i = 1; i < Object.keys(item).length; i++) {
        row = row +  ',' +  '"' + item[Object.keys(item)[i]] + '"'
      }
      //row = row + '\n';
      csvData.push(row);
    });


    // download stuff
    var fileName = inputFileName;
    var buffer = csvData.join('\n');
    var blob = new Blob([buffer], {
      'type': 'text/csv;charset=utf8;'
    });
    var link = document.createElement('a');
    var li = document.createElement('li');
    if(link.download !== undefined) { // feature detection
      // Browsers that support HTML5 download attribute
      link.setAttribute('href', window.URL.createObjectURL(blob));
      link.setAttribute('download', fileName);
    }
    else {
      // it needs to implement server side export
      link.setAttribute('href', 'http://www.example.com/export');
    }
    link.setAttribute('class', 'btn btn-blue')
    link.setAttribute('list-style-type', 'none')
    link.innerHTML = buttonName;
    li.appendChild(link)
    document.getElementById(appendToId).appendChild(li);
  };

  function showbutton(button, downloadFunction, name){
    // $('#' + button).removeClass('hidden')
    downloadFunction(name);
  }

  DownLoadCenter.downloadButtonHandler = function downloadButtonHandler(button, downloadFunction, authFlag, name){
    if (authFlag) {
      checkAuth(authFlag).then(function(result){
        if (result) {
          showbutton(button, downloadFunction, name)
        }
      })
    } else {
      showbutton(button, downloadFunction, name)
    }
  }

  module.DownLoadCenter = DownLoadCenter;
})(window);
