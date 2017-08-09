(function(module) {

    function helperFunctions() {

        //// Initialize variables ////
        var dateKeys = ['2016-4', '2017-0', '2017-1', '2017-2', '2017-3', '2017-4', '2017-5', '2017-6'];

        var statesAb = {
                        AL: "Alabama",
                        AK: "Alaska",
                        AS: "American Samoa",
                        AZ: "Arizona",
                        AR: "Arkansas",
                        CA: "California",
                        CO: "Colorado",
                        CT: "Connecticut",
                        DE: "Delaware",
                        DC: "District Of Columbia",
                        FM: "Federated States Of Micronesia",
                        FL: "Florida",
                        GA: "Georgia",
                        GU: "Guam",
                        HI: "Hawaii",
                        ID: "Idaho",
                        IL: "Illinois",
                        IN: "Indiana",
                        IA: "Iowa",
                        KS: "Kansas",
                        KY: "Kentucky",
                        LA: "Louisiana",
                        ME: "Maine",
                        MH: "Marshall Islands",
                        MD: "Maryland",
                        MA: "Massachusetts",
                        MI: "Michigan",
                        MN: "Minnesota",
                        MS: "Mississippi",
                        MO: "Missouri",
                        MT: "Montana",
                        NE: "Nebraska",
                        NV: "Nevada",
                        NH: "New Hampshire",
                        NJ: "New Jersey",
                        NM: "New Mexico",
                        NY: "New York",
                        NC: "North Carolina",
                        ND: "North Dakota",
                        MP: "Northern Mariana Islands",
                        OH: "Ohio",
                        OK: "Oklahoma",
                        OR: "Oregon",
                        PW: "Palau",
                        PA: "Pennsylvania",
                        PR: "Puerto Rico",
                        RI: "Rhode Island",
                        SC: "South Carolina",
                        SD: "South Dakota",
                        TN: "Tennessee",
                        TX: "Texas",
                        UT: "Utah",
                        VT: "Vermont",
                        VI: "Virgin Islands",
                        VA: "Virginia",
                        WA: "Washington",
                        WV: "West Virginia",
                        WI: "Wisconsin",
                        WY: "Wyoming"
        }

        //////// call functions to update data //////

        updateOldData("Party", "party"); 
        updateOldData("District", "district");
        updateOldData("StateAb", "state");    // order matters here --> stateAb function will look for 'State' value in order to get Abbr (call first)
        updateOldData("State", "stateName");
        updateOldData("", "govTrack");
        updateOldData("", "iconFlag");
        stateNameMoc();
        
        //////// general update function //////

        // [default : will update old value with new value]
        function updateOldData(oldValue, newValue) {
            var dateKey;

            // loop over each date key
            for (var i = 0; i < dateKeys.length; i++) {
                dateKey = dateKeys[i];
                firebase.database().ref('/townHallsOld/' + dateKey).once('value').then(function(snapshot) {
                    snapshot.forEach(function(oldTownHall) {
                        var townHallObj = oldTownHall.val();
                        switch(newValue){
                            case 'party':
                                partyUpdate(oldValue, newValue, townHallObj);
                                break;
                            case 'district':
                                districtUpdate(oldValue, newValue, townHallObj);
                                break;
                            case 'stateName': // check order of updating stateName and state --> may change results
                                stateNameUpdate(oldValue, newValue, townHallObj);
                                break;
                            case 'state':
                                stateUpdate(oldValue, newValue, townHallObj);
                                break;
                            case 'iconFlag':
                                iconFlagUpdate(townHallObj);
                                break;
                            case 'govTrack':
                                addGovTrackId(townHallObj); // had parameter : dateKey
                                break;
                            default:
                                if(townHallObj[oldValue]) {
                                    currentValue = townHallObj[oldValue];
                                    //newValueVar = window[newValue];
                                    //var path = townHallObj.eventId;
                                    // updateObj(`/townHallsOld/${dateKey}/${townHallOld.key}`, newValueVar, currentValue);
                                    console.log(newValue + " : " + currentValue);
                                } else {
                                    console.log("No " + oldValue + " property found.")
                                }
                        } 
                    })
                })
            }
        }

        //////// specific update functions ////////

        function partyUpdate (oldValue, newValue, townHallObj) {
            if (townHallObj[oldValue]) {
                party = townHallObj[oldValue];
                if (party == "Democrat" || party == "democrat") {
                    party = "Democratic";
                }
                // updateObj(`/townHallsOld/${dateKey}/${townHallOld.key}`, 'party', party);
                console.log(newValue + " : " + party);
            } else {
                console.log("No " + oldValue + " property found.")
            }
        }
        
        function districtUpdate (oldValue, newValue, townHallObj) {
            if (townHallObj[oldValue]) {
                originalValue = townHallObj[oldValue];
                var updatedDistrict;
                if (originalValue.includes("-")) {
                    // get substring after and check for zero index
                    var dashLoc = originalValue.indexOf("-");
                    var strAfterDash = originalValue.substring(dashLoc + 1);
                    if (strAfterDash.length == 1) {
                        updatedDistrict = "0" + strAfterDash;
                    } else if (strAfterDash.length == 3) { // check for this object --> district : 011 | was --> IL-011
                        updatedDistrict = strAfterDash.substring(1);
                    } else {
                        updatedDistrict = strAfterDash;
                    }
                } else if (originalValue.length == 1) {
                    // add zero to front and set updatedDistrict
                    updatedDistrict = "0" + originalValue;
                } else if (originalValue.length == 2 && !isNaN(originalValue)) {
                    // set originalValue to updatedDistrict
                    updatedDistrict = originalValue;
                } 
                
                if (updatedDistrict) {
                    console.log(newValue + " : " + updatedDistrict);
                    // updateObj(`/townHallsOld/${dateKey}/${townHallObj.key}`, 'district', updatedDistrict);
                } else {
                    // console.log(townHallObj);
                    updatedDistrict = '--';
                    console.log("district : " + updatedDistrict);
                    // console.log("Not sure what to do. Here is object 'District' value: " + originalValue);
                    // updateObj(`/townHallsOld/${dateKey}/${townHallObj.key}`, 'district', updatedDistrict);
                }
            } else {
                console.log("No " + oldValue + " property found | was --> " + originalValue)
            }
        }

        function stateNameUpdate (oldValue, newValue, townHallObj) {
            if (townHallObj[oldValue]) {
                currentValue = townHallObj[oldValue];
                var stateName;
                if (currentValue.length == 2) {
                    var stateKeys = Object.keys(statesAb);

                    // compare current state Abbr with keys - 
                    // set stateName to match value associated with key
                    for (var i = 0; i < stateKeys.length; i++) {
                        if (currentValue == stateKeys[i]) {
                            stateName = statesAb[stateKeys[i]];
                        }
                    }
                } else {
                    stateName = currentValue;
                }
                // updateObj(`/townHallsOld/${dateKey}/${townHallObj.key}`, 'stateName', stateName);
                console.log(newValue + " : " + stateName);
            } else {
                console.log("No " + oldValue + " property found.")
            }
        }

        function stateUpdate (oldValue, newValue, townHallObj) {
            var state;
            var currentValue;
            var stateCheck;

            if (townHallObj[oldValue] || !townHallObj[oldValue] && townHallObj.hasOwnProperty('State')) {

                if (typeof townHallObj[oldValue] !== 'undefined') {
                    currentValue = townHallObj[oldValue];
                } else {
                    currentValue = townHallObj['State'];
                }
                
                // if 2 char - set as state
                if (currentValue.trim().length == 2) {
                    state = currentValue;
                } 

                // if full name of state - getKeyByValue
                if (currentValue.length > 2) {
                    stateCheck = getKeyByValue(statesAb, currentValue);
                    if (typeof stateCheck !== 'undefined') {
                        state = stateCheck;
                    }
                } 
                
                if (typeof state !== 'undefined') {
                    console.log("state : " + state);
                }
                // update state
                // updateObj(`/townHallsOld/${dateKey}/${townHallObj.key}`, 'state' , state);

            } else {
                console.log("Could not get state abbr. value from object");
            }
            
        }

        function iconFlagUpdate(townHallObj) {
            var iconFlag;
            console.log("{ iconFlag : " + iconFlag + " }")
            // updateObj(`/townHallsOld/${dateKey}/${townHallObj.key}`, 'iconFlag', iconFlag);
        }

        function addGovTrackId (townHallObj) {
            if (typeof townHallObj.Member !== 'undefined') {
                getMember(townHallObj.Member).then(function(govtrack_id) {
                    console.log( "govtrack_id : " +  govtrack_id);
                    // set event govtrack_id to value
                    // updateObj(`/townHallsOld/${dateKey}/${townHallOld.key}`, govtrack_id, govtrack_id);
                })
            } else {
                console.log("townHallObj.Member is undefined")
            }
        }

        // Update stateName for Member of Congress objects
        function stateNameMoc () {
            firebase.database().ref('/mocData/').once('value').then(function(snapshot) {
                snapshot.forEach(function(member) {
                    // stateName
                    var stateName;

                    // get path key 
                    var pathKey = member.govtrack_id;

                    // get member stateAbbr value
                    var currentAbbrState = member.val().state;

                    // states abbr from object keys
                    var keys = Object.keys(statesAb);

                    // compare current state Abbr with keys - 
                    // set stateName to match value associated with key
                    for (var i = 0; i < keys.length; i++) {
                        if (currentAbbrState == keys[i]) {
                            stateName = statesAb[keys[i]];
                            console.log("stateName for MOC : " + stateName);
                        }
                    }
                    // once found, update firebase with stateName property of current full stateName
                    // firebase.database().ref('/mocData/' + pathkey).update({ stateName : stateName });
                    // updateObj(`/mocData/${dateKey}/${pathKey}`, stateName, stateName);
                })
            })
        }

        //////// Helper Functions ////////

        // getMember 
        getMember = function (displayName) {
            var memberKey;

            // if undefined?
            // if (typeof memberKey == undefined) {
            //     console.log("Town hall Member undefined");
            //     return;
            // } 

            if (displayName.split(' ').length === 3) {
                memberKey = displayName.split(' ')[1].toLowerCase() + displayName.split(' ')[2].toLowerCase() + '_' + displayName.split(' ')[0].toLowerCase();
            } else {
                memberKey = displayName.split(' ')[1].toLowerCase() + '_' + displayName.split(' ')[0].toLowerCase();
            }
            // write filter for names formatted like this:
            // e.clyburn_james
            if (memberKey.charAt(1) == '.') {
                memberKey = memberKey.substring(2);
            }

            // *** also special cases with a number of names **
            // ex. 
            // donaldmceachin_a. --> mceachin_donald
            // caseyjr,_bob      --> casey_bob
            // butterfield_g.k.  --> butterfield_gk 
            switch(memberKey) {
                case 'donaldmceachin_a.':
                    memberKey = 'mceachin_donald';
                    break;
                case 'casey,jr._bob':
                    memberKey = 'casey_bob';
                    break;
                case 'comerjr._james':
                    memberKey = 'comer_james';
                    break;
                case 'butterfield_g.k.':
                    memberKey = 'butterfield_gk ';
                    break;
                case 'himes_jim':
                    memberKey = 'himes_james';
                    break;
                case 'roybal-allard_lucille':
                    memberKey = 'roybalallard_lucille';
                    break;
                case 'carson_andre':
                    memberKey = 'carson_andré';
                    break;
                case 'markey_ed':
                    memberKey = 'markey_edward';
                    break;
                case 'mcgovern_jim':
                    memberKey = 'mcgovern_james';
                    break;
                case 'nolan_rick':
                    memberKey = 'nolan_richard';
                    break;
                case 'walz_tim':
                    memberKey = 'walz_timothy';
                    break;
                case 'carolshea-porter_rep':
                    memberKey = 'sheaporter_carol';
                    break;
                case 'donaldnorcross_rep':
                    memberKey = 'norcross_donald';
                    break;
                case 'smith_chris':
                    memberKey = 'smith_christopher';
                    break;
                case 'burr,_richard':
                    memberKey = 'burr_richard';
                    break;
                case 'portman_rob':
                    memberKey = 'portman_robert';
                    break;
                case 'tiberi_pat':
                    memberKey = 'tiberi_patrick';
                    break;
                case 'veasey_mark':
                    memberKey = 'veasey_marc';
                    break;
                case 'cruz,_ted':
                    memberKey = 'cruz_ted';
                    break;
                case 'brat_dave':
                    memberKey = 'brat_david';
                    break;
                case 'velazquez_nydia':
                    memberKey = 'velázquez_nydia';
                    break;
                case 'barragan_nanette':
                    memberKey = 'barragán_nanette';
                    break;
                case 'rubenkihuen_rep':
                    memberKey = 'kihuen_ruben';
                    break;
                case 'loebsack_dave':
                    memberKey = 'loebsack_david';
                    break;
                case 'suozzi_tom':
                    memberKey = 'suozzi_thomas';
                    break;
                case 'serrano_jose':
                    memberKey = 'serrano_josé';
                    break;
                case 'shaheen,_senator':
                    memberKey = 'shaheen_jeanne';
                    break;
                case 'cardin_ben':
                    memberKey = 'cardin_benjamin';
                    break;
                case 'sanford_mark':
                    memberKey = 'sanford_marshall';
                    break;
                case 'ciciline_david':
                case 'cicillne_david':
                    memberKey = 'cicilline_david';
                    break;
                case 'lagevin_james':
                case 'jameslagevin_representive':
                case 'langevin_jim':
                    memberKey = 'langevin_james';
                    break;
                case 'johnsarbanes_rep':
                    memberKey = 'sarbanes_john';
                    break;
                case 'pearce_steve':
                    memberKey = 'pearce_stevan';
                    break;
                case 'johnson_hank':
                    memberKey = 'johnson_henry';
                    break;
                case 'gutierrez_luis':
                    memberKey = 'gutiérrez_luis';
                    break;
                case 'bacshon_larry':
                    memberKey = 'bucshon_larry';
                    break;
                case 'beyer_don':
                    memberKey = 'beyer_donald';
                    break;
                case 'manchiniii_joe':          // the Joe Manchin III
                    memberKey = 'manchin_joe';
                    break;
                case 'moultan_seth':
                    memberKey = 'moulton_seth';
                    break;
                case 'durbin_dick':
                    memberKey = 'durbin_richard';
                    break;
                case 'schakowsky_jan':
                    memberKey = 'schakowsky_janice';
                    break;
                case 'cartwright_matt':
                    memberKey = 'cartwright_matthew';
                    break;
                case 'kennedyiii_joe':
                    memberKey = 'kennedy_joe';
                    break;
                case 'doyle_mike':
                    memberKey = 'doyle_michael';
                    break;
                case 'lipinski_dan':
                    memberKey = 'lipinski_daniel';
                    break;
                case 'reed_jack':
                    memberKey = 'reed_john';
                    break;
                case 'heck_dennis':
                    memberKey = 'heck_denny';
                    break;
                case 'kaine_tim':
                    memberKey = 'kaine_timothy';
                    break;
                case 'enzi_mike':
                    memberKey = 'enzi_michael';
                    break;
                case 'inhofe,_james':
                    memberKey = 'inhofe_james';
                    break;
                case 'young_dave':
                    memberKey = 'young_david';
                    break;
                case 'roskam_pete':
                    memberKey = 'roskam_peter';
                    break;
                case 'royce_ed':
                    memberKey = 'royce_edward';
                    break;
                case 'moorecapito_shelley':
                case 'moorecapito_shelly':
                    memberKey = 'capito_shelley';
                    break;
                case 'sinema_krysten':
                    memberKey = 'sinema_kyrsten';
                    break;
                case 'mcconnell,_mitch':
                    memberKey = 'mcconnell_mitch';
                    break;
                case 'capuano_mike':
                    memberKey = 'capuano_michael';
                    break;
                case 'rooney_tom':
                    memberKey = 'rooney_thomas';
                    break;
                case 'bonamici_susan':
                    memberKey = 'bonamici_suzanne';
                    break;
                case 'cburgess_michael':
                    memberKey = 'burgess_michael';
                    break;
                case 'crawford_rick':
                    memberKey = 'crawford_eric';
                    break;
                case 'graham_lindsay':
                    memberKey = 'graham_lindsey';
                    break;
                case 'wittman_rob':
                    memberKey = 'wittman_robert';
                    break;
                case 'grassley_charles':
                    memberKey = 'grassley_chuck';
                    break;
                case 'labrador_raul':
                    memberKey = 'labrador_raúl';
                    break;
                case 'esty_elzabeth':
                    memberKey = 'esty_elizabeth';
                    break;
                case 'davis(illinois)_rodney':
                    memberKey = 'davis_rodney';
                    break;
                case 'renacci_jim':
                    memberKey = 'renacci_james';
                    break;
                case 'toomey_pat':
                    memberKey = 'toomey_patrick';
                    break;
                case 'knight_stephen':
                    memberKey = 'knight_steve';
                    break;
                case 'kuster_annie':
                    memberKey = 'kuster_ann';
                    break;
                case 'johnson(wisconsin)_ron':
                    memberKey = 'johnson_ron';
                    break;
                default:
                    // figure out default
                    break;
            }

            return new Promise(function(resolve, reject) {
                firebase.database().ref('mocID/' + memberKey).once('value').then(function (snapshot) {
                    if (snapshot.exists()) {
                        resolve(snapshot.val().id)
                    } else {
                        reject('That member is not in our database, please check the spelling, and only use first and last name.')
                    }
                })
            })
        }

        // update object
        function updateObj(path, key, value) {
            firebase.database().ref(path).update({ key : value })
        }

        // get object key from value
        function getKeyByValue(object, value) {
            return Object.keys(object).find(function (key) {
                        return object[key] === value;
            });
        }

        // get object value from key
        function getValueByKey(object, key) {
            return Object.values(object).find(function (value) {
                return value === object[key];
            })
        }

    }

    helperFunctions();
    
})();