#!/usr/bin/env node
/**
 * PictureViewer, 2.4.2014 Spaceify Inc.
 * 
 * @class PictureViewer
 */

var fs = require("fs");
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

	var clients = {};
	var content = {};
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
			rpc.setDisconnectionListener(disconnectionListener);
			rpc.connect.sync({hostname: null, port: Config.FIRST_SERVICE_PORT, owner: "Pictureviewer"});
			
			rpcs.exposeMethod("getBigScreenIds", self, self.getBigScreenIds);
			rpcs.exposeMethod("showPicture", self, self.showPicture);
			rpcs.exposeMethod("clientConnect", self, self.clientConnect);
			rpcs.exposeMethod("contentConnect", self, self.contentConnect);
			rpcs.setDisconnectionListener(disconnectionListener);
			rpcs.connect.sync({hostname: null, port: Config.FIRST_SERVICE_PORT_SECURE, is_secure: true, key: key, crt: crt, ca_crt: ca_crt, owner: "Pictureviewer" });

			// Start applications http and https web servers
			httpServer.connect.sync({hostname: null, port: 80, www_path: www_path, owner: "pictureviewer"});
			httpsServer.connect.sync({hostname: null, port: 443, is_secure: true, key: key, crt: crt, ca_crt: ca_crt, www_path: www_path, owner: "Pictureviewer"});

			// Register provided services
			rpcCore.sync.callRPC("registerService", ["spaceify.org/services/pictureviewer"], self);

			// Connect to the Big screen application
				// Get the required service - this throws an error if service is not available -> initialization fails and spacelet is not started.
			var service = rpcCore.sync.callRPC("getService", ["spaceify.org/services/bigscreen", null], self);

				// Open a connection to the service.
			rpcBS.sync.connect({hostname: Config.EDGE_HOSTNAME, port: service.port, persistent: true});

			// Application initialialized itself successfully.
			console.log(Config.CLIENT_APPLICATION_INITIALIZED);
		}
		catch(err)
		{
			// Application failed to initialialize itself. Pass the error message to the core.
			logger.error("{{" + err.message + "}}");
			console.log(Config.CLIENT_APPLICATION_UNINITIALIZED);

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
	var disconnectionListener = function(connection)
	{
		if(clients[connection.id])
			delete clients[connection.id];

		if(content[connection.id])
			delete content[connection.id];
	}

	/***************************
	* EXPOSED JSON-RPC METHODS *
	***************************/

	// Add a client to the connected clients
	self.clientConnect = fibrous( function(bs_id)
	{
		var connection = arguments[arguments.length - 1];
		clients[connection.id] = {bs_id: bs_id, connection: connection, is_secure: connection.is_secure};
	});

	// Add a content page to the connected content pages
	self.contentConnect = fibrous( function(bs_id)
	{
		var connection = arguments[arguments.length - 1];
		content[connection.id] = {bs_id: bs_id, connection: connection, is_secure: connection.is_secure};
	});

	// Send picture id to the content page(s) having the bs_id.
	self.showPicture = fibrous( function(pid, bs_id, is_secure)
	{
		var content_pages = 0;
		for(var id in content)												// Send showPicture request to all content pages having the bs_id
		{
			if(content[id].bs_id == bs_id)
				content_pages += (is_secure ? rpc : rpcs).sync.callRPC("showPicture", [pid], self, null, id);
		}

		if(content_pages == 0)												// No content pages having our content available yet
			content_pages = rpcBS.sync.callRPC("loadContent", [Utility.getApplicationURL(is_secure) + "/content.html?pid=" + pid, bs_id, content_type], self);

		return content_pages;
	});

	// Get the ids from big screens and relay them to the client
	self.getBigScreenIds = fibrous( function()
	{
		return rpcBS.sync.callRPC("getBigScreenIds", [], self);
	});

}

fibrous.run(function()																		// Start the application
	{
	logger.setOptions({labels: logger.ERROR});

	var pictureViewer = new PictureViewer();
	pictureViewer.sync.start();
	});
