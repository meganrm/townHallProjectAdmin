// update 'mocData/' 
// if member doesn't exists - update (add) entire moc (hold this in construct obj)
// otherwise (if member displayName already exists in mocData/) 
// update propublica_id, type, party (whichever needs to be updated)


(function(module) {

    function Moc() {
        this.propublica_id = propublica_id;
        this.displayName = displayName;
        this.type = type;
        this.party = party;
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

        // have to call propublica api twice (once for senators, once for representatives)
        loadPropublicaData("senate").then(function (value) {
            var senators = value;
            getHOCValues(senators);
        }).catch(function() {
            console.log("error with retrieving senator values");
        });

        loadPropublicaData("house").then(function (value) {
            var representatives = value;
            getHOCValues(representatives);
        }).catch(function() {
            console.log("error with retrieving representative values.");
        });

        function getHOCValues(hoc) {
            var currentHOC = hoc;
            currentHOC.forEach(function(propub_member) {
                // is_match = false;
                //  property values
                propub_display_name = propub_member.first_name + " " + propub_member.last_name;
                propublica_id = propub_member.id;
                propub_type = propub_member.type;
                propub_party = getParty(propub_member.party);

                // update moc obj
                var propub_moc_obj = Moc(propublica_id, 
                                  propub_display_name, 
                                  propub_type, 
                                  propub_party);
                
                // find match to mocData --> should return a 'mocData/' key or nothing
                var mocdata_match = findMatch(propub_moc_obj);

                if (typeof mocdata_match !== 'undefined') { // update specific object [or return a key - to update 'mocData/' at that key]
                    // update mocdata_match with propub_moc_obj values needed
                    // update propublica_id
                    // updateObj("mocData/" + mocdata_match.govtrack_id, 'propublica_id', propub_moc_obj.propublica_id);
                    // update party
                    if (!mocdata_match.party) {
                        // updateObj("mocData/" + mocdata_match.govtrack_id, 'party', propub_moc_obj.party);
                        console.log("party : ", propub_moc_obj.party);
                    }
                    // update type
                    if (!mocdata_match.type) {
                        // updateObj("mocData/" + mocdata_match.govtrack_id, 'type', propub_moc_obj.type);
                        console.log("type : ", propub_moc_obj.type);
                    }
                    if (!mocdata_match.displayName) {
                        // updateObj("mocData/" + mocdata_match.govtrack_id, 'displayName', propub_moc_obj.displayName);
                        console.log("type : ", propub_moc_obj.displayName);
                    }
                } else {        // build new moc in mocData/
                    // update 'mocData/' with propub_moc_obj
                    // add object?
                    //updateObj("mocData/", NOT SURE, propub_moc_obj)
                    console.log("Entire obj update: ", propub_moc_obj)
                }

            });
        }

        // find match between propublica and mocData
        function findMatch(pro_moc_obj) {
            firebase.database().ref('/mocData/').once('value').then(function(snapshot) {
                snapshot.forEach(function(moc) {
                    member = moc.val();

                    if (typeof member['displayName'] !== null && member['displayName'] == pro_moc_obj.displayName) {
                        return member;
                    }
                })
            })
        }

        // update functions //

        // update propublica id
        function updateMocPropubId(member, propublica_id) {
            console.log("{ displayName: " + member.displayName + ", propublica_id" + ": " + propublica_id + "}");
            // I need moc key from mocData ****
            // updateObj(`/mocData/${member.key}`, "propublica_id", propublica_id);
        }

        // helper functions
        function updateObj(path, key, value) {
            firebase.database().ref(path).update({ key : value })
        }

        function getParty(propub_party) {
            if (propub_party == "R") {
                return "Republican";
            } else if (propub_party == "D") {
                return "Democratic";
            } else if (propub_party == "I") {
                return "Independent";
            }
        }
        
    }

    propublicaUpdate();
})();