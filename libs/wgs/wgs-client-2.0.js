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
  
WgsClient.prototype.login = function(realm, user, password, onstatechange) {
    var client = this;
    Wamp2.prototype.login.call(this, realm, user, password, function(state, msg) {
      if(state == ConnectionState.AUTHENTICATED || state == ConnectionState.ANONYMOUS) {
          client.getUserInfo(function(id,details,errorURI,result,resultKw) {
              if(errorURI) {
                  onstatechange(ConnectionState.ERROR, errorURI);
              } else {
                  client.user = resultKw.user;
                  onstatechange(state, resultKw);
              }
          });
       } else {
          onstatechange(state, msg);
       }
    });

}

WgsClient.prototype.getDefaultRealm = function() {
    return document.location.hostname;
}

WgsClient.prototype.registerUser = function(realm, user, password, email, onstatechange) {
    var client = this;
    client.connect(realm, function(state, msg) {
        onstatechange(state, msg);
        if(state == ConnectionState.WELCOMED) {
            var msg = Object();
            msg.user = user;
            msg.password = CryptoJS.MD5(password).toString();
            msg.email = email;
            client.call("wgs.register", msg).then(
                function(id,details,errorURI,result,resultKw) {
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


WgsClient.prototype.openIdConnectProviders = function(realm, redirectUri, callback) {
    var client = this;
    client.connect(realm, function(state, msg) {
        if(state == ConnectionState.WELCOMED) {
            var msg = Object();
            msg.redirect_uri = redirectUri;
            client.call("wgs.openid_connect_providers", msg).then(
                function(id,details,errorURI,result,resultKw) {
                    //client.close();
                    callback(id,details,errorURI,result,resultKw);
                }, 
                function(id,details,errorURI,result,resultKw) {
                    client.close();
                    callback(id,details,errorURI,result,resultKw);
                });
        } 
    });
}

WgsClient.prototype.openIdConnectLoginUrl = function(realm, principal, redirectUri, notificationChannel, onstatechange) {
    var client = this;
    client.connect(realm, function(state, msg) {
        if(state == ConnectionState.WELCOMED) {
            var msg = Object();
            msg.principal = principal;
            msg.redirect_uri = redirectUri;
            msg.state = notificationChannel;
            client.call("wgs.openid_connect_login_url", msg).then(
                function(id,details,errorURI,result,resultKw) {
                    client.close();
                    //document.location.href = result[0];
                    window.open(result[0], "_blank");  // + "&nonce=" + escape(client.sid)
                }, 
                function(id,details,errorURI,result,resultKw) {
                    onstatechange(ConnectionState.ERROR, errorURI);
                });
        }
    });
}


WgsClient.prototype.openIdConnectAuthCode = function(realm, provider, redirectUri, code, notificationChannel, onstatechange) {
    var client = this;
    client.connect(realm, function(state, msg) {
        onstatechange(state, msg);          
        if(state == ConnectionState.WELCOMED) {
            var msg = Object();
            msg.provider = provider;
            msg.code = code;
            msg.redirect_uri = redirectUri;
            if(notificationChannel) msg.notification_channel = notificationChannel;

            client.call("wgs.openid_connect_auth", msg).then(
                function(id,details,errorURI,result,resultKw) {
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

WgsClient.prototype.newApp = function(name, domain, version, maxScores, descScoreOrder, min, max, delta, observable, dynamic, alliances, ai_available, roles, callback) {
    var msg = Object();
    msg.name = name;
    msg.domain = domain;
    msg.version = version;
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

        if(isFinite(payloadKw.slot)) payloadKw.members = [ payloadKw ];
        else if(payloadKw.members) client.groups[gid].members = new Array();

        if(payloadKw.cmd == "user_joined") client.groups[gid].connections[payloadKw.sid] = payloadKw;

        if(payloadKw.members) {
            payloadKw.members.forEach(function(item) {
                if(isFinite(item.sid) > 0) client.groups[gid].connections[item.sid] = item;
                if(isFinite(item.slot)) client.groups[gid].members[item.slot] = item;
            });
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
    
    if(client.groups[payloadKw.gid].group_change_callback) {
        client.groups[payloadKw.gid].group_change_callback(id,details,errorURI,payload,payloadKw);
    }        

} 

WgsClient.prototype.openGroup = function(appId, gid, options, callback) {
    var client = this;
    var args = Array();
    args[0] = appId? appId : null;
    args[1] = gid? gid : null;
    args[2] = options;

    this.call("wgs.open_group", args).then(function(id,details,errorURI,result,resultKw) {
        client.subscribe("wgs.group_event." + resultKw.gid, client._update_group_users, null, {} );
        client._update_group_users(id,details,errorURI,result,resultKw, null, callback, true);
    }, callback);
}

WgsClient.prototype.exitGroup = function(gid, callback) {
    var client = this;
    this.call("wgs.exit_group", gid).then(callback, callback);
    this.unsubscribe("wgs.group_event." + gid, client._update_group_users, null, {});
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

WgsClient.prototype.updateGroup = function(appId, gid, state, data, automatch, hidden, observable, dynamic, alliances, callback) {
    var client = this;
    var msg = Object();
    msg.app = appId;
    msg.gid = gid;
    msg.automatch = automatch;
    msg.hidden = hidden;
    msg.observable = observable;
    msg.dynamic = dynamic;
    msg.alliances = alliances;      
    if(state) msg.state = state;
    if(data) msg.data  = data;

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
