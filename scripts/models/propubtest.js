// ProPublica API Key: CGreQp3d95C4FLYHkCZRph5Hhs9nqfRCdJNlrxHL

// ** Note that for id, sometimes the value is member_id or sponsor_id that is being returned ** //

function doStuff() {
    return new Promise(function(resolve, reject) {
        arr_names = [];
        firebase.database().ref('/mocData/').once('value').then(function(snapshot) {
            snapshot.forEach(function(moc) {
                member = moc.val();
                if (member.type == "rep") {
                    arr_names.push(member.displayName);
                }
            })
        })
        resolve(arr_names);
    })
}

doStuff().then(function(value) {
    // var last = value.lastIndexOf("Michael Burgess");
    sorted_arr = (value.sort((a,b) => a.localeCompare(b)));
    console.log(sorted_arr);
    // console.log(sorted_arr);
    // console.log(last);
});

some_array.sort((a,b) => a.localeCompare(b));

some_array.sort(function (a, b) {
    return a.localeCompare(b);
});

some_array.sort(a,b)

// var arrrayyy = ar.arr_names;
// console.log(arrrayyy);

sorted_arr = ar.sort();
console.log(sorted_arr);

results = [];
console.log(sorted_arr);
for (var j = 1; j < sorted_arr.length; j++) {
    if (sorted_arr[j + 1] == sorted_arr[j]) {
        results.push(sorted_arr[j])
    }
}
console.log(results);








// jquery way:
// $.ajax({
//     url: "https://api.propublica.org/congress/v1/115/senate/members.json",
//     headers: {"X-API-Key" : "CGreQp3d95C4FLYHkCZRph5Hhs9nqfRCdJNlrxHL"}
// });


function loadXMLDoc() {
    var xmlhttp = new XMLHttpRequest();

    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == XMLHttpRequest.DONE) {
            if (xmlhttp.status == 200) {
                var data = JSON.parse(xmlhttp.response)
                getSenateIds(data);
            } else if (xmlhttp.status == 400) {
                alert("There was an error 400");
            } else {
                alert("Something else other than 200 was returned");
            }
        }
    };
    xmlhttp.open("GET", "https://api.propublica.org/congress/v1/115/senate/members.json", true);
    xmlhttp.setRequestHeader("X-API-Key", "CGreQp3d95C4FLYHkCZRph5Hhs9nqfRCdJNlrxHL");
    xmlhttp.send();
}

loadXMLDoc();


function getSenateIds(data) {
    // get displayName
    // get value we want to add
    // find corresponding moc/Data member
    // update moc/Data member value with new data value
    // 
    // console.log(data);

    var i = 1;
    console.log(data['status']);
    var membersArray = data['results'][0]['members'];
    membersArray.forEach(function(member) {
        console.log(member.party + " " + i + " " + member.id);
        i++;
    });
    // console.log(membersArray);
}

function mocUpdateSenatePropublicaIds() {
    // ?
    // firebase call for mocData
    // match displayName ot displayName
    // set propublica data ID for each 
    // member who matches the display name
}







/////////////
// get congress info
function loadXMLDoc() {
    var xmlhttp = new XMLHttpRequest();

    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == XMLHttpRequest.DONE) {
            if (xmlhttp.status == 200) {
                var data = JSON.parse(xmlhttp.response)
                getSenateIds(data);
            } else if (xmlhttp.status == 400) {
                alert("There was an error 400");
            } else {
                alert("Something else other than 200 was returned");
            }
        }
    };
    xmlhttp.open("GET", "https://api.propublica.org/congress/v1/115/House/members.json", true);
    xmlhttp.setRequestHeader("X-API-Key", "CGreQp3d95C4FLYHkCZRph5Hhs9nqfRCdJNlrxHL");
    xmlhttp.send();
}

loadXMLDoc();


function getCongressIds(data) {
    // parse through http call for senators info
    // compile a displayName and ids to match
    // go through mocData db and update [another function call?]
    // ids to propublica ids
    console.log(data);
    console.log(data['status']);
}






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

    loadPropublicaData("senate").then(function (value) {
        var senators = value;
        senators.forEach(function(member) {
            proDisplayName = member.first_name + " " + member.last_name;
            propublica_id = member.id;
            //console.log(proDisplayName + " propublica_id: " + member.id);
            // call methods to change indivuals values
            findMatchingValueinMocData(proDisplayName, "displayName", propublica_id);
        });
    }).catch(function() {
        console.log("error with senator values");
    });

    function findMatchingValueinMocData(oldvalue, property, newvalue) {
        firebase.database().ref('/mocData/').once('value').then(function(snapshot) {
            snapshot.forEach(function(moc) {
                member = moc.val();
                if (typeof member[property] !== null && member[property] == oldvalue) {
                    console.log("displayName: " + member[property] + " propublica_id: " + newvalue);
                    // update function
                }
            })
        })
    }


        loadPropublicaData("house").then(function (value) {
        var representatives = value;
        console.log(representatives.first_name + " " + representatives.last_name);
        //console.log(representatives);
    }).catch(function() {
        console.log("error with representative values.");
    });

///////////////////////////////////////////////////////

    loadPropublicaData("senate").then(function (value) {
            var senators = value;
            senators.forEach(function(member) {
                proDisplayName = member.first_name + " " + member.last_name;
                var match = findMatch(proDisplayName);
                if (typeof match !== undefined) {
                    // success
                    console.log(match);
                    updateMocPropubId(match, member.id); // match should be the object of a matched moc
                } else {
                    // failed to find match
                    console.log("failed to find match");
                }
            });
        }).catch(function() {
            console.log("error with senator values");
        });

    function findMatch(propublicaDisplayName) {
            firebase.database().ref('/mocData/').once('value').then(function(snapshot) {
                snapshot.forEach(function(moc) {
                    mocMember = moc.val();
                    if (typeof mocMember['displayName'] !== null && mocMember['displayName'] == propublicaDisplayName) {
                        return mocMember;
                    }
                })
            })
        }

        function updateMocPropubId(match, propublica_id) {
            console.log("{ displayName: " + match.displayName + ", propublica_id" + ": " + propublica_id + "}");
        }





        firebase.database().ref('mocData/2017-3').once('value').then(function(snapshot) {
            snapshot.forEach(function(moc) {
                mocMember = moc.val();
                console.log(mocMember);
            })
        })