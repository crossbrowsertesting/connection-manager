"use strict";
var socketIo = require('socket.io-client');
var http = require('http');
var Tunnel = require('./tunnel');
var utils = require('./utils');
var express = require('express');

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

function getApiUrl(env){
  switch(env){
    case 'prod':
      return 'https://crossbrowsertesting.com/localconman';
    case 'qa':
      return 'https://qaapp.crossbrowsertesting.com/localconman';
    case 'test':
      return 'http://test.crossbrowsertesting.com/localconman'
      // return 'http://173.12.250.100/localconman';
    case 'local':
      return 'http://localhost:3000/localconman';
  }
}

// only work if this version is in date
// ( or if we can't reach cbt to check... )
utils.checkVersion( () => {

  // var socket = socketIo("http://localhost:3000/socket", { path: "/socket"} );
  // var socket = socketIo.connect("http://localhost:3000/socket/socket");
  var socket = socketIo(getApiUrl(argv.env),
    { path: "/api/v3/socket.io",
      reconnect: true,
      extraHeaders: {'heyo': 'forealz'}
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
      console.log("authentication successful!");
      // setup the other socket message handlers
    });

    socket.on('start', (msg) => {
      console.log("got a start message! time to start a tunnel....");
      console.log("message is: " + msg)
      msg = JSON.parse(msg);
      console.log('typeof msg: ' + typeof msg);
      console.log('after parse msg is : ' + JSON.stringify(msg));
      console.log('type: ' + typeof msg.options);
      console.log(msg.options);
      // start the tunnel!
      if (argv.env == 'test' || argv.env == 'local'){
        msg.options.test = true;
      }
      new Tunnel(msg.user.username, msg.user.authkey, msg.options).start()
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


});

