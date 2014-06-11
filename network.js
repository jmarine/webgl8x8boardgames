/*
    WebGL 8x8 board games
    Copyright (C) 2011 by Jordi Mariné Fort  

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

var Network = {

wgsclient: null, 
nick: null, 
mucService: null, 
gameRoom: null, 
joinState: 0, 
joinedRemoteUserSession: null,
networkGameType: null,

GameStatusEnum: {
  GAME_UNDEFINED: 0,
  GAME_PROPOSED: 1,
  GAME_CREATED: 2
},


getGameType: function() {
  if(this.networkGameType == null) this.networkGameType = UI.getGameType().toLowerCase();
  return this.networkGameType;
},

getGameNamespace: function() {
  return "urn:games:" + this.getGameType();
},

getGameStatus: function() {
  return this.joinState;
},

onPresence: function(presence) {
     console.log("PRESENCE RECEIVED:");
     console.log(Strophe.serialize(presence));
     var from = $(presence).attr('from');
     console.log("FROM:" + from);
     var resource = Strophe.getResourceFromJid(from); 
     console.log("RESOURCE: " + resource);
     var room = Strophe.getBareJidFromJid(from);
     console.log("ROOM: " + room);

     console.log("Updating presence for " + from);
     $('select[id=users] > option[value="'+from+'"]').remove();
     console.log("User cleared");

     var presenceType = $(presence).attr('type');
     console.log("Presence type = " + presenceType);
     if(presenceType == null || presenceType != 'unavailable') {
	// handle connections
        var cmdNode = $(presence).find("*[xmlns='" + Network.getGameNamespace() + "']");
        console.log("CMDNODE.length: " + cmdNode.length);
	if(cmdNode.length <= 0) return true;

	var cmd = cmdNode.get(0).tagName;
	if( (cmd == "PLAYER") && (resource != Network.nick) ) {
	    var status = cmdNode.attr('status');
	    if(status.indexOf("waiting opponent") != -1) {
	      var role = cmdNode.attr('role');
	      if(resource != Network.nick) {
                $('select[id=users]').append($("<option></option>").text(resource + " as " + role).val(from)); 
	      }
            } else if( (status.indexOf("playing") != -1) && (resource == Network.joinedRemoteUserSession) && (Network.nick != cmdNode.attr('opponent')) ) {
              Network.onGameRejected(from);
            }
        } else if( (cmd == "OBSERVER") && (Network.joinedRemoteUserSession != null) ) {
            // TODO: only 1 player should send LOAD command
            Network.xmppConnection.send($msg({to: Network.gameRoom + "/" + resource, type: 'chat'}).c("LOAD", {xmlns: Network.getGameNamespace(), state: game.toString(), player: game.getTurn()}));
            console.log("LOAD command sended from player to observer");
        }
     } else {
	// handle disconnections

	    //if(resource != Network.nick) $("select[id=games] > option[value='" + from + "']").remove(); 

	    console.log("JOINED REMOTE USER SESSION " + Network.joinedRemoteUserSession);
	    if(resource == Network.joinedRemoteUserSession) {
                var opponent = Network.getOpponentNick();
                Network.exitGame(true);
		showMessage("Game terminated by " + opponent);
	    }

     }
     return true; 
},

onMessage: function(message) {
        var from = $(message).attr('from');
	var resource = Strophe.getResourceFromJid(from); 
        console.log("MSG RECEIVED FROM:" + from);

        console.log(Strophe.serialize(message));
        var cmdNode = $(message).find("*[xmlns='" + Network.getGameNamespace() + "']");
        console.log("CMDNODE.length: " + cmdNode.length);
        if(cmdNode.length <= 0) return true;
        var cmd = cmdNode.get(0).tagName;
        console.log("COMMAND: " + cmd);

        if(cmd == "PLAY") {
	    var role = cmdNode.attr('role');
	    if( (!Network.gameRoom) && (resource != Network.nick) ) {
		Network.joinState = Network.GameStatusEnum.GAME_CREATED;
                Network.joinedRemoteUserSession = resource;
		//$('select[id=games]').append($("<option></option>").text(resource + " as " + role).val(from)); 

		$('#games_section').hide();
		$('#network_status').hide();
		showMessage("Select game request");

	    	$('#reject').fadeIn();
                $('input[id=reject_submit]').each(function() {
                   this.disabled = false; 
                });
	    }

        } else if(cmd == "MOVE") {
	    //alert("Received move: " + message.body);
	    var moveStr = cmdNode.attr('path'); 
	    if(resource != Network.nick) {
		var move = game.parseMoveString(moveStr);
		movePieceOnBoard(move);
	    }

        } else if(cmd == "LOAD") {
            var state = cmdNode.attr('state');
	    if( (Network.gameRoom) && (Network.joinedRemoteUserSession == null) ) {
              showMessage(null);
            }
	    if( (Network.gameRoom) && (resource == Network.joinedRemoteUserSession) ) {
              var player = parseInt(cmdNode.attr('player'));
              var answer = getPlayer(player).sendCommand(game, player, 'LOAD', {data: state});
              if(answer) {
                 UI.setGameState(state);
                 //UI.openNetworkGame(state);
              }
              Network.xmppConnection.send($msg({to: Network.gameRoom, type: 'groupchat'}).c("LOAD_ANSWER", {xmlns: Network.getGameNamespace(), state: state, answer: answer, player: player }));

            }

        } else if(cmd == "LOAD_ANSWER") {
            var answer = cmdNode.attr('answer');
            var state = cmdNode.attr('state');
            if(answer == 'true') {
              var player = parseInt(cmdNode.attr('player'));
              if( (Network.gameRoom) && (resource == Network.joinedRemoteUserSession) ) {
                getPlayer(player).loadConfirmed = true;
              }
              UI.setGameState(state);
            }

        } else if(cmd == "RETRACT") {
	    if( (Network.gameRoom) && (resource == Network.joinedRemoteUserSession) ) {
              var previousGameTurn = game.getTurn();
              var state = cmdNode.attr('state');
              var player = parseInt(cmdNode.attr('player')); 
              var answer = getPlayer(player).sendCommand(game, player, 'RETRACT', {data: state});
              if(answer) {
                if(player != previousGameTurn) {
                   setNumUndosToIgnore(1);
                   document.execCommand("undo");  
                   setNumUndosToIgnore(0);
                }
              }
              Network.xmppConnection.send($msg({to: Network.gameRoom, type: 'groupchat'}).c("RETRACT_ANSWER", {xmlns: Network.getGameNamespace(), state: state, answer: answer, player: player}));
            }

        } else if(cmd == "RETRACT_ANSWER") {
            var answer = cmdNode.attr('answer');
            var state = cmdNode.attr('state');
            if(answer == 'true') {
              var player = parseInt(cmdNode.attr('player')); 
	      if( (Network.gameRoom) && (resource == Network.joinedRemoteUserSession) ) {
                getPlayer(player).retractConfirmed = true;
                document.execCommand("undo");
              } else {  // observers
                UI.setGameState(state);
              }
            }
	    if( (Network.gameRoom) && (resource == Network.joinedRemoteUserSession) ) {
              showMessage(null);
            }

	} else if(cmd == "NACK") {
            Network.onGameRejected(from);

	} else if(cmd == "ACK") {
	    var user_role = cmdNode.attr('role');
	    if( (!Network.gameRoom) && (resource == Network.joinedRemoteUserSession) ) {

	        Network.gameRoom = cmdNode.attr('room');
	    	console.log("ACK received for room: " + Network.gameRoom);

	        $('#start').hide();
	        $('#games_section').hide();

	        $('#reject').fadeIn();
                $('input[id=reject_submit]').each(function() {
                    this.disabled = false;
                });

	        $('#network_status').text("Playing with " + Network.getOpponentNick()).fadeIn();
		showMessage(false);
		//alert("ACK: unsubscribe from MUC");

    		Network.xmppConnection.send($pres({to: Network.getGameType() + "@" + Network.mucService + "/" + Network.nick}).c("PLAYER",{xmlns: Network.getGameNamespace(), status: "playing", opponent: Network.joinedRemoteUserSession}));
		console.log("ACK: sending presence to room: " + Network.gameRoom);
    		Network.xmppConnection.send($pres({to: Network.gameRoom + "/" + Network.nick}));
	    	console.log("ACK: presence sent to room: " + Network.gameRoom);
		if( ( (user_role == 'player1') && ($('select[id=player1] > option:selected').attr('value') != REMOTE_USER) )
                           || ( (user_role == 'player2') && ($('select[id=player2] > option:selected').attr('value') != REMOTE_USER) ) ) {
			swapPlayerTypes();
		}

		console.log("ACK: creating game");
	        UI.createGame();
	    }

        } 

        return true;
},




sendGameRequest: function(remoteUser, localUserRole) {
    this.joinState = Network.GameStatusEnum.GAME_PROPOSED;
    this.joinedRemoteUserSession = Strophe.getResourceFromJid(remoteUser);
    this.xmppConnection.send($msg({to: remoteUser, type: 'chat'}).c("PLAY", {xmlns: this.getGameNamespace(), role: localUserRole}));
    this.xmppConnection.send($pres({to: this.getGameType() + "@" + this.mucService + "/" + this.nick}).c("PLAYER",{xmlns: this.getGameNamespace(), status: "waiting confirmation", opponent: this.joinedRemoteUserSession}));

    console.log("User session: " + remoteUser);
    $('#start').hide();
    $('#games_section').hide();
    $('#games_section').hide();
    showMessage("Waiting confirmation from " + Network.getUserNick(Strophe.getResourceFromJid(remoteUser)));

    $('#reject').fadeIn();
    $('#input[id=reject_submit]').each(function() {
        this.disabled = false;
    });
},

rejectGameRequest: function(remoteUser, pendingGameRequests) {
    var role = ($('select[id=player1] > option:selected').attr('value') == REMOTE_USER) ? "player2" : "player1";
    this.xmppConnection.send($pres({to: this.getGameType() + "@" + this.mucService + "/" + this.nick}).c("PLAYER",{xmlns: this.getGameNamespace(), role: role, status: "waiting opponent"})); 
    this.xmppConnection.send($msg({to: remoteUser, type: 'chat'}).c("NACK", {xmlns: this.getGameNamespace()}));
    if(pendingGameRequests <= 0) {
      this.joinState = Network.GameStatusEnum.GAME_UNDEFINED;
      this.joinedRemoteUserSession = null;
    }
},

onGameRejected: function(from) {
   //$("select[id=games] > option[value='" + from + "']").remove(); 

   var role = ($('select[id=player1] > option:selected').attr('value') == REMOTE_USER) ? "player2" : "player1";
   Network.xmppConnection.send($pres({to: Network.getGameType() + "@" + Network.mucService + "/" + Network.nick}).c("PLAYER",{xmlns: Network.getGameNamespace(), role: role, status: "waiting opponent"})); 


   Network.joinState = Network.GameStatusEnum.GAME_UNDEFINED;
   Network.joinedRemoteUserSession = null;
   Network.gameRoom = null;

   /*var req = $("select[id=games] > option[value='" + from + "']");
   if(req.size() > 0) {
     req.remove();
     updateStartButtonState('games');
   }
   */

   req = $("select[id=games] > option");
   if(req.size() <= 0) {
     $('#reject').hide();
     $('#network_status').hide();
     $('#games_section').fadeIn();
     $('#start').fadeIn();
     updateStartButtonState('users');
   }
   showMessage("User " + from + " has rejected the game.");
},

