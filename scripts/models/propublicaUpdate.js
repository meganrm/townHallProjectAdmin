(function(module) {

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
            currentHOC.forEach(function(member) {
                //  property values
                proDisplayName = member.first_name + " " + member.last_name;
                propublica_id = member.id;

                // find match to mocData
                findMatch("displayName", proDisplayName, "propublica_id", propublica_id);
            });
        }

        // find match between propublica and mocData
        function findMatch(mocDisplayName, propublicaDisplayName, newproperty, newvalue) {
            firebase.database().ref('/mocData/').once('value').then(function(snapshot) {
                snapshot.forEach(function(moc) {
                    member = moc.val();
                    if (typeof member[mocDisplayName] !== null && member[mocDisplayName] == propublicaDisplayName) {
                        // call update functions based on new property
                        switch (newproperty){
                            case 'propublica_id':
                                updateMocPropubId(member, newvalue)
                                break;
                            default:
                                console.log("no match for update function");
                        }
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
    }

    propublicaUpdate();
})();