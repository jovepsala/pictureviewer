/**
 * Client side code for Pictureviewer spacelet.
 * Spaceify Inc. 2014
 */

var bs_id = "default";									// This is the id we use to connect to big screen(s). Available big screen ids can be acquired
											// using this spacelets getBigScreenIds method. It would be easy to a build selector for choosing 
											// a specific bigscreen but lets assume some big screen has the "default" id. Spacelets content.html 
											// can get the id from 'window.parent.bs_id' and must use it when messaging with the picture viewer 
											// spacelet (parent is the big screen IFRAME where content.html is loaded).
var pictureViewerClient = null;

	/* DOM AND EVENTS // // // // // // // // // // */
window.addEventListener("spaceifyReady", function()		// When Spaceify has injected its and applications files it sends this event.
{
	pictureViewerClient = new PictureViewerClient();
	pictureViewerClient.initialize();
});

	/* CLASS // // // // // // // // // // */
function PictureViewerClient()
{
	var self = this;

	var pv_service = null;
	var client_id = Math.floor(Math.random() * (Math.pow(2, 32) - 1));

	var RECONNECT_TIMEOUT = 10 * 1000;

	var core = new SpaceifyCore();
	var network = new SpaceifyNetwork();
	var utility = new SpaceifyUtility();

	self.initialize = function()
	{
		utility.addjQuery(connect);															// Adds jQuery if it is not already on the host page
	}

	var connect = function()
	{
		core.startSpacelet("spaceify/pictureviewer", function(err, services)
		{
			if(services)
			{ // services is an instance of SpaceifyService class. Use its methods to get service connections etc. (see documentation)
				pv_service = services.getService("spaceify.org/services/pictureviewer");	// Get the service connection

				services.setDisconnectionListener(pv_service, disconnectionListener);		// Try to reconnect if connection is lost

				pv_service.callRPC("clientConnect", [bs_id], null, null);					// Notify spacelet of a connected client

				processImgTags(true);														// Modify img tags

				if(localStorage)															// Clear paywall
					localStorage.clear();
			}
			else
				{
				showMessage(err);
				disconnectionListener("");
				}
		});
	}

	var disconnectionListener = function(service_name)
	{
		pv_service = null;

		processImgTags(false);

		window.setTimeout(connect, RECONNECT_TIMEOUT);										// Try to reconnect
	}

	/*********************************************
	* EVENTS FROM THE INJECTED/MODIFIED CONTROLS *
	*********************************************/
	var showPicture = function(pid)
	{
		pv_service.callRPC("showPicture", [pid, bs_id], self, function(err, data)
		{
			if(data == -1)
				showMessage(language.E_NO_BIG_SCREEN);
		});
	}

	/*******************
	* COMMON FUNCTIONS *
	*******************/
	var processImgTags = function (bSet)
	{
		//var regx = /(\.jpg|\.png|\.gif)$/;
		var color = (bSet ? "#0F0" : "#F80");

		jQuery("img").each(function()
		{
			if(!jQuery(this).attr("src") || jQuery(this).attr("src").indexOf("snstatic.fi") == -1)	// Link to Helsingin Sanomat image
				return;

			var parser = network.parseURL(jQuery(this).attr("src"));								// Get the picture id from the URL, test its validity
			var parts = parser.pathname.split("/");
			var pid = parts[parts.length - 1];

			if(!/^[0-9]+$/.test(pid))
				return;

			jQuery(this).css("margin", "0px");
			jQuery(this).css("padding", "0px");
			jQuery(this).css("border-top", "4px solid " + color);
			jQuery(this).css("border-bottom", "4px solid " + color);
			jQuery(this).css("box-sizing", "border-box");

			jQuery(this).attr("data-pid", pid);

			jQuery(this).click(function()
			{
				showPicture(jQuery(this).attr("data-pid"));
				jQuery(this).fadeOut(500, function() { jQuery(this).fadeIn(500); });
			});
		});
	}

	var showMessage = function(err)
	{
		if(err)
			console.log(utility.errorsToString(err));
	}

}
