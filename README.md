# Dev

`yarn install`
`yarn dev`

This will start and open the dev app. By default it uses an auth token permitting use on localhost:8000, which is where the dev app loads.

# Environment variables
`THREEKIT_ENV`=preview | admin-fts
The variable to specify test on production environment for Threekit

`THREEKIT_AUTH_TOKEN`= 
The variable to specify authorisation token for Threekit
# Build

To build a production bundle of the configurator:
`THREEKIT_AUTH_TOKEN=... THREEKIT_ENV=... yarn build`
where the value of the THREEKIT_AUTH_TOKEN environment variable is the auth token (setup in the ctech org on the Threekit platform) to be used by the bundled app. Thus, it should be the token that supports the desired domain where the app will be deployed.

The existing pre-built bundle located at `build/configurator.js` (same as is currently deployed at ctech.mythreekit.dev) has been built to use the assets hosted on the CTech org at admin.threekit.com/o/ctech, and using an auth token supporting hosting of the configurator app on the following domains:

- ctech-staging.herokuapp.com
- ctech.mythreekit.dev (alias to ctech-staging.herokuapp.com)
- configurator.ctechmanufacturing.com
- ctechmfgstage.wpengine.com
- ctechmfgdev.wpengine.com
- configurator.ctechmanufacturing.local
- www.ctechmanufacturing.local
- ctechmanufacturing.local
- www.configurator.ctechmanufacturing.com

# Usage

See `build/index.html` for example usage of the built app. This html is the site displayed at https://ctech.mythreekit.dev.

Once the bundle is loaded on the page, it exposes a `threekit` api object on the window with the following functions:

- `init(elementId)` - initialize the configurator into the html element with the specified id. Returns a promise which resolves when initialization complete and the subsequent api functions are ready for use.
- `setConfiguration(json)` - creates a cabinet based on the specified CTech json data. Returns a promise which resolves when the configuration has been applied. The promise resolves with a string id, which identifies the cabinet instance created.
- `moveCabinet(cabinetId, {x,y,z})` - Apple an x/y/z offset to a cabinet with a specified id (returned from setConfiguration)
- `openDoors()` - animates all cabinet doors open
- `closeDoors()` - animates all cabinet doors closed

# Misc

Branch `staging` is autodeployed to https://ctech.mythreekit.dev. This is intended for testing/demo purposes only. Note that the appropriate THREEKIT_AUTH_TOKEN is added to the heroku environment, so the heroku-hosted app is built with the correct token at deploy time.
