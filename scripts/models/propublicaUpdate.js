(function(module) {
    
    var states_obj = {
                    AL: "Alabama",
                    AK: "Alaska",
                    AS: "American Samoa",
                    AZ: "Arizona",
                    AR: "Arkansas",
                    CA: "California",
                    CO: "Colorado",
                    CT: "Connecticut",
                    DE: "Delaware",
                    DC: "District of Columbia",
                    FM: "Federated States of Micronesia",
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
    
    function Moc(govtrack_id, propublica_id, isCurrent, displayName, type, party, facebook, stateName) {
        this.govtrack_id  = govtrack_id;
        this.propublica_id = propublica_id;
        this.isCurrent = isCurrent;
        this.displayName = displayName;
        this.type = type;
        this.party = party;
        this.facebook = facebook;
        this.stateName = stateName;
    }

    function propublicaUpdate() {
        // api call to ProPublica (accepted parameters : 'senate' or 'house')
        function loadPropublicaData(hoc) {
            return new Promise(function(resolve, reject) {
                var xmlhttp = new XMLHttpRequest();

                xmlhttp.onreadystatechange = function() {
                    if (xmlhttp.readyState == XMLHttpRequest.DONE) {
                        if (xmlhttp.status == 200) {
                            var data = JSON.parse(xmlhttp.response);
                            var membersArray = data['results'][0]['members'];
                            resolve(membersArray);
                        }; 
                        xmlhttp.onerror = reject;
                    }
                };
                xmlhttp.open("GET", "https://api.propublica.org/congress/v1/115/" + hoc + "/members.json", true);
                xmlhttp.setRequestHeader("X-API-Key", "CGreQp3d95C4FLYHkCZRph5Hhs9nqfRCdJNlrxHL");
                xmlhttp.send();
            })
        }

        var type = "";
        // have to call propublica api twice (once for senators, once for representatives)
        loadPropublicaData("senate").then(function (value) {
            type = "sen";
            var senators = value;
            updateHocValues(senators, type);
        }).catch(function() {
            console.log("error with retrieving senator values");
        });

        loadPropublicaData("house").then(function (value) {
            type = "rep";
            var representatives = value;
            updateHocValues(representatives, type);
        }).catch(function() {
            console.log("error with retrieving representative values.");
        });

        function updateHocValues(hoc, type) {
            var currentHOC = hoc;
            currentHOC.forEach(function(propub_member) {
                // function returns propub_moc_obj
                var propub_moc_obj = buildUpdateObj(propub_member);
                // find match to mocData --> should return a 'mocData/' obj or nothing
                findMatch(propub_moc_obj).then(function(value) { 
                    var mocdata_match = value;
                    console.log("Values to update on existing member:")
                    // forEach property of propub_moc_obj
                    for (property in propub_moc_obj) {
                        if (!mocdata_match[property] || 
                            mocdata_match[property] !== propub_moc_obj[property] && propub_moc_obj[property] !== null)
                            console.log(property, " : ", propub_moc_obj[property])
                            // updateObj("mocData/" + mocdata_match.govtrack_id, property, propub_moc_obj[property]); 
                    }
                    console.log("---------------------");
                }).catch(function() {
                    console.log("Update Entire Object in 'mocData/': ", propub_moc_obj);
                    // make update call here
                });
            });
        }

        // find match between propublica and mocData
        function findMatch(pro_moc_obj) {
            var match = false;
            return new Promise(function(resolve, reject) {
                firebase.database().ref('/mocData/').once('value').then(function(snapshot) {
                    snapshot.forEach(function(moc) {
                        member = moc.val();
                        match = false;
                        if (member['govtrack_id'] == pro_moc_obj.govtrack_id) {
                            match = true;
                            resolve(member); 
                        } 
                    })
                    if (!match) {
                        reject();
                    }
                })
            })
        }

        function buildUpdateObj(propub_member) {
            //  property values
            propublica_govtrack = parseInt(propub_member.govtrack_id);
            propublica_id = propub_member.id;
            propub_isCurrent = propub_member.in_office;
            propub_display_name = propub_member.first_name + " " + propub_member.last_name;
            propub_type = type;
            propub_party = getParty(propub_member.party);
            propub_facebook = propub_member.facebook_account;
            propub_stateName = getValueByKey(states_obj, propub_member.state);

            // update moc obj
            var obj = new Moc(propublica_govtrack,
                                propublica_id, 
                                propub_isCurrent, 
                                propub_display_name,
                                propub_type, 
                                propub_party,
                                propub_facebook,
                                propub_stateName);
            return obj;
        }

        // update object
        function updateObj(path, key_val, val) {
            obj = {};
            obj[key_val] = val;
            firebase.database().ref(path).update(obj);
        }

        function getParty(current_party) {
            if (current_party == "R") {
                return "Republican";
            } else if (current_party == "D") {
                return "Democratic";
            } else if (current_party == "I") {
                return "Independent";
            }
        }

        // get object value from key
        function getValueByKey(object, key) {
            return Object.values(object).find(function (value) {
                return value === object[key];
            })
        }
        
    }

    propublicaUpdate();
})();