"use strict";
var socketIo = require('socket.io-client');
var http = require('http');
var Tunnel = require('./tunnel');
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

console.log("starting");

function getApiUrl(env){
  switch(env){
    case 'prod':
      return 'https://crossbrowsertesting.com/tunnelserver'
    case 'test':
      return 'https://test.crossbrowsertesting.com/tunnelserver'
    case 'local':
      return 'http://localhost:3000/tunnelserver'
  }
}

// var socket = socketIo("http://localhost:3000/socket", { path: "/socket"} );
// var socket = socketIo.connect("http://localhost:3000/socket/socket");
var socket = socketIo(getApiUrl(argv.env),
    { path: "/api/v3/socket.io",
      reconnect: true }
);

socket.on('keepalive_check', () => {
  socket.emit('keepalive_ack');
})

socket.on('connect', () => {
  console.log("connection established! Initiating auth!");
  socket.emit('authenticate', {username: argv.username, authkey: argv.authkey});
})

socket.on('authenticated', function() {
  // `authenticated` is emitted by socketio-auth server 
  console.log("authentication successful!");
  // setup the other socket message handlers
  socket.on('start', (msg) => {
    console.log("got a start message! time to start a tunnel....");
    console.log("message is: " + msg)
    msg = JSON.parse(msg);
    // start the tunnel!
    new Tunnel(msg.user.username, msg.user.authkey, msg.options).start()
  })

  socket.on('bye', () => {
    console.log("got bye");
    socket.disconnect();
  })
});
  
socket.on('unauthorized', function(err) {
  // `unauthorized` is emitted by socketio-auth server when auth fails
  // connection is closed by the server
  console.log("authentication failed! Reason: " + err);
});

