#!/usr/bin/env node
/**
 * PictureViewer, 2.4.2014 Spaceify Inc.
 * 
 * @class PictureViewer
 */

var fs = require("fs");
var fibrous = require("fibrous");
var logger = require("./api/logger");
var Utility = require("./api/utility");
var Const = require("./api/constants");
var Config = require("./api/config")();
var WebServer = require('./api/webserver');
var WebSocketServer = require("./wsserver");
var WebSocketClient = require("./wsclient");
var WebSocketRPCClient = require("./api/websocketrpcclient");

function PictureViewer()
{
	var self = this;

	var httpPort = 80;
	var httpsPort = 443;
	var service_port = Const.FIRST_SERVICE_PORT;

	var WSCommandServer = new WebSocketServer();
	var WSCommandClient = new WebSocketClient();
	var WSPictureFServer = new WebSocketServer();
	var WSPictureBServer = new WebSocketServer();
	var rpcSpaceify = new WebSocketRPCClient();
	var httpServer = new WebServer();
	var httpsServer = new WebServer();

	self.start = fibrous( function()
	{
		try
		{
			// Get and parse manifest
			var manifestFile = fs.sync.readFile("manifest", {"encoding": "utf8"});
			var manifest = Utility.parseManifest(manifestFile);

			// Establish a RPC websocket connection to the Spaceify Core
			rpcSpaceify.sync.connect({hostname: Config.EDGE_HOSTNAME, port: Config.CORE_PORT_WEBSOCKET, subprotocol: Config.CORE_SUBPROTOCOL, persistent: true, owner: "PictureViewer"});

			// find the required service
			var service = rpcSpaceify.sync.callRpc("findService", ["spaceify/bigscreen", "command_frontend"], self);

			// SETUP A COMMAND CHANNEL: [user]<>[pictureviewer::command|spacelet]<>[bigscreen::command_frontend|jsapp]
			WSCommandServer.sync.start(null, service_port++, "command", WSCommandClient, false);										// user to spacelet
			WSCommandClient.sync.start(Config.EDGE_HOSTNAME/*service.ip*/, service.port, "command_frontend", WSCommandServer);			// spacelet to jsapp

			// SETUP A PICTURE VIEWER CHANNEL: [user]<>[pictureviewer::frontend<<spacelet>>pictureviewer::backend]<>[bigscreen]
			WSPictureFServer.sync.start(null, service_port++, "frontend", WSPictureBServer, false);										// user to spacelet
			WSPictureBServer.sync.start(null, service_port++, "backend", WSPictureFServer, false);										// bigscreen video to spacelet

			// Start web servers
			httpServer.connect.sync({hostname: null, port: httpPort, owner: "PictureViewer"});

			var key = fs.readFileSync(Config.APPLICATION_PATH + Config.SSL_DIRECTORY + Const.APPLICATION_KEY);
			var cert = fs.readFileSync(Config.APPLICATION_PATH + Config.SSL_DIRECTORY + Const.APPLICATION_CRT);
			result = httpsServer.connect.sync({hostname: null, port: httpsPort, isSsl: true, sslKey: key, sslCert: cert, owner: "PictureViewer"});

			// Register provided services
			rpcSpaceify.sync.callRpc(["registerService", "registerService", "registerService"], [["command"], ["frontend"], ["backend"]], self);

			// Let the Spaceify Core know this spacelet was succesfully initialized (= true)
			rpcSpaceify.sync.callRpc("initialized", [true, null], self);
		}
		catch(err)
		{
			err = Utility.format(Language.ERROR_STRING, Utility.makeErrorO(err, true));

			logger.error(err);

			// Let the Spaceify Core know this spacelet failed to initialize itself (= false)
			rpcSpaceify.sync.callRpc("initialized", [false, err], self);

			self.sync.stop();
		}
		finally
		{
			rpcSpaceify.sync.close();
		}
	});

	self.stop = fibrous( function()
	{
		if(WSCommandServer != null)
			WSCommandServer.sync.close();
		if(WSCommandClient != null)
			WSCommandClient.sync.close();

		if(WSVideoFServer != null)
			WSVideoFServer.sync.close();
		if(WSVideoBServer != null)
			WSVideoBServer.sync.close();

		if(httpServer)
			httpServer.sync.close();
		if(httpsServer)
			httpsServer.sync.close()
	});

}

fibrous.run(function()
	{
	logger.setOptions({labels: logger.ERROR});

	var pictureViewer = new PictureViewer();
	pictureViewer.sync.start();
	});