getSortedPlayers: function(my_role) {
  var players = [];
  if(my_role == 'player1') {
    players.push(this.getUserNick(this.nick));
    players.push(this.getOpponentNick());
  } else {
    players.push(this.getOpponentNick());
    players.push(this.getUserNick(this.nick));
  }
  return players;
},


acceptGameRequest: function(user_session, my_role) {
    this.joinedRemoteUserSession = Strophe.getResourceFromJid(user_session);
    console.log("joinedRemoteUserSession : " + this.joinedRemoteUserSession );
    this.gameRoom = this.getGameType() + "_" + this.getSortedPlayers(my_role).join("_") + "_" + (new Date()).getTime() + "@" + this.mucService;
    console.log("sending ACK: room = " + this.gameRoom);
    this.xmppConnection.send($pres({to: this.getGameType() + "@" + this.mucService + "/" + this.nick}).c("PLAYER",{xmlns: this.getGameNamespace(), status: "playing", opponent: Network.joinedRemoteUserSession}));
    this.xmppConnection.send($msg({to: user_session, type: 'chat'}).c("ACK", {xmlns: this.getGameNamespace(), role: my_role, room: this.gameRoom}));
    console.log("ACK sent");
    console.log("sending room presence: room = " + this.gameRoom);
    this.xmppConnection.send($pres({to: this.gameRoom + "/" + this.nick}));
    console.log("room presence SENT: room = " + this.gameRoom);
    this.clearGameRequests();

    $('#start').hide();
    $('#games_section').hide();

    $('#reject').fadeIn();
    $('input[id=reject_submit]').each(function() {
        this.disabled = false;
    });

    $('#network_status').text("Playing with " + Network.getOpponentNick()).fadeIn();
    showMessage(false);
},

