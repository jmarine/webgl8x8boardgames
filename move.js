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

var rowNames = "12345678";
var colNames = "abcdefgh";

var app = app || {}
app.model = app.model || {}
app.model.Move = (function() {

function Move() { 
  this.x1 = -1;
  this.y1 = -1;
  this.x2 = -1;
  this.y2 = -1;
  this.killedX = -1;
  this.killedY = -1;
  this.nextMove = null;
  this.killedPawns = 0;
  this.killedQueens = 0; 
  this.promotion = NONE; 
  return this;
}

Move.prototype.setFrom = function(x1,y1) {
  this.x1 = x1; 
  this.y1 = y1;
}

Move.prototype.setTarget = function(x2,y2) {
  this.x2 = x2;
  this.y2 = y2;
}


Move.prototype.setKilledPiece = function(x,y) {
  this.killedX = x;
  this.killedY = y;
}

Move.prototype.setKills = function(playerPiece, p,q) {
  this.playerPiece = playerPiece;
  this.killedPawns = p;
  this.killedQueens = q;
}

Move.prototype.getKilledPawns = function() {
  return this.killedPawns;
}

Move.prototype.getKilledQueens = function() {
  return this.killedQueens;
}

Move.prototype.getPriority = function() {
  var killedPieceCountFactor = 100;
  var killedPieceCount = this.killedPawns + this.killedQueens;
  var playerPieceFactor = (this.playerPiece == PAWN) ? 1 : 100;
  return playerPieceFactor * (killedPieceCount*killedPieceCountFactor + this.killedQueens);
}


Move.prototype.setNextMove = function(move) {
  this.nextMove = move;
}

Move.prototype.getNextMove = function() {
  return this.nextMove;
}

Move.prototype.copyFrom = function(move) {
  this.x1 = move.x1;
  this.y1 = move.y1;
  this.x2 = move.x2;
  this.y2 = move.y2;
  this.killedPawns = move.killedPawns;
  this.killedQueens = move.killedQueens;
  this.killedX = move.killedX;
  this.killedY = move.killedY;
  this.setNextMove(move.getNextMove());
}

Move.prototype.equals = function(m) { 
  if(m == null) return false;
  if( (this.x1 == m.x1) && (this.y1 == m.y1) && (this.x2 == m.x2) && (this.y2 == m.y2) ) {
    if (this.getNextMove() == null) return (m.getNextMove() == null);
    else return (getNextMove().equals(m.getNextMove()));
  }
  else return false;
}

return Move;
})();
