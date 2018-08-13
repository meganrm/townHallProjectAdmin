# townHallProjectAdmin

## Current features: 
- Back end: bin/capEvents.js runs every hour on heroku
- Front end: view for researchers to see what events current have issues
- Front end: Admin can edit and approve events. 

## Future:
- Back end: may be where our email automation lives.

## Development
- Create a free firebase account, then create a new project: https://console.firebase.google.com
- Go to the project overview and then click `Add Firebase to your web app` and copy the config to `script\lib\firebaseinit.js`
- Click the gear after "Project overview" and choose "project settings", then choose "service accounts"
- Generate a new private key and copy the info into your env vars so it can be accessed by `\server\lib\setupFirebase.js`
- Go back to the firebase admin, then enabled the google sign in provider in `Develop` -> `Authentication` -> `Sign in methods`
- Go to `Develop` -> `Database` -> `Rules`.  Then copy in the rules from https://github.com/townhallproject/townHallProject/blob/development/database.rules.json
- Get a test JSON file from a team member
- Go to `Develop` -> `Database` and click the three verticle dots in the top right of the card -> `Import JSON` -> upload the test JSON file
- If you're serving off something other than `localhost` add it to the whitelist in the `Authorized domains` section
- Start the express server by running node .\server.js
- Serve and access index.html, then login
- Go back to the firebase admin and to to `Develop` -> `Database` then drill into the keys and find the user you just created when you logged in
- Add an `isAdmin` key to that user with the value of `True`