getWgsClient: function(url) {
    if(url) {
      if(!this.wgsclient || (url != this.wgsclient.url)) {
        if(this.wgsclient) {
            try { this.wgsclient.close(); }
            catch(e) { }
        }
        this.wgsclient = new WgsClient(url);
      }
    }
    return this.wgsclient;
},


login: function(url, user, pass) {
    showMessage("Connecting...");

    this.wgsclient = this.getWgsClient(url);
    var realm = this.wgsclient.getDefaultRealm();
    if(user.length > 0) {
            this.wgsclient.login(realm, user, pass, authentication);
    } else {
            this.wgsclient.login(realm, null, null, authentication);
    }
}, 


isConnected: function() {
  return (Network.wgsclient && Network.wgsclient.getState() != ConnectionState.DISCONNECTED);
},


onConnect: function(msg) {
    console.log("connected");
    $('#connect_section').hide();
    $('#network_status').hide();
    $('#matching_options').hide();
    $('#btnCreateGame').hide();
    $('#reject').hide();
    $('#btnShowMatchingOptions').fadeIn();
    $('#btnDeleteFinishedGames').fadeIn();
    $('#btnDisconnect').fadeIn();


    $('#start').fadeIn();
    $('select[id=games]').empty();
    showMessage(false);

    Network.wgsclient.subscribe("wgs.apps_event", Network.update_groups, null, {"match": "exact"} );

    /*
        if(msg && msg.picture) {
            $("#user_picture").attr("src", msg.picture).width(48).height(48);
        } else if(state == ConnectionState.ANONYMOUS) {
            $("#user_picture").attr("src", "images/anonymous.png").width(48).height(48);
        } else {
            $("#user_picture").width(0).height(0);
        }
    */

    if(msg) {
      this.joinState = Network.GameStatusEnum.GAME_UNDEFINED;
      this.joinedRemoteUserSession = null;

      this.user = msg;
      this.nick = msg.user;
      this.listGames();
    }
},


