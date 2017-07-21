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

  function showbutton(button, downloadFunction){
    $('#' + button).removeClass('hidden')
    $('#' + button).on('click', downloadFunction);
  }

  DownLoadCenter.downloadButtonHandler = function downloadButtonHandler(button, downloadFunction, authFlag){
    if (authFlag) {
      checkAuth(authFlag).then(function(result){
        if (result) {
          showbutton(button, downloadFunction)
        }
      })
    } else {
      showbutton(button, downloadFunction)
    }
  }



  module.DownLoadCenter = DownLoadCenter;
})(window);
