/*jslint sloppy: true, browser: true */
/*global enyo, $L, console, setTimeout, PalmSystem */

function log(msg) {
    console.error(msg);
}

function debug(msg) {
    console.error(msg);
}

var BASE_URL = "https://accounts.google.com/o/oauth2/";
var CLIENT_ID = "272134554501-k5k377p7i1psit075to941cpbgahqn69.apps.googleusercontent.com";
var CLIENT_SECRET = "TiN4hzrMTxXP0szqQTDxRAfy";

enyo.kind({
    name: "Main.CrossAppLaunch",
    width: "100%",
    height: "100%",
    kind: "VFlexBox",
    className: "enyo-bg",
    components: [
        { name: "getAccessToken", kind: "WebService", url: BASE_URL + "token", method: "POST",
            onSuccess: "gotAccessToken", onFailure: "getAccessTokenFailed" },
        { name: "getUserName", kind: "WebService", url: "https://www.googleapis.com/userinfo/v2/me", method: "GET",
            onSuccess: "gotName", onFailure: "getAccessTokenFailed" },
        //used to change credentials:
        { name: "checkCredentials", kind: "PalmService", service: "palm://org.webosports.cdav.service/",
            method: "checkCredentials", onSuccess: "credentialsCameBack", onFailure: "credentialsCameBack" },
        {kind: "ApplicationEvents", onWindowParamsChange: "windowParamsChangeHandler"},
        { kind: "PageHeader", content: "Sign In with Google", pack: "center" },
        { name: "alert", flex: 1, style: "margin-bottom:30px;text-align:center; background-color:red; color:yellow;", showing: false },
        { kind: "WebView", flex: 9, onPageTitleChanged: "gotAuthToken"},
        {kind: "CrossAppResult", name: "crossAppResult" },
        {className: "accounts-footer-shadow", tabIndex: -1},
        {kind: "Toolbar", className: "enyo-toolbar-light", components: [
            { name: "doneButton", kind: "Button", caption: "Back", onclick: "doBack", className: "accounts-toolbar-btn"}
        ]}
    ],
    create: function () {
        var url, authWin;
        this.inherited(arguments);
        console.error(">>>>>>>>>>>>>>>>>>>> create");
        console.error("Parameters: " + JSON.stringify(arguments));

        if (PalmSystem.launchParams) {
            console.error("Params from PalmSystem: " + PalmSystem.launchParams);
            this.params = JSON.parse(PalmSystem.launchParams);
        }

        if (enyo.windowParams) {
            console.error("Params from enyo: " + JSON.stringify(enyo.windowParams));
            this.params = enyo.windowParams;
        }

        url = BASE_URL + "auth?client_id=" +
                  encodeURIComponent(CLIENT_ID) +
                  "&response_type=code" +
                  "&redirect_uri=" + encodeURIComponent("urn:ietf:wg:oauth:2.0:oob") +
            "&scope=" + encodeURIComponent("https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/carddav https://www.googleapis.com/auth/contacts https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile");

        if (this.params && this.params.account && this.params.account.credentials && this.params.account.credentials.user) {
            url += "&login_hint=" + encodeURIComponent(this.params.account.credentials.user);
        }

        //title polling function, used because events somehow go missing.
        function pollTitle() {
            if (!this.doing) {
                this.gotAuthToken({}, authWin.document.title);

                setTimeout(pollTitle.bind(this), 500);
            } else {
                authWin.close();
            }
        }

        if (window.PalmSystem && PalmSystem.deviceInfo) {
            var devInfo = JSON.parse(PalmSystem.deviceInfo);
            if (devInfo.modelName === "Lune OS Device") {
                //is LuneOS:
                this.log("Popping up Google page with OAuth request.");
                authWin = window.open(url);
                console.log(authWin);


                if (authWin) {
                    this.log("Adding listener for change messages to new window.");
                    //somehow those get deleted quite fast.. why?
                    authWin.onload = function () { this.gotAuthToken({}, authWin.document.title); }.bind(this);
                    authWin.onchange = function () { this.gotAuthToken({}, authWin.document.title); }.bind(this);

                    setTimeout(pollTitle.bind(this), 500);

                    authWin.document.onload = function () { this.gotAuthToken({}, authWin.document.title); }.bind(this);
                    authWin.document.onchange = function () { this.gotAuthToken({}, authWin.document.title); }.bind(this);


                } else {
                    this.error("No authWin!!! AHRGS.");
                }
            }
            else if (devInfo.platformVersionMajor === 3) {
                //is legacy webos:
                this.$.webView.setUrl(url);
            }
        }

        if (this.params.mode === "modify" && this.params.account) {
            this.accountId = this.params.account._id;
            log("Stored accountId: " + this.accountId);
        }

        console.error("<<<<<<<<<<<<<<<<<<<< create");
    },
    gotAuthToken: function (inSender, inResponse) {
        if (this.doing) {
            return;
        }

        debug("Got response: " + JSON.stringify(inResponse));
        var start = inResponse.indexOf("code=") + 5,
            code;
        if (start >= 5) {
            code = inResponse.substring(start);
            debug("Got code: " + code);

            this.doing = true;
            this.$.getAccessToken.call({
                code:           code,
                client_id:      CLIENT_ID,
                client_secret:  CLIENT_SECRET,
                redirect_uri:   "urn:ietf:wg:oauth:2.0:oob", //means token will be returned as title of page.
                grant_type:     "authorization_code"
            });
        } else {
            log("Could not extract code: " + start);
        }
    },
    gotAccessToken: function (inSender, inResponse) {
        debug("Got access token: " + JSON.stringify(inResponse));

        this.token_response = inResponse;

        this.$.getUserName.call({access_token: inResponse.access_token});
    },
    gotName: function (inSender, inResponse) {
        debug("Got name: " + JSON.stringify(inResponse));

        if (!this.params) {
            this.showLoginError("Please do run this from account app, not stand alone.");
            return;
        }

        this.accountSettings = {};
        var i, template = this.params.template,
            username = inResponse.email,
            credentials = {
                access_token: this.token_response.access_token,
                refresh_token: this.token_response.refresh_token,
                token_type: this.token_response.token_type,
                oauth: true,
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                authToken: this.token_response.token_type + " " + this.token_response.access_token,
                refresh_url: BASE_URL + "token"
            },
            config = {
                name: "C+DAV Google",
                url: "https://www.googleapis.com/caldav/v2",
                credentials: credentials
            };

        if (!username) {
            username = Date.now();
        }

        if (this.params.mode === "create") {
            if (!template) {
                this.showLoginError("Account App", "Internal error: No template. Please report this issue.");
                return;
            } else {
                for (i = 0; i < template.capabilityProviders.length; i += 1) {
                    if (template.capabilityProviders[i].capability === "CONTACTS") {
                        template.capabilityProviders[i].enabled = true;
                        template.capabilityProviders[i].loc_name = "Google Contacts";
                        break;
                    }
                    if (template.capabilityProviders[i].capability === "CALENDAR") {
                        template.capabilityProviders[i].enabled = true;
                        template.capabilityProviders[i].loc_name = "Google Calendar";
                        break;
                    }
                }


                if (!template.config) {
                    template.config = config;
                }
            }
        }

        this.accountSettings = {
            template: template,
            username: username,
            credentials: credentials,
            config: config,
            alias: "C+Dav Google " + username,
            returnValue: true
        };

        if (this.accountId) {
            //store new tokens:
            this.$.checkCredentials.call({
                accountId: this.accountId,
                oauth: credentials,
                url: config.url,
                name: config.name
            });
        } else {
            //Pop back to Account Creation Dialog
            // Set val as a parameter to be passed back to our source application
            debug("Returning: " + JSON.stringify(this.accountSettings));
            this.$.crossAppResult.sendResult(this.accountSettings);
        }
    },
    getAccessTokenFailed: function (inSender, inResponse) {
        log("Failed to get access token: " + JSON.stringify(inResponse));
        this.showLoginError("Failed to get access token. Please try again later.");
    },
    showLoginError: function (msg) {
        this.$.alert.setContent(msg);
        this.$.alert.show();
    },
    // called when app is opened or reopened
    windowParamsChangeHandler: function (inSender, event) {
        console.error(">>>>>>>>>>>>>>>>>>>> windowParamsChangeHandler");
        // capture any parameters associated with this app instance
        if (!event || !event.params) {
            console.error("No params received...");
            setTimeout(function () {
                this.$.alert.setContent($L("No parameters received. This needs to be called from Account Manager."));
            }.bind(this), 500);
        } else {
            if (event.params.template) {
                this.params = event.params;
                console.error("Params: " + JSON.stringify(this.params));
            } else {
                console.error("Skipping params, because they don't contain template information.");
            }

        }

        console.error("<<<<<<<<<<<<<<<<<<<< windowParamsChangeHandler");
    },
    doBack: function () {
        this.$.crossAppResult.sendResult({returnValue: false});
    },
    credentialsCameBack: function (inSender, inResponse) {
        log("Credentials store came back: " + JSON.stringify(inResponse));
        this.$.crossAppResult.sendResult(this.accountSettings);
    }
});
