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
gameRoom: null, 

GameStatusEnum: {
  GAME_UNDEFINED: 0,
  GAME_PROPOSED: 1,
  GAME_CREATED: 2
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

    if(msg) {
      this.user = msg;
      this.nick = msg.user;
      this.listGames();
    }
},

loadProfile: function(user) {
  var user = $("#profile_filter").val();
  this.wgsclient.getProfile(user, function(id,details,errorURI,result,resultKw) {

      $("#profile_filter > option[value!='']").remove();
      if(Network.user.friends) {
          Network.user.friends.forEach(function(item) {
            var option = $('<option>').attr('value',item.user).text(item.name);
            if(item.user == user) option.attr("selected","selected");
            if(item.picture) option.attr("style","height:34px;background-repeat:no-repeat;background-image:url("+item.picture+");padding-left:35px;background-size: auto 30px;background-position:2px 2px;vertical-align: middle");
            $("#profile_filter").append(option);
          });
      }

      $("#profile_apps>tbody>tr").remove();
      $.each(resultKw.apps, function(app, appStats) {
          var tr = $('<tr>');
          tr.attr('class', "scrollTableRow");
          tr.append('<td>' + app + '</td>');
          tr.append('<td>' + appStats.active + '</td>');
          tr.append('<td>' + appStats.win + '</td>');
          tr.append('<td>' + appStats.draw + '</td>');
          tr.append('<td>' + appStats.lose + '</td>');
          tr.append('<td>' + appStats.resign + '</td>');

          $("#profile_apps>tbody").append(tr);
      });
      $('#profile_section').show();
  });
},

sendLoadRequest: function(game, state, toPlayerNumber)
{
  // TODO
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
  $("#groupsTable>tbody>tr[state='FINISHED']").remove();
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
},

