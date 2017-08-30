<img src="https://crossbrowsertesting.com/design/images/brand/cbt-sb-logo.svg" width="50%">

----

# Enterprise Connection Manager

Enterprise Connection Manager is an enterprise-focused utility to give network administrators
maximimum control over CrossBrowserTesting's [Local
Connection](https://help.crossbrowsertesting.com/local-connection/general/local-tunnel-overview/)
feature.

## What does it do?

Normally enabling Local Connection establishes a websocket tunnel between CBT's devices and the user's
computer. Some network environments don't allow users to establish that kind of tunnel. And some network
administrators need to be able to audit and control the tunnel traffic.

That's where the Enterprise Connection Manager comes in. When ECM is enabled all Local Connection
requests by all users will go through the ECM, instead of the users' computers.

## How do I use it?

First, make sure that your account is enabled to use the Enterprise Connection Manager. Contact
[support@crossbrowsertesting.com](mailto:support@crossbrowsertesting.com) if you need help with
this.

### Install With NPM:
1. Install it with NPM: `$ npm install -g cbt-enterprise-connection-manager`

### Install with Git:
1. Clone this repository: `$ git clone https://github.com/crossbrowsertesting/connection-manager`
2. Move to the new directory: `$ cd connection-manager`
3. Download the dependencies: `$ npm install`
4. Optional: create a link to a folder in your path: `$ ln -s cbt-enterprise-connection-manager.js ~/bin/cbt-ecm`

### Install with pre-compiled binary:
*Coming soon! If this is something you would like to see, let us know.*

### Then run it!
 Run the program: 
    * If you installed it with `npm -g`: `$ cbt-enterprise-connection-manager --username <email address> --authkey <authkey>`
    * If you didn't: `$ ./cbt-enterprise-connection-manager --username <email address> --authkey <authkey>`

You may want to use [PM2](https://github.com/Unitech/pm2),
[Monit](https://bitbucket.org/tildeslash/monit/), or a related process management utility to ensure
that ECM is always running. 

## How does it work?

ECM establishes a long-running secure websocket connection to crossbrowsertesting.com.  When a user
requests a Local Connection, a message will be sent over the websocket to the ECM asking it to start
a Local Connection tunnel for the user. As far as the user is concerned, our service will operate
the same as it always has but the tunnel will start from the ECM, not their machine.

Be aware that users will not be able to enable Local Connection if the ECM is not running.