sendLoadRequest: function(game, state, toPlayerNumber)
{
  if(this.joinedRemoteUserSession) {  // When player is not an observer 
    this.xmppConnection.send($msg({to: this.gameRoom, type: 'groupchat'}).c("LOAD", {xmlns: this.getGameNamespace(), state: state, player: toPlayerNumber}));
  }
},

sendMoveRequest: function(game, move, toPlayerNumber)
{
  var group = Network.gameRoom;
  if(group && this.wgsclient.isMemberOfGroup(group.gid)) {  // When player is not an observer
    var slot = game.getTurn()-1;
    var data = game.getMoveString(move);
    this.wgsclient.addAction(group.gid, slot, "MOVE", data);
  }
},

sendRetractMoveRequest: function(game, state, toPlayerNumber)
{
  var group = Network.gameRoom;
  if(group && this.wgsclient.isMemberOfGroup(group.gid)) {  // When player is not an observer
    var slot = group.slotJoinedByClient;
    this.wgsclient.addAction(group.gid, slot, "RETRACT_QUESTION", state);
  }
},

deleteFinishedGroups: function() {
  this.wgsclient.deleteFinishedGroups();
},

getUserNick: function(user_session)
{
  if(!user_session) return null; 
  var pos = user_session.indexOf('_');
  return user_session.substring(0,pos);
},

