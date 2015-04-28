#!/usr/bin/env node
/**
 * PictureViewer, 2.4.2014 Spaceify Inc.
 * 
 * @class PictureViewer
 *
 * NOTICE! The use of "master" is here for demonstration only. Its intended purpose is to 
 * control messages sent to clients from content pages. It is usefull in applications 
 * where messages from multiple content pages might flood clients with duplicate messages.
 * One example is video applications which send progress messages.
 *
 *
 */

var fs = require("fs");
var url = require("url");
var fibrous = require("fibrous");
var logger = require("/api/logger");
var Utility = require("/api/utility");
var Config = require("/api/config")();
var WebServer = require('/api/webserver');
var WebSocketRPCClient = require("/api/websocketrpcclient");
var WebSocketRPCServer = require("/api/websocketrpcserver");

function PictureViewer()
{
	var self = this;

	var clients = [];
	var content = [];
	var content_type = "spaceify/pictureviewer";
	var httpServer = new WebServer();
	var httpsServer = new WebServer();
	var rpc = new WebSocketRPCServer();
	var rpcs = new WebSocketRPCServer();
	var rpcBS = new WebSocketRPCClient();
	var rpcCore = new WebSocketRPCClient();
	var www_path = Config.APPLICATION_WWW_PATH;
	var ca_crt = Config.API_WWW_PATH + Config.SPACEIFY_CRT;
	var key = Config.APPLICATION_TLS_PATH + Config.SERVER_KEY;
	var crt = Config.APPLICATION_TLS_PATH + Config.SERVER_CRT;

	self.start = fibrous( function()
	{
		try
		{
			// Establish a RPC connection to the Spaceify Core
			rpcCore.sync.connect({hostname: Config.EDGE_HOSTNAME, port: Config.CORE_PORT_WEBSOCKET, persistent: true, owner: "Pictureviewer"});

			// Start applications JSON-RPC ws and wss servers
			rpc.exposeMethod("getBigScreenIds", self, self.getBigScreenIds);		// Pictureviewers methods
			rpc.exposeMethod("showPicture", self, self.showPicture);
			rpc.exposeMethod("clientConnect", self, self.clientConnect);
			rpc.exposeMethod("contentConnect", self, self.contentConnect);
			rpc.connect.sync({hostname: null, port: Config.FIRST_SERVICE_PORT, connectionListener: connectionListener, owner: "Pictureviewer" });

			rpcs.exposeMethod("getBigScreenIds", self, self.getBigScreenIds);
			rpcs.exposeMethod("showPicture", self, self.showPicture);
			rpcs.exposeMethod("clientConnect", self, self.clientConnect);
			rpcs.exposeMethod("contentConnect", self, self.contentConnect);
			rpcs.connect.sync({hostname: null, port: Config.FIRST_SERVICE_PORT_SECURE, is_secure: true, key: key, crt: crt, ca_crt: ca_crt, connectionListener: connectionListener, owner: "Pictureviewer" });

			// Start applications http and https web servers
			httpServer.connect.sync({hostname: null, port: 80, www_path: www_path, owner: "pictureviewer"});
			httpsServer.connect.sync({hostname: null, port: 443, is_secure: true, key: key, crt: crt, ca_crt: ca_crt, www_path: www_path, owner: "Pictureviewer"});

			// Register provided services
			rpcCore.sync.call("registerService", ["spaceify.org/services/pictureviewer"], self);

			// Connect to the Big screen application
				// Get the required service - this throws an error if service is not available -> initialization fails and spacelet is not started.
			var service = rpcCore.sync.call("getService", ["spaceify.org/services/bigscreen", null], self);

				// Open a connection to the service.
			rpcBS.sync.connect({hostname: Config.EDGE_HOSTNAME, port: service.port, persistent: true});

			// Notify the core application initialialized itself successfully
			rpcCore.sync.call("initialized", [true, null], self);
		}
		catch(err)
		{
			logger.error(err.message);

			// Notify the core application failed to initialialize itself. The error message can be passed to the core.
			rpcCore.sync.call("initialized", [false, err.message], self);

			stop.sync();
		}
		finally
		{
			rpcCore.sync.close();
		}
	});

	stop = fibrous( function()
	{
		rpc.sync.close();
		rpcs.sync.close();

		httpServer.sync.close();
		httpsServer.sync.close();

		rpcBS.sync.close();
	});

	/************************
	* MANAGE CONNECTIONS!!! *
	************************/
	var connectionListener = function(type, owner, connection)
	{
		if(type != "close") return;

		for(var i=0; i<content.length; i++)												// Remove content page connection and set new master
		{
			if(content[i].connection == connection)
			{
				var cntnt = content.splice(i, 1);

				for(var j=0; j<content.length; j++)
				{
					if(content[j].bs_id == cntnt.bs_id)
					{ content[j].isMaster = true; break; }
				}

				break;
			}
		}

		for(var i=0; i<clients.length; i++)												// Remove client connection
		{
			if(clients[i].connection == connection)
			{
				clients.splice(i, 1);
				break;
			}
		}
	}

	/***************************
	* EXPOSED JSON-RPC METHODS *
	***************************/

	// Add a client to the connected clients
	self.clientConnect = fibrous( function(bs_id)
	{
		var connection = arguments[arguments.length - 1];
		clients.push({bs_id: bs_id, connection: connection, id: connection.id, is_secure: connection.is_secure});
	});

	// Add a content page to the connected content pages
	self.contentConnect = fibrous( function(bs_id)
	{
		// One of the content pages with bs_id must be the master.
		var isMaster = true;
		for(var i=0; i<content.length; i++)
		{
			if(content[i].isMaster && content[i].bs_id) {
				isMaster = false; break; }
		}

		var connection = arguments[arguments.length - 1];
		content.push({bs_id: bs_id, isMaster: isMaster, connection: connection, id: connection.id, is_secure: connection.is_secure});
	});

	// Send picture id to the content page(s) having the bs_id.
	self.showPicture = fibrous( function(_url, bs_id, is_secure)
	{
		var purl = url.parse(_url, false);												// Get the picture id from the URL
		var pids = purl.pathname.split("/");
		var pid = pids[pids.length - 1];

		var hasBS = false;
		for(var i=0; i<content.length; i++)												// Send showPicture request if possible
		{
			if(content[i].bs_id == bs_id)
			{
				hasBS = true;
				(!content[i].is_secure ? rpc : rpcs).sync.call("showPicture", [pid], self, content[i].id);
			}
		}

		if(!hasBS)																		// No big screens having our content available yet
		{
			var port = (!is_secure ? process.env["PORT_80"] : process.env["PORT_443"]);
			var URL = (!is_secure ? "http://" : "https://") + Config.EDGE_HOSTNAME + ":" + port + "/content.html?pid=" + pid;

			return rpcBS.sync.call("setContentURL", [URL, bs_id, content_type], self);
		}
	});

	// Get the ids from big screens and relay them to the client
	self.getBigScreenIds = fibrous( function()
	{
		return rpcBS.sync.call("getBigScreenIds", [], self);
	});

}

fibrous.run(function()																		// Start the application
	{
	logger.setOptions({labels: logger.ERROR});

	var pictureViewer = new PictureViewer();
	pictureViewer.sync.start();
	});
