function Language()
{
	var self = this;

	/** ERRORS */
	self.E_NO_SERVICE = {"codes": [1000], "messages": ["Requested spacelet/service is not available."]};
	self.E_NO_BIG_SCREEN = {"codes": [1001], "messages": ["No big screens having the big screen id are available."]};
	self.E_LOAD_CONTENT = {"codes": [1002], "messages": ["Content web page is not ready and must be loaded."]};
}

var language = new Language();
