/**
 * @overview
 * @author Matthew Caruana Galizia <m@m.cg>
 * @license MIT
 * @copyright Copyright (c) 2013, Matthew Caruana Galizia
 * @version 0.1.2
 * @preserve
 */

'use strict';

/*jshint node:true*/

var http = require('http');
var inherits = require('util').inherits;

var socksClient = require('socks5-client');
var starttls = require('starttls');

function createConnection(options) {
	var socksSocket, handleSocksConnectToHost;

	socksSocket = socksClient.createConnection(options);

	handleSocksConnectToHost = socksSocket.handleSocksConnectToHost;
	socksSocket.handleSocksConnectToHost = function() {
		starttls({
			socket: socksSocket.socket,
			host: options.hostname
		}, function(err) {
			var clearText;

			if (err) {
				return socksSocket.emit('error', err);
			}

			clearText = this.cleartext;
			socksSocket.socket = clearText;

			handleSocksConnectToHost.call(socksSocket);
	
			// The Socks5ClientSocket constructor (invoked by socksClient.createConnection) adds an 'error' event listener to the original socket. That behaviour needs to be mimicked by adding a similar listener to the cleartext stream, which replaces the original socket.
			clearText.on('error', function(err) {
				socksSocket.emit('error', err);
			});
		});
	};

	return socksSocket;
}

function Socks5ClientHttpsAgent(options) {
	http.Agent.call(this, options);

	this.socksHost = options.socksHost || 'localhost';
	this.socksPort = options.socksPort || 1080;
	this.createConnection = createConnection;
}

inherits(Socks5ClientHttpsAgent, http.Agent);

module.exports = Socks5ClientHttpsAgent;
