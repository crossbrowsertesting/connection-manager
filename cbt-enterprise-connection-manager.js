#!/usr/local/bin/node
"use strict";
var WebSocket = require('ws')
var http = require('http');
var tls = require('tls');
var url = require('url');
var Tunnel = require('./tunnel');
var utils = require('./utils');
var util = require('util');
var ProxyAgent = require('https-proxy-agent');

var Logger = require('./log');

var RECONNECTING = false;

// simple arg parser
// args are stored in argv object
var argv = require('yargs')
  .options({
    'username': {
      demandOption: true
    },
    'authkey': {
      demandOption: true
    },
    'env': {
      description: false,
      hide: true,
      default: 'prod'
    },
    'acceptAllCerts': {
      description: false,
      hide: true,
      default: false
    },
    'verbose': {
        alias: 'v',
        count: true,
        conflicts: 'quiet'

    },
    'quiet': {
        alias: 'q',
        boolean: true,
        conflicts: 'verbose'
    }
  })
  .argv;

// parse logging args and create logger
let initialLogLevel;
if (argv.quiet){
  // no logs if quiet option specified
  initialLogLevel = 'OFF';
} else {
  // otherwise, log level based on count of verbose flags
  switch (argv.verbose){
    case 0:
      initialLogLevel = 'WARN';
      break;
    case 1:
      initialLogLevel = 'INFO';
      break;
    case 2:
      initialLogLevel = 'DEBUG';
      break;
    case 3:
    default:
      initialLogLevel = 'TRACE';
      break;
  }
}
const log = new Logger(initialLogLevel);
// bind to global
global.log = log

