For development only.

Edit index.mjs as needed to specify the old token to delete, and the desired name/whitelist for the new token. The run `yarn update-whitelist`.

Then, log into Heroku, update the THREEKIT_AUTH_TOKEN config var for the desired app, and redeploy it.
