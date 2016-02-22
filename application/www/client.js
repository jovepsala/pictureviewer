/**
 * Client side code for the Pictureviewer spacelet.
 * Spaceify Inc. 2014
 */

var bs_id = "default";
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
var config = new SpaceifyConfig();
var network = new SpaceifyNetwork();
var utility = new SpaceifyUtility();
var request = new SpaceifyRequest();

var pv_service = null;

var unique_name = "spaceify/pictureviewer";
var pv_service_name = "spaceify.org/services/pictureviewer";

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
		{
		showMessage(err);
		window.setTimeout(spacelet.start, RECONNECT_TIMEOUT, unique_name, started);
		}
	else
		{
		pv_service = spacelet.getRequiredService(pv_service_name);
		pv_service.setDisconnectionListener(reconnectService);

		setup();
		}
	}

	// SERVICE -- -- -- -- -- -- -- -- -- -- //
var setup = function()
	{
	var status = pv_service.getStatus();

	if(status == config.CONNECTED)
		{
		pv_service.callRpc("clientConnect", [bs_id], null, null);								// Notify spacelet of a connected CLIENT

		processImgTags(true);																	// Modify img tags

		if(localStorage)																		// Clear paywall
			localStorage.clear();
		}
	else
		reconnectService(pv_service);
	}

var reconnectService = function(/*service*/)
	{ // Clear current and try to reconnect
	processImgTags(false);
	window.setTimeout(pv_service.reconnect, RECONNECT_TIMEOUT, setup);
	}

	// COMMON FUNCTIONS -- -- -- -- -- -- -- -- -- -- //
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
			pv_service.callRpc("showPicture", [jQuery(this).attr("data-pid"), bs_id]);

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