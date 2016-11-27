/* Copyright (c) 2012-2014 Jordi Mariné Fort */

WgsClient.prototype = new Wamp2();
WgsClient.prototype.constructor = WgsClient;
WgsClient.prototype.constructor.name = "WgsClient";

function WgsClient(u) {
    this.url = u;
    this.groups = new Array();
    return this;
}

WgsClient.prototype.getAgent = function() {
    return "wgs-client-2.0-alpha1";
}

WgsClient.prototype.getUserInfo = function(callback) {
    this.call("wgs.get_user_info").then(callback,callback);
}
  
WgsClient.prototype.login = function(realm, details, user, password, onstatechange) {
    var client = this;
    Wamp2.prototype.login.call(this, realm, details, user, password, function(state, msg) {
        onstatechange(state, msg);
        if(state == ConnectionState.WELCOMED) {
            client.getUserInfo(function(id,details,errorURI,result,resultKw) {
                if(errorURI) {
                    onstatechange(ConnectionState.ERROR, errorURI);
                } else {
                    client.user = resultKw.user;
                    onstatechange(ConnectionState.AUTHENTICATED, resultKw);
                }
            });
        }
    });

}

WgsClient.prototype.getDefaultRealm = function() {
    return document.location.hostname;
}


WgsClient.prototype.getProfile = function(user, callback) {
    this.call("wgs.get_profile", [user], {}).then(callback, callback);
}

WgsClient.prototype.getRanking = function(app, min, callback) {
    this.call("wgs.get_ranking", [app,min], {}).then(callback, callback);
}

WgsClient.prototype.setUserPushChannel = function(appName, notificationChannel) {
    this.call("wgs.set_user_push_channel", [appName, notificationChannel]);
}

WgsClient.prototype.registerUser = function(appName, realm, user, password, email, notificationChannel, onstatechange) {
    var client = this;
    var details = { "authmethods": ["anonymous"] };
    client.connect(realm, details, function(state, msg) {
        onstatechange(state, msg);
        if(state == ConnectionState.WELCOMED) {
            var msg = Object();
            msg.user = user;
            msg.password = CryptoJS.MD5(password).toString();
            msg.email = email;
            msg._oauth2_client_name = appName;            
            msg._notification_channel = notificationChannel;

            client.call("wgs.register", null, msg).then(
                function(id,details,errorURI,result,resultKw) {
                    client.authid = resultKw.authid;
                    client.authrole = resultKw.authrole;
                    client.authmethod = resultKw.authmethod;
                    client.authprovider= resultKw.authprovider;
                    client.user = resultKw.user;
                    client.state = ConnectionState.AUTHENTICATED;
                    onstatechange(ConnectionState.AUTHENTICATED, resultKw);
                }, 
                function(id,details,errorURI,result,resultKw) {
                    onstatechange(ConnectionState.ERROR, errorURI);
                });
        }
    });
}


WgsClient.prototype.openIdConnectProviders = function(subjectToDiscover, realm, clientName, redirectUri, onstatechange) {
    var client = this;
    var details = { "authmethods": ["oauth2"], "_oauth2_redirect_uri": redirectUri, "_oauth2_client_name": clientName, "_oauth2_subject": subjectToDiscover};
    client.connect(realm, details, function(state, msg) {
            onstatechange(state, msg);          
            if(state == ConnectionState.WELCOMED) {
                client.getUserInfo(function(id,details,errorURI,result,resultKw) {
                      if(errorURI) {
                          onstatechange(ConnectionState.ERROR, errorURI);
                      } else {
                          client.user = resultKw.user;
                          onstatechange(ConnectionState.AUTHENTICATED, resultKw);
                      }
                  });                
            }
        });
}

WgsClient.prototype.openIdConnectFromSubject = function(realm, subject, clientName, redirectUri, notificationChannel, onstatechange) {
    var client = this;
    
    var details = { "authmethods": ["oauth2"], "_oauth2_client_name": clientName, "_oauth2_redirect_uri": redirectUri, "_oauth2_subject": subject };    
    client.abort();
    client.hello(realm, details);
}


