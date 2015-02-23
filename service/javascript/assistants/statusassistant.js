/*jslint node: true, nomen: true */
/*global servicePath, Log */
/*exported statusAssistant*/
var SyncStatus = require(servicePath + "/javascript/utils/SyncStatus.js");

/* Validate contact username/password */
var statusAssistant = function () { "use strict"; };

statusAssistant.prototype.run = function (outerfuture, subscription) {
	"use strict";
	var args = this.controller.args, accountId, status, changeCallback;

	Log.log("_reply: " + typeof this.controller._reply);

	if (args.accountId) {
		accountId = args.accountId;
		Log.log("Got accountId: ", accountId);
	} else {
		Log.log("Missing accountId! From args ", args);
		outerfuture.exception = {message: "Missing accountId parameter."};
	}

	//no subscription, can finish early.
	if (!args.subscribe) {
		Log.log("No subscription => returning one status.");
		status = SyncStatus.getStatus(accountId);
		outerfuture.result = status;
		return outerfuture;
	}

	//about the use of _reply:
	//Somehow the Sync-Framework stuff seems to not support subscriptions at all.
	//So we use this internal method of the service controller to send subscription results nontheless.

	changeCallback = function (change) {
		if (this && this.controller && typeof this.controller._reply === "function") {
			Log.log("cdav.app Callback called with ", change);
			Log.log("Send result via subscription to cdav.app.");
			this.controller._reply("subscribe", change);
		} else {
			Log.log("cdav.app Seems subscription is gone, deregister Callback. ", !!this, " && ", !!this.controller, " && ", typeof this.controller._reply);
			SyncStatus.deregisterChangeCallback(accountId, changeCallback);
		}
	}.bind(this);

	//have subscription, i.e. need to stay here:
	Log.log("Have subscription, registering callback and sending current status as result.");
	SyncStatus.registerChangeCallback(accountId, changeCallback);
	this.controller._reply("subscribe", SyncStatus.getStatus(accountId)); //send first status immediately

	return outerfuture;
};