getOpponentNick: function()
{
  return "opponent";
  //return this.getUserNick(this.joinedRemoteUserSession);
},

exitGame: function(waitNewGame)
{
    acceptHumanMove(false);

    $('#network_status').hide();
    $("#btnFinishGame").hide();

    $("#matching_options").hide();
    $("#btnCreateGame").hide();
    $("#btnHideMatchingOptions").hide();
    $("#games_section").show();
    $("#btnShowMatchingOptions").show();
    $("#btnDeleteFinishedGames").show();

    if(this.gameRoom) {
      var gid = this.gameRoom.gid;
      this.wgsclient.exitGroup(gid, function(id,details,errorURI,result,resultKw) {});
    }

    this.gameRoom = null;
    this.joinState = Network.GameStatusEnum.GAME_UNDEFINED;
    this.joinedRemoteUserSession = null;
    this.networkGameType = null;
},

clearGameRequests: function()
{
/** Other game games are cleared on playing presence
    req = $("select[id=games] > option");
    req.each(function() {
      var user_session = $(this).attr('value');
      Network.xmppConnection.send($msg({to: user_session, type: 'chat'}).c("NACK", {xmlns: Network.getGameNamespace()}));
      //this.remove();
    });
*/
    $('select[id=games]').empty();
},

listUsers: function()
{
    var role = ($('select[id=player1] > option:selected').attr('value') == REMOTE_USER) ? "player2" : "player1";
    this.xmppConnection.send($pres({to: this.getGameType() + "@" + this.mucService + "/" + this.nick}).c("PLAYER",{xmlns: this.getGameNamespace(), role: role, status: "waiting opponent"})); 

    $('select[id=games]').empty();

    $('#open_game').hide();
    $('#join2').hide();
    $('#join').fadeIn();
    $('#start').fadeIn();
    showMessage("Select opponent");
},

view_group: function(appId,gid) {
    var options = new Object();
    options.spectator = true;
    try {
      Network.open_group(appId, gid, options);
    } catch(e) {
      console.debug(e.stack);
    }
},

reserve_group_slot: function(appId,gid,slot) {
    //var gid = $('#groups option:selected').attr('value');
    var options = new Object();
    options.slot = slot;
    try {
      Network.open_group(appId, gid, options);
    } catch(e) {
      console.debug(e.stack);
    }
},

new_group: function() {
    UI.createGame();
    var appId = $("#game_type").val();
    var gid = $("#new_grp_automatch").is(":checked") ? "automatch" : "";
    var opponent = $("#new_grp_opponent").val();
    var options = new Object();
    options.automatch = (opponent.length == 0);
    options.opponents = [];
    options.opponents[0] = {}; 
    options.opponents[0].user = opponent; 
    options.observable = $("#new_grp_observable").is(":checked");
    options.data = game.toString();
    options.hidden = $("#new_grp_hidden").is(":checked");
    options.password = $("#new_grp_password").val();
    options.role = $("#new_grp_role option:selected").val();
    if(options.role != "") options.slot = (options.role == "Black") ? 1 : 0;
    Network.open_group(appId, gid, options);
    return false;
},

group_finished: function() {
  var group = Network.gameRoom;
  if(this.wgsclient && group && group.state != "FINISHED") {
    var newState = "FINISHED";
    this.wgsclient.updateGroup(group.appId, group.gid, newState, group.data, group.automatch, group.hidden, group.observable, group.dynamic, group.alliances, function(id,details,errorURI,result,resultKw) {
       if(errorURI) alert(errorURI);
    });
  }
},

