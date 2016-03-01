/**
 * Client side code for the Pictureviewer spacelet.
 * Spaceify Inc. 2014
 */

var bigscreenId = "default";
var pictureViewerClient = null;

	// DOM AND EVENTS -- -- -- -- -- -- -- -- -- -- */
window.addEventListener("spaceifyReady", function()		// Called after Spaceify's classes are injected
	{
	pictureViewerClient = new PictureViewerClient();
	pictureViewerClient.getResources();
	});

	// CLASS -- -- -- -- -- -- -- -- -- -- //
function PictureViewerClient()
{
var self = this;

var spacelet = new Spacelet();
var network = new SpaceifyNetwork();
var request = new SpaceifyRequest();

var pictureviewerService = null;

var unique_name = "spaceify/pictureviewer";

var RECONNECT_TIMEOUT = 10 * 1000;

self.getResources = function()
	{
	request.addjQueryTag(function()																// Add jQuery if it is not already on the host page
		{
		spacelet.start(unique_name, started);													// Start the spacelet after jQuery is ready
		});
	}

	// SPACELET -- -- -- -- -- -- -- -- -- -- //
var started = function(err, status)
	{
	if(!status)																					// Try starting the spacelet again
		window.setTimeout(spacelet.start, RECONNECT_TIMEOUT, unique_name, started);
	else
		{
		pictureviewerService = spacelet.getRequiredService("spaceify.org/services/pictureviewer");

		pictureviewerService.setDisconnectionListener(disconnectionListener);

		pictureviewerService.callRpc("clientConnect", [bigscreenId], null, null);				// Notify spacelet of a connected CLIENT

		processImgTags(true);																	// Modify img tags

		if(localStorage)																		// Clear paywall
			localStorage.clear();
		}
	}

	// SERVICE -- -- -- -- -- -- -- -- -- -- //
var disconnectionListener = function()
	{
	processImgTags(false);
	}

	// -- -- -- -- -- -- -- -- -- -- //
var processImgTags = function (bSet)
	{
	//var regx = /(\.jpg|\.png|\.gif)$/;
	var color = (bSet ? "#0F0" : "#F80");

	jQuery("img").each(function()
		{
		if(!jQuery(this).attr("src") || jQuery(this).attr("src").indexOf("snstatic.fi") == -1)	// Link to Helsingin Sanomat image
			return;

		var parser = network.parseURL(jQuery(this).attr("src"));								// Get the picture id from the URL, test its validity
		var parts = parser.path.split("/");
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
			pictureviewerService.callRpc("showPicture", [jQuery(this).attr("data-pid"), bigscreenId]);

			jQuery(this).fadeOut(500, function() { jQuery(this).fadeIn(500); });
			});
		});
	}

}