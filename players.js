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

var LOCAL_USER  = 1;
var REMOTE_USER = 2;
var ENGINE = 3;

var worker = null;
var players = Array();

function stopEnginePlayer() {
    if(worker) {
        worker.terminate(); 
        worker = null;
    }
}

function runEnginePlayer(args) {
    if(!worker) {
        worker = new Worker("ai-worker.js");

        worker.onmessage = function(event) {
            var moveStr = event.data;
            console.log("AI Engine: move received: " + moveStr);

            if(moveStr == "null") {
                checkGameStatus();
            } else {
                var move = game.parseMoveString(moveStr);
                movePieceOnBoard(move);
            }
        };
    }

    worker.postMessage(args);
}

function getPlayer(turn) {
  return players[turn];
}

function createPlayer(playerNumber) {
    var retval = null;
    var playerType = $('select[id=player'+playerNumber+'] > option:selected').attr('value');

    if( (playerType == REMOTE_USER) && (!Network.isConnected()) ) {
        playerType = LOCAL_USER;
    }

    switch(parseInt(playerType)) {
        case LOCAL_USER:
            retval = new LocalPlayer(playerNumber);
            break;
        case REMOTE_USER:
            retval = new NetworkPlayer(playerNumber);
            break;
        case ENGINE:
            retval = new EnginePlayer(playerNumber);
            break;
    }

    players[playerNumber] = retval;
    return retval;
}


function LocalPlayer(playerNumber) { 
    this.playerNumber = playerNumber;
    return this; 
}


LocalPlayer.prototype.sendCommand = function(game, player, cmd, args) {
    switch(cmd) {
        case 'LOAD':
            if( this.loadConfirmed || confirm("Play opponent's new game?") ) {
                this.loadConfirmed = false;
                UI.setGameState(args.data);
                return true;
            } else {
                args.returnValue = false;
                return false;
            }
            break;

        case 'STATE':
            if(player != game.getTurn()) break;

        case 'MOVED':
            acceptHumanMove(true);
            break;

	case 'RETRACT':
            if( this.retractConfirmed || confirm("Retract move?") ) {
                this.retractConfirmed = false;
                UI.setGameState(args.data);
                return true;
            } else {
                args.returnValue = false;
                return false;
            }
            break;

	case 'DRAW':
            if(confirm("Accept draw offer?") ) {
                return true;
            } else {
                return false;
            }
            break;

    }
}


function EnginePlayer(playerNumber) { 
    this.playerNumber = playerNumber;
    return this; 
}


EnginePlayer.prototype.sendCommand = function(game, player, cmd, args) {
   switch(cmd) {
       case 'LOAD':
       case 'STATE':
           if(player != game.getTurn()) break;

       case 'MOVED': 
           var alg = $('select[id=algorithm_name] > option:selected').val();
           var level = $('input[id=level]').val();

           console.log("The computer is thinking...");

           //DEBUG: locks user interface, but it is easiest to debug than webworker code
           //var move = getBestMove(game, alg, level);
           //alert("Best: " + move);
           //game.initFromStateStr(game.toString());
           //alert("Done");
           //END DEBUG

           runEnginePlayer({ alg: alg, level:level, game: game.toString()});
           console.log("AI Engine: move requested");
           break;

       case 'RETRACT':
           if( this.retractConfirmed || confirm("Retract move?") ) {
                this.retractConfirmed = false;
                UI.setGameState(args.data);
                return true;
           } else {
                args.returnValue = false;
                return false;
           }
           break;

	case 'DRAW':
            if(confirm("Accept draw offer?") ) {
                return true;
            } else {
                return false;
            }
            break;

    }
}


function NetworkPlayer(playerNumber) { 
    this.playerNumber = playerNumber;
    this.retractConfirmed = false;
    return this; 
}

NetworkPlayer.prototype.sendCommand = function(game, player, cmd, args) {
    switch(cmd) {
        case 'LOAD':
            if(!this.loadConfirmed) {
               var state = args;
               showMessage("Waiting load confirmation from " + Network.getOpponentNick());
               Network.sendLoadRequest(game, state, player);
               args.returnValue = false;
            } else {
               this.loadConfirmed = false;
               UI.setGameState(args.data);
               return true;
            }
            return false;
            break;

	case 'MOVE':
            try {
                var move = args;
                Network.sendMoveRequest(game, move, this.playerNumber);
            } catch(e) {
                alert(e.message);
            }
            break;

        case 'MOVED':
            if(!game.isOver() && player == game.getTurn()) {
                var opponent = Network.getOpponentNick();
                if(opponent) showMessage("Waiting move from " + opponent);
            } else {
                //showMessage("");
            }
            break;

        case 'STATE':
            if(!game.isOver() && player == game.getTurn()) {
                var opponent = Network.getOpponentNick();
                if(opponent) showMessage("Waiting move from " + opponent);
            }
            break;

	case 'RETRACT':
            // send question to opponent
            if(!this.retractConfirmed) {
                var state = args.data;
                showMessage("Waiting retract confirmation from " + Network.getOpponentNick());
                Network.sendRetractMoveRequest(game, state, player);
                args.returnValue = false;
            } else {
                this.retractConfirmed = false;
                UI.setGameState(args.data);
                return true;
            }
            return false;
            break;

	case 'DRAW':
            // send question to opponent
            showMessage("Waiting draw confirmation from " + Network.getOpponentNick());
            return false;
            break;

    }
}


