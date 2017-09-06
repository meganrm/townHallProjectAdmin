(function(module){
  var adminSiteController = {};

  adminSiteController.initMOCReport = function(){
    if (!mocReportView.rendered) {
      mocReportView.init()
    }
  }

  adminSiteController.renderAdmin = function(){
    eventHandler.readData('/townHalls/');
    eventHandler.metaData();
    eventHandler.readDataUsers();
    eventHandler.renderNav('admin')
  }

  adminSiteController.renderPartner = function(){
    eventHandler.readData('/townHalls/');
    eventHandler.metaData();
    eventHandler.renderNav('partner')
  }

  adminSiteController.renderDefault = function(){
    eventHandler.readData('/townHalls/');
    eventHandler.metaData();
    eventHandler.renderNav('default')
  }

  adminSiteController.renderMain= function(ctx){
    if (ctx.Auth) {
      switch (ctx.Auth) {
        case 'isAdmin':
          adminSiteController.renderAdmin()
          break;
        case 'isResearcher':
          adminSiteController.renderAdmin()
          break;
        case 'isPartner':
          adminSiteController.renderPartner()
          break;
        default:
        adminSiteController.renderDefault()
      }
    }
  }

  adminSiteController.checkAuth = function(uid, next) {
    ctx = {}
      User.getUser(uid).then(function(user){
        if (user['isPartner']) {
          ctx.Auth = 'isPartner'
        }
        if (user['isResearcher']) {
          ctx.Auth = 'isResearcher'
        }
        if (user['isAdmin']) {
          ctx.Auth = 'isAdmin'
        }
      next(ctx)
    })
  }


  function writeUserData(userId, name, email, flag) {
    user = {
      username: name,
      email: email
    }
    if (flag) {
      user[flag] = true
    }
    firebase.database().ref('users/' + userId).update(user);
  }

  firebase.auth().onAuthStateChanged(function (user) {
    eventHandler.renderNav()
    if (user) {
    // User is signed in.
      if (user.uid !== TownHall.currentUser) {
        console.log(user.displayName, ' is signed in');
        TownHall.currentUser = user.uid;
        $('.write-error').removeClass('hidden');
        if (user.email === 'townhallproject2018@gmail.com' || user.email === 'andy.wilson@sierraclub.org' || user.email === 'sbaron@americanprogress.org' || user.email === 'meganrm@townhallproject.com') {
          writeUserData(user.uid, user.displayName, user.email, 'isPartner');
        } else {
          writeUserData(user.uid, user.displayName, user.email);
        }
        adminSiteController.checkAuth(user.uid, adminSiteController.renderMain)
      } else {
        console.log(user.displayName, ' is still signed in');
      }
    } else {
      console.log('no user');
      adminSiteController.signIn();
      // No user is signed in.
    }
  });

  // Sign in fuction for firebase
  adminSiteController.signIn = function signIn() {
    firebase.auth().signInWithRedirect(provider);
    firebase.auth().getRedirectResult().then(function (result) {
      // This gives you a Google Access Token. You can use it to access the Google API.
      // var token = result.credential.accessToken;
      // The signed-in user info.
      // var user = result.user;
    }).catch(function (error) {
      // Handle Errors here.
      var errorCode = error.code;
      var errorMessage = error.message;
      console.log(errorCode, errorMessage);
    });
  };

  $(document).ready(function () {
    $('#lookup-old-events-form').on('submit', eventHandler.lookupOldEvents);
    $('.sort').on('click', 'a', eventHandler.sortTable);
    $('.filter').on('click', 'a', eventHandler.filterTable);
    $('#filter-info').on('click', 'button.btn', eventHandler.removeFilter);
    eventHandler.resetFilters();
    eventHandler.setupTypeaheads();
    if (location.hash) {
      $("a[href='" + location.hash + "']").click();
    }
  });

  module.adminSiteController = adminSiteController;
})(window);
