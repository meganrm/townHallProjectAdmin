(function(module) {

    var states_obj = {
        AL: 'Alabama',
        AK: 'Alaska',
        AS: 'American Samoa',
        AZ: 'Arizona',
        AR: 'Arkansas',
        CA: 'California',
        CO: 'Colorado',
        CT: 'Connecticut',
        DE: 'Delaware',
        DC: 'District of Columbia',
        FM: 'Federated States of Micronesia',
        FL: 'Florida',
        GA: 'Georgia',
        GU: 'Guam',
        HI: 'Hawaii',
        ID: 'Idaho',
        IL: 'Illinois',
        IN: 'Indiana',
        IA: 'Iowa',
        KS: 'Kansas',
        KY: 'Kentucky',
        LA: 'Louisiana',
        ME: 'Maine',
        MH: 'Marshall Islands',
        MD: 'Maryland',
        MA: 'Massachusetts',
        MI: 'Michigan',
        MN: 'Minnesota',
        MS: 'Mississippi',
        MO: 'Missouri',
        MT: 'Montana',
        NE: 'Nebraska',
        NV: 'Nevada',
        NH: 'New Hampshire',
        NJ: 'New Jersey',
        NM: 'New Mexico',
        NY: 'New York',
        NC: 'North Carolina',
        ND: 'North Dakota',
        MP: 'Northern Mariana Islands',
        OH: 'Ohio',
        OK: 'Oklahoma',
        OR: 'Oregon',
        PW: 'Palau',
        PA: 'Pennsylvania',
        PR: 'Puerto Rico',
        RI: 'Rhode Island',
        SC: 'South Carolina',
        SD: 'South Dakota',
        TN: 'Tennessee',
        TX: 'Texas',
        UT: 'Utah',
        VT: 'Vermont',
        VI: 'Virgin Islands',
        VA: 'Virginia',
        WA: 'Washington',
        WV: 'West Virginia',
        WI: 'Wisconsin',
        WY: 'Wyoming'
    };

    function Moc(opts) {
        if (!opts.member_id) {
            return;
        }
        for (keys in opts) {
            this[keys] = opts[keys];
        }
        this.propublica_id = opts.member_id;
        if (parseInt(opts.facebook_account)) {
            this.facebook_account = parseInt(opts.facebook_account);
        }
        if (opts.current_party && opts.current_party.toLowerCase() === 'd') {
            this.party = 'Democratic';
        } else if (opts.current_party && opts.current_party.toLowerCase() === 'r') {
            this.party = 'Republican';
        } else if (opts.current_party) {
            this.party = 'Independent';
        }
        if (opts.state) {
            this.stateName = states_obj[opts.state];
        }
        delete this.member_id;
        delete this.current_party;
    }

    function weeklyPropublicaUpdate() {
        // call to new members
        function loadNewMembers() {
            return new Promise(function(resolve, reject) {
                url = 'https://api.propublica.org/congress/v1/members/new.json';
                $.ajax({
                    url: url,
                    headers: {'X-API-Key': 'CGreQp3d95C4FLYHkCZRph5Hhs9nqfRCdJNlrxHL'},
                    success: function(response){
                        if (response['results'][0]['members']) {
                            var membersArray = response['results'][0]['members'];
                            resolve(membersArray);
                        } else {
                            reject('Did not get response from api call.');
                        }
                    },
                    contentType: 'application/json'
                });
            });
        }

        function findSpecificMember(member_id) {
            return new Promise(function(resolve, reject) {
                url = 'https://api.propublica.org/congress/v1/members/' + member_id + '.json';
                $.ajax({
                    url: url,
                    headers: {'X-API-Key': 'CGreQp3d95C4FLYHkCZRph5Hhs9nqfRCdJNlrxHL'},
                    success: function(response){
                        if (response['results'][0]) {
                            var member = response['results'][0];
                            resolve(member);
                        } else {
                            reject("Propublica didn't return a specific member match.");
                        }
                    },
                    contentType: 'application/json'
                });
            });
        }


        function updateNewMembers(newPropublicaMembers) {
            newPropublicaMembers.forEach(function(new_propub_member) {
                var type;
                if (new_propub_member.chamber == 'House') {
                    type = 'rep';
                } else {
                    type = 'sen';
                }
                // check against propublica specific member search using id
                findSpecificMember(new_propub_member.id).then(function(existing_propub_member) {
                    // console.log(existing_propub_member);
                    var member = new Moc(existing_propub_member);
                    member.type = type;
                    // check mocData for matches
                    var path = '/mocData/' + existing_propub_member.govtrack_id;
                    firebase.database().ref(path).once('value').then(function(snapshot) {
                        if (!snapshot.exists()) {
                            // if no match
                            // update an entirely new member
                            member.displayName = member.first_name + ' ' + member.last_name;
                            console.log(member);
                            // firebase.database().ref(path).update(member).then(function(done){
                            //   console.log(done);
                            // });
                        } else {
                            // if match - update only fields that may change (social media)
                            console.log('Existing member: ', member.facebook_account, " ", member.youtube_account, " ", member.twitter_account, ' ', member.in_office);
                            console.log("---------");
                            // firebase.database().ref(path).update(
                            // { isCurrent : member.isCurrent,
                            //   facebook_account : member.facebook_account, 
                            //   in_office : member.in_office, 
                            //   youtube_account : member.youtube_account,
                            //   twitter_account : member.twitter_account}).then(function(done){
                            //   console.log(done);
                            // });
                        }
                    })
                }).catch(function(error) {
                    console.log('error ', error);
                })
            })
        }

        // call propublica 'new members' api endpoint 
        loadNewMembers().then(function(newMembers) {
            updateNewMembers(newMembers); 
        }).catch(function(error) {
            console.log("Uh oh, something went wrong getting new members ", error);
        });
    }

    module.weeklyPropublicaUpdate = weeklyPropublicaUpdate;

})(window);