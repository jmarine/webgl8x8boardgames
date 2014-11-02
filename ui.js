var UI = UI || {};


UI.getGameType = function() {
  return $('select[id=game_type] > option:selected').text();
}

UI.openNetworkGame = function(state) {
     try {
        $('select[id=player1]').val(REMOTE_USER);
        $('select[id=player2]').val(REMOTE_USER);

        var gameType = UI.getGameType();
        game = eval("new " + gameType + "()"); 
        game.newGame();

        var player1 = createPlayer(PLAYER1);
        var player2 = createPlayer(PLAYER2);
        UI.setGameState(state);
        hideGameStorage();

        $("#game_info").show();

        console.log("Game created.");

     } catch(e) {
        alert("Error: " + e.message + "|" + JSON.stringify(e));
     }
}

UI.createGame = function() {
     try {
        var gameType = UI.getGameType();
        game = eval("new " + gameType + "()"); 
        game.newGame();

        var player1 = createPlayer(PLAYER1);
        var player2 = createPlayer(PLAYER2);
        UI.setGameState(game.toString());

        window.undoManager.clearUndo();
        showGameStorage();

        $("#type_info").html($('select[id=game_type] > option:selected').text() + " players");
        $("#member0_info").html($('select[id=player1] > option:selected').text());
        $("#member1_info").html($('select[id=player2] > option:selected').text());
        $("#member0_info").show();
        $("#member1_info").show();
        $("#game_info").show();

        console.log("Game created.");

     } catch(e) {
        alert("Error: " + e.message + "|" + JSON.stringify(e));
     }
}


UI.setGameState = function(state) {
  acceptHumanMove(false);
  stopEnginePlayer();
  game.initFromStateStr(state, PLAYER1);
  UI.setTurn(game.getTurn());
  BlenderExport = eval(game.constructor.name.toLowerCase() + "Theme");
  board.invalidate();
  getPlayer(PLAYER1).sendCommand(game, PLAYER1, 'STATE', state);
  getPlayer(PLAYER2).sendCommand(game, PLAYER2, 'STATE', state);
  checkGameStatus();
}

UI.updateRetractMoveButton = function() {
  $('#btnRetractMove').each(function() {
         var player1 = getPlayer(PLAYER1);
         var player2 = getPlayer(PLAYER2);
         var type1 = player1.constructor.name;
         var type2 = player2.constructor.name;
         this.disabled = (window.undoManager.length<=0) || (type1=='NetworkPlayer' && type2=='NetworkPlayer') || (type1=='EnginePlayer' && type2=='EnginePlayer');
  });
}

UI.retractMove = function(event) {
  if(event.data) {
    var player1 = getPlayer(PLAYER1);
    var player2 = getPlayer(PLAYER2);
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
}

UI.setTurn = function(player) {
  $('#lblPlayer1').css('font-weight', 'normal');
  $('#lblPlayer2').css('font-weight', 'normal');
  $('#lblPlayer' + player).css('font-weight', 'bold');
}

UI.sendChatLine = function() {
  Network.wgsclient.addAction(Network.gameRoom.gid, -1, "CHAT", $('#line').val());
  $('#line').val('');
}

UI.clearChat = function(action) {
  $("#chat").val('');
}

UI.addChatLine = function(action) {
  $("#chat").val( $("#chat").val() + action.user + "> " + action.value + "\n");
  document.getElementById("chat").scrollTop = document.getElementById("chat").scrollHeight;
  showGames();
}
