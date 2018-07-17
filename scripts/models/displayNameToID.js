(function(module) {

  var getGovtrackIDHandler = {};

  getGovtrackIDHandler.getIdFromName = function(displayName) {
    var memberKey;
    if (displayName == 'Schweikert') {
      displayName = 'david schweikert;'
    }

    var formatName = displayName.replace(
      /[^\w\sáúé-]|(rep)\s|(representative)\s|(senator)\s/gi, ''
    );

    if (formatName.split(" ").length === 3) {
      if (formatName.split(" ")[1].length === 1) {
        memberKey =
        formatName.split(" ")[2].toLowerCase() +
          "_" +
          formatName.split(" ")[0].toLowerCase();
      } else {
        memberKey =
        formatName.split(" ")[1].toLowerCase() +
        formatName.split(" ")[2].toLowerCase() +
          "_" +
          formatName.split(" ")[0].toLowerCase();
      }
    } else {
      memberKey =
      formatName.split(" ")[1].toLowerCase() +
        "_" +
        formatName.split(" ")[0].toLowerCase();
    }

    memberKey = memberKey.replace(/^[a-z]\./g, "");
    memberKey = memberKey.replace(/[,]+/g, "");
    memberKey = memberKey.replace(/\,(jr)\./g, "");
    memberKey = memberKey.replace(/(jr)/g, "");

    return new Promise(function(resolve, reject) {
      firebase
        .database()
        .ref("mocID/" + memberKey)
        .once("value")
        .then(function(snapshot) {
          if (snapshot.exists()) {
            resolve(snapshot.val().id);
          } else {
            reject(
              memberKey +
                " That member is not in our database, please check the spelling, and only use first and last name. "
                + displayName
            );
          }
        });
    });
  };

  module.getGovtrackIDHandler = getGovtrackIDHandler;
})(window);