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
app.model = app.model || {}
app.model.Checkers = (function() {

function Checkers() {
  this.firstCellOccupied = 1;
  return this;
}

Checkers.prototype = new app.model.Draughts();
Checkers.prototype.constructor = Checkers;
Checkers.prototype.constructor.name = "Checkers";


Checkers.prototype.getBoardRotationDegrees = function() {
  return 90;
}


Checkers.prototype.getFirstTurn = function() {
  return PLAYER2;
}


Checkers.prototype.getWinner = function() {
  if(this.isOver()) {
    return (this.getTurn() == PLAYER1)? PLAYER2 : PLAYER1;
  } else {
    return NONE;
  }
}


Checkers.prototype.getUniDirPawnMovements = function(player, x,y, dx,dy, parentMove, movs) {
  this.getUniDirPieceMovements(player, x,y, dx,dy, parentMove, movs);
}


Checkers.prototype.getUniDirQueenMovements = function(player, x,y, dx,dy, parentMove, movs) {
  this.getUniDirPieceMovements(player, x,y, dx,dy, parentMove, movs);
}


Checkers.prototype.getUniDirPieceMovements = function(player, x,y, dx,dy, parentMove, movs) {
  var x2=x+dx;
  var y2=y+dy;
  var killedPawns = 0;
  var killedQueens = 0;
  var move, nextMove;

  var playerPiece = this.getPiece(x,y);
  if(this.inRange(x2,y2)) {
    var piece = this.getPiece(x2,y2);
    if(piece == NONE) { 
      if(!parentMove) {
 	move = new app.model.Move();
        move.setFrom(x,y);
	move.setTarget(x2,y2);
        this.addMoveIfPriorityIsGreaterOrEqual(movs, move);
      }
    }
    else if(player != this.getPieceOwner(piece)) {
      var killedX = x2;
      var killedY = y2;
      if(this.getPieceType(piece) == PAWN)  killedPawns++;
      if(this.getPieceType(piece) == QUEEN) killedQueens++;

      x2=x2+dx; 
      y2=y2+dy;
      if( this.inRange(x2,y2) && (this.getPiece(x2,y2) == NONE) ) {
        var movRecurs = [];
        move = new app.model.Move();
        move.setKilledPiece(killedX,killedY);
        move.setKills(PAWN, killedPawns, killedQueens);
        move.setFrom(x,y);
        move.setTarget(x2,y2);

        this.getUniDirPieceMovements(player, x2,y2,  1, dy, move, movRecurs);
        this.getUniDirPieceMovements(player, x2,y2, -1, dy, move, movRecurs);
        if(this.getPieceType(playerPiece)==QUEEN) {
          this.getUniDirPieceMovements(player, x2,y2,  1, -dy, move, movRecurs);
          this.getUniDirPieceMovements(player, x2,y2, -1, -dy, move, movRecurs);
        }

        if(movRecurs.length == 0) {
          this.addMoveIfPriorityIsGreaterOrEqual(movs, move);
        } else {
          while(movRecurs.length > 0) {
            nextMove = movRecurs.pop();
            if(nextMove == null) break;
            move = new app.model.Move();
	    move.setFrom(x,y);
	    move.setTarget(x2,y2);
            move.setNextMove(nextMove);
            move.setKilledPiece(killedX,killedY);
	    move.setKills(PAWN, killedPawns + nextMove.getKilledPawns(), killedQueens + nextMove.getKilledQueens());
            this.addMoveIfPriorityIsGreaterOrEqual(movs, move);
          }
        }

      }
    }

  }
}


Checkers.prototype.addMoveIfPriorityIsGreaterOrEqual = function(a, m) {
  if(a.length == 0) {
    a.push(m);
  } else {
    var m0 = a[0];
    var p0 = m0.getPriority();
    var pm = m.getPriority();
    if(pm > 0 && p0 == 0) a.length = 0;
    if(pm > 0 || p0 == 0) a.push(m);
  }
}

return Checkers;
})();

