var app = app || {}
app.view = app.view || {}
app.view.UI = {

lastMsgId: 0,
nextMsgId: 0,

getGameType: function() {
  return $('select[id=game_type] > option:selected').val();
},

createGame: function() {
     try {
        var gameType = this.getGameType();
        game = app.model.GameFactory.createGame(gameType);
        game.newGame();

        var player1 = app.controller.Players.createPlayer(PLAYER1);
        var player2 = app.controller.Players.createPlayer(PLAYER2);
        this.setGameState(game.toString());

        window.undoManager.clearUndo();
        app.controller.Storage.showGameStorage();

        //$("#game_info_title").html($('select[id=game_type] > option:selected').text() + " players");
        var game_type_name = $('select[id=game_type] > option:selected').text();
        document.l10n.setAttributes(document.querySelector('#game_info_title'), "app.game_info.title", { "game_type": game_type_name } );
        document.l10n.formatValue("app.game_info.title", { "game_type": game_type_name } ).then(function(game_info_title) { 
            // Fix FireFox bug:
	    game_info_title = game_info_title.toLowerCase();
            while(game_info_title.length > 0 && game_info_title.charCodeAt(0) == 8296) {
                game_info_title = game_info_title.substring(1);
            }
            game_info_title = game_info_title.substring(0,1).toUpperCase() + game_info_title.substring(1);
            $('#game_info_title').html(game_info_title);
        }); 

        $("#member0_info").html($('select[id=player1] > option:selected').text());
        $("#member1_info").html($('select[id=player2] > option:selected').text());
        $("#member0_info").show();
        $("#member1_info").show();
        $("#game_info").show();

        console.log("Game created.");

     } catch(e) {
        alert("Error: " + e.message + "|" + JSON.stringify(e));
     }
},


setGameState: function(state) {
  app.view.board.acceptHumanMove(false);
  app.controller.Players.stopEnginePlayer();
  game.initFromStateStr(state, PLAYER1);
  BlenderExport = eval(game.constructor.name.toLowerCase() + "Theme");
  this.setTurn(game.getTurn());
  app.controller.Players.getPlayer(PLAYER1).sendCommand(game, PLAYER1, 'STATE', state);
  app.controller.Players.getPlayer(PLAYER2).sendCommand(game, PLAYER2, 'STATE', state);
  app.view.board.checkGameStatus();
},

updateRetractMoveButton: function() {
  $('#btnRetractMove').each(function() {
         var player1 = app.controller.Players.getPlayer(PLAYER1);
         var player2 = app.controller.Players.getPlayer(PLAYER2);
         var type1 = player1.constructor.name;
         var type2 = player2.constructor.name;
         this.disabled = (window.undoManager.length<=0) || (type1=='NetworkPlayer' && type2=='NetworkPlayer') || (type1=='EnginePlayer' && type2=='EnginePlayer');
  });
},

retractMove: function(event) {
  if(event.data) {
    var player1 = app.controller.Players.getPlayer(PLAYER1);
    var player2 = app.controller.Players.getPlayer(PLAYER2);
    var type1 = player1.constructor.name;
    var type2 = player2.constructor.name;
    if( (type1 != 'NetworkPlayer' || type2 != 'NetworkPlayer')
        && (type1 != 'EnginePlayer' || type2 != 'EnginePlayer') ) {
      if(type1 == 'NetworkPlayer') player1.sendCommand(game, PLAYER1, 'RETRACT', event);
      else if(type2 == 'NetworkPlayer') player2.sendCommand(game, PLAYER2, 'RETRACT', event);
      else if(type1 == 'EnginePlayer') player1.sendCommand(game, PLAYER1, 'RETRACT', event);
      else if(type2 == 'EnginePlayer') player2.sendCommand(game, PLAYER2, 'RETRACT', event);
      else if(type1 == 'LocalPlayer') player1.sendCommand(game, PLAYER1, 'RETRACT', event);
      else if(type2 == 'LocalPlayer') player2.sendCommand(game, PLAYER2, 'RETRACT', event);
    }

    if(!event.returnValue) {
      // when previous game state is rejected, restore the state to undoManager again
      window.undoManager.add(event.data);
    }

  }
},

setTurn: function(player) {
  $('#lblPlayer1').css('font-weight', 'normal');
  $('#lblPlayer2').css('font-weight', 'normal');
  $('#lblPlayer' + player).css('font-weight', 'bold');
  app.view.board.invalidate();
},

sendChatLine: function() {
  var line = $('#line').val();
  if(line.length > 0) app.lobby.wgsclient.addAction(app.lobby.gameRoom.gid, -1, "CHAT", line);
  $('#line').val('');
},

clearChat: function(action) {
  $("#chat").val('');
},

addChatLine: function(action) {
  $("#chat").val( $("#chat").val() + action.user + "> " + action.value + "\n");
  document.getElementById("chat").scrollTop = document.getElementById("chat").scrollHeight;
  app.view.UI.showGames();
},

getNextMsgId: function() {
  return ++this.nextMsgId;
},

showMessage: function(msg, msgId) {
  if(!msg) enableGoogleAnalytics();

  if(!msgId) msgId = this.getNextMsgId(); 
  if(this.lastMsgId <= msgId) {  // fix async UI messages to user
    this.lastMsgId = msgId;
    if(msg) {
        $('#message').html(msg);
        $('#messageBox').show();
    } else {
        $('#messageBox').hide();
    }
  }
},

showCredits: function() {
  $('#title').show();
  $('#games').hide();
  $('#options').hide();
  $('#config').fadeIn();
},

showOptions: function() {
  $('#title').hide();
  $('#games').hide();
  $('#options').show();
  $('#config').fadeIn();
},

showGames: function() {
  $('#title').hide();
  $('#options').hide();
  $('#games').show();
  $('#config').fadeIn();
},

hideControls: function() {
  $('#config').hide();
}


}