WgsClient.prototype.openIdConnectAuthCode = function(realm, provider, clientName, redirectUri, code, notificationChannel, onstatechange) {
    var client = this;
    var details = { }
    details.authprovider = provider;
    details._oauth2_client_name = clientName;
    details._oauth2_redirect_uri = redirectUri;
    details._notification_channel = notificationChannel;
    
    // TODO: check client.url
    if(client.authmethod.indexOf("oauth2") != -1) {
        client.authenticate(code, details);
        
    } else {
        details.authmethods = ["oauth2"];
        client.close();
        client.connect(realm, details, function(state, msg) {
            onstatechange(state, msg);          
            if(state == ConnectionState.CHALLENGED) {
                client.authenticate(code, details);
            } else if(state == ConnectionState.WELCOMED) {
                client.getUserInfo(function(id,details,errorURI,result,resultKw) {
                      if(errorURI) {
                          onstatechange(ConnectionState.ERROR, errorURI);
                      } else {
                          client.user = resultKw.user;
                          onstatechange(ConnectionState.AUTHENTICATED, resultKw);
                      }
                  });                
            }
        });
    }
}


WgsClient.prototype.listApps = function(filterByDomain, callback) {
    var msg = Object();
    if(filterByDomain) msg.domain = document.domain.toString();

    this.call("wgs.list_apps", [], msg).then(
        function(id,details,errorURI,result,resultKw) {
          callback(id,details,errorURI,result,resultKw);
        }, 
        function(id,details,errorURI,result,resultKw) {
          callback(id,details,errorURI,result,resultKw);
        });
}

WgsClient.prototype.listGroups = function(appId, scope, state, callback) {
    this.call("wgs.list_groups", [appId, state, scope]).then(callback, callback);
}

WgsClient.prototype.newApp = function(name, domain, version, actionValidatorClass, maxScores, descScoreOrder, min, max, delta, observable, dynamic, alliances, ai_available, roles, callback) {
    var msg = Object();
    msg.name = name;
    msg.domain = domain;
    msg.version = version;
    msg.action_validator_class = actionValidatorClass;
    msg.max_scores = maxScores;
    msg.desc_score_order = descScoreOrder;
    msg.min = min;
    msg.max = max;
    msg.delta = delta;
    msg.observable = observable;      
    msg.dynamic = dynamic;
    msg.alliances = alliances;
    msg.ai_available = ai_available;
    msg.roles = roles;

    this.call("wgs.new_app", msg).then(callback, callback);
}

WgsClient.prototype.deleteApp = function(appId, callback) {
    var msg = Object();
    msg.app = appId;

    this.call("wgs.delete_app", msg).then(callback, callback);
}

WgsClient.prototype._update_group_users = function(id,details,errorURI,payload, payloadKw, topicURI, group_change_callback, register_callback) {
    var client = this;
    if(payloadKw.connections) {
        client.groups[payloadKw.gid] = new Object();
        client.groups[payloadKw.gid].min = payloadKw.min;
        client.groups[payloadKw.gid].max = payloadKw.max;
        client.groups[payloadKw.gid].delta = payloadKw.delta;
        client.groups[payloadKw.gid].members = payloadKw.members;
        client.groups[payloadKw.gid].connections = new Array();
        payloadKw.connections.forEach(function(con) { 
            client.groups[payloadKw.gid].connections[con.sid] = con;
        });
    } else if(payloadKw.cmd == "user_joined" || payloadKw.cmd == "group_updated") {
        var gid = payloadKw.gid;
        if(client.groups[gid]) {
            if(isFinite(payloadKw.slot)) payloadKw.members = [ payloadKw ];
            //else if(payloadKw.members) client.groups[gid].members = new Array();

            if(payloadKw.cmd == "user_joined") client.groups[gid].connections[payloadKw.sid] = payloadKw;

            if(payloadKw.members) {
                payloadKw.members.forEach(function(item) {
                    if(isFinite(item.sid) > 0) client.groups[gid].connections[item.sid] = item;
                    if(isFinite(item.slot)) client.groups[gid].members[item.slot] = item;
                });
            }
        }
    } else if(payloadKw.cmd == "user_detached") {
        delete client.groups[payloadKw.gid].connections[payloadKw.sid];
        if(payloadKw.members) {
            payloadKw.members.forEach(function(item) {
                if(isFinite(item.slot)) client.groups[payloadKw.gid].members[item.slot] = item;
            });
        }
    }
    
    if(register_callback && group_change_callback) {
        client.groups[payloadKw.gid].group_change_callback = group_change_callback;
    } else if(group_change_callback) {
        group_change_callback(id,details,errorURI,payload,payloadKw);
    }
    
    if(client.groups[payloadKw.gid] && client.groups[payloadKw.gid].group_change_callback) {
        client.groups[payloadKw.gid].group_change_callback(id,details,errorURI,payload,payloadKw);
    }        

} 

