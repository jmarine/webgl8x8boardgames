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

xmppConnection: null, 
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

	    if(resource != Network.nick) $("select[id=requests] > option[value='" + from + "']").remove(); 

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
		$('select[id=requests]').append($("<option></option>").text(resource + " as " + role).val(from)); 

		$('#join').hide();
                $('#list_games').hide();
		$('#network_status').hide();
	    	$('#join2').fadeIn();
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
              var answer = game.getPlayer(player).sendCommand(game, player, 'LOAD', {data: state});
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
                game.getPlayer(player).loadConfirmed = true;
              }
              UI.setGameState(state);
            }

        } else if(cmd == "RETRACT") {
	    if( (Network.gameRoom) && (resource == Network.joinedRemoteUserSession) ) {
              var previousGameTurn = game.getTurn();
              var state = cmdNode.attr('state');
              var player = parseInt(cmdNode.attr('player')); 
              var answer = game.getPlayer(player).sendCommand(game, player, 'RETRACT', {data: state});
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
                game.getPlayer(player).retractConfirmed = true;
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
	        $('#join').hide();
	        $('#join2').hide();

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
    $('#join').hide();
    $('#join2').hide();
    $('#list_games').hide();
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
   $("select[id=requests] > option[value='" + from + "']").remove(); 

   var role = ($('select[id=player1] > option:selected').attr('value') == REMOTE_USER) ? "player2" : "player1";
   Network.xmppConnection.send($pres({to: Network.getGameType() + "@" + Network.mucService + "/" + Network.nick}).c("PLAYER",{xmlns: Network.getGameNamespace(), role: role, status: "waiting opponent"})); 


   Network.joinState = Network.GameStatusEnum.GAME_UNDEFINED;
   Network.joinedRemoteUserSession = null;
   Network.gameRoom = null;

   var req = $("select[id=requests] > option[value='" + from + "']");
   if(req.size() > 0) {
     req.remove();
     updateStartButtonState('requests');
   }

   req = $("select[id=requests] > option");
   if(req.size() <= 0) {
     $('#reject').hide();
     $('#network_status').hide();
     $('#join2').hide();
     $('#join').fadeIn();
     $('#start').fadeIn();
     $('#list_games').fadeIn();
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
    $('#join').hide();
    $('#join2').hide();

    $('#reject').fadeIn();
    $('input[id=reject_submit]').each(function() {
        this.disabled = false;
    });

    $('#network_status').text("Playing with " + Network.getOpponentNick()).fadeIn();
    showMessage(false);
},


connect: function(bosh_url, muc, userid, password) {
    showMessage("Connecting...");

    this.mucService = muc;
    this.xmppConnection = new Strophe.Connection(bosh_url);

    this.xmppConnection.connect(userid, password, function (status) {
        switch(status) {
        case Strophe.Status.CONNECTED:
            Network.onConnect();
            break;
            
        case Strophe.Status.DISCONNECTED:
            this.disconnect();
            break;
	
        case Strophe.Status.AUTHFAIL:
            showMessage("Authentication error.");
            break;

        case Strophe.Status.ERROR:
        case Strophe.Status.CONNFAIL:
	    showMessage("Connection error.");
            break;
        }
    });

}, 


onConnect: function() {
    console.log("connected");
    $('#connect').hide();
    $('#join2').hide();
    $('#network_status').hide();
    $('#reject').hide();
    $('#list_games').fadeIn();
    $('#disconnect').fadeIn();


    updateStartButtonState('users');
    $('select[id=users]').click(function() {
        $('input[id=start_submit]').each(function() {
          var c =  $("select[id=users] > option:selected").size();
          this.disabled = (c==0);
        });
    });
    $('select[id=requests]').click(function() {
        var c =  $("select[id=requests] > option:selected").size();
        $('input[id=start_submit]').each(function() {
          this.disabled = (c==0);
        });
        $('input[id=reject_submit]').each(function() {
          this.disabled = (c==0);
        });
        $('input[id=open_game_submit]').each(function() {
          this.disabled = (c==0);
        });
    });

    $('#start').fadeIn();
    $('#join').fadeIn();
    $('select[id=users]').empty();
    $('select[id=requests]').empty();
    showMessage("Select opponent");

    this.joinState = Network.GameStatusEnum.GAME_UNDEFINED;
    this.joinedRemoteUserSession = null;

    this.xmppConnection.addHandler(Network.onMessage, null, "message");
    this.xmppConnection.addHandler(Network.onPresence, null, "presence");

    this.nick = this.xmppConnection.jid.split("@")[0] + "_" + (new Date()).getTime();

    var role = ($('select[id=player1] > option:selected').attr('value') == REMOTE_USER) ? "player2" : "player1";
    this.xmppConnection.send($pres({to: this.getGameType() + "@" + this.mucService + "/" + this.nick}).c("PLAYER",{xmlns: this.getGameNamespace(), role: role, status: "waiting opponent"})); 
},


sendLoadRequest: function(game, state, toPlayerNumber)
{
  if(this.joinedRemoteUserSession) {  // When player is not an observer 
    this.xmppConnection.send($msg({to: this.gameRoom, type: 'groupchat'}).c("LOAD", {xmlns: this.getGameNamespace(), state: state, player: toPlayerNumber}));
  }
},

sendMoveRequest: function(game, move, toPlayerNumber)
{
  if(this.joinedRemoteUserSession) {  // When player is not an observer
    var str = game.getMoveString(move);
    this.xmppConnection.send($msg({to: this.gameRoom, type: 'groupchat'}).c("MOVE", {xmlns: this.getGameNamespace(), path: str, player: toPlayerNumber}));
  }
},

sendRetractMoveRequest: function(game, state, fromPlayerNumber)
{
  if(this.joinedRemoteUserSession) {  // When player is not an observer
    this.xmppConnection.send($msg({to: this.gameRoom, type: 'groupchat'}).c("RETRACT", {xmlns: this.getGameNamespace(), state: state, player: fromPlayerNumber}));
  }
},

getUserNick: function(user_session)
{
  if(!user_session) return null; 
  var pos = user_session.indexOf('_');
  return user_session.substring(0,pos);
},

getOpponentNick: function()
{
  return this.getUserNick(this.joinedRemoteUserSession);
},

exitGame: function(waitNewGame)
{
    $('#reject').hide();
    $('#network_status').hide();

    if(this.joinState >= Network.GameStatusEnum.GAME_PROPOSED) {
        this.xmppConnection.send($pres({to: this.gameRoom + "/" + this.nick, type: 'unavailable'}));
    }

    this.gameRoom = null;
    this.joinState = Network.GameStatusEnum.GAME_UNDEFINED;
    this.joinedRemoteUserSession = null;
    this.networkGameType = null;


    if(waitNewGame) {
        var role = ($('select[id=player1] > option:selected').attr('value') == REMOTE_USER) ? "player2" : "player1";
        this.xmppConnection.send($pres({to: this.getGameType() + "@" + this.mucService + "/" + this.nick}).c("PLAYER",{xmlns: this.getGameNamespace(), role: role, status: "waiting opponent"}));
        $('#join').fadeIn();
        $('#start').fadeIn();
        $('#list_games').fadeIn();
        showMessage("Select opponent");
        updateStartButtonState('users');
    }

},

clearGameRequests: function()
{
/** Other game requests are cleared on playing presence
    req = $("select[id=requests] > option");
    req.each(function() {
      var user_session = $(this).attr('value');
      Network.xmppConnection.send($msg({to: user_session, type: 'chat'}).c("NACK", {xmlns: Network.getGameNamespace()}));
      //this.remove();
    });
*/
    $('select[id=requests]').empty();
},

listUsers: function()
{
    var role = ($('select[id=player1] > option:selected').attr('value') == REMOTE_USER) ? "player2" : "player1";
    this.xmppConnection.send($pres({to: this.getGameType() + "@" + this.mucService + "/" + this.nick}).c("PLAYER",{xmlns: this.getGameNamespace(), role: role, status: "waiting opponent"})); 

    $('select[id=requests]').empty();

    $('#open_game').hide();
    $('#list_users').hide();
    $('#join2').hide();
    $('#join').fadeIn();
    $('#start').fadeIn();
    $('#list_games').fadeIn();
    showMessage("Select opponent");
},

listGames: function()
{
    $('select[id=requests]').empty();
    $('#start').hide();
    $('#list_games').hide();
    $('#join').hide();

    $('input[id=open_game_submit]').each(function() {
               this.disabled = true;
    });

    $('#join2').fadeIn();
    $('#open_game').fadeIn();
    $('#list_users').fadeIn();
    showMessage("Select and open the game to observe");
    var muc = $("#muc").val();

    Network.xmppConnection.send($pres({to: Network.getGameType() + "@" + Network.mucService + "/" + Network.nick}).c("PLAYER",{xmlns: Network.getGameNamespace(), status: "observer"}));

    this.xmppConnection.sendIQ(
            $iq({to: muc, type: "get"})
                .c("query", {xmlns:
                             "http://jabber.org/protocol/disco#items"}),
            function (iq) {
                Network.onListItem(iq);
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
                    $('select[id=requests]').append($("<option></option>").text(desc).val(from));
                }
            });
        }
},

openGame: function(gameRoom, gameDescription) {
    $('#open_game').hide();
    $('#list_users').hide();
    $('#join2').hide();
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
    if(this.xmppConnection) {
        this.xmppConnection.deleteHandler(Network.onMessage);
        this.xmppConnection.deleteHandler(Network.onPresence);

        this.xmppConnection.sync = true;
        this.exitGame(false);

        this.xmppConnection.send($pres({to: this.getGameType() + "@" + this.mucService + "/" + this.nick, type: "unavailable"}));
        this.xmppConnection.flush();

        this.xmppConnection.disconnect();

        $('#start').hide();
        $('#open_game').hide();
        $('#list_games').hide();
        $('#list_users').hide();
        $('#reject').hide();
        $('#disconnect').hide();
        $('#join').hide();
        $('#join2').hide();
        $('#network_status').hide();
        $('#connect').fadeIn();

	//wait sending of unavailable presence stanzas
	showMessage("User disconnected.");
        console.log("Disconnected");
    }

    this.xmppConnection = null;
}

}
