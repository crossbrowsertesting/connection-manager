<img src="https://crossbrowsertesting.com/design/images/brand/cbt-sb-logo.svg" width="50%">

----

# Enterprise Connection Manager

Enterprise Connection Manager is an enterprise-focused utility to give network administrators maximimum control
over CrossBrowserTesting's [Local
Connection](https://help.crossbrowsertesting.com/local-connection/general/local-tunnel-overview/ )
feature.

## What does it do?

Normally when a user enables Local Connection a tunnel is established between their
computer and our devices. Some network environments won't allow users to establish that
kind of tunnel. Or network administrators need to be able to audit and control the tunnel
traffic.

That's where the Enterprise Connection Manager comes in. When ECM is enabled all Local
Connection requests by all users will go through the ECM, instead of the users' computers.

## How do I use it?

1. Make sure that your account is enabled to use the Enterprise Connection Manager. Contact
[support@crossbrowsertesting.com](mailto:support@crossbrowsertesting.com) if you need help
with this.
1. Install with NPM: `npm install cbt-enterprise-connection-manager`
1. Clone this repository or download the standalone binary from the "Releases" page (coming
soon).
1. Run the program: 
    1. Cloned repo: `node client.js --username <email address> --authkey <authkey>`
    2. Standalone binary: `./enterprise-connection-manager --username <email address> --authkey <authkey>`

You may want to use [PM2](https://github.com/Unitech/pm2),
[Monit](https://bitbucket.org/tildeslash/monit/), or a related process management utility
to ensure that ECM is always running. 

## How does it work?

ECM establishes a long-running secure websocket connection to crossbrowsertesting.com.
When a user requests a Local Connection, a message will be sent over the websocket to the
ECM asking it to start a Local Connection tunnel for the user. As far as the user is
concerned, our service will operate the same as it always has but the tunnel will start
from the ECM, not their machine.

Be aware that users will not be able to enable Local Connection if the ECM is not running.
