#!/usr/bin/env node
/**
 * PictureViewer, 2.4.2014 Spaceify Oy
 *
 * @class PictureViewer
 */

var spaceify = require("/api/spaceifyapplication.js");

function PictureViewer()
	{
var self = this;

var clients = {};
var content = {};
var contentType = "spaceify/pictureviewer";

var bigscreenService = null;
var pictureViewerService = null;

	// CONNECTIONS -- -- -- -- -- -- -- -- -- -- //
var onClientDisconnected = function(cId)
	{
	if(clients[cId])													// Remove disconnected clients or contents from the lists
		delete clients[cId];

	if(content[cId])
		delete content[cId];
	}

	// EXPOSED JSON-RPC METHODS -- -- -- -- -- -- -- -- -- -- //
var clientConnect = function(bigscreenId)
	{
	clients[arguments[arguments.length-1].cId] = {bigscreenId: bigscreenId};	// Add a client to the connected clients
	}

var contentConnect = function(bigscreenId)
	{
	content[arguments[arguments.length-1].cId] = {bigscreenId: bigscreenId};	// Add a content page to the connected content pages
	}

var showPicture = function(pid, bigscreenId)
	{
	var contentIds = [];														// Send picture id to the content page(s) having the bigscreenId

	for(var id in content)
		{
		if(content[id].bigscreenId == bigscreenId)
			contentIds.push(id);
		}

	if(contentIds.length == 0)													// No content pages having our content available yet
		bigscreenService.callRpc("loadContent", [spaceify.getOwnUrl(false, true) + "/content.html?pid=" + pid + "&bigscreenId=" + bigscreenId, bigscreenId, contentType], self);
	else																		// Send showPicture request to all content pages having the bigscreenId
		for(var i=0; i<contentIds.length; i++)
			pictureViewerService.callRpc("showPicture", [pid], self, null, contentIds[i]);
	}

	// -- -- -- -- -- -- -- -- -- -- //
self.start = function()
	{
	bigscreenService = spaceify.getRequiredService("spaceify.org/services/bigscreen");

	pictureViewerService = spaceify.getProvidedService("spaceify.org/services/pictureviewer");

	pictureViewerService.exposeRpcMethod("showPicture", self, showPicture);
	pictureViewerService.exposeRpcMethod("clientConnect", self, clientConnect);
	pictureViewerService.exposeRpcMethod("contentConnect", self, contentConnect);

	pictureViewerService.setDisconnectionListener(onClientDisconnected);
	}

}

var stop = function()
	{
	spaceify.stop();
	}

var pictureViewer = new PictureViewer();
spaceify.start(pictureViewer, {webservers: {http: true, https: true}});