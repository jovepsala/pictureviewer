#!/usr/bin/env node
/**
 * WebSocketClient, 25.9.2013 Spaceify Inc.
 * 
 * @class WebSocketClient
 */

var fibrous = require("fibrous");
var websockclient = require('websocket').client;
var logger = require("./api/logger");

function WebSocketClient()
{
	var self = this;

	var WSClient = null;
	var connection = null;
	var _protocol = "";
	var e_protocol = "";

	self.start = function(hostname, port, protocol, proxyto, callback)
	{
		_protocol = protocol;
		e_protocol = "WebSocketClient is not connected to the " + protocol + " protocol.";

		logger.info("Trying to connect to " + hostname + ":" + port + "/" + protocol);

		WSClient = new websockclient();

		WSClient.on('connectFailed', function(err)
		{
			callback(err, null);
		});

		WSClient.on('connect', function(connected)
		{
			logger.info("WebSocketClient " + protocol + " connected");

			connection = connected;
			callback(null, true);

			connection.on('error', function(err)
			{
				logger.info("WebSocketClient " + protocol + " error: " + err);
				connection = null;
			});

			connection.on('close', function(reasonCode, description)
			{
				logger.info("WebSocketClient " + protocol + " close: " + reasonCode + ", " + description);
				connection = null;
			});

			connection.on('message', function(message)
			{
				logger.info("WebSocketClient " + protocol + " proxying data " + message.utf8Data);

				var routeByConnectionSequence = null;
				var rpc = JSON.parse(message.utf8Data);
				var rpcid = rpc.id;
				var splid = (rpc.id != null ? (rpc.id.toString()).split(":") : []);
				// If routing information doesn't exist add the information and broadcast the message (rpc call or return value) to all the connections.
				if(splid.length == 1)
					rpc.id = rpc.id + ":null";
				// If routing information exists remove the information and send the message (rpc call or return value) to a specific connection.
				else if(splid.length == 2)
				{
					rpc.id = parseInt(splid[0]);
					routeByConnectionSequence = (splid[1] == "null" ? null : parseInt(splid[1]));
				}

				var str = (proxyto != null ? proxyto.send(JSON.stringify(rpc), routeByConnectionSequence) : e_protocol);

				// Return error only if rpc call is not a notification (notification: id = null)
				if(str != "")
				{
					logger.error(str);
					if(rpcid != null)
						connection.send(JSON.stringify({"jsonrpc": "2.0", "error": {"code": "Spacelet", "message": str}, "id": rpcid}));
				}
			});
		});

		WSClient.connect("ws://" + hostname + ":" + port + "/", protocol);
	}

	self.close = fibrous( function()
	{
		if(connection != null)
			connection.close();
		connection = null;
		logger.info("WebSocketClient " + _protocol + " close called");
	});

	self.send = function(message)
	{
		if(connection == null || !connection.connected)
			return e_protocol;

		logger.info("WebSocketServer " + _protocol + " sending message: " + message);
		connection.send(message);

		return "";
	}
}

module.exports = WebSocketClient;
