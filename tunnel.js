var exec = require('child_process').exec;
var util = require('util');

var createLaunchArgs = function(user, auth, params){
  args = []
  // add username and authkey
  args.push('--username', user);
  args.push('--authkey', auth);
  // args.push('--quiet');
  args.push('--verbose');
  if (params.proxyIp == 'localhost'){
    params.proxyIp = null;
    params.proxyPort = null;
  }
  if(!!params){
    for (key in params){
      if (!!params[key]){
        if (key === "direct_resolution"){
          key = "bypass"
        } else if(key === "tunnel_source"){
          continue;
        }
        args.push('--' + key, params[key])
      }
    }
  }
  return args;
}

var Tunnel = function(user, auth, params){
  console.log(`making a new tunnel for ${user}:${auth} with params ${util.inspect(params)}`)
  this.args = createLaunchArgs(user,auth,params);
  this.tunnelLogs = ''

  this.start = (cb) => {
    console.log(`going to exec process with: node ./node_modules/cbt_tunnels/cmd_start.js ${this.args.join(' ')}`)
    var cbt_tunnels_dir = require.resolve('cbt_tunnels');
    this.tunnelProc = exec(`/usr/bin/env node ${__dirname}/node_modules/cbt_tunnels/cmd_start.js ` + this.args.join(' '), (err, stdout, stderr) => {
      console.log("Tunnel closed for " + user);
    })
    // collect tunnel process logs
    this.tunnelProc.stdout.on('data', (chunk) => {
      this.tunnelLogs += chunk
    })
    this.tunnelProc.on('close', (code) => {
      if (code !== 0){
        console.log("Tunnel for " + user + " crashed! Exit code: " + code)
        console.log("Tunnel logs: " + this.tunnelLogs );
        console.log("Please contact support@crossbrowsertesting.com for help with this.");
      }
    })
  }

  this.stop = (cb) => {
    this.tunnelProc.kill();
  }
}

module.exports = Tunnel;
