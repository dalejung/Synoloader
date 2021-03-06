/* This js module doesn't export anything, it's meant to handle the magnet protocol registration/unregistration. */
var EXPORTED_SYMBOLS = ["MagnetHandler"];

Components.utils.import("resource://SynoLoader/Util.js");
// Our XPCOM components to handle the protocols.
Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

let manager = Components.manager.QueryInterface(Components.interfaces.nsIComponentRegistrar);

function MagnetProtocolWrapper() {
    let myHandler = function() {};

    myHandler.prototype = {
        QueryInterface: XPCOMUtils.generateQI([Components.interfaces.nsIProtocolHandler]),

        _xpcom_factory: {
            singleton: null,
            createInstance: (aOuter, aIID) => {
                if (aOuter) {
                    throw Components.results.NS_ERROR_NO_AGGREGATION;
                }
                if (!this.singleton) {
                    this.singleton = new myHandler();
                }
                return this.singleton.QueryInterface(aIID);
            }
        },

        // nsIProtocolHandler implementation:

        // Default attributes.
        protocolFlags: Components.interfaces.nsIProtocolHandler.URI_LOADABLE_BY_ANYONE,
        defaultPort: -1,

        // Create dummy nsIURI and nsIChannel instances.
        newURI: (aSpec, aCharset, aBaseURI) => {
            let uri = Components.classes["@mozilla.org/network/simple-uri;1"]
                .createInstance(Components.interfaces.nsIURI);
            uri.spec = aSpec;
            return uri;
        },

        newChannel: (aURI) => {
            Components.classes["@mozilla.org/observer-service;1"]
                .getService(Components.interfaces.nsIObserverService)
                .notifyObservers(aURI, "magnet-on-open-uri", "magnet");

            return Components.classes["@mozilla.org/network/io-service;1"]
                .getService(Components.interfaces.nsIIOService)
                .newChannel("javascript:void()", null, null);
        },

        scheme: "magnet",
        classDescription: "Torrent Magnet Handler",
        classID: Components.ID("{6dfabfd0-0aba-11e1-be50-0800200c9a66}"),
        contractID: "@mozilla.org/network/protocol;1?name=magnet"
    };

    return myHandler;
}

// This function takes care of register/unregister the magnet protocol handlers as requested.
// It's called when the preferences change.
var MagnetHandler = {};
let protocolHandler = MagnetProtocolWrapper();

MagnetHandler.setActive = (activate) => {
    Util.log("attempting to register protocol");

    try {
        let proto = protocolHandler.prototype;

        if (activate) {
            Util.log("enabling magnet protocol");
            if (!protocolHandler.registered && !manager.isCIDRegistered(proto.classID)) {
                manager.registerFactory(
                    proto.classID,
                    proto.classDescription,
                    proto.contractID,
                    proto._xpcom_factory
                );
            }
        } else {
            Util.log("disabling magnet protocol");
            if (protocolHandler.registered) {
                manager.unregisterFactory(proto.classID, proto._xpcom_factory);
            }
        }
        protocolHandler.registered = activate;
    } catch (e) {
        Util.log("error with magnet protocol: " + e);
    }
};

MagnetHandler.createObserver = () => {
    return ({
        observe: function(subject, topic, data) {},
        QueryInterface: function(iid) {
            if (!iid.equals(Components.interfaces.nsIObserver) &&
                !iid.equals(Components.interfaces.nsISupportsWeakReference) &&
                !iid.equals(Components.interfaces.nsISupports)) {
                throw Components.results.NS_ERROR_NO_INTERFACE;
            }
            return this;
        }
    });
};
