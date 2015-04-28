/**
 * Client side code for Pictureviewer spacelet.
 * Spaceify Inc. 2014
 */

var bs_id = "default";							// This is the id we use to connect to big screen(s). Available big screen ids can be acquired
												// using this spacelets getBigScreenIds method. It would be easy to a build selector for choosing 
												// a specific bigscreen but lets assume some big screen has the "default" id. Spacelets content.html 
												// can get the id from 'window.parent.bs_id' and must use it when messaging with the picture viewer 
												// spacelet (parent is the big screen IFRAME where content.html is loaded).

var spaceletRPC = null;

var RECONNECT_TIMEOUT = 10 * 1000;

/*****************
* DOM AND EVENTS *
*****************/
window.addEventListener("load", function()
{
	// jQuery is required and must be loaded if it isn't.
	if(typeof jQuery == "undefined")
	{
		var script = document.createElement('script');
		script.type = "text/javascript";
		script.onreadystatechange = function() { if(this.readyState == 4) connect(); }
		script.onload = function() { connect(); }
		script.src = location.protocol + "//edge.spaceify.net/js/jquery-1.11.1.min.js";

		var head = document.getElementsByTagName("head")[0] || document.documentElement;
		head.parentNode.insertBefore(script, head.nextSibling);
	}
	else
		connect();
});

/*****************
* RPC CONNECTION *
*****************/
function connect()
{
	$SC.startSpacelet("spaceify/pictureviewer", "spaceify.org/services/pictureviewer", function(err, data)
	{
		if(data)
		{
			// Remember the JSON-RPC connection to the service, call the service.
			if(data.rpc)
			{
				spaceletRPC = data.rpc;											// RPC connection to the spacelet...
				spaceletRPC.connectionListener(close);							// ..is kept open as long as spacelet closes it

				spaceletRPC.call("clientConnect", [bs_id], null, null);			// Notify spacelet of connected client

				processImgTags(true);											// Modify img tags

				if(localStorage)												// Clear paywall
					localStorage.clear();
			}
			else
				close(true, false, language.E_NO_SERVICE);
		}
		else
			close(true, false, err);
	});
}

function close(isInternal, status, err)
{
	if(spaceletRPC)
	{
		spaceletRPC.close();
		spaceletRPC = null;
	}

	initialize(status, err);

	window.setTimeout(connect, RECONNECT_TIMEOUT);								// Try to reconnect
}

/*********************************************
* EVENTS FROM THE INJECTED/MODIFIED CONTROLS *
*********************************************/
function showImage(url)
{
	spaceletRPC.call("showPicture", [url, bs_id, $SN.isSecure()], self, function(err, data)
	{
		if(data == -1)
			showMessage(language.E_NO_BIG_SCREEN);
		else if(data > 0)
			showMessage(language.E_LOAD_CONTENT);
	});
}

/*******************
* COMMON FUNCTIONS *
*******************/
function processImgTags(bSet)
{
	//var regx = /(\.jpg|\.png|\.gif)$/;
	var color = (bSet ? "#0F0" : "#F80");

	$('img').each(function()
	{
		$(this).css("margin", "0px");
		$(this).css("padding", "0px");
		$(this).css("border-top", "4px solid " + color);
		$(this).css("border-bottom", "4px solid " + color);
		$(this).css("box-sizing", "border-box");

		$(this).click(function()
		{
			showImage($(this).attr("src"), false);
			$(this).fadeOut(500, function() { $(this).fadeIn(500); });
		});
	});
}

function initialize(status, err)
{
	showMessage(err);
	processImgTags(status);
}

function showMessage(err)
{
	if(err)
		console.log($SU.makeErrorString(err));
}