exitGame: function(disconnecting)
{
    acceptHumanMove(false);

    $("#chat_section").hide();
    $("#profile_section").hide();
    $("#game_info").hide();
    $("#member0_info").hide();
    $("#member1_info").hide();
    $("#state0_info").hide();
    $("#state1_info").hide();
    $("#game_type").removeAttr("disabled");
    $("#player1").removeAttr("disabled");
    $("#player2").removeAttr("disabled");

    $("#btnResignGame").hide();
    $("#btnDrawGame").hide();

    $("#matching_options").hide();
    $("#btnCreateGame").hide();
    $("#btnHideMatchingOptions").hide();
    $("#games_section").show();
    $("#btnShowMatchingOptions").show();
    $("#btnDeleteFinishedGames").show();
    $('#btnRetractMove').hide();

    var client = this.wgsclient;
    if(this.gameRoom && !disconnecting) {
      var gid = this.gameRoom.gid;
      this.wgsclient.exitGroup(gid, function(id,details,errorURI,result,resultKw) {} );
    }

    this.gameRoom = null;
    this.networkGameType = null;
    showMessage(null);
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

resign: function() {
  var group = Network.gameRoom;
  if(this.wgsclient && group && group.state != "FINISHED" && this.wgsclient.isMemberOfGroup(group.gid)) {  // When player is not an observer
    var slot = this.wgsclient.getSlotOfGroup(group.gid);
    var data = ""; 
    this.wgsclient.addAction(group.gid, slot, "RESIGN", data);
  }
},

offerDraw: function() {
  var group = Network.gameRoom;
  if(this.wgsclient && group && group.state != "FINISHED" && this.wgsclient.isMemberOfGroup(group.gid)) {  // When player is not an observer
    var slot = this.wgsclient.getSlotOfGroup(group.gid);
    var data = ""; 
    this.wgsclient.addAction(group.gid, slot, "DRAW_QUESTION", data);
  }
},


group_finished: function() {
  var group = Network.gameRoom;

  $("#btnResignGame").hide();
  $("#btnDrawGame").hide();
  $("#btnRetractMove").hide();  // TODO: clear achievements on retract

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

        this.wgsclient.updateGroup(group.appId, group.gid, newState, false, group.data, group.automatch, group.hidden, group.observable, group.dynamic, group.alliances, function(id,details,errorURI,result,resultKw) {
           if(errorURI) alert(errorURI);
        });

        group.state = newState;

    }

    UI.clearChat();
    $("#chat_section").show();
    $("#state0_info").show();
    $("#state1_info").show();
    hideCredits();    

    $('#start').hide();
    $('#games_section').hide();
    $("#matching_options").hide();
    $("#matching_options").hide();
    $("#btnCreateGame").hide();
    $("#btnShowMatchingOptions").hide();
    $("#btnHideMatchingOptions").show();
    $("#btnDeleteFinishedGames").hide();
    if(this.wgsclient.isMemberOfGroup(group.gid) && group.state != "FINISHED") {
         $("#btnResignGame").show();
         $("#btnDrawGame").show();
         $("#btnRetractMove").show();
    } else {
         $("#btnResignGame").hide();
         $("#btnDrawGame").hide();
         $("#btnRetractMove").hide();
    }

    $("select[id=game_type]").val(group.appName);
    if(group.appName.indexOf('chess') == 0) {
        $('#promotion_option').show();
    } else {
        $('#promotion_option').hide();
    }


    group.members.forEach(function(item) {
      $("select[id=player" + (item.slot+1) + "]").val((Network.wgsclient.sid == item.sid)? LOCAL_USER : REMOTE_USER);
    });


    $('#game_type').attr('disabled','disabled');
    $('#player1').attr('disabled','disabled');
    $('#player2').attr('disabled','disabled');
    showMessage(false);
    //alert("ACK: unsubscribe from MUC");

    UI.createGame();
    if(group.initial_data && group.initial_data.length > 0) game.initFromStateStr(group.initial_data);

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

        if(action.type == "CHAT") {
	  UI.addChatLine(action);
        } else {
          lastAction = action;
        }

      });
      group.action = lastAction;
    }

    UI.setGameState(game.toString());
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
      if(action.type == "CHAT") {
        UI.addChatLine(action);
      } else if(action.type == "MOVE" && (opened || action.slot != currentSlot) ) {
        UI.setGameState(game.toString());
        var move = game.parseMoveString(action.value);
        if(move) movePieceOnBoard(move, true);

      } else if(action.type == "RESIGN") {
          showMessage("Player " + (action.slot+1) + " has resigned!");
          $("#btnRetractMove").hide();
          $("#btnResignGame").hide();
          $("#btnDrawGame").hide();
          acceptHumanMove(false);

      } else if(action.type == "RETRACT_REJECTED") {
          UI.setGameState(action.value);
          if(isFinite(currentSlot) && action.slot != currentSlot) {
            showMessage("Move retraction has been rejected");
            checkGameStatus();
          }

      } else if(action.type == "RETRACT_ACCEPTED") {
        showMessage("");
        if(this.wgsclient.isMemberOfGroup(group.gid) && (isFinite(currentSlot) && action.slot != currentSlot) ) {
          getPlayer(1+action.slot).retractConfirmed = true;
          document.execCommand("undo");
          showMessage("Move retraction has been accepted");
          $("#btnResignGame").show();
          $("#btnDrawGame").show();
        } else {
          if(this.wgsclient.isMemberOfGroup(group.gid) && (isFinite(currentSlot) && (1+action.slot) != game.getTurn()) ) {
            setNumUndosToIgnore(1);
            document.execCommand("undo");
            setNumUndosToIgnore(0);
            showMessage("");
            $("#btnResignGame").show();
            $("#btnDrawGame").show();
          }
          UI.setGameState(action.value);
        }

      } else if(action.type == "RETRACT_QUESTION") {
        var currentState = game.toString();
        if(isFinite(currentSlot) && action.slot == currentSlot) {
          acceptHumanMove(false);
          showMessage("Waiting retract confirmation from opponent");
          //setNumUndosToIgnore(1);
          //document.execCommand("undo");
          //setNumUndosToIgnore(0);

        } else if(this.wgsclient.isMemberOfGroup(group.gid)) {

          var player = 1+(1-action.slot);
          var answer = getPlayer(player).sendCommand(game, player, 'RETRACT', {data: action.value});

          var response = answer? "RETRACT_ACCEPTED" : "RETRACT_REJECTED";
          var data = answer? action.value : currentState;
          this.wgsclient.addAction(group.gid, currentSlot, response, data);
        }

      } else if(action.type == "DRAW_QUESTION") {
        var currentState = game.toString();
        if(isFinite(currentSlot) && action.slot == currentSlot) {
          showMessage("Waiting draw offer response from opponent");
          acceptHumanMove(false);

        } else if(this.wgsclient.isMemberOfGroup(group.gid)) {

          var player = 1+(1-action.slot);
          var answer = getPlayer(player).sendCommand(game, player, 'DRAW', {data: action.value});

          var response = answer? "DRAW_ACCEPTED" : "DRAW_REJECTED";
          var data = answer? action.value : currentState;
          this.wgsclient.addAction(group.gid, currentSlot, response, data);
        }


      } else if(action.type == "DRAW_REJECTED") {
          if(isFinite(currentSlot) && action.slot != currentSlot) {
            showMessage("Draw offer has been rejected");
            UI.setGameState(game.toString());
          }

      } else if(action.type == "DRAW_ACCEPTED") {
          showMessage("Draw offer has been accepted");
          acceptHumanMove(false);
          UI.setTurn(0);
          $("#btnRetractMove").hide();
          $("#btnResignGame").hide();
          $("#btnDrawGame").hide();
      }

    }


    if(group.members) {
        var currentUser = Network.wgsclient.user;
        var currentUserIsOnlineMember = false;
        var currentUserIsOfflineMember = false;
        group.members.forEach(function(member, index) {
            if(!member.connected && member.user==currentUser) {
                currentUserIsOfflineMember = true;
            }
        });
        group.members.forEach(function(member) {
            var memberId = member.slot;
            var selected = "";
            var roleFixed = false;
            var currentUserSelected = false;
            
            if(member.sid==Network.wgsclient.sid) {
                var selected = "";
                if(currentUserIsOfflineMember && (!member.connected) && member.user==currentUser) {
                    currentUserSelected = true;;
                    currentUserIsOnlineMember = true;
                    currentUserIsOfflineMember = false;
                    roleFixed = true;
                }
                if(!currentUserIsOfflineMember && !currentUserIsOnlineMember) {
                    currentUserSelected = true;
                    currentUserIsOnlineMember = true;
                }
            } else {
                roleFixed = true;
            }

            Network.update_group_member(memberId, member, currentUserSelected, roleFixed);

        });
    }

},

