#!/usr/bin/env node
/**
 * PictureViewer, 2.4.2014 Spaceify Inc.
 *
 * rpcObj = { is_secure: Boolean, id: Number, server_type: String, remotePort: Number, remoteAddress: Number, origin: String }
 * serviceObj = { id: Number, is_secure: Boolean, service_name: String, server_type: String, remotePort: Number, remoteAddress: Number, origin: String }
 *
 * @class PictureViewer
 */

var spaceify = require("/api/spaceifyapplication.js");

function PictureViewer()
	{
var self = this;

var clients = {};
var content = {};
var content_type = "spaceify/pictureviewer";

var pv_service = pv_service_secure = null;
var pv_service_name = "spaceify.org/services/pictureviewer";

var bs_service = bs_service_secure = null;
var bs_service_name = "spaceify.org/services/bigscreen";

	// MANAGE CONNECTIONS!!! -- -- -- -- -- -- -- -- -- -- //
var onClientDisconnected = function(serviceObj)
	{
	if(clients[serviceObj.id])											// Remove disconnected clients or contents from the lists
		delete clients[serviceObj.id];

	if(content[serviceObj.id])
		delete content[serviceObj.id];
	}

	// EXPOSED JSON-RPC METHODS -- -- -- -- -- -- -- -- -- -- //
var clientConnect = function(bs_id, rpcObj)
	{
	clients[rpcObj.id] = {bs_id: bs_id, is_secure: rpcObj.is_secure};	// Add a client to the connected clients
	}

var contentConnect = function(bs_id, rpcObj)
	{
	content[rpcObj.id] = {bs_id: bs_id, is_secure: rpcObj.is_secure};	// Add a content page to the connected content pages
	}

var showPicture = function(pid, bs_id, rpcObj)
	{
	var content_ids = [];												// Send picture id to the content page(s) having the bs_id

	for(var id in content)
		{
		if(content[id].bs_id == bs_id)
			content_ids.push(id);
		}

	if(content_ids.length == 0)											// No content pages having our content available yet
		(!rpcObj.is_secure ? bs_service : bs_service_secure).callRpc("loadContent", [spaceify.getOwnUrl(rpcObj.is_secure, true) + "/content.html?pid=" + pid + "&bs_id=" + bs_id, bs_id, content_type], self);
	else																// Send showPicture request to all content pages having the bs_id
		for(var i=0; i<content_ids.length; i++)
			(!rpcObj.is_secure ? pv_service : pv_service_secure).callRpc("showPicture", [pid], self, null, content_ids[i]);
	}

	// -- -- -- -- -- -- -- -- -- -- //
self.start = function()
	{
	bs_service = spaceify.getRequiredService(bs_service_name);
	bs_service_secure = spaceify.getRequiredServiceSecure(bs_service_name);

	pv_service = spaceify.getProvidedService(pv_service_name);
	pv_service_secure = spaceify.getProvidedServiceSecure(pv_service_name);

	spaceify.exposeRpcMethodProvided("showPicture", self, showPicture, pv_service_name);
	spaceify.exposeRpcMethodProvided("clientConnect", self, clientConnect, pv_service_name);
	spaceify.exposeRpcMethodProvided("contentConnect", self, contentConnect, pv_service_name);

	//spaceify.setConnectionListenersProvided(onClientConnected, pv_service_name);
	spaceify.setDisconnectionListenersProvided(onClientDisconnected, pv_service_name);
	}

}

var stop = function()
	{
	spaceify.stop();
	}

var pictureViewer = new PictureViewer();
spaceify.start(pictureViewer, {webservers: {http: true, https: true}});