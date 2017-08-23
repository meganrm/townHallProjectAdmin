(function(module) {
    helperFunctions = {};
  
    // To call:
    // helperFunctions.updateOldData("", "");
    // helperFunctions.updateOldData("", "", "2017-3"); // with a date parameter
    //
    // params: ("Party", "party");
    //         ("District", "district");
    //         ("StateAb", "state");
    //         ("State", "stateName");
    //         ("Date", "dateString");
    //         ("", "govTrack");
    //         ("", "iconFlag");
    //
    // Also, to update MOC obj stateName:
    // helperFunctions.stateNameMoc();
  
    //////// general update function //////
  
    // [default : will update old value with new value]
    helperFunctions.updateOldData = function updateOldData(
      oldValue,
      newValue,
      dateParam
    ) {
      var date_key;
      var date_list;
      if (dateParam) {
        date_list = [dateParam];
      } else {
        date_list = [
          "2016-4",
          "2017-0",
          "2017-1",
          "2017-2",
          "2017-3",
          "2017-4",
          "2017-5",
          "2017-6",
          "2017-7",
          "noDate"
        ];
      }
  
      // loop over each date key
      for (var i = 0; i < date_list.length; i++) {
        let date_key = date_list[i];
        console.log(date_key);
        firebase
          .database()
          .ref("/townHallsOld/" + date_key)
          .once("value")
          .then(function(snapshot) {
            snapshot.forEach(function(oldTownHall) {
              var townHallObj = oldTownHall.val();
              switch (newValue) {
                case "party":
                  partyUpdate(townHallObj, oldTownHall.key, date_key);
                  break;
                case "district":
                  //working
                  districtUpdate(townHallObj, oldTownHall.key, date_key);
                  break;
                case "stateName": // check order of updating stateName and state --> may change results
                  //move what was State to be stateName
                  stateNameUpdate(townHallObj, oldTownHall.key, date_key);
                  break;
                case "state":
                  //make abbrivatation
                  stateUpdate(townHallObj, oldTownHall.key, date_key);
                  break;
                case "iconFlag":
                  iconFlagUpdate(townHallObj, oldTownHall.key, date_key);
                  break;
                case "govTrack":
                  addGovTrackId(townHallObj, oldTownHall.key, date_key); // had parameter : date_key
                  break;
                default:
                  if (townHallObj[oldValue]) {
                    currentValue = townHallObj[oldValue];
                    updateObj(
                      `/townHallsOld/${date_key}/${oldTownHall.key}`,
                      newValue,
                      currentValue
                    );
                  } else {
                    console.log("No " + oldValue + " property found.");
                  }
              }
            });
          });
      }
    };
  
    //////// specific update functions ////////
  
    function partyUpdate(townHallObj, key, date_key) {
      var oldValue = "Party";
      var newValue = "party";
  
      if (townHallObj[oldValue]) {
        party = townHallObj[oldValue];
        if (party == "Democrat" || party == "democrat") {
          party = "Democratic";
        }
        updateObj(`/townHallsOld/${date_key}/${key}`, "party", party);
      } else {
        console.log("No " + oldValue + " property found.");
      }
    }
  
    function districtUpdate(townHallObj, key, date_key) {
      var oldValue = "District";
      var newValue = "district";
      if (townHallObj.district) {
        return;
      }
      if (townHallObj[oldValue]) {
        originalValue = townHallObj[oldValue];
        if (originalValue == "Senate") {
          return;
        }
        var updatedDistrict;
        var districtList = originalValue.split("-");
        if (districtList.length > 1) {
          districtNo = Number(districtList[1]);
        } else {
          districtNo = townHallObj.District;
        }
        zeropadding = "00";
        districtString = districtNo.toString();
        if (isNaN(districtString)) {
          console.log(townHallObj.District, "NaN", key, date_key);
        } else {
          updatedDistrict =
            zeropadding.slice(0, zeropadding.length - districtString.length) +
            districtString;
        }
  
        if (updatedDistrict) {
          updateObj(`/townHallsOld/${date_key}/${key}`, 'district', updatedDistrict);
        } else {
          console.log("no district : " + townHallObj.eventId, key, date_key);
        }
      } else {
        console.log(townHallObj.District, key, townHallObj.eventId, date_key);
      }
    }
  
    function stateNameUpdate(townHallObj, key, date_key) {
      // 9 values return no property found (info is logged)
      var oldValue = "State";
      var newValue = "stateName";
  
      // old value is State new value is stateName, should be the same except in a few cases.
      if (townHallObj[oldValue]) {
        currentValue = townHallObj[oldValue];
  
        var stateName;
        if (currentValue.length === 2) {
          // current version is abbr already
          stateName = statesAb[currentValue]; // what is happening to this value?? stateKeys??
        } else {
          stateName = currentValue;
        }
        updateObj(`/townHallsOld/${date_key}/${key}`, "stateName", stateName);
        // console.log(newValue + " : " + stateName);
      }
  
      if (!townHallObj[oldValue]) {
        console.log(
          "No " + oldValue + " property found. " + date_key + " " + key
        );
      }
    }
  
    function stateUpdate(townHallObj, key, date_key) {
      var oldValue = "StateAb";
      var newValue = "state";
      // old value probably doesn't exist, but checking,
      // old value is StateAb new value is state
      var state;
      var currentValue;
      var stateCheck;
  
      if (
        townHallObj[oldValue] &&
        townHallObj[oldValue].length == 2 &&
        typeof townHallObj[oldValue] !== "undefined"
      ) {
        // if StateAb is there, use it
        // done
        state = townHallObj[oldValue];
      } else {
        currentValue = townHallObj["State"].trim(); // assuming 'State' property exists
      }
      if (typeof currentValue !== "undefined") {
        // if 2 char - set as state
        if (currentValue.trim().length === 2) {
          //done
          state = currentValue;
        } else if (currentValue.length > 2) {
          stateCheck = getKeyByValue(statesAb, currentValue);
          if (typeof stateCheck !== "undefined") {
            state = stateCheck;
          }
        }
      }
      if (state) {
        if (state.length > 2) {
          console.log(townHallObj);
        }
        // update state
        updateObj(`/townHallsOld/${date_key}/${key}`, "state", state);
      } else {
        console.log('no "state" value defined');
        console.log(townHallObj);
      }
    }
  
    function iconFlagUpdate(townHallObj, key, date_key) {
      var iconFlag;
      console.log("{ iconFlag : " + iconFlag + " }");
      updateObj(`/townHallsOld/${date_key}/${key}`, "iconFlag", iconFlag);
    }
  
    function addGovTrackId(townHallObj, key, date_key) {
      if (typeof townHallObj.Member !== "undefined") {
        getMember(townHallObj.Member)
          .then(function(govtrack_id) {
            // console.log( "govtrack_id : " +  govtrack_id);
            // set event govtrack_id to value
            updateObj(
              `/townHallsOld/${date_key}/${key}`,
              'govtrack_id',
              govtrack_id
            );
          })
          .catch(function(error) {
            console.log(error, "could not get name");
          });
      } else {
        console.log("townHallObj.Member is undefined");
      }
    }
  
    // Update stateName for Member of Congress objects
    helperFunctions.stateNameMoc = function() {
      firebase.database().ref("/mocData/").once("value").then(function(snapshot) {
        snapshot.forEach(function(member) {
          // stateName
          var stateName;
  
          // get path key
          var path_key = member.govtrack_id;
  
          // get member stateAbbr value
          var currentAbbrState = member.val().state;
  
          // states abbr from object keys
          stateName = statesAb[currentAbbrState];
  
          // once found, update firebase with stateName property of current full stateName
          // firebase.database().ref('/mocData/' + path_key).update({ stateName : stateName });
          updateObj(`/mocData/${path_key}`, "stateName", stateName);
        });
      });
    };
  
    //////// Helper Functions ////////
  
    // getMember
    getMember = function(displayName) {
      var memberKey;
  
      if (displayName.split(" ").length === 3) {
        memberKey =
          displayName.split(" ")[1].toLowerCase() +
          displayName.split(" ")[2].toLowerCase() +
          "_" +
          displayName.split(" ")[0].toLowerCase();
      } else {
        memberKey =
          displayName.split(" ")[1].toLowerCase() +
          "_" +
          displayName.split(" ")[0].toLowerCase();
      }
  
      if ((/^[a-z]\.(.+)\_(.+)/g).test(memberKey)) { // (e.clyburn_james)
        memberKey = memberKey.replace(/^[a-z]\./g, "");
      } else if ((/(.+)\,\_(.+)/g).test(memberKey)) { // (burr,_richard)
        memberKey = memberKey.replace(/[,]+/g, "");
      } else if ((/(.+)\,(jr)\.\_(.+)/g).test(memberKey)) { // (casey,jr.bob)
        memberKey = memberKey.replace(/\,(jr)\./g, "");
      }
  
  
      // *** also special cases with a number of names **
      switch (memberKey) {
        case "donaldmceachin_a.":
          memberKey = "mceachin_donald";
          break;
        case "comerjr._james":
          memberKey = "comer_james";
          break;
        case "butterfield_g.k.":
          memberKey = "butterfield_gk";
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
        case "carolshea-porter_rep":
          memberKey = "sheaporter_carol";
          break;
        case "donaldnorcross_rep":
          memberKey = "norcross_donald";
          break;
        case "smith_chris":
          memberKey = "smith_christopher";
          break;
        case "burr,_richard":
          memberKey = "burr_richard";
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
        case 'shaheen_senator':
        case "shaheen,_senator":
          memberKey = "shaheen_jeanne";
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
        case "johnsarbanes_rep":
          memberKey = "sarbanes_john";
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
        case "cburgess_michael":
          memberKey = "burgess_michael";
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
        case "davis(illinois)_rodney":
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
        case "kuster_annie":
          memberKey = "kuster_ann";
          break;
        case "johnson(wisconsin)_ron":
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
        case "scott(georgia)_david":
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
        case "b.holding_george":  
          memberKey = "holding_george";
          break;
        default:
          // not a special case
          break;
      }
  
      // still missing:
      // price_tom
      // shuster_brian
      // lusk,_nancy
      // blarson_john
      // ruben_rep
      // ann_rep
      // norman_ralph
      // Schweikert
  
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
                  " That member is not in our database, please check the spelling, and only use first and last name."
              );
            }
          });
      });
    };
  
    // update object
    function updateObj(path, key_val, val) {
      obj = {};
      obj[key_val] = val;
      console.log(obj);
      // uncomment to run
      // firebase.database().ref(path).update(obj);
    }
  
    // get object key from value
    function getKeyByValue(object, value) {
      return Object.keys(object).find(function(key) {
        return object[key] === value;
      });
    }
  
    // get object value from key
    function getValueByKey(object, key) {
      return Object.values(object).find(function(value) {
        return value === object[key];
      });
    }
  
    module.helperFunctions = helperFunctions;
  })(window);
  