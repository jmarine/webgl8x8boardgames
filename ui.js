var UI = UI || {};

UI.getGameType = function() {
  return $('select[id=promotion_piece] > option:selected').val();
}

UI.getGameType = function() {
  return $('select[id=game_type] > option:selected').text();
}

UI.openNetworkGame = function(state) {
     try {
        $('select[id=player1]').val(REMOTE_USER);
        $('select[id=player2]').val(REMOTE_USER);

        var player1 = getPlayerController(1);
        var player2 = getPlayerController(2);

        var gameType = UI.getGameType();
        game = eval("new " + gameType + "()"); 
        game.newGame(player1,player2);
        UI.setGameState(state);
        BlenderExport = eval(gameType.toLowerCase() + "Theme");
        hideGameStorage();

        console.log("Game created.");

     } catch(e) {
        alert("Error: " + e.message + "|" + JSON.stringify(e));
     }
}

UI.createGame = function() {
     try {
        stopEnginePlayer();
        var player1 = getPlayerController(1);
        var player2 = getPlayerController(2);

        var gameType = UI.getGameType();
        game = eval("new " + gameType + "()"); 
        game.newGame(player1,player2);
        BlenderExport = eval(gameType.toLowerCase() + "Theme");
        board.invalidate();

        window.undoManager.clearUndo();
        showGameStorage();
        console.log("Game created.");

     } catch(e) {
        alert("Error: " + e.message + "|" + JSON.stringify(e));
     }
}


UI.setGameState = function(state) {
  acceptHumanMove(false);
  stopEnginePlayer();
  game.initFromStateStr(state, PLAYER1);
  board.invalidate();
  game.players[PLAYER1].sendCommand(game, PLAYER1, 'STATE', state);
  game.players[PLAYER2].sendCommand(game, PLAYER2, 'STATE', state);
  checkGameStatus();
}

UI.updateRetractMoveButton = function() {
  $('input[id=retract_submit]').each(function() {
         var player1 = game.getPlayer(PLAYER1);
         var player2 = game.getPlayer(PLAYER2);
         var type1 = player1.constructor.name;
         var type2 = player2.constructor.name;
         this.disabled = (window.undoManager.length<=0) || (type1=='NetworkPlayer' && type2=='NetworkPlayer') || (type1=='EnginePlayer' && type2=='EnginePlayer');
  });
}

UI.retractMove = function(event) {
  if(event.data) {
    var player1 = game.getPlayer(PLAYER1);
    var player2 = game.getPlayer(PLAYER2);
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
