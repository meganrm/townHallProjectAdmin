(function(module) {

    // example given for object we may want:
    // $mocID : {Town Hall : {$eventID: dateObj}, Tele-Town Hall : {$eventID: dateObj}}

    // TODO:

        // check stateName and state order

        // addGovTrackId -- figure out way to test

        ///////////// end of TODO
    

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

        // // look through MOC objects 
        firebase.database().ref('mocData/').once('value').then(function(snapshot) {
            snapshot.forEach(function(member) {
                console.log(member.val());
            })
        })

        firebase.database().ref('mocID/').once('value').then(function (snapshot) {
            snapshot.forEach(function(member) {
                console.log(member.key)
            })
        })

        // // Looking through townHallsOld
        firebase.database().ref('/townHallsOld/').once('value').then(function(snapshot) {
            snapshot.forEach(function(oldTownHall) {
                console.log(oldTownHall.val());
            })
        })

        firebase.database().ref('/townHallsOld/2017-3').once('value').then(function(snapshot) {
            snapshot.forEach(function(oldTownHall) {
                var town_hall = oldTownHall.val();
                console.log(town_hall);
            })
        })



        // write helper update function
        function updateObj(path, key, value) {
            firebase.database().ref(path).update({ key : value })
        }

        // helper get key by value
        // Object.prototype.getKeyByValue = function( value ) {
        //     for( var prop in this ) {
        //         if( this.hasOwnProperty( prop ) ) {
        //             if( this[ prop ] === value )
        //                 return prop;
        //         }
        //     }
        // }

        function getKeyByValue(object, value) {
            return Object.keys(object).find(key => object[key] === value);
        }

        // write helper function for matching
        // stateAb to stateName and vice versa

        function addGovTrackId(dateKey) {
            firebase.database().ref('townHallsOld/' + dateKey).once('value').then(function(snapshot) {
                snapshot.forEach(function(townHallOld) {
                    var townHall = townHallOld.val();
                    getMember(townHall.Member).then(function(govtrack_id) {
                        // set event govtrack_id to value
                        // firebase.database().ref(`/townHallsOld/${dateKey}/${townHallOld.key}`).update({ govtrack_id : govtrack_id });
                        
                        // with helper function
                        // updateObj(`/townHallsOld/${dateKey}/${townHallOld.key}`, govtrack_id, govtrack_id);
                        //console.log(govtrack_id);
                    })
                })
            })
        }

        // look at getMember function - townHall Submission
        getMember = function (displayName) {
            console.log(displayName);
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
                        console.log(snapshot.val());
                        reject('That member is not in our database, please check the spelling, and only use first and last name.')
                    }
                })
            })
        }

        // Update stateName for Member of Congress objects
        function stateNameMOC() {
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
                            console.log("stateName : " + stateName);
                        }
                    }
                    // once found, update firebase with stateName property of current full stateName
                    // firebase.database().ref('/mocData/' + pathkey).update({ stateName : stateName });
                })
            })
        }









        function updateOldData(oldValue, newValue) {
            //  dateKey
            var key;

            // for loop over all function for each date key
            for (var i = 0; i < dateKeys.length; i++) {
                key = dateKeys[i];
                firebase.database().ref('/townHallsOld/' + key).once('value').then(function(snapshot) {
                    snapshot.forEach(function(oldTownHall) {
                        if(oldTownHall.val()[oldValue]) {
                            currentValue = oldTownHall.val()[oldValue];
                            //newValueVar = window[newValue];
                            //var path = oldTownHall.val().eventId;
                            //firebase.database().ref('/townHallsOld/' + dateKey).update({ newValueVar: currentValue });
                            console.log(newValue + " : " + currentValue);
                        } else {
                            console.log("No " + oldValue + " property found.")
                        }
                    })
                })
            }
        }

        // update Party --> party property
        updateOldData("Party", "party");

        function updateDistrictData(oldValue, newValue) {
            //  path key
            var dateKey;

            // for loop over all function for each date key
            for (var i = 0; i < dateKeys.length; i++) {
                dateKey = dateKeys[i];
                firebase.database().ref('/townHallsOld/' + dateKey).once('value').then(function(snapshot) {
                    snapshot.forEach(function(oldTownHall) {
                        if(oldTownHall.val()[oldValue]) {
                            originalValue = oldTownHall.val()[oldValue];
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
                            } else {
                                console.log("not sure what to do - here is object 'District' value: " + originalValue);
                            }
                            //newValueVar = window[newValue];
                            //var path = oldTownHall.val().eventId;
                            //firebase.database().ref('/townHallsOld/' + dateKey).update({ newValueVar: currentValue });
                            console.log(newValue + " : " + updatedDistrict + " | was --> " + originalValue);
                        } else {
                            console.log("No " + oldValue + " property found.")
                        }
                    })
                })
            }            
        }

        // update District  --> district property
        updateDistrictData("District", "district");


        function updateStateNameData(oldValue, newValue) {
            //  dateKey
            var dateKey;


            // for loop over all function for each date key
            for (var i = 0; i < dateKeys.length; i++) {
                dateKey = dateKeys[i];
                firebase.database().ref('/townHallsOld/' + dateKey).once('value').then(function(snapshot) {
                    snapshot.forEach(function(oldTownHall) {
                        if(oldTownHall.val()[oldValue]) {
                            currentValue = oldTownHall.val()[oldValue];
                            var stateName;
                            if (currentValue.length == 2) {
                                // console.log("currentValue is 2 " + currentValue + " " + typeof currentValue);
                                // match abbr to state, set 
                                // stateName to value
                                // states abbr from object keys
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
                            //var path = oldTownHall.val().eventId;
                            //firebase.database().ref('/townHallsOld/' + dateKey).update({ newValueVar: currentValue });
                            console.log(newValue + " : " + stateName);
                        } else {
                            console.log("No " + oldValue + " property found.")
                        }
                    })
                })
            }
        }

        // update State --> stateName property 
        // I am getting some abbreviation values from this call
        updateStateNameData("State", "stateName");




        function updateStateAbbrOldData(oldValue, newValue) {
            //  dateKey
            var key;

            // for loop over all function for each date key
            for (var i = 0; i < dateKeys.length; i++) {
                key = dateKeys[i];
                firebase.database().ref('/townHallsOld/' + key).once('value').then(function(snapshot) {
                    snapshot.forEach(function(oldTownHall) {
                        var state;
                        var townHallObj = oldTownHall.val();
                        if (oldTownHall.val()[oldValue]) {
                            currentValue = oldTownHall.val()[oldValue];
                            if (currentValue.trim().length == 2) {
                                state = currentValue;
                            } 
                            if (currentValue.trim().length > 2) {
                                var state = getKeyByValue(statesAb, currentValue);
                            }
                        } else if (!oldTownHall.val()[oldValue] || oldTownHall.val()[oldValue].length > 2 && townHallObj.State) {
                                var currentStateValue = townHallObj.State;
                                // a few entries have { State: 'IL' } 
                                if (currentStateValue.length == 2) {
                                    state = currentValue;
                                } else {
                                    var state = getKeyByValue(statesAb, currentStateValue);
                                }
                        }
                        if (state) {
                            console.log(newValue + " : " + state);
                            //newValueVar = window[newValue];
                            //var path = oldTownHall.val().eventId;
                            //firebase.database().ref('/townHallsOld/' + dateKey).update({ newValueVar: currentValue });
                        } else {
                            console.log(oldTownHall.val());
                            console.log("could not find StateAb or State value for townhall object");
                        }
                    })
                })
            }
        }

        updateStateAbbrOldData("StateAb", "state"); 
    }
})();




