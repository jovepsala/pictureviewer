/**
 * INJECT CONTROLS / START SPACELET * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 */
var pictureRPC = null;
var commandRPC = null;
var pictureURL = "";
var injectURL = "";
var unique_name = "spaceify/pictureviewer";

window.addEventListener("load", function()
{
	if(typeof jQuery == "undefined")
	{
		var head = document.getElementsByTagName("head")[0] || document.documentElement;
		var script = document.createElement('script');
		script.onload = function()
		{
			script.onload = null;
			readyToStart();
		}
		script.src = location.protocol + "//edge.spaceify.net/js/metro/jquery/jquery.min.js";
		head.parentNode.insertBefore(script, head.nextSibling);
	}
	else
		readyToStart();
});

window.addEventListener("unload", function()
{
	connectionClose(true);
});

function connectionClose(isInternal)
{
	if(pictureRPC)
	{
		pictureRPC.close();
		pictureRPC = null;
	}

	if(commandRPC)
	{
		commandRPC.close();
		commandRPC = null;
	}

	processImgTags(false);
}

function readyToStart()
{
	// Start Spacelet - returns the command channel
	spaceifyCore.startSpacelet(unique_name, "command", function(err, data)
	{
		if(err)
			showError("load:startSpacelet", err);
		else
		{
			commandRPC = data;
			commandRPC.exposeRPCMethod("pageLoaded", self, pageLoaded);
			commandRPC.exposeRPCMethod("connectionClose", self, connectionClose);			// connectionClose originates from the jsapp when all the bigscreens are closed or from connection class when connection is lost
			commandRPC.setCloseEventListener(connectionClose);

			injectURL = spaceifyCore.getInjectURL(unique_name);								// try spacelets internal web server first and resort to the global Spaceify web server
			injectURL = (injectURL == "" ? spaceifyCore.getEdgeURL() + "/injects/" : injectURL);

			// Start the Picture viewer channel service
			var pvrpc = new SpaceifyRPC(spaceifyCore.getService(unique_name, "frontend"), false, function(err, data)
			{
				if(err)
					showError("load::RPC:", err);
				else
				{
					pictureRPC = pvrpc;

					pictureRPC.setCloseEventListener(connectionClose);						// monitor connection lost
				}

				// Connection is now setup or not - Find img tags
				processImgTags(true);

				// Clear paywall
				if(localStorage)
					localStorage.clear();
			});
		}
	});
}

function processImgTags(bSet)
{
	var regx = /(\.jpg|\.png|\.gif)$/;

	$('img').each(function()
	{
		var isInsideLink = false;
		var srcFromHref = "";

		$(this).parents().each(function()													// find out is the image inside a hyperlink
		{
			if($(this).prop("tagName") == "A")													// yes -> does the link specify an image = check the presence of a known file extension
			{
				if($(this).prop("pathname").match(regx))
				{
					srcFromHref = $(this).prop("href");												// store the href and clear hyperlink so that browser stays on the same page
					$(this).prop("href", "");
				}
				else																			// no -> don't add click event handler
					isInsideLink = true;
			}
		});

		if(!isInsideLink)
		{
			//$(this).css("box-sizing", "border-box");
			//$(this).css("-moz-box-sizing", "border-box");
			
			if(bSet)
			{
				$(this).css("margin", "0px");
				$(this).css("padding", "0px");
				$(this).css("border-top", "4px solid #0F0");
				$(this).css("border-bottom", "4px solid #0F0");

				$(this).click(function()
				{
					url = (srcFromHref != "" ? srcFromHref : $(this).attr("src"));
					showPicture(url, false);
					$(this).fadeOut(500, function() { $(this).fadeIn(500); });
				});
			}
			else
			{
				$(this).unbind("click");
				$(this).css("border-top", "0px none transparent");
				$(this).css("border-bottom", "0px none transparent");
			}
		}
	});
}

/**
 * HANDLE EVENTS ORIGINATING FROM THE INJECTED CONTROLS * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 */
function showPicture(url, bPageLoaded)
{
	if(!pictureRPC || !commandRPC)
		return false;

	if(!bPageLoaded)																			// 1/2: test every time that the Picture viewer is loaded
		return loadPage(url);

	pictureRPC.call("showPicture", [url], self, function(err, data) { if(err) throw err; });	// 2/2: page is loaded or was already loaded -> send event request
}

/**
 * COMMAND EVENTS RECEIVED THROUGH RPC FROM BIGSCREEN * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 */
function loadPage(url)
{ // Call loadPage using the command channel service
	commandRPC.call("loadPage", [spaceifyCore.getInjectPort(unique_name, true) + "/pictureviewer.html?url=" + spaceifyCore.encodeBase64(url), "pictureviewer", spaceifyCore.isSecure()], self, function(err, data)
	{
		if(err)
			showError("loadPage:", err);
		else
		{
			if(data === true)
				showPicture(url, true);
			// else start waiting for the pageLoaded rpc call from the bigscreen
		}
	});

	return false;
}

function pageLoaded(url, source, initialized)
{ // Page is now loaded and ready to show the requested picture
	if(source == "pictureviewer" && initialized)
	{
		pictureURL = url;														// This is now the currently shown image
		showPicture(url, true);
	}

	return true;
}

/**
 * COMMON FUNCTIONS * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 */

function showError(lerr, rerr)
{
	var errstr = language.formatErrorString(lerr, rerr);
	//alert(errstr);
	console.log(errstr);
}

function setInfoText(str)
{
	return language.INFO_TITLE + (str != "" ? language.TITLE_SEP + str : "");
}
