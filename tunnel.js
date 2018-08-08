var exec = require('child_process').exec;
var util = require('util');
var _ = require('lodash');
var cbt_tunnels = require('cbt_tunnels');

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

var apiTunnelParamsToOptions = function(params){
  paramNameMap =  {
    // <cbt api param name>: <cmd arg name>,
    "local_ip": "proxyIp",
    "local_port": "proxyPort" ,
    "directory": "dir",
    "tunnel_name": "tunnelname",
    "pac": "pac",
    "rejectUnauthorized": "rejectUnauthorized",
    "accept_all_certs": "acceptAllCerts",
    "direct_resolution": "bypass"
  };

  return _.reduce(params, (accum, val, key, coll) => {
    if (val !== '' && val !== null){
      if (key in paramNameMap){
        let newKeyName = paramNameMap[key];
        accum[newKeyName] = val;
      } else {
        accum[key] = val;
      }
    } else {
      return accum
    }
    return accum
  }, {})
}
var Tunnel = function(user, auth, params){
  this.args = createLaunchArgs(user,auth,params);
  this.tunnelLogs = ''

  this.start = (cb) => {
    let tunnelOptions = apiTunnelParamsToOptions(params);
    tunnelOptions.username = user;
    tunnelOptions.authkey = auth;
    // need to omit tunnel_source param
    tunnelOptions = _.omit(tunnelOptions, 'tunnel_source')
    console.log(`making a new tunnel for ${user} with params: ` + util.inspect(tunnelOptions))
    cbt_tunnels.start( tunnelOptions, (err) => {
      if (err){
        console.error('could not start tunnel: ' + err);
      } else {
        console.log('started tunnel')
      }
    })
    // console.log(`going to exec process with: node ./node_modules/cbt_tunnels/cmd_start.js ${this.args.join(' ')}`)
    // var cbt_tunnels_dir = require.resolve('cbt_tunnels');
    // this.tunnelProc = exec(`/usr/bin/env node ${__dirname}/node_modules/cbt_tunnels/cmd_start.js ` + this.args.join(' '), (err, stdout, stderr) => {
    //   console.log("Tunnel closed for " + user);
    // })
    // // collect tunnel process logs
    // this.tunnelProc.stdout.on('data', (chunk) => {
    //   this.tunnelLogs += chunk
    // })
    // this.tunnelProc.on('close', (code) => {
    //   if (code !== 0){
    //     console.log("Tunnel for " + user + " crashed! Exit code: " + code)
    //     console.log("Tunnel logs: " + this.tunnelLogs );
    //     console.log("Please contact support@crossbrowsertesting.com for help with this.");
    //   }
    // })
  }

  this.stop = (cb) => {
    // this.tunnelProc.kill();
    this.tunnelProc.stop();
  }
}

module.exports = Tunnel;
