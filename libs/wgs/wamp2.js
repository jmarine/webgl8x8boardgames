/* Copyright (c) 2014 Jordi Mariné Fort */

var ConnectionState = {
  DISCONNECTED: 0,
  ERROR: 1,  
  CLOSED: 2,  
  CONNECTED: 3,
  CHALLENGED: 4,
  WELCOMED: 5,
  AUTHENTICATED: 6
};

function Wamp2(u) {
  this.url = u;
  return this;
}

Wamp2.prototype = {
    ws: null,
    sid: null,
    authmethod: null,
    state: ConnectionState.DISCONNECTED,
    goodbyeRequested: false,
    sessionScopeId: 0,
    pendingRequests: new Array(),
    rpcRegistrationsById: new Array(),
    rpcRegistrationsByURI: new Array(),
    rpcHandlers: new Array(),
    topicPatternsBySubscriptionId: new Array(),
    eventHandlers: new Array(),
    metaeventHandlers: new Array(),


    setState: function(state) {
        this.state = state;
    },

    getState: function() {
      return this.state;  
    },

    newGlobalScopeId: function() {
        var r = Math.random()*131072.0*131072.0*131072.0 + Math.random()*131072.0*131072.0 + Math.random()*131072.0;
        return Math.floor(r);
    },
    
    newSessionScopeId: function() {
        return ++this.sessionScopeId;
    },
    
    getAgent: function() {
        return "wamp2-client";
    },

    
    // WAMPv2 REQUESTS
    
    hello: function(realm, details) {
        this.goodbyeRequested = false;
        var arr = [];
        arr[0] = 1;  // HELLO
        arr[1] = realm;
        arr[2] = details || {};  // HelloDetails
        arr[2].agent = this.getAgent();
        arr[2].roles = {};
        arr[2].roles.publisher = {};
        arr[2].roles.publisher.features = { "subscriber_blackwhite_listing": true, "publisher_exclusion": true };
        arr[2].roles.subscriber = {};
        arr[2].roles.subscriber.features = { "publisher_identification": true, "pattern_based_subscription": true, "subscriber_metaevents": true };
        arr[2].roles.caller = {};
        arr[2].roles.caller.features = { "caller_identification": true, "call_canceling": true, "progressive_call_results": true };
        arr[2].roles.callee = {};
        arr[2].roles.callee.features = { "caller_identification": true, "pattern_based_registration": true };        
        this.send(JSON.stringify(arr));
    },
    
    abort: function(reason, details) {
        if(!details) details = {};
        var arr = [];
        arr[0] = 3;   // Abort
        arr[1] = details;
        arr[2] = reason;
        this.send(JSON.stringify(arr));
    },
    
    goodbye: function(reason, details) {
        if(!this.goodbyeRequested) {
            this.goodbyeRequested = true;
            if(!details) details = {};
            var arr = [];
            arr[0] = 6;   // Goodbye
            arr[1] = details;
            arr[2] = reason;
            this.send(JSON.stringify(arr));
        }
    },

    // Caller API
    call: function(cmd, args, argsKw, wampOptions) {
        var dfd = $.Deferred();
        var msg = [];
        msg[0] = 48;
        msg[1] = this.newSessionScopeId();
        msg[2] = (wampOptions!=null) ? wampOptions : {};
        msg[3] = cmd;
        if(args != null || argsKw != null) msg[4] = (args!=null)? ((args instanceof Array)? args : [args] ) : [];
        if(argsKw!=null) msg[5] = argsKw;

        this.pendingRequests[msg[1]] = [dfd];
        this.send(JSON.stringify(msg));
        return dfd.promise();
    },  

    cancelCall: function(callID, options) {
        var arr = [];
        arr[0] = 49;  // CANCEL CALL
        arr[1] = callID;
        if(options) arr[2] = options;
        this.send(JSON.stringify(arr));      
    },

    // Callee API
    registerRPC: function(options, procedureURI, callback) {
        var dfd = $.Deferred();            
        var arr = [];
        arr[0] = 64;  // REGISTER
        arr[1] = this.newSessionScopeId();
        arr[2] = options;
        arr[3] = procedureURI;      
        this.pendingRequests[arr[1]] = [dfd, procedureURI, callback];
        this.send(JSON.stringify(arr));
        return dfd.promise();   
    },

    unregisterRPC: function(options, procedureURI, callback) {
        var registrationId = this.rpcRegistrationsByURI[procedureURI];  // TODO: search with options
        var dfd = $.Deferred();            
        var arr = [];
        arr[0] = 66;  // UNREGISTER
        arr[1] = this.newSessionScopeId();
        arr[2] = registrationId;
        this.pendingRequests[arr[1]] = [dfd, procedureURI, callback];
        this.send(JSON.stringify(arr));
        return dfd.promise();      
    },

    // PubSub API
    subscribe: function(topic, event_cb, metaevent_cb, options) {
        if(!options) options = {};
        if(event_cb==null && metaevent_cb!=null) options.metaonly = 1;
        
        if(!options.match && topic.indexOf("..") != -1) {
            options.match = "wildcard";
        }        

        var dfd = $.Deferred();            
        var arr = [];
        arr[0] = 32;  // SUBSCRIBE
        arr[1] = this.newSessionScopeId();
        arr[2] = options;
        arr[3] = topic;      
        var topicPattern = this.getTopicPattern(topic, options);
        this.pendingRequests[arr[1]] = [dfd, topicPattern, event_cb, metaevent_cb, options];
        this.send(JSON.stringify(arr));
        return dfd.promise();
    },

    unsubscribe: function(subscriptionId, event_cb, metaevent_cb) {
        var dfd = $.Deferred();            
        var arr = [];
        arr[0] = 34;  // UNSUBSCRIBE
        arr[1] = this.newSessionScopeId();
        arr[2] = subscriptionId;
        this.pendingRequests[arr[1]] = [dfd, arr[2], event_cb, metaevent_cb];
        this.send(JSON.stringify(arr));

        return dfd.promise();
    },

    publish: function(topic, payload, payloadKw, options) {
        var dfd = $.Deferred();
        var arr = [];
        arr[0] = 16;  // PUBLISH
        arr[1] = this.newSessionScopeId();
        arr[2] = (options) ? options : {};      
        arr[3] = topic;
        arr[4] = payload;
        arr[5] = payloadKw;
        this.send(JSON.stringify(arr));
        this.pendingRequests[arr[1]] = dfd;
        return dfd.promise();
    }, 
    
    
    getTopicPattern: function(topicPattern, options) {
        if(!options) options = {};
        if(!options.match) options.match = (topicPattern.indexOf("..") != -1)? "wildcard" : "exact";
        else if(options.match=="prefix") topicPattern = topicPattern + "..";
        return topicPattern;
    },
    

    authenticate: function(signature, extra) {
        var arr = [];
        arr[0] = 5;  // AUTHENTICATE
        arr[1] = signature;
        arr[2] = extra || {};  // HelloDetails
        this.send(JSON.stringify(arr));
    },


    login: function(realm, extra, user, password, onstatechange) {
        var client = this;
        var details = extra || {};
        details.authmethods = [ "wampcra", "anonymous" ];
        details.authid = user;

        client.connect(realm, details, function(state, msg) {
            onstatechange(state, msg);
            if(state == ConnectionState.CHALLENGED) {
                password = CryptoJS.MD5(password).toString();
                if(msg.salt) {
                    var key = CryptoJS.PBKDF2(password, msg.salt, { keySize: msg.keylen / 4, iterations: msg.iterations, hasher: CryptoJS.algo.SHA256 });
                    password = key.toString(CryptoJS.enc.Base64);                        
                }
                
                if(!extra) extra = {};
                var signature = CryptoJS.HmacSHA256(msg.challenge, password).toString(CryptoJS.enc.Base64);
                client.authenticate(signature, extra);
                
            } else if(state == ConnectionState.WELCOMED) {
                client.authid = msg.authid;
                client.authrole = msg.authrole;
                client.authmethod = msg.authmethod;
                client.authprovider = msg.authprovider;
            } 
        });
    },

    // WEBSOCKETS transport
    connect: function(realm, extra, onstatechange) {
        if(this.url.indexOf("ws") == 0) {
            this.connectWS(realm, extra, onstatechange);
        } else {
            this.connectLP(realm, extra, onstatechange);
        }
    },

    send: function(msg) {
        if(this._send) this._send(msg);
    },

    close: function(msg) {
        if(this._close) this._close();
    },


    connectWS: function(realm, extra, onstatechange) {
        var client = this;
        this.user = null;
        console.log("Websocket connection to url: " + this.url);

        var ws = null; 
        this.ws = null;

        if ("WebSocket" in window) {
            ws = new WebSocket(this.url, "wamp.2.json");
        } else if ("MozWebSocket" in window) {
            ws = new MozWebSocket(this.url, "wamp.2.json");
        } else {
            console.log("This Browser does not support WebSockets");
            this.connectLP(realm, extra, onstatechange);
            return;
        }

        ws.onopen = function(e) {
            console.log("A connection to "+this.url+" has been opened.");
            client.ws = ws;
            client._send = client.sendWS;
            client._close = client.closeWS;
            this.state = ConnectionState.CONNECTED;
            onstatechange(ConnectionState.CONNECTED);
            client.hello(realm, extra);
        };

        ws.onclose = function(e) {
            console.log("The connection to "+this.url+" was closed.");
            onstatechange(ConnectionState.DISCONNECTED);    
            client.close();
        };

        ws.onerror = function(e) {
            console.log("WebSocket error: " + e);
            onstatechange(ConnectionState.ERROR, "wgs.websocket.error");
            client.close();
        };

        ws.onmessage = function(e) {
            console.log("ws.onmessage: " + e.data);
            var arr = JSON.parse(e.data);

            client.onWampMessage(arr, onstatechange);
        };

    },

    
    sendWS: function(msg) {
        if(!this.ws || this.ws.readyState != 1) {
           console.log("Websocket is not available for writing");
        } else {
           this.ws.send(msg);
        }
    },


    closeWS: function() {
        if(this.ws /* && this.ws.state == this.ws.OPEN */) {
            this.ws.close();
            this.ws = null;
        }
        this.state = ConnectionState.DISCONNECTED;
    },


    // LONG-POLLING transport
    connectLP: function(realm, extra, onstatechange) {    
        var client = this;
        var lpID = client.newGlobalScopeId();
                
        if(this.url.indexOf("ws://") == 0) this.url = "http://" + this.url.substring(5) + "-longpoll";
        else if(this.url.indexOf("wss://") == 0) this.url = "https://" + this.url.substring(6) + "-longpoll";

        var lpOnOpen = function(response) {
           console.log("lp.open: " + JSON.stringify(response));
           client.open = true;
           client.lpID = lpID;
           client.transport = response.transport;
           client._send = client.sendLP;
           client._close = client.closeLP;
           client.state = ConnectionState.CONNECTED;
           onstatechange(ConnectionState.CONNECTED);
           client.hello(realm, extra);           
           lpReceive();
        };


        var lpReceive = function() {
           var url = client.url + '/'+client.transport+'/receive?x=' + client.newGlobalScopeId();
           $.post(url, {}, lpOnReceive, 'json')
            .fail(function() { onstatechange(ConnectionState.ERROR, "WGS receive error"); });
        };


        var lpOnReceive = function(response) {
            // Note: response can be null on timeout response            
            console.log("lp.onmessage: " + JSON.stringify(response));  
            if(response != null) client.onWampMessage(response, onstatechange);
            if(client.open && lpID == client.lpID) lpReceive();
        };
        

        var url = client.url + '/open?x=' + client.newGlobalScopeId();
        console.log("Connecting to URL " + url);
        $.post(url, JSON.stringify({ "protocols": ["wamp.2.json"] }), lpOnOpen, 'json')
         .fail(function(e) { onstatechange(ConnectionState.ERROR, "WGS connection error"); });
    },

    sendLP: function(msg) {
        var client = this;
        if(client.open) {
            var url = client.url + '/'+client.transport+'/send?x=' + client.newGlobalScopeId();
            $.post(url, msg);
        }
    },

    closeLP: function() {
        var client = this;
        if(client.open) {
            client.open = false;
            $.post(client.url + '/'+client.transport+'/close?x=' + client.newGlobalScopeId(), []);
        }
    },
        
    
    // WAMPv2 RESPONSES
    onWampMessage: function(arr, onstatechange) {
        var client = this;
        if (arr[0] == 2) {  // WELCOME
            var details = (arr.length > 2)? arr[2] : {};
            client.sid = arr[1];
            client.authmethod = details.authmethod;
            client.state = ConnectionState.WELCOMED;
            onstatechange(ConnectionState.WELCOMED, details);

        } else if (arr[0] == 3) {  // ABORT
            var reason = arr[2];
            client.state = ConnectionState.ERROR;
            onstatechange(ConnectionState.ERROR, reason);

        } else if (arr[0] == 4) {  // CHALLENGE
            var extra = arr[2] || {};
            extra.authmethod = arr[1];
            client.authmethod = arr[1];
            client.state = ConnectionState.CHALLENGED;
            onstatechange(ConnectionState.CHALLENGED, extra);

        } else if (arr[0] == 6) {  // GOODBYE 
            var reason = arr[2];
            client.state = ConnectionState.CLOSED;
            onstatechange(ConnectionState.CLOSED, reason);
            client.goodbye(reason, {});

        } else if (arr[0] == 8) {  // ERROR
            var requestType = arr[1];
            var requestId = arr[2];
            if(client.pendingRequests[requestId]) {
                var details = (arr.length>3)? arr[3] : null;
                var errorURI = (arr.length>4)? arr[4] : null;
                var args = (arr.length>5)? arr[5] : [];
                var argsKw = (arr.length>6)? arr[6] : {};
                var promise = client.pendingRequests[requestId][0];
                promise.reject(requestId, details, errorURI, args, argsKw);
                delete client.pendingRequests[requestId];     
            }

        } else if (arr[0] == 50) {  // RESULT
            var requestId = arr[1];
            if(client.pendingRequests[requestId]) {      
                var promise = client.pendingRequests[requestId][0];
                var details = arr[2];
                var result = (arr && arr.length > 2)? arr[3] : [];
                var resultKw = (arr && arr.length > 3)? arr[4] : {};
                if(details && details.progress) {
                    promise.notify(requestId, details, null, result, resultKw);
                } else {
                    promise.resolve(requestId, details, null, result, resultKw);
                    delete client.pendingRequests[requestId];
                }
            } else {
                console.log("call not found: " + requestId);
            }

        } else if(arr[0] == 33) {  // SUBSCRIBED
            var requestId = arr[1];
            if(requestId && client.pendingRequests[requestId]) {
                var subscriptionId = arr[2];
                var promise = client.pendingRequests[requestId][0];
                var topicPattern = client.pendingRequests[requestId][1];
                var event_cb = client.pendingRequests[requestId][2];
                var metaevent_cb = client.pendingRequests[requestId][3];
                client.topicPatternsBySubscriptionId[subscriptionId] = topicPattern;
                if(client.pendingRequests[requestId][2]) {
                  if(!client.eventHandlers[subscriptionId]) client.eventHandlers[subscriptionId] = [];
                  client.eventHandlers[subscriptionId].push(event_cb);
                }
                if(client.pendingRequests[requestId][3]) {                  
                  if(!client.metaeventHandlers[subscriptionId]) client.metaeventHandlers[subscriptionId] = [];
                  client.metaeventHandlers[subscriptionId].push(metaevent_cb);
                }
                promise.resolve(subscriptionId);
                delete client.pendingRequests[requestId];
            }

        } else if(arr[0] == 35) {  // UNSUBSCRIBED
            var requestId = arr[1];
            if(requestId && client.pendingRequests[requestId]) {
                var promise = client.pendingRequests[requestId][0];
                var subscriptionId = client.pendingRequests[requestId][1];
                var event_cb = client.pendingRequests[requestId][2];
                var metaevent_cb = client.pendingRequests[requestId][3];
                var callbacks = client.eventHandlers[subscriptionId];
                if(callbacks && callbacks.length>0) {
                    var indexOfEventHandlerToClear = callbacks.indexOf(event_cb);
                    if(event_cb && callbacks && callbacks.length<=1 && indexOfEventHandlerToClear!=-1) delete client.eventHandlers[subscriptionId];
                    else if(indexOfEventHandlerToClear != -1) client.eventHandlers[subscriptionId].splice(indexOfEventHandlerToClear,1);
                }

                callbacks = client.metaeventHandlers[subscriptionId];
                if(callbacks && callbacks.length>0) {
                    var indexOfMetaHandlerToClear = callbacks.indexOf(metaevent_cb);
                    if(metaevent_cb && callbacks && callbacks.length<=1 && indexOfMetaHandlerToClear != -1) delete client.metaeventHandlers[subscriptionId];
                    else if(indexOfMetaHandlerToClear != -1) client.metaeventHandlers[subscriptionId].splice(indexOfMetaHandlerToClear,1);
                }

                promise.resolve(subscriptionId);
                delete client.pendingRequests[requestId];
                //delete client.subscriptionsById[subscriptionId];
            }

        } else if(arr[0] == 17) {  // PUBLISHED
            var requestId = arr[1];
            var publicationId = arr[2];
            var promise = client.pendingRequests[requestId];
            promise.resolve(requestId, publicationId);
            delete client.pendingRequests[requestId];

        } else if(arr[0] == 36) {  // EVENT
            var subscriptionId = arr[1];
            var publicationId = arr[2];
            var details = arr[3];
            var payload   = (arr.length>4)? arr[4] : null;
            var payloadKw = (arr.length>5)? arr[5] : null;
            var topicURI = client.topicPatternsBySubscriptionId[subscriptionId];
            if(details && details.topic) topicURI = details.topic;

            if(details && details.metatopic) {
                var metatopic = details.metatopic;
                var metaevent = details;

                if(client.metaeventHandlers[subscriptionId]) {
                    client.metaeventHandlers[subscriptionId].forEach(function(callback) {
                        callback.call(client, topicURI, metatopic, metaevent);
                    });
                } 

            } else {
                if(client.eventHandlers[subscriptionId]) {
                    client.eventHandlers[subscriptionId].forEach(function(callback) {
                        callback.call(client, publicationId, details, null, payload, payloadKw, topicURI);                
                    });
                } 
            }

        } else if(arr[0] == 65) {  // REGISTERED
            var requestId = arr[1];
            var registrationId = arr[2];
            if(requestId && client.pendingRequests[requestId]) {
                var promise = client.pendingRequests[requestId][0];
                var procedureURI = client.pendingRequests[requestId][1];
                var callback = client.pendingRequests[requestId][2];
                client.rpcRegistrationsById[registrationId] = procedureURI;
                client.rpcRegistrationsByURI[procedureURI] = registrationId;
                client.rpcHandlers[registrationId] = callback;
                promise.resolve(requestId, registrationId);
            }

        } else if(arr[0] == 67) {  // UNREGISTERED                
            var requestId = arr[1];
            if(requestId && client.pendingRequests[requestId]) {
                var registrationId = arr[2];
                var promise = client.pendingRequests[requestId][0];
                var procedureURI = client.pendingRequests[requestId][1];
                promise.resolve(requestId,registrationId);
                delete client.rpcHandlers[registrationId];
                delete client.pendingRequests[requestId];                  
                //delete client.rpcRegistrationsById[registrationId];
                //delete client.rpcRegistrationsByURI[procedureURI];              
            }

        } else if(arr[0] == 68) {  // INVOCATION
            var requestId = arr[1];
            try {
                var registrationId = arr[2];
                var details = arr[3];
                var arguments = arr[4];
                var argumentsKw = arr[5];
                if(requestId && client.rpcHandlers[registrationId]) {
                    var callback = client.rpcHandlers[registrationId];

                    var resultKw = {};
                    var result = callback(arguments, argumentsKw, details);
                    if(isFinite(result)) {
                        result = [result];
                    } else if(typeof(result) == "string") {
                        result = [result];
                    } else if(!(result instanceof Array)) {
                        resultKw = result;
                        result = [];
                    }

                    var arr = [];
                    arr[0] = 70;  // YIELD (=INVOCATION_RESULT)
                    arr[1] = requestId;
                    arr[2] = {};  // options
                    arr[3] = result;
                    arr[4] = resultKw;
                    client.send(JSON.stringify(arr)); 
                }

            } catch(e) {
                var arr = [];
                arr[0] = 4;  // ERROR
                arr[1] = requestId;
                arr[2] = {}; // details
                arr[3] = "wamp.error.invalid_argument";
                arr[4] = [];
                arr[5] = e;
                client.send(JSON.stringify(arr)); 
            }

        } else {
            console.log("Server message not recognized: " + e.data);
        }
        
    }
  
}
