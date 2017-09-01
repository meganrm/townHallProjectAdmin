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

  function showbutton(button, downloadFunction, name){
    // $('#' + button).removeClass('hidden')
    console.log(name);
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
