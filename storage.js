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


var app = app || {}
app.controller = app.controller || {}
app.controller.Storage = (function() {

var saved_games_form = 0;

function deleteGames() {
  window.localStorage.clear();
  listGames();
}

function deleteGame() {
  if(document.forms[saved_games_form].saved_games.selectedIndex > 0) {
    var key = document.forms[saved_games_form].saved_games.options[document.forms[saved_games_form].saved_games.selectedIndex].text;
    window.localStorage.removeItem(key); 
    listGames();
  }
}

function loadGame() {
  if(document.forms[saved_games_form].saved_games.selectedIndex > 0) {
    var gameStr = game.toString();
    if($('#game_type').val() == gameStr.substring(0, gameStr.indexOf(':')).toLowerCase()) window.undoManager.add(gameStr);
    var state = document.forms[saved_games_form].saved_games.options[document.forms[saved_games_form].saved_games.selectedIndex].value;
    var player1 = app.controller.Players.getPlayer(PLAYER1);
    var player2 = app.controller.Players.getPlayer(PLAYER2);
    var type1 = player1.constructor.name;
    var type2 = player2.constructor.name;
    if(type1 == 'NetworkPlayer') player1.sendCommand(game, PLAYER1, 'LOAD', state);
    else if(type2 == 'NetworkPlayer') player2.sendCommand(game, PLAYER2, 'LOAD', state);
    else app.view.UI.setGameState(state);
  }
}

function saveGame() {
  var state = game.toString();
  document.l10n.formatValue('app.storage.save_as_name_prompt').then(function(msg) { 
    var name = prompt(msg, "");
    if(name) {
      name = name.trim();  // prevent bug in FF4
      window.localStorage.setItem(name, state); 
      listGames();
    }
  });
}

function hideGameStorage() {
  $("#storage").hide();
  $("#btnSaveGame").hide();
  //$("#btnRetractMove").hide();
}

function showGameStorage() {
  $("#btnSaveGame").show();
  $('#btnRetractMove').each(function() {
     this.disabled = true;
  });
  //$("#btnRetractMove").show();
  listGames();
}

function listGames() {
  document.forms[saved_games_form].saved_games.options.length = 0;
  document.forms[saved_games_form].saved_games.options[0] = new Option();

  var gameType = $('#game_type').val();
  var storage = window.localStorage;
  if(storage) {
    for(var index = 0; index < storage.length; index++) {
      var option = new Option();
      option.value = storage.getItem(storage.key(index));
      option.text  = storage.key(index);
      if(gameType == option.value.substring(0, option.value.indexOf(':')).toLowerCase()) {
        document.forms[saved_games_form].saved_games.options[document.forms[saved_games_form].saved_games.options.length] = option;
      }
    }
    if(document.forms[saved_games_form].saved_games.options.length > 1) {
      $("#storage").show();
    } else {
      $("#storage").hide();
    }

  } else {
    $('#btnSaveGame').each(function() {
      this.disabled = true;
    });
  }
}


  return {
    deleteGames: deleteGames,
    deleteGame: deleteGame,
    loadGame: loadGame,
    saveGame: saveGame,
    hideGameStorage: hideGameStorage,
    showGameStorage: showGameStorage,
    listGames: listGames
  };

})();

function UndoManagerEvent(data, title) {
  this.data = data;
  this.title = title; 
  this.returnValue = true;
  this.cancelBubble = false;
  return this;
}


function UndoManager() {
  this.max = 10;
  this.length = 0;
  this.position = 0;
  this.states = new Array();
  this.titles = new Array();
  return this;
}

UndoManager.prototype.clearUndo = function() {
  this.length = 0;
  $('#btnRetractMove').each(function() {
    this.disabled = true;
  });
}
 
UndoManager.prototype.add = function(value, title) {
  this.titles[this.position] = title; 
  this.states[this.position] = value;
  this.position = this.position + 1;
  this.length = this.length + 1;
  if(this.max > 0) { 
    this.position = this.position % this.max;
    if(this.length > this.max) this.length = this.max;
  }

  $('#btnRetractMove').each(function() {
    this.disabled = false;
  });

}


var numUndosToIgnore = 0;
function setNumUndosToIgnore(n) {
  numUndosToIgnore = n;
}

window.undoManager = new UndoManager();
window.onundo = function(event) {
  if(event.data) {
    if(numUndosToIgnore <= 0) {
      app.view.UI.retractMove(event);
    } else {
      numUndosToIgnore--;
    }
  }
  return true;
}


document.defaultExecCommand = document.execCommand;
document.execCommand = function(commandId, doShowUI, value) {
  if(commandId == "undo") {
    if(window.undoManager.length > 0) {
      var pos = (window.undoManager.position + window.undoManager.max - 1);
      if(window.undoManager.max > 0) pos = pos % window.undoManager.max;
      var event = new UndoManagerEvent(window.undoManager.states[pos], window.undoManager.titles[pos]);

      window.undoManager.length = window.undoManager.length - 1;
      window.undoManager.position = window.undoManager.position + window.undoManager.max - 1;
      if(window.undoManager.max > 0) window.undoManager.position = window.undoManager.position % window.undoManager.max;
      app.view.UI.updateRetractMoveButton();

      if(window.onundo) {
           window.onundo(event);
      }
    }
  } else if(document.defaultExecCommand) {
    document.defaultExecCommand(commandId, doShowUI, value);
  }
}

