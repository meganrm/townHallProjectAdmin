/*globals mocReportView eventHandler User firebasedb*/

(function(module){
  var adminSiteController = {};

  adminSiteController.initMOCReport = function(){
    if (!mocReportView.rendered) {
      setTimeout(function () {
        mocReportView.init();
      }, 30);
    }
  };

  adminSiteController.renderAdmin = function(){
    eventHandler.readData('/townHalls/');
    eventHandler.metaData();
    eventHandler.readDataUsers('/UserSubmission', '#for-approval');
    eventHandler.readDataUsers('/state_legislators_user_submission/NC', '#for-approval-state');
    eventHandler.readDataUsers('/state_legislators_user_submission/VA', '#for-approval-state');
    eventHandler.readDataUsers('/state_legislators_user_submission/CO', '#for-approval-state');
    eventHandler.readDataUsers('/state_legislators_user_submission/AZ', '#for-approval-state');
    eventHandler.renderNav('admin');
    Moc.download();
  };

  adminSiteController.renderPartner = function(){
    eventHandler.readData('/townHalls/');
    eventHandler.metaData();
    eventHandler.renderNav('partner');
  };

  adminSiteController.renderDefault = function(){
    eventHandler.readData('/townHalls/');
    eventHandler.metaData();
    eventHandler.renderNav('default');
  };

  adminSiteController.renderMain= function(ctx){
    if (ctx.Auth) {
      switch (ctx.Auth) {
      case 'isAdmin':
        adminSiteController.renderAdmin();
        break;
      case 'isResearcher':
        adminSiteController.renderAdmin();
        break;
      case 'dataIntern':
        adminSiteController.renderAdmin();
        break;
      case 'isPartner':
        adminSiteController.renderPartner();
        break;
      default:
        adminSiteController.renderDefault();
      }
    }
  };

  adminSiteController.checkAuth = function(uid, next) {
    var ctx = {};
    User.getUser(uid).then(function(user){
      if (user['isPartner']) {
        ctx.Auth = 'isPartner';
      }
      if (user['isResearcher']) {
        ctx.Auth = 'isResearcher';
      }
      if (user['isAdmin']) {
        ctx.Auth = 'isAdmin';
      }
      if (user['dataIntern']) {
        ctx.Auth = 'dataIntern';
      }
      next(ctx);
    });
  };


  function writeUserData(userId, name, email, flag) {
    var user = {
      username: name,
      email: email,
    };
    if (flag) {
      user[flag] = true;
    }
    firebasedb.ref('users/' + userId).update(user);
  }

  firebase.auth().onAuthStateChanged(function (user) {
    eventHandler.renderNav();
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
        adminSiteController.checkAuth(user.uid, adminSiteController.renderMain);
      } else {
        console.log(user.displayName, ' is still signed in');
      }
    } else {
      console.log('no user');
      adminSiteController.signIn();
      // No user is signed in.
    }
  });
  var provider = new firebase.auth.GoogleAuthProvider();
  // Sign in function for firebase
  adminSiteController.signIn = function signIn() {
    firebase.auth().signInWithRedirect(provider);
    firebase.auth().getRedirectResult().then(function () {
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

  adminSiteController.signOut = function() {
    firebase.auth().signOut();
  };

  $(document).ready(function () {
    $('#lookup-old-events-form').on('submit', eventHandler.lookupOldEvents);
    $('#lookup-old-state-events-form').on('submit', eventHandler.lookupOldStateEvents);

    $('.sort').on('click', 'a', eventHandler.sortTable);
    $('.filter').on('click', 'a', eventHandler.filterTable);
    $('#filter-info').on('click', 'button.btn', eventHandler.removeFilter);
    $('#signOut').on('click', adminSiteController.signOut);
    eventHandler.resetFilters();
    eventHandler.setupTypeaheads();
    if (location.hash) {
      $('a[href=\'' + location.hash + '\']').click();
    }
  });

  module.adminSiteController = adminSiteController;
})(window);