update_group_member: function(memberId, member, currentUserSelected, roleFixed) {
    var memberState = member.state ? member.state : "empty";
    var memberType  = member.type  ? member.type  : "user";
    var memberName  = member.name  ? member.name  : "";
    if(memberName.length == 0) memberName = "Empty";
    //if( member.sid && member.sid == Network.wgsclient.sid ) memberName = "Me";
    
    var status = memberState.toLowerCase();
    if(status != 'empty') status = memberType.toLowerCase() + "_" + status;
    $("#state" + memberId).attr("src", "/images/" + status + ".png");
    $("#state" + memberId).attr("title", ((status!='empty')? memberType.toUpperCase():"") + " " + memberState);
    $("#state" + memberId + "_info").attr("src", "/images/" + status + ".png");
    $("#state" + memberId + "_info").attr("title", ((status!='empty')? memberType.toUpperCase():"") + " " + memberState);
    $("#member" + memberId).html( memberName );
    $("#member" + memberId + "_info").html( memberName );
},


open_group: function(appId, gid, options) {
    $('#profile_section').hide();

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

addGroupListItem: function(group) {
   var localPlayerTurn = false;
   var opt = $('<tr>');
   opt.attr("gid", group.gid);
   opt.attr('observable', group.observable);   
   opt.attr('class', "scrollTableRow");
   opt.attr('state', group.state);

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
       
       var playerLabel = "Player " + count; // + (member.role? " ("+ member.role +")" : "");
       if(group.state != "FINISHED" && index == group.turn) {
          playerLabel = "<b>" + playerLabel + "</b>"; 
          if(group.members[group.turn].user == Network.wgsclient.user) localPlayerTurn = true;
       }

       var row = $("<tr>");
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


   if(localPlayerTurn) {
     opt.attr("bgcolor", "#EAB13D");  // remark current turn
     $("#groupsTable>tbody").prepend(opt);
   } else {
     $("#groupsTable>tbody").append(opt);
   }

},

update_groups: function(id,details,errorURI,payload,payloadKw) {
      if(payloadKw.groups) {
        //$("#groups option").remove();
        $("#groupsTable>tbody>tr").remove();
        

     console.log("**** update_groups ****");
        payloadKw.groups.forEach(function(item) {
            /*
            var opt = $('<option>')
            opt.attr('value',item.gid).text(Network.getGroupDescription(item));
            opt.attr('observable', item.observable);
            $("#groups").append(opt);
            */
            Network.addGroupListItem(item);

            if(gid != null && gid == item.gid) {
	      Network.open_group(item.appId, item.gid, {});	
            }

        });

                
      } else if(payloadKw.cmd == "group_deleted") {
       
        $("#groupsTable>tbody>tr[gid='"+payloadKw.gid+"']").remove();
        
      } else {  // "group_created" || "group_updated" || user_joined || user_exit || user_updated
        
        if(payloadKw.hidden) {
            //$("#groups option[value='"+response.gid+"']").remove();
            $("#groupsTable>tbody>tr[gid='"+payloadKw.gid+"']").remove();
        } else {
            // if($("#groups option[value='"+response.gid+"']").size() <= 0) {  // insert group
            //   $("#groups").append($("<option>").attr("value", response.gid));
            // }
            //$("#groups option[value='"+response.gid+"']").text(Network.getGroupDescription(response));
            //$("#groups option[value='"+response.gid+"']").attr("observable", response.observable);
            
            $("#groupsTable>tbody>tr[gid='"+payloadKw.gid+"']").remove();
            Network.addGroupListItem(payloadKw);
        }
        
      }
    
},


listGames: function()
{
    $('#start').hide();
    $('#games_section').fadeIn();
    $("#groupsTable>tbody>tr").remove();
    this.wgsclient.listGroups(null, null, null, function(id,details,errorURI,result,resultKw) {
        if(!errorURI) {
            Network.update_groups(id,details,errorURI,result,resultKw);
            $("#app_list").hide();
            if(gid == null || gid.length == 0) $("#group_list").slideDown(500);
            else gid = "";  // TODO: show/hide buttons
        } else {
            showMessage("Error: " + errorURI);
        }
    });

},


disconnect: function() {
    console.log("Disconnecting.");
    if(this.wgsclient) {
        //Network.wgsclient.unsubscribe("wgs.apps_event", Network.update_groups, null, {});
        this.exitGame(true);
        this.wgsclient.close();
        this.wgsclient = null;

        $("#btnProfile").hide();
        $("#user").val("");
        $("#password").removeAttr("disabled");
        $("#password").val("");
        if(provider.length == 0) {
          $("#password").show();
          $("#lbl_password").show();
          $("#user").removeAttr("disabled");
          $("#server_url").removeAttr("disabled");
        }

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
        $("#btnResignGame").hide();
        $("#btnDrawGame").hide();
        $('#games_section').hide();
        $('#connect_section').fadeIn();

        $("#groupsTable>tbody>tr").remove();

	//wait sending of unavailable presence stanzas
	showMessage("User disconnected.");
        console.log("Disconnected");
        //enable_network();
    }
    this.wgsclient = null;
}

}