group_opened: function(group) {
    console.log("group change received: " + JSON.stringify(group));
    if(this.wgsclient.isMemberOfGroup(group.gid) && this.wgsclient.user != group.admin && group.state == "OPEN") {
        var newState = group.state;
        if(confirm("Accept game request?")) {
          newState = "STARTED";
        } else {
          newState = "FINISHED";
        }

        this.wgsclient.updateGroup(group.appId, group.gid, newState, group.data, group.automatch, group.hidden, group.observable, group.dynamic, group.alliances, function(id,details,errorURI,result,resultKw) {
           if(errorURI) alert(errorURI);
        });

        group.state = newState;

    }

    $('#start').hide();
    $('#games_section').hide();
    $("#matching_options").hide();
    $("#matching_options").hide();
    $("#btnCreateGame").hide();
    $("#btnShowMatchingOptions").hide();
    $("#btnHideMatchingOptions").show();
    $("#btnDeleteFinishedGames").hide();
    if(this.wgsclient.isMemberOfGroup(group.gid) && group.state != "FINISHED") $("#btnFinishGame").show();

    $("select[id=game_type]").val(group.appName);

    group.members.forEach(function(item) {
      $("select[id=player" + (item.slot+1) + "]").val((Network.wgsclient.sid == item.sid)? LOCAL_USER : REMOTE_USER);
    });


    //$('#network_status').text("Playing " + group.members[0].name + " with " + group.members[1].name);
    showMessage(false);
    //alert("ACK: unsubscribe from MUC");

    UI.createGame();
    if(group.data && group.data.length > 0) game.initFromStateStr(group.data);

    if(group.actions && group.actions.length > 0) {
      var sim = game.clone();
      var lastAction = null;
      group.actions.forEach(function(action, index) {
        game.initFromStateStr(sim.toString());
        if(action.type == "MOVE") {
          if(action.slot == Network.gameRoom.slotJoinedByClient) window.undoManager.add(sim.toString());
          var move = sim.parseMoveString(action.value);
          sim.makeMove(move);

        } else if(action.type == "RETRACT_ACCEPTED") {
          sim.initFromStateStr(action.value);
          if(index+1 < group.actions.length && Network.gameRoom.slotJoinedByClient >= 0 
             && (action.slot != Network.gameRoom.slotJoinedByClient || (1+action.slot)!=game.getTurn()) ) { // member
            setNumUndosToIgnore(1);
            document.execCommand("undo");
            setNumUndosToIgnore(0);
          }
        }
        lastAction = action;
        //UI.setGameState(game.toString());
      });
      group.action = lastAction;
    }
},

group_changed: function(group) {
    var opened = false;
    if(!Network.gameRoom) {
        Network.gameRoom = group;
        Network.group_opened(group);
        opened = true;
    } 

    var action = group.action;
    if(action) {
      group.action = null;
      var currentSlot = Network.gameRoom.slotJoinedByClient;
      if(action.type == "MOVE" && (opened || action.slot != currentSlot) ) {
        UI.setGameState(game.toString());
        var move = game.parseMoveString(action.value);
        if(move) movePieceOnBoard(move, true);

      } else if(action.type == "RETRACT_REJECTED") {
          UI.setGameState(action.value);
          if(isFinite(currentSlot) && action.slot != currentSlot) {
            showMessage("Move retraction has been rejected");
          }

      } else if(action.type == "RETRACT_ACCEPTED") {
        showMessage("");
        if(this.wgsclient.isMemberOfGroup(group.gid) && (isFinite(currentSlot) && action.slot != currentSlot) ) {
          showMessage("Move retraction has been accepted");
          getPlayer(1+action.slot).retractConfirmed = true;
          document.execCommand("undo");
        } else {
          if(this.wgsclient.isMemberOfGroup(group.gid) && (isFinite(currentSlot) && (1+action.slot) != game.getTurn()) ) {
            setNumUndosToIgnore(1);
            document.execCommand("undo");
            setNumUndosToIgnore(0);
          }
          UI.setGameState(action.value);
        }

      } else if(action.type == "RETRACT_QUESTION") {
        var currentState = game.toString();
        if(isFinite(currentSlot) && action.slot == currentSlot) {
          showMessage("Waiting retract confirmation from opponent");
          acceptHumanMove(false);
          //setNumUndosToIgnore(1);
          //document.execCommand("undo");
          //setNumUndosToIgnore(0);
        } else {

          var player = 1+(1-action.slot);
          var answer = getPlayer(player).sendCommand(game, player, 'RETRACT', {data: action.value});

          var response = answer? "RETRACT_ACCEPTED" : "RETRACT_REJECTED";
          var data = answer? action.value : currentState;
          this.wgsclient.addAction(group.gid, currentSlot, response, data);
        }
      }
    }
},


