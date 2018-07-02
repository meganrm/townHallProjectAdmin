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

    // *** also special cases with a number of names **
    switch (memberKey) {
      case "donaldmceachin_a":
        memberKey = "mceachin_donald";
        break;
      case "himes_jim":
        memberKey = "himes_james";
        break;
      case "roybal-allard_lucille":
        memberKey = "roybalallard_lucille";
        break;
      case "carson_andre":
        memberKey = "carson_andré";
        break;
      case "markey_ed":
        memberKey = "markey_edward";
        break;
      case "mcgovern_jim":
        memberKey = "mcgovern_james";
        break;
      case "nolan_rick":
        memberKey = "nolan_richard";
        break;
      case "walz_tim":
        memberKey = "walz_timothy";
        break;
      case "smith_chris":
        memberKey = "smith_christopher";
        break;
      case "portman_rob":
        memberKey = "portman_robert";
        break;
      case "tiberi_pat":
        memberKey = "tiberi_patrick";
        break;
      case "veasey_mark":
        memberKey = "veasey_marc";
        break;
      case "brat_dave":
        memberKey = "brat_david";
        break;
      case "velazquez_nydia":
        memberKey = "velázquez_nydia";
        break;
      case "barragn_nanette":
      case "barragan_nanette":
        memberKey = "barragán_nanette";
        break;
      case "rubenkihuen_rep":
        memberKey = "kihuen_ruben";
        break;
      case "loebsack_dave":
        memberKey = "loebsack_david";
        break;
      case "suozzi_tom":
        memberKey = "suozzi_thomas";
        break;
      case "serrano_jose":
        memberKey = "serrano_josé";
        break;
      case "cardin_ben":
        memberKey = "cardin_benjamin";
        break;
      case "sanford_mark":
        memberKey = "sanford_marshall";
        break;
      case "ciciline_david":
      case "cicillne_david":
        memberKey = "cicilline_david";
        break;
      case "lagevin_james":
      case "jameslagevin_representive":
      case "langevin_jim":
        memberKey = "langevin_james";
        break;
      case "pearce_steve":
        memberKey = "pearce_stevan";
        break;
      case "johnson_hank":
        memberKey = "johnson_henry";
        break;
      case "gutierrez_luiz":
      case "gutierrez_luis":
        memberKey = "gutiérrez_luis";
        break;
      case "bacshon_larry":
        memberKey = "bucshon_larry";
        break;
      case "beyer_don":
        memberKey = "beyer_donald";
        break;
      case "manchiniii_joe":
        memberKey = "manchin_joe";
        break;
      case "moultan_seth":
        memberKey = "moulton_seth";
        break;
      case "durbin_dick":
        memberKey = "durbin_richard";
        break;
      case "schakowsky_jan":
        memberKey = "schakowsky_janice";
        break;
      case "cartwright_matt":
        memberKey = "cartwright_matthew";
        break;
      case "kennedyiii_joe":
        memberKey = "kennedy_joe";
        break;
      case "doyle_mike":
        memberKey = "doyle_michael";
        break;
      case "lipinski_dan":
        memberKey = "lipinski_daniel";
        break;
      case "reed_jack":
        memberKey = "reed_john";
        break;
      case "heck_dennis":
        memberKey = "heck_denny";
        break;
      case "kaine_tim":
        memberKey = "kaine_timothy";
        break;
      case "enzi_mike":
        memberKey = "enzi_michael";
        break;
      case "young_dave":
        memberKey = "young_david";
        break;
      case "roskam_pete":
        memberKey = "roskam_peter";
        break;
      case "royce_ed":
        memberKey = "royce_edward";
        break;
      case "moorecaptio_shelley":
      case "moorecapito_shelley":
      case "moorecapito_shelly":
        memberKey = "capito_shelley";
        break;
      case "sinema_krysten":
        memberKey = "sinema_kyrsten";
        break;
      case "capuano_mike":
        memberKey = "capuano_michael";
        break;
      case "rooney_tom":
        memberKey = "rooney_thomas";
        break;
      case "bonamici_susan":
        memberKey = "bonamici_suzanne";
        break;
      case "crawford_rick":
        memberKey = "crawford_eric";
        break;
      case "graham_lindsay":
        memberKey = "graham_lindsey";
        break;
      case "wittman_rob":
        memberKey = "wittman_robert";
        break;
      case "grassley_charles":
        memberKey = "grassley_chuck";
        break;
      case "labrador_raul":
        memberKey = "labrador_raúl";
        break;
      case "esty_elzabeth":
        memberKey = "esty_elizabeth";
        break;
      case "davisillinois_rodney":
        memberKey = "davis_rodney";
        break;
      case "renacci_jim":
        memberKey = "renacci_james";
        break;
      case "toomey_pat":
        memberKey = "toomey_patrick";
        break;
      case "knight_stephen":
        memberKey = "knight_steve";
        break;
      case "mclanekuster_ann":
      case 'ann_rep':
      case "kuster_annie":
        memberKey = "kuster_ann";
        break;
      case "johnsonwisconsin_ron":
        memberKey = "johnson_ron";
        break;
      case "raylujan_ben":
      case "rayluján_ben":
        memberKey = "luján_ben";
        break;
      case "patrickmaloney_sean":
        memberKey = "maloney_sean";
        break;
      case "jontester_senator":
        memberKey = "tester_jon";
        break;
      case "scottgeorgia_david":
        memberKey = "scott_david";
        break;
      case "isakson_johnny":
        memberKey = "isakson_john";
        break;
      case "franken_al":
        memberKey = "franken_alan";
        break;
      case "pittenger_richard":
        memberKey = "pittenger_robert";
        break;
      case "holmesnorton_eleanor":
        memberKey = "norton_eleanor";
        break;
      case "grijalva_raul":
        memberKey = "grijalva_raúl";
        break;
      case "sanchez_linda":
        memberKey = "sánchez_linda";
        break;
      case "ebholding_george":
        memberKey = "holding_george";
        break;
      case "crdenas_tony":
        memberKey = "cárdenas_tony";
        break;
      case 'norman_ralph':
        memberKey = 'abraham_ralph';
        break;
      default:
        // not a special case
        break;
    }

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