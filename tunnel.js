var exec = require('child_process').exec;
var util = require('util');

var createLaunchArgs = function(user, auth, params){
  console.log('creating launch args with params: ' + util.inspect(params) );
  args = []
  // add username and authkey
  args.push('--username', user);
  args.push('--authkey', auth);
  args.push('--quiet');
  if(!!params){
    for (key in params){
      if (!!params[key]){
        args.push('--' + key, params[key])
      }
    }
  }
  console.log('tunnel args is: ' + args)
  return args;
}

var Tunnel = function(user, auth, params){
  console.log(`making a new tunnel for ${user}:${auth} with params ${util.inspect(params)}`)
  this.args = createLaunchArgs(user,auth,params);
  this.tunnelLogs = ''

  this.start = (cb) => {
    console.log(`going to exec process with: cbt_tunnels ${this.args.join(' ')}`)
    var cbt_tunnels_dir = require.resolve('cbt_tunnels');
    // this.tunnelProc = exec(`node ./cmd_start.js`, this.args, {detached: false})
    this.tunnelProc = exec(`node ./cmd_start.js` + this.args.join(' '))
    // collect tunnel proc logs
    this.tunnelProc.stdout.on('data', (chunk) => {
      this.tunnelLogs += chunk
    })
    this.tunnelProc.on('close', (code) => {
      if (code !== 0){
        console.log("tunnel closed with non-zero statuscode: " + code)
        console.log("logs: " + this.tunnelLogs );
      }
    })
  }

  this.stop = (cb) => {
    this.tunnelProc.kill();
  }
}

module.exports = Tunnel;
