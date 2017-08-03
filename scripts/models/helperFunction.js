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
        // updateOldData("", "govTrack");
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

        //////// specific update functions ////////

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

            } else {
                console.log("Could not get state abbr. value from object");
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