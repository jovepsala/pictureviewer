function Language()
{
	var self = this;

	/** ERRORS */
	self.E_NO_SERVICE = {"codes": [1000], "messages": ["Requested spacelet/service is not available."]};
	self.E_NO_BIG_SCREEN = {"codes": [1001], "messages": ["No big screens having the big screen id are available."]};
}

var language = new Language();
