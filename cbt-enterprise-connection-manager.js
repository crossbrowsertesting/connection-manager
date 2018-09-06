#!/usr/local/bin/node
"use strict";
var socketIo = require('socket.io-client');
var http = require('http');
var Tunnel = require('./tunnel');
var utils = require('./utils');

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
      default: 'prod'
    }

  })
  .argv;

var tunnels = [];

function getApiUrl(env){
  switch(env){
    case 'prod':
      return 'https://crossbrowsertesting.com/localconman';
    case 'qa':
      return 'https://qaapp.crossbrowsertesting.com/localconman';
    case 'test':
      return 'https://test.crossbrowsertesting.com/localconman'
      // return 'https://testapp2.crossbrowsertesting.com/localconman'
      // return 'http://173.12.250.100/localconman';
    case 'local':
      return 'http://localhost:3000/localconman';
  }
}

// only work if this version is in date
// ( or if we can't reach cbt to check... )
utils.checkVersion( argv.env, () => {

  // var socket = socketIo("http://localhost:3000/socket", { path: "/socket"} );
  // var socket = socketIo.connect("http://localhost:3000/socket/socket");
  var socket = socketIo(getApiUrl(argv.env),
    { path: "/api/v3/socket.io",
      // need to make sure that only websockets protocol is used
      transports: ['websocket'], 
      upgrade: false
    }
  );


  socket.on('error', (err) => {
    console.log("Socket error!!");
    console.log(err.stack);
  })

  socket.on('disconnect', () => {
    console.log("Socket disconnected");
  })

  socket.on('reconnect', () => {
    console.log("connection re-established! Re authing!");
    socket.emit('authenticate', {username: argv.username, authkey: argv.authkey});
  })

  socket.on('reconnecting', () => {
    console.log('Connection lost, attempting to reconnect...');
  })

  socket.on('reconnect_error', (err) => {
    console.log('reconnect error: Could not connect to crossbrowsertesting.com' + err);
  })

  socket.on('reconnect_failed', (err) => {
    console.log('reconnect failed');
  })


  socket.once('connect', () => {
    console.log("connection established! Initiating auth!");
    socket.emit('authenticate', {username: argv.username, authkey: argv.authkey});

    socket.on('authenticated', function() {
      // `authenticated` is emitted by socketio-auth server 
      console.log("Authentication successful! Waiting for a request to open a tunnel...");
      // setup the other socket message handlers
    });

    socket.on('start', (msg) => {
      msg = JSON.parse(msg);
      // start the tunnel!
      if (argv.env == 'test' || argv.env == 'local'){
        msg.options.test = 'test';
      }
      var t = new Tunnel(msg.user.username, msg.user.authkey, msg.options)
      tunnels.push(t)
      t.start()
    });

    socket.on('keepalive_check', () => {
      socket.emit('keepalive_ack');
    });

    socket.on('unauthorized', function(err) {
      // `unauthorized` is emitted by socketio-auth server when auth fails
      // connection is closed by the server
      console.log("authentication failed! Reason: " + err);
    });

    socket.on('bye', () => {
      console.log("got bye");
      socket.disconnect();
    });

  })


  process.on('SIGINT', () => {
    console.log('\nECM is shutting down');
    console.dir(tunnels)
    tunnels.map( (tunnel, tunnelIndex) => {
      tunnel.stop( () => {
      })
    })

    setTimeout(() => {process.exit(0)}, 7000);
  })
});

