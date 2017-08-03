(function(module) {

    function helperFunctions() {

        // initialize dateKey array and state abbr --> name object vars
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

        // call functions to update data
        updateOldData("Party", "party"); 
        updateOldData("District", "district");
        updateOldData("StateAb", "state");    // order matters here --> stateAb function will look for 'State' value in order to get Abbr (call first)
        updateOldData("State", "stateName");
        // updateOldData("", "govTrack");
        stateNameMoc();
        

        function updateOldData(oldValue, newValue) {
            //  dateKey
            var dateKey;

            // for loop over each date key
            for (var i = 0; i < dateKeys.length; i++) {
                dateKey = dateKeys[i];
                firebase.database().ref('/townHallsOld/' + dateKey).once('value').then(function(snapshot) {
                    snapshot.forEach(function(oldTownHall) {
                        var townHallObj = oldTownHall.val();
                        // switch statement
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
                            case 'govTrack':
                                addGovTrackId(oldTownHall, townHallObj); // had parameter : dateKey
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

        function partyUpdate (oldValue, newValue, townHallObj) {

            if (townHallObj[oldValue]) {
                currentValue = townHallObj[oldValue];
                if (currentValue == "Democrat" || currentValue == "democrat") {
                    currentValue = "Democratic";
                }
                //newValueVar = window[newValue];
                //var path = townHallObj.eventId;
                // updateObj(`/townHallsOld/${dateKey}/${townHallOld.key}`, newValueVar, currentValue);
                console.log(newValue + " : " + currentValue);
            } else {
                console.log("No " + oldValue + " property found.")
            }
        }

        // fix undefined case
        function districtUpdate (oldValue, newValue, townHallObj) {

            if (townHallObj[oldValue]) {
                originalValue = townHallObj[oldValue];
                var updatedDistrict;
                if (originalValue.includes("-")) {
                    // get substring after and check for zero index
                    var dashLoc = originalValue.indexOf("-");
                    var strAfterDash = originalValue.substring(dashLoc + 1);
                    // make sure there is a zero in front (check length)
                    // this is for once object : district : 011 | was --> IL-011
                    if (strAfterDash.length == 1) {
                        updatedDistrict = "0" + strAfterDash;
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
                    //newValueVar = window[newValue];
                    //var path = townHallObj.eventId;
                    // updateObj(`/townHallsOld/${dateKey}/${townHallOld.key}`, newValueVar, updatedDistrict);
                } else {
                    console.log(townHallObj);
                    console.log("Not sure what to do. Here is object 'District' value: " + originalValue);
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
                    // set stateName to current Value
                    stateName = currentValue;
                }
                //newValueVar = window[newValue];
                //var path = townHallObj.eventId;
                // updateObj(`/townHallsOld/${dateKey}/${townHallOld.key}`, newValueVar, stateName);

                console.log(newValue + " : " + stateName);
            } else {
                console.log("No " + oldValue + " property found.")
            }
        }

        // a few entries have { State: 'IL' } 
        // doesn't account for "State" value of "New York"
        // "State : Georgia" "statesAb : Gainsville" ERROR
        function stateUpdate (oldValue, newValue, townHallObj) {
            var state;
            var currentValue;
            var stateCheck;

            // check if statesAb property 
            // is abbr. value of state
            // OR --> if statesAb value
            // is not null --> check that it is not
            // a full state name (in which case 
            // use getKeyByValue)

            if (townHallObj[oldValue]) {
                currentValue = townHallObj[oldValue];
                if (currentValue.trim().length == 2) {
                    state = currentValue;
                } 

                if (currentValue.trim().length > 2) {
                    // check if value is in statesAb object
                    // if so, get key to state value
                    stateCheck = getKeyByValue(statesAb, currentValue);
                    if (stateCheck !== null) {
                        state = stateCheck;
                    } else if (stateCheck == null || townHallObj.hastOwnProperty('State')) {
                        var statePropertyValue = townHallObj.State;
                        stateCheck = getKeyByValue(statesAb, statePropertyValue);
                        if (stateCheck !== null) {
                            state = stateCheck;
                        }
                    } else {
                        console.log("statesAb and State valid, but no matches");
                    }
                }
            } else if (state == null && !townHallObj[oldValue] || 
                       state == null && townHallObj[oldValue].length > 2 && townHallObj.State.trim().length > 2) {
                    // if statesAb is not there or stateAb property is larger than 2 and 'State'
                    // property exists --> 
                    // check if state prop is full state name (getkeybyvalue)
                    // or the abbreviation itself

                    currentStateValue = townHallObj.State;
                    if (currentStateValue.length == 2) {
                        state = currentStateValue;
                    } else { 
                        stateCheck = getKeyByValue(statesAb, currentStateValue);
                        if (stateCheck !== null) {
                            state = stateCheck;
                        }
                    }
            } else if (state == null && townHallObj.hastOwnProperty('State') && townHallObj.State.trim().length == 2) {
                    console.log(townHallObj.State + " HELLLOOOO");
                    state = townHallObj.State;
            }

            if (typeof state !== 'undefined') { 
                console.log(newValue + " : " + state);
                //newValueVar = window[newValue];
                //var path = townHallObj.eventId;
                // updateObj(`/townHallsOld/${dateKey}/${townHallOld.key}`, newValueVar, state);
            } else {
                console.log(townHallObj);
                console.log("Error finding a state Abbreviation from object (WIP) ");
            }
        }

        function addGovTrackId (oldTownHall, townHallObj) {
            var townHall = townHallObj;
            getMember(townHall.Member).then(function(govtrack_id) {
                console.log( "govtrack_id : " +  govtrack_id);
                // set event govtrack_id to value
                // updateObj(`/townHallsOld/${dateKey}/${townHallOld.key}`, govtrack_id, govtrack_id);
            })
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
            if (displayName.split(' ').length === 3) {
                memberKey = displayName.split(' ')[1].toLowerCase() + displayName.split(' ')[2].toLowerCase() + '_' + displayName.split(' ')[0].toLowerCase();
            } else {
                memberKey = displayName.split(' ')[1].toLowerCase() + '_' + displayName.split(' ')[0].toLowerCase();
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
        // townHallshold
        function updateObj(path, key, value) {
            firebase.database().ref(path).update({ key : value })
        }

        // get object key from value
        function getKeyByValue(object, value) {
            return Object.keys(object).find(function (key) {
                        return object[key] === value;
            });
        }

        // getValueByKey
        function getValueByKey(object, key) {
            return Object.values(object).find(function (value) {
                return value === object[key];
            })
        }

    }

})();