open_group: function(appId, gid, options) {
    Network.wgsclient.openGroup(appId, gid, options, function(id,details,errorURI,result,resultKw) {
       if(!errorURI) {
            Network.group_changed(resultKw); 
       } else if(errorURI == "wgs.incorrectpassword") {
            var password = prompt("Introduce the password to access the group:");
            if(password) {
                if(!options) options = {};
                options.password = password;
                Network.open_group(appId, gid, options);
            }
       } else {
           alert(errorURI);
       }
    });
    return false;
},

getGroupDescription: function(group) {
    return group.state + " (" + group.num + "/" + group.max + "): " + group.description;
},

getGroupListItem: function(group) {
   var opt = $('<tr>');
   opt.attr("gid", group.gid);
   opt.attr('observable', group.observable);   
   opt.attr('class', "scrollTableRow");


   var viewButton = "";
   if(group.observable) viewButton = "<br><button onclick=\"javascript:Network.view_group('" + group.appId + "','" + group.gid + "'); return false;\">View</button>";
   
   opt.append('<td>' + group.appName + '</td>');
   opt.append('<td>' + group.state + (group.password? "<br>(password)" : "" ) + '</td>');
   opt.append('<td>' + group.num + "/" + group.max + viewButton + "</td>");
   
   
   var memberCol = $('<td>');
   var members = $('<table>');

   var count = 0;
   var members = $('<table>');
   group.members.forEach(function(member,index) {
       count++;
       var row = $("<tr>");
       
       var playerLabel = "Player " + count + (member.role? " ("+ member.role +")" : "");
       if(index == group.turn && group.members[group.turn].user == Network.wgsclient.authid) playerLabel = "<b>" + playerLabel + "</b>";  // remark current turn
       row.append("<td>" + playerLabel + ":</td>");
       
       if(isFinite(member.sid) && (member.user == "" || member.user == Network.wgsclient.user) ) {
           row.append("<td><button onclick=\"javascript:Network.reserve_group_slot('" + group.appId + "','" + group.gid + "'," + member.slot + "); return false;\">Play</button></td>");
       } else {
           row.append("<td>" + member.name + "</td>");       
       }
        
       members.append(row);
   }); 

   memberCol.append(members);
   opt.append(memberCol);

   return opt;
},

update_groups: function(id,details,errorURI,payload,payloadKw) {
      if(payloadKw.groups) {
        //$("#groups option").remove();
        $("#groupsTable>table>tbody>tr").remove();
        
        payloadKw.groups.forEach(function(item) {
            /*
            var opt = $('<option>')
            opt.attr('value',item.gid).text(Network.getGroupDescription(item));
            opt.attr('observable', item.observable);
            $("#groups").append(opt);
            */
            var opt = Network.getGroupListItem(item);
            $("#groupsTable>table").append(opt);
        });
        
      } else if(payloadKw.cmd == "group_deleted") {
       
        $("#groupsTable>table>tbody>tr[gid='"+payloadKw.gid+"']").remove();
        
      } else {  // "group_created" || "group_updated" || user_joined || user_exit || user_updated
        
        if(payloadKw.hidden) {
            //$("#groups option[value='"+response.gid+"']").remove();
            $("#groupsTable>table>tbody>tr[gid='"+payloadKw.gid+"']").remove();
        } else {
            // if($("#groups option[value='"+response.gid+"']").size() <= 0) {  // insert group
            //   $("#groups").append($("<option>").attr("value", response.gid));
            // }
            //$("#groups option[value='"+response.gid+"']").text(Network.getGroupDescription(response));
            //$("#groups option[value='"+response.gid+"']").attr("observable", response.observable);
            
            if($("#groupsTable>table>tbody>tr[gid='"+payloadKw.gid+"']").size() <= 0) {
                $("#groupsTable>table").append(Network.getGroupListItem(payloadKw));
            } else {
                $("#groupsTable>table>tbody>tr[gid='"+payloadKw.gid+"']").replaceWith(Network.getGroupListItem(payloadKw));
            }
        }
        
      }
    
      adjustScrollTable("groups");
},


