var exec = require('child_process').exec;
var util = require('util');
var _ = require('lodash');
var cbt_tunnels = require('cbt_tunnels');

// create logger if it's not in scope
if (!global.log){
    var Logger = require('./log')
    global.log = new Logger('TRACE')
}

var apiTunnelParamsToOptions = function(params){
  // this function maps options received from CBT to options cbt_tunnels can use
  log.trace('Creating tunnel launch options from params. Params: ' + util.inspect(params));

  // CBT sends proxy of 'localhost:8080' if no upstream proxy was specified
  if (params.proxyIp === 'localhost' && params.proxyPort === '8080'){
    params.proxyIp = null;
    params.proxyPort = null;
  }

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

  let tunnelOpts =  _.reduce(params, (accum, val, key, coll) => {
    if (val !== '' && val !== null){
      if (key in paramNameMap){
        let newKeyName = paramNameMap[key];
        accum[newKeyName] = val;
      } else {
        accum[key] = val;
      }
    } else {
      return accum;
    }
    return accum;
  }, {})
  log.trace('Created tunnel options: ' + util.inspect(tunnelOpts));
  return tunnelOpts;
}

var Tunnel = function(user, auth, params){
  // this.args = createLaunchArgs(user,auth,params);
  // this.tunnelLogs = ''

  this.start = (cb) => {
    let tunnelOptions = apiTunnelParamsToOptions(params);
    
    tunnelOptions.username = user;
    tunnelOptions.authkey = auth;
    tunnelOptions.nokill = true;

    // need to omit tunnel_source param
    tunnelOptions = _.omit(tunnelOptions, 'tunnel_source');

    log.info(`Starting tunnel for ${user}. Tunnel options: ` + util.inspect(tunnelOptions));
    cbt_tunnels.start(tunnelOptions, (err) => {
      if (err){
        log.error('Failed to start tunnel: ' + (err.stack || err));
      } else {
        log.debug('Tunnel started successfully')
      }
    })
  }

  this.stop = (cb) => {
    cbt_tunnels.stop(cb);
  }

  this.status = () => {
      return cbt_tunnels.status()
  }
}

module.exports = Tunnel;