##### finished #####
roybal-allard_lucille
carson_andre
markey_ed
mcgovern_jim
nolan_rick
walz_tim
carolshea-porter_rep
donaldnorcross_rep
smith_chris
burr,_richard
portman_rob
tiberi_pat
veasey_mark
cruz,_ted
brat_dave
velazquez_nydia
barragan_nanette
rubenkihuen_rep
loebsack_dave
suozzi_tom
serrano_jose
shaheen,_senator
cardin_ben
sanford_mark
cicillne_david
langevin_jim
johnsarbanes_rep
pearce_steve
ciciline_david
johnson_hank
gutierrez_luis
bacshon_larry
beyer_don
moultan_seth
durbin_dick
jameslagevin_representive
lagevin_james
schakowsky_jan
cartwright_matt
kennedyiii_joe
doyle_mike
lipinski_dan
reed_jack
heck_dennis
kaine_tim
enzi_mike
inhofe,_james
young_dave
roskam_pete
royce_ed
sinema_krysten
capuano_mike
bonamici_susan
graham_lindsay
grassley_charles // this should be the value in our db, no? we use chuck
labrador_raul
renacci_jim
toomey_pat
knight_stephen // we use steve
kuster_annie
johnson(wisconsin)_ron











--> skip there are 2 rubens
ruben_rep --> probably representative ruben

--> not sure there are lots of ann, anna, suzanna
ann_rep

--> can't find
rayluján_ben

--> not tom or thomas (there is a david price : price_david)
price_tom

-->there is bill shuster, but no 'brian shuster' shuster_bill
shuster_brian

--> cant find
lusk,_nancy

--> can't find
blarson_john

--> can't find
mclanekuster_ann

--> cant find
sanchez_linda

--> can't find
grijalva_raul

--> can't find
norman_ralph























Updates to 'townHallsOld/' 
-stateName
-state
-district
-party
-govtrack_id
-iconFlag (this is just added, values are not defined - I noticed that meetingType values didn't exactly match, so let me know how you would like them filled)

mocData/ updates
-stateName

For first pass, if you run this code you will get all the changes in the output of the console to double check, all of the actual update calls are commented out for now, so that I can incorporate any more changes before making the updated to firebase.