listGames: function()
{
    $('#start').hide();
    $('#games_section').fadeIn();
    $("#groupsTable>table>tbody>tr").remove();
    this.wgsclient.listGroups(null, null, null, function(id,details,errorURI,result,resultKw) {
        if(!errorURI) {
            Network.update_groups(id,details,errorURI,result,resultKw);
            $("#app_list").hide();
            $("#group_list").slideDown(500);
        } else {
            showMessage("Error: " + errorURI);
        }
    });

},

onListItem: function (iq) {
        var items = $(iq).find("item");
        if (items.length > 0) {
            $(iq).find("item").each(function () {
                var from = $(this).attr("jid");
                var name = $(this).attr('name');
                var parts = name.split("_");
                if(parts.length > 1 && parts[0] == Network.getGameType()) {
                    var player1 = parts[1];
                    var player2 = parts[2];
                    var desc = player1 + " vs " + player2;
                    //$('select[id=games]').append($("<option></option>").text(desc).val(from));
                }
            });
        }
},

openGame: function(gameRoom, gameDescription) {
    $('#open_game').hide();
    $('#games_section').hide();
    $('#reject').fadeIn();
    Network.gameRoom = gameRoom;
    Network.joinState = Network.GameStatusEnum.GAME_CREATED;
    console.log("opening game room = " + Network.gameRoom);
    console.log("sending room presence: room = " + Network.gameRoom);
    Network.xmppConnection.send($pres({to: Network.gameRoom + "/" + Network.nick}).c("OBSERVER",{xmlns: Network.getGameNamespace()}));
    Network.xmppConnection.flush();
    console.log("ROOM presence SENT: room = " + Network.gameRoom);
    $('#network_status').text("Observing game " + gameDescription).fadeIn();
    showMessage("");
},

disconnect: function() {
    console.log("Disconnecting.");
    if(this.wgsclient) {
        //Network.wgsclient.unsubscribe("wgs.apps_event", Network.update_groups, null, {});
        this.exitGame(false);
        this.wgsclient.close();
        this.wgsclient = null;

        $("#server_url").removeAttr("disabled");
        $("#user").removeAttr("disabled");
        $("#user").val("");
        $("#password").removeAttr("disabled");
        $("#password").val("");
        $("#password").show();
        $("#lbl_password").show();
        //$("#user_picture").width(0).height(0);

        $("#btnConnect").removeAttr("disabled");
        $("#btnRegister").removeAttr("disabled");
        $("#oic_connect").removeAttr("disabled");
        $("#btnConnect").show();
        $("#oic_connect").show();
        $("#btnRegister").show();
        //$("#participants").html("");

        $('#start').hide();
        $('#open_game').hide();
        $('#reject').hide();
        $('#btnDisconnect').hide();
        $('#matching_options').hide();
        $('#btnCreateGame').hide();
        $('#btnShowMatchingOptions').hide();
        $('#btnHideMatchingOptions').hide();
        $('#btnDeleteFinishedGames').hide();
        $("#btnFinishGame").hide();
        $('#games_section').hide();
        $('#network_status').hide();
        $('#connect_section').fadeIn();

        $("#groupsTable>table>tbody>tr").remove();

	//wait sending of unavailable presence stanzas
	showMessage("User disconnected.");
        console.log("Disconnected");
        //enable_network();
    }
    this.wgsclient = null;
}

}
