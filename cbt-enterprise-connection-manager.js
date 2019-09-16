#!/usr/local/bin/node
"use strict";
var WebSocket = require('ws')
var http = require('http');
var tls = require('tls');
var url = require('url');
var Tunnel = require('./tunnel');
var utils = require('./utils');
var ProxyAgent = require('https-proxy-agent');

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
    }

  })
  .argv;



var httpProxy  = process.env.http_proxy  || process.env.HTTP_PROXY  || null
var httpsProxy = process.env.https_proxy || process.env.HTTPS_PROXY || null

if (argv.acceptAllCerts){
    console.log('setting reject_unauthorized = 0')
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

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

var socket

function cbtConnect() {

  // var socket = socketIo("http://localhost:3000/socket", { path: "/socket"} );
  // var socket = socketIo.connect("http://localhost:3000/socket/socket");
  let proxy = httpProxy || httpsProxy

  if(proxy){
      console.log('going to setup proxy agent')
      let proxyURL = new url.URL(proxy)
      let proxyAgentOpts ={
          host:proxyURL.hostname,
          port: proxyURL.port,
          auth: proxyURL.username ? `${proxyURL.username}:${proxyURL.password}` : ``,
          secureProxy:true
      }
      console.log('proxy agent opts: ' + JSON.stringify(proxyAgentOpts))
      let proxyAgent = new ProxyAgent(proxyAgentOpts)
      socket = new WebSocket(getApiUrl(argv.env), {agent: proxyAgent});
  } else {
      socket = new WebSocket(getApiUrl(argv.env));
  }



  socket.on('error', function(err){
    if (RECONNECTING){
      // console.log('reconnecting...')
    } else {
      console.log("Socket error!!");
      console.dir(err);
      let apiUrl = new url.URL(getApiUrl(argv.env));
      var tlsSocket = tls.connect({host: apiUrl.hostname, port:443, rejectUnauthorized: false}, () => {
        console.log('TLS connect successful, getting certificates from peer')
        console.log(tlsSocket.getPeerCertificate(true))
      })
    }
  })

  socket.on('close', () => {
    console.log('Signalling socket disconnected')
    RECONNECTING = true
    let reconnectInterval = setInterval( () => {
        if (socket.readyState === 0) {
            // socket is still connecting... just wait
        } else if (socket.readyState === 1){
            // socket is reconnected!
            RECONNECTING = false
            clearInterval(reconnectInterval)
        } else {
            console.log('Signalling socket reconnecting...')
            cbtConnect()
        }
    }, 500)
  })

  socket.once('open', () => {
    console.log("connection established! Initiating auth!");
    socket.send(JSON.stringify({action: 'authenticate', username: argv.username, authkey: argv.authkey}));

    socket.on('message', msg => {
        // handle incoming messages through the signaling socket
        try {
            msg = JSON.parse(msg)
        } catch (parseErr) {
            console.error('could not parse inbound message: ' + msg)
            return
        }

        // after parsing successful, each message should come in with an "action"
        switch(msg.action){
            case 'authenticated':
                console.log("Authentication successful! Waiting for a request to open a tunnel...");
                break
            case 'start':
                if (argv.env == 'test' || argv.env == 'local'){
                    msg.options.test = 'test';
                }
                var t = new Tunnel(msg.user.username, msg.user.authkey, msg.options)
                tunnels.push(t)
                t.start()
                break
            case 'keepalive_check':
                socket.send(JSON.stringify({action:'keepalive_ack'}))
                break
            case 'unauthorized':
                console.error("authentication failed! " + msg.message)
                process.exit(1)
                break
            case 'bye':
                console.log("got bye");
                socket.close();
        }
    })
  })
}


// only work if this version is in date
// ( or if we can't reach cbt to check... )
utils.checkVersion( argv.env, () => {
    cbtConnect()
  process.on('SIGINT', () => {
    console.log('\nECM is shutting down');
    if (tunnels.length === 0){
        process.exit(0)
    }
    tunnels.map( (tunnel, tunnelIndex) => {
      tunnel.stop( () => {
      })
    })

    setTimeout(() => {process.exit(0)}, 7000);
  })
})


