/*global debug */

var UrlSchemes = {
	//known url schemes.
	//idea: search user supplied URL for "key"
	//replace URL for checkCredentials, caldav and carddav with known URLs.
	//issue: some require user specific parts in URL, replace them on useage...
	//	   if a replacement is required more than once, change function!
	urlSchemes: [
		{
			//contact & calendar hostname vary for each user, it seems.
			keys:			  ["icloud.com"],
			checkCredentials: "https://p02-contacts.icloud.com:443"
		},
		{
			keys:			  ["google."],
			//calendar does not yet work, requires OAuth2,
			//will require new validator and own account, so
			//there will be two google accounts until google supports
			//OAuth2 for contacts also. => ok, it seems like this already
			//exists: https://developers.google.com/google-apps/carddav/
			//so change the google account template and create custom UI for OAuth2
			//try to keep OAuth2 UI general.. probably others use it, too, in the future.
			calendar:	      "https://apidata.googleusercontent.com/caldav/v2/%USERNAME%/events",
			contact:           "https://www.google.com:443/carddav/v1/principals/%USERNAME%/lists/",
			checkCredentials: "https://www.google.com:443/.well-known/carddav"
		},
		{
			keys:	          ["DISABLEDyahoo."],
			calendar:	      "https://caldav.calendar.yahoo.com",
			contact:		  "https://carddav.address.yahoo.com",
			checkCredentials: "https://carddav.address.yahoo.com"
		},
		{
			keys:			  ["/owncloud", "cloudu.de"],
            //issue: calendar/contact contain display name, which we don't know and can be different from username??
			calendar:	      "%URL_PREFIX%/remote.php/caldav/calendars/%USERNAME%/",
			contact:		  "%URL_PREFIX%/remote.php/carddav/addressbooks/%USERNAME%/",
			checkCredentials: "%URL_PREFIX%/remote.php/caldav"
		},
		{
			keys:			  ["/egroupware"],
			calendar:	      "%URL_PREFIX%/groupdav.php/%USERNAME%/",
			contact:		  "%URL_PREFIX%/groupdav.php/%USERNAME%/",
			checkCredentials: "%URL_PREFIX%/groupdav.php",
			additionalConfig: {
				preventDuplicateCalendarEntries: true
			}
		},
		{
			keys:			  ["/SOGo"],
			calendar:	      "%URL_PREFIX%/dav/%USERNAME%/Calendar/",
			contact:		  "%URL_PREFIX%/dav/%USERNAME%/Contacts/",
			checkCredentials: "%URL_PREFIX%/dav/%USERNAME%/"
		}
	],

	resolveURL: function (url, username, type) {
		"use strict";
		var i, j, scheme, index, prefix, newURL, orgURL = url;
		url = url.toLowerCase();
		debug("Resolving " + orgURL);

		for (i = 0; i < this.urlSchemes.length; i += 1) {
			scheme = this.urlSchemes[i];
			for (j = 0; j < scheme.keys.length; j += 1) {
				index = url.indexOf(scheme.keys[j]);
				if (index >= 0) {
					debug("Found URL for scheme ", scheme);
					prefix = url.substring(0, index + scheme.keys[j].length);
					debug("Prefix: ", prefix);
					if (scheme[type]) {
						if (typeof scheme[type] === "string") {
							newURL = scheme[type].replace("%URL_PREFIX%", prefix);
							newURL = newURL.replace("%USERNAME%", username); //This will only replace once.
							debug("Returning new URL: ", newURL);
							return newURL;
						} else {
							return scheme[type];
						}
					}
				}
			}
		}

		return false;
	}
};