// apply acceptAllCerts arg by setting env variable for NodeJS
if (argv.acceptAllCerts){
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

// parse env variables for proxy options
let proxyUrl = utils.getProxyFromEnv();

var tunnels = [];

function getApiUrl(env){
  switch(env){
    case 'prod':
      return 'https://livetestdirect.crossbrowsertesting.com/localconmanws';
    case 'qa':
      return 'https://qaapp.crossbrowsertesting.com/localconmanws';
    case 'test':
      return 'https://test.crossbrowsertesting.com/localconmanws'
      // return 'https://testapp2.crossbrowsertesting.com/localconman'
      // return 'http://173.12.250.100/localconman';
    case 'local':
      return 'http://localhost:3000/localconmanws';
  }
}

function createProxyAgent(proxyUrl){
  proxyUrl = new url.URL(proxyUrl)
  let proxyAgentOpts ={
    host:proxyUrl.hostname,
    port: proxyUrl.port,
    auth: proxyUrl.username ? `${proxyUrl.username}:${proxyUrl.password}` : ``,
    procotol: proxyUrl.protocol
  }
  log.debug('ProxyAgent options: ' + util.inspect(proxyAgentOpts))
  let proxyAgent = new ProxyAgent(proxyAgentOpts)
}

var socket

function cbtConnect() {

  let socketUrl = getApiUrl(argv.env)

  // create websocket connection (with proxy if specified)
  if(proxyUrl){
    let proxyAgent = createProxyAgent(proxyUrl)
    socket = new WebSocket(socketUrl, {agent: proxyAgent});
  } else {
    socket = new WebSocket(socketUrl);
  }

  socket.on('error', function(err){
    if (RECONNECTING){
      log.debug('Socket error while reconnecting');
      log.trace('Socket error: ' + (err || err.stack));
    } else {
      log.error('Socket error: ' + (err || err.stack));
      let apiUrl = new url.URL(getApiUrl(argv.env));
      var tlsSocket = tls.connect({host: apiUrl.hostname, port:443, rejectUnauthorized: false}, () => {
        log.debug('TLS connect successful, getting certificates from peer')
        log.debug(tlsSocket.getPeerCertificate(true))
      })
    }
  })

  socket.on('close', () => {
    log.error('Signalling socket disconnected. Attempting to reconnect.')
    RECONNECTING = true
    let reconnectInterval = setInterval( () => {
        if (socket.readyState === 0) {
            // socket is still connecting... just wait
        } else if (socket.readyState === 1){
            // socket is reconnected!
            log.info('Socket reconnect successful!')
            RECONNECTING = false
            clearInterval(reconnectInterval)
        } else {
            log.debug('Signalling socket reconnecting...')
            cbtConnect()
        }
    }, 500)
  })

  socket.once('open', () => {

    // setup handler for if server stops pinging
    socket.lastPing = new Date();
    let serverKeepalive = setInterval(() => {
        let now = new Date();
        let timeSincePing = (now - socket.lastPing) / 1000;
        if (timeSincePing > 15){
            log.error(`No ping from CBT in ${timeSincePing} seconds. Closing socket to trigger reconnect`)
            clearInterval(serverKeepalive)
            socket.terminate()
        }
    }, 500)

    log.info("Socket connection established! Authenticating...");
    let payload = {action: 'authenticate', username: argv.username, authkey: argv.authkey};

    // clone payload to log it without logging creds
    let loggablePayload = JSON.parse(JSON.stringify(payload));
    loggablePayload.authkey = '********';
    log.trace("ECM => CBT: " + JSON.stringify(loggablePayload));

    socket.send(JSON.stringify(payload));

    socket.on('message', msg => {
      // handle incoming messages through the signaling socket
      try {
        msg = JSON.parse(msg);
      } catch (parseErr) {
        log.warn('Could not parse message from CBT. Offending message:' + msg);
        log.debug('Parse error: ' + (parseErr.stack || parseErr));
        return;
      }

      // after parsing successful, each message should come in with an "action"
      switch(msg.action){
        case 'authenticated':
          log.trace("ECM <= CBT: " + util.inspect(msg));
          log.info("Authentication successful! Waiting for a request to open a tunnel.");
          break;
        case 'start':
          log.trace("ECM <= CBT: " + util.inspect(msg));
          if (argv.env == 'test' || argv.env == 'local'){
            msg.options.test = 'test';
          }
          var t = new Tunnel(msg.user.username, msg.user.authkey, msg.options);
          tunnels.push(t);
          t.start();
          break;
        case 'keepalive_check':
          socket.lastPing = new Date();
          socket.send(JSON.stringify({action:'keepalive_ack'}));
          break;
        case 'unauthorized':
          log.trace("ECM <= CBT: " + util.inspect(msg));
          log.error("Authentication failed! " + msg.message);
          process.exit(1);
          break
        case 'bye':
          log.info("CBT requested this socket close. Closing socket...");
          socket.close();
      }
    })
  })
}


// only work if this version is in date
// ( or if we can't reach cbt to check... )
utils.checkVersion( argv.env, () => {
    cbtConnect()


  // attempt graceful shutdown on sigint
  process.on('SIGINT', () => {
    log.info('ECM is shutting down');

    if (tunnels.length === 0){
        log.trace('No tunnels running, quitting now')
        process.exit(0)
    } else {

      log.trace(`Currently ${tunnels.length} tunnels running. Going to shut them down before quitting.`)
      tunnels.map( (tunnel, tunnelIndex) => {
        log.trace(`Stopping tunnel ${tunnelIndex}`)
        tunnel.stop( () => { })
      })

      // quit when all tunnels are stopped
      setInterval(() => {

          // get status of all tunnels
          let tunnelStatus = tunnels.map( tunnel => {
              return tunnel.status()
          })

          // quit if all tunnels are stopped (status() returns false)
          if (tunnelStatus.every( tunnel => !tunnel )){
              log.info('All tunnels stopped')
              process.exit(0)
          }

      }, 250)
    }

    // exit after 7 seconds if there are stubborn tunnels
    setTimeout(() => {process.exit(0)}, 7000);
  })
})


