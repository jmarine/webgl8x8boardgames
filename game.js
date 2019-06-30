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


var game = null;

var NONE    = 0;
var PLAYER1 = 1;
var PLAYER2 = 2;

var PAWN    = 1;
var QUEEN   = 2;
var KING    = 3;
var BISHOP  = 4;
var KNIGHT  = 5;
var ROOK    = 6;

var PIECE_CHARS  = " PQKBNR"; 


var app = app || {} 

app.model = app.model || {}
app.model.GameFactory = {
  createGame: function(gameType) {
    var camelGameType = gameType.substring(0,1).toUpperCase() + gameType.substring(1).toLowerCase();
    return eval(" new app.model." + camelGameType + "()");
  }
}

app.model.Game = (function() {
 
function Game() {
  return this;
}

Game.prototype.getTurn = function() {
  return this.turn;
}

Game.prototype.isOver = function() {
  return (this.getMovements().length == 0);
}

Game.prototype.getOpponent = function() {
  return (this.turn == PLAYER1) ? PLAYER2 : PLAYER1;
}

Game.prototype.toggleTurn = function() {
  this.turn = this.getOpponent();
  return this.turn;
}

Game.prototype.getPieceIndex = function(x,y) {
  var index = y*8 + x;
  return index;
}

Game.prototype.setPiece = function(x,y, player, pieceType) {
  var index = this.getPieceIndex(x,y);
  var playerFactor = 0;
  if(player == PLAYER1) playerFactor = 1;
  if(player == PLAYER2) playerFactor = -1;
  this.pieces[index] = playerFactor * pieceType;
}

Game.prototype.getPiece = function(x,y) {
  var index = this.getPieceIndex(x,y);
  var val = this.pieces[index];
  if(val) {
	return val;
  }
  else return NONE;
}


Game.prototype.getPieceChar = function(type,player) {
  var pieceChar = PIECE_CHARS.charAt(type);
  if(player == PLAYER2) pieceChar = pieceChar.toLowerCase();
  return pieceChar;
}


Game.prototype.parsePieceType = function(ch) {
  var index = PIECE_CHARS.indexOf(ch);
  if(index < 0) index = NONE;
  return index;
}


Game.prototype.getPieceType = function(piece) {
  if(piece < 0) piece = -piece;
  return piece;
}


Game.prototype.getPieceOwner = function(piece) {
  if(!piece) return NONE;
  else if(piece > 0) return PLAYER1;
  else if(piece < 0) return PLAYER2;
}


Game.prototype.makeMove = function(move) { 
  var player = this.getTurn();
  while(move != null) { 
      this.makeStep(player, move);
      move=move.nextMove;
  }
  this.toggleTurn();
  this.movements = null;
}


// METHODS TO OVERRIDE

Game.prototype.getBoardRotationDegrees = function() {
  return 0;
}


Game.prototype.getPreferedLevelAI = function(alg) {
  if(alg == "MCTS") return 50;
  else return 4;
}

Game.prototype.toString = function() {
  return "[Game]";
}

Game.prototype.clone = function() {
  var copy = new this.constructor();
  copy.turn = this.turn;
  copy.pieces = this.pieces.slice(0);
  return copy;
}


Game.prototype.initFromStateStr = function(str) {
}

Game.prototype.newGame = function(player1, player2) {
}

Game.prototype.parseMoveString = function(str) {
  return null;
}

Game.prototype.getMoveString = function(move) {
  return "null";
}

Game.prototype.isValidMove = function(str) {
  var move = this.parseMoveString(str);
  return (move != null);
}

Game.prototype.makeStep = function(player, move) {
}

Game.prototype.getPieceValue = function(pieceType) {
  return 0;
}

Game.prototype.evaluateState = function(depth) {
  return 0;
}

Game.prototype.isQuiescenceMove = function(move) {
  return true;
}

Game.prototype.getMovements = function() {
  return [];
}

Game.prototype.getWinner = function() {
  return NONE;
}


return Game;
})();
