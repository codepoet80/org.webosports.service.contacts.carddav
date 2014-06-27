/*global Kinds, Log */

function SyncKey(client) {
    "use strict";
    this.client = client;
}

SyncKey.prototype.setKindName = function (kindName) {
    "use strict";
    this.kindName = kindName;
};

SyncKey.prototype.folderLength = function (kindName) {
    "use strict";
    return this.client.transport.syncKey[kindName || this.kindName].folders.length;
};

SyncKey.prototype.folderIndex = function (kindName) {
    "use strict";
    return this.client.transport.syncKey[kindName || this.kindName].folderIndex || 0;
};

SyncKey.prototype.nextFolder = function (kindName) {
    "use strict";
    if (!this.client.transport.syncKey[kindName || this.kindName].folderIndex) {
        this.client.transport.syncKey[kindName || this.kindName].folderIndex = 0;
    }
    this.client.transport.syncKey[kindName || this.kindName].folderIndex += 1;
};

SyncKey.prototype.hasMoreFolders = function (kindName) {
    "use strict";
    return this.folderIndex(kindName) < this.folderLength(kindName);
};

SyncKey.prototype.currentFolder = function (kindName) {
    "use strict";
    return this.getFolder(kindName, this.folderIndex(kindName));
};

SyncKey.prototype.forEachFolder = function (kindName, callback) {
    "use strict";
    if (!callback && typeof kindName === "function") {
        callback = kindName;
        kindName = undefined;
    }

    this.client.transport.syncKey[kindName || this.kindName].folders.forEach(callback);
};

SyncKey.prototype.getFolder = function (kindName, index) {
    "use strict";
    return this.client.transport.syncKey[kindName || this.kindName].folders[index];
};

SyncKey.prototype.hasError = function (kindName) {
    "use strict";
    return this.client.transport.syncKey[kindName || this.kindName].error === true;
};

SyncKey.prototype.getConfig = function () {
    "use strict";
    return this.client.config;
};

SyncKey.prototype.prepare = function (kindName, state) {
    "use strict";
    var key;
    //be sure to have an transport object with all necessary fields!
    if (!this.client.transport) {
        this.client.transport = {};
    }

    //prevent crashes during assignments.
    if (!this.client.transport.syncKey) {
        this.client.transport.syncKey = {};
    }

    for (key in Kinds.objects) {
        if (Kinds.objects.hasOwnProperty(key)) {
            if (!this.client.transport.syncKey[Kinds.objects[key].name]) {
                this.client.transport.syncKey[Kinds.objects[key].name] = {};
            }

            if (!this.client.transport.syncKey[Kinds.objects[key].name].folders) {
                this.client.transport.syncKey[Kinds.objects[key].name].folders = [];
            }
        }
    }

    if (state === "first") {
        //reset index:
        this.client.transport.syncKey[kindName || this.kindName].folderIndex = 0;



        // if error on previous sync reset ctag.
        if (this.client.transport.syncKey[kindName || this.kindName].error ||
            this.client.transport.syncKey[Kinds.objects[kindName || this.kindName].connected_kind].error) {
            Log.log("Error state in db was true. Last sync must have failed. Resetting ctag to do full sync.");

            this.forEachFolder(kindName, function (folder) {
                folder.ctag = 0;
            });
        }

        //clear possibly stored entries from previous syncs:
        this.forEachFolder(kindName, function (folder) {
            delete folder.entries;
        });

        Log.debug("Modified SyncKey: ", this.client.transport.syncKey[kindName || this.kindName]);

        //reset error. If folders had error, transfer error state to content.
        this.client.transport.syncKey[kindName || this.kindName].error = this.client.transport.syncKey[Kinds.objects[kindName || this.kindName].connected_kind].error;
    }
};

module.exports = SyncKey;