WgsClient.prototype.openGroup = function(appId, gid, options, callback) {
    var client = this;
    var args = Array();
    args[0] = appId? appId : null;
    args[1] = gid? gid : null;
    args[2] = options;

    this.openedGroupSubscriptionId = null;
    this.call("wgs.open_group", args).then(function(id,details,errorURI,result,resultKw) {
        client.subscribe("wgs.group_event." + resultKw.gid, client._update_group_users, null, {} ).then(function(id) { client.openedGroupSubscriptionId = id; });
        client._update_group_users(id,details,errorURI,result,resultKw, null, callback, true);
    }, callback);
}

WgsClient.prototype.exitGroup = function(gid, callback) {
    var client = this;
    this.unsubscribe(this.openedGroupSubscriptionId, client._update_group_users, null, {});    
    this.call("wgs.exit_group", gid).then(callback, callback);
    delete this.groups[gid];
}

WgsClient.prototype.getGroupMinMembers = function(gid) {          
    return this.groups[gid].min;
}        

WgsClient.prototype.getGroupMaxMembers = function(gid) {          
    return this.groups[gid].max;
}

WgsClient.prototype.getGroupConnections = function(gid) {
    return this.groups[gid].connections;
}

WgsClient.prototype.getGroupMembers = function(gid) {
    return this.groups[gid].members;
}

WgsClient.prototype.getGroupMember = function(gid,slot) {
    return this.groups[gid].members[slot];
}

WgsClient.prototype.isMemberOfGroup = function(gid) {
    var retval = false;
    var client = this;
    this.groups[gid].members.forEach(function(item) {
        if(item.user == client.user) retval = true;
    });
    return retval;
}

WgsClient.prototype.getSlotOfGroup = function(gid) {
    var retval = -1;
    var client = this;
    this.groups[gid].members.forEach(function(item, index) {
        if(item.user == client.user) retval = index;
    });
    return retval;
}

WgsClient.prototype.updateGroup = function(appId, gid, state, ready, data, automatch, hidden, observable, dynamic, alliances, callback) {
    var client = this;
    var msg = Object();
    msg.app = appId;
    msg.gid = gid;
    msg.automatch = automatch;
    msg.hidden = hidden;
    msg.observable = observable;
    msg.dynamic = dynamic;
    msg.alliances = alliances;      
    if(data) msg.data  = data;
    if(state) {
        msg.state = state;
        msg.ready = ready;        
    }

    this.call("wgs.update_group", msg).then(function(id,details,errorURI,result,resultKw) { 
        client._update_group_users(id,details,errorURI,result,resultKw, null, callback, false);
    }, 
    function(id,details,errorURI,result,resultKw) { 
        client._update_group_users(id,details,errorURI,result,resultKw, null, callback, false);
    } );
}

WgsClient.prototype.updateMember = function(appId, gid, state, slot, sid, usertype, user, role, team, callback) {
    var client = this;      
    var msg = Object();
    msg.app = appId;
    msg.gid = gid;
    msg.state = state;
    if(!isNaN(slot)) {
        msg.slot = slot;
        msg.sid  = sid;
        msg.user = user;
        msg.role = role;
        msg.team = team;
        msg.type = usertype;
    }
    
    this.call("wgs.update_member", msg).then(
        function(id,details,errorURI,result,resultKw) { 
            client._update_group_users(id,details,errorURI,result,resultKw, null, callback, false);
        }, 
        function(id,details,errorURI,result,resultKw) { 
            client._update_group_users(id,details,errorURI,result,resultKw, null, callback, false);
        } );
}

WgsClient.prototype.deleteFinishedGroups = function() {
    var client = this;
    var args = [];
    return this.call("wgs.delete_finished_groups", args);    
}

WgsClient.prototype.addAction = function(gid, slot, type, value) {
    var client = this;
    var args = [];
    args[0] = gid? gid : null;
    args[1] = slot;
    args[2] = type;
    args[3] = value;
    return this.call("wgs.add_action", args);
}

WgsClient.prototype.sendGroupMessage = function(gid, data, callback) {
    var args = Array();
    args[0] = gid;
    args[1] = data;

    this.call("wgs.send_group_message", args).then(callback, callback);
}

WgsClient.prototype.sendTeamMessage = function(gid, data, callback) {
    var args = Array();
    args[0] = gid;
    args[1] = data;

    this.call("wgs.send_team_message", args).then(callback, callback);
}
