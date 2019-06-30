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

app.model.Draughts = (function() {

function Draughts() {
  this.firstCellOccupied = 0;
  return this;
}


Draughts.prototype = new app.model.Game();
Draughts.prototype.constructor = Draughts;
Draughts.prototype.constructor.name = "Draughts";

Draughts.prototype.getBoardRotationDegrees = function() {
  return 0;
}

Draughts.prototype.getPreferedLevelAI = function(alg) {
  if(alg == "MCTS") return 40;
  else return 6;
}

Draughts.prototype.clone = function() {
  var copy=app.model.Game.prototype.clone.call(this);
  copy.pieceCount = this.pieceCount.slice(0);

  /* manual clone
  copy.pieceCount = Array();
  copy.pieceCount[PLAYER1] = this.pieceCount[PLAYER1];
  copy.pieceCount[PLAYER2] = this.pieceCount[PLAYER2];
  */

  return copy;
}

Draughts.prototype.toString = function() {
   var retval = [];
   retval.push(this.constructor.name);
   retval.push(":");
   retval.push( (this.getTurn() == PLAYER1) ? "1" : "2" );
   for(var y = 0; y < 8; y++) {
     for(var x = 0; x < 8; x++) {
        if(((x+y)%2) != this.firstCellOccupied) {
          var piece = this.getPiece(x,y);
          var pieceType = this.getPieceType(piece);
          var pieceOwner = this.getPieceOwner(piece);
          var pieceChar  = this.getPieceChar(pieceType, pieceOwner);
          retval.push(pieceChar);
        }
     }
   }
   return retval.join("");
}

Draughts.prototype.initFromStateStr = function(str) {
  try {
    var startIndex = str.indexOf(':');
    if(startIndex != -1) str = str.substring(1+startIndex);

    var index = 0;
    this.turn = (str.charAt(index++) == '1') ? PLAYER1 : PLAYER2;
    this.pieceCount = Array();
    this.pieceCount[PLAYER1] = 0;
    this.pieceCount[PLAYER2] = 0;

    this.pieces = Array();
    for(var y = 0; y < 8; y++) {
      for(var x = 0; x < 8; x++) {
        this.setPiece(x,y, NONE, NONE);
        if(((x+y)%2) != this.firstCellOccupied) {
          var piece = str.charAt(index++);
          var pieceUpper = piece.toUpperCase();
          var pieceType  = this.parsePieceType(pieceUpper);
          if(pieceType != NONE) {
            var pieceOwner = (piece == pieceUpper) ? PLAYER1 : PLAYER2;
	    this.setPiece(x,y, pieceOwner, pieceType);
            this.pieceCount[pieceOwner]++;
          } 
        }
      }
    }

  } catch(e) {
    alert("Error: " + e.message);
  }

  this.movements = null;
}


Draughts.prototype.getFirstTurn = function() {
  return PLAYER1;
}

Draughts.prototype.newGame = function() {
  var rows = 3;

  this.turn = this.getFirstTurn();
  this.pieces = Array();
  this.pieceCount = Array();
  this.pieceCount[PLAYER1] = 0;
  this.pieceCount[PLAYER2] = 0;

  var x,y;
  for(y=0; y<8; y++) {
      for(x=0; x<=8; x++) {
         this.setPiece(x,y,NONE, NONE);
      }
  }
  for(y=0; y<rows; y++) { 
      for(x=0; x<8; x++) { 
          if(((x+y)%2) != this.firstCellOccupied) {
		this.setPiece(x,y,PLAYER1, PAWN);
		this.pieceCount[PLAYER1]++;
	  }
          else {
		this.setPiece(x,7-y,PLAYER2, PAWN);
		this.pieceCount[PLAYER2]++;
	  }
      }  
  }

  this.movements = null;
}


Draughts.prototype.parseMoveString = function(str) {
  if(str) {
    str = str.toLowerCase();
    var movs = this.getMovements();
    if(movs.length > 0) {
      for(var i = 0; i < movs.length; i++) {
        var move = movs[i];
        if(str == this.getMoveString(move)) return move;
      }
    }
  }
  return null;
}


Draughts.prototype.getMoveString = function(move) {
  if(!move) return "null";
  var str = colNames.charAt(move.x1) + rowNames.charAt(move.y1);
  while(move != null) {
    str = str + colNames.charAt(move.x2) + rowNames.charAt(move.y2);
    move = move.getNextMove();
  }
  return str;
} 


Draughts.prototype.getWinner = function() {
  if(this.pieceCount[PLAYER1] == 0) return PLAYER2;
  else if(this.pieceCount[PLAYER2] == 0) return PLAYER1;
  else return NONE;
}


Draughts.prototype.getValidMove = function(m) {
  var validMoves = this.getMovements();
  for(var index = 0; index < validMoves.length; index++) {
      var move = validMoves[index];
      if(this.getMoveString(m) == this.getMoveString(move)) return move;
  }
  return null;
}

Draughts.prototype.makeStep = function(player, move) {

  if(move == null) return;

  var x1, y1, x2, y2, dx, dy;
  var myPiece, oldPiece, piece, pieceType;

  x1=move.x1; y1=move.y1;
  x2=move.x2; y2=move.y2;
  dx=((x2-x1)>0)? 1:-1;
  dy=((y2-y1)>0)? 1:-1;
  myPiece=oldPiece=this.getPieceType(this.getPiece(x1,y1));
  this.setPiece(x1,y1, player, NONE);

  do
  { // Nota: el valor de l'avanzament no hauria de ser igual
      x1 = x1+dx; y1 = y1+dy;
      piece=this.getPiece(x1,y1);
      pieceType=this.getPieceType(piece);
      if(pieceType != NONE) { 
        // kill piece 
        this.setPiece(x1,y1, player, NONE);
        this.pieceCount[this.getPieceOwner(piece)]--;
      }
      if(myPiece == PAWN) { 
        if(player == PLAYER1) {
          if(y1==7) myPiece = QUEEN;
        } else if(player == PLAYER2) { 
          if(y1==0) myPiece = QUEEN;
        }
      }
  } while(y1!=y2);

  this.setPiece(x2,y2, player, myPiece);
  this.movements = null;
}


Draughts.prototype.getPieceValue = function(pieceType) {
  switch(pieceType) {
    case PAWN:   return 30;
    case QUEEN:  return 165;
    default:     return 0;
  }
}

Draughts.prototype.evaluateState = function(depth) {
   var x,y;
   var retval = 0;

   if(this.isOver()) {
     var winner = this.getWinner();
     if(winner == PLAYER2) {
       return (this.getTurn() == PLAYER1) ? -10000-depth : 10000+depth;
     } else if(winner == PLAYER1) {
       return (this.getTurn() == PLAYER2) ? -10000-depth : 10000+depth;
     } else { 
       return 0;
     }
   }

   // balance of power 
   for(y = 0; y < 8; y++) {
     for(x = 0; x < 8; x++) {
        var piece = this.getPiece(x,y);
        var pieceType = this.getPieceType(piece);
        var pieceValue = this.getPieceValue(pieceType);
        var factor = (this.getTurn() == this.getPieceOwner(piece)) ? 1 : -1;
        retval += factor * pieceValue * 10; 
     }
   } 

   // penalization for opening of promotion cells
   var promotionCellOpenedValue = 10;
   for(x = 0; x < 8; x = x+2) {
	var piece0 = this.getPiece(x+1, 0);
	if(this.getPieceOwner(piece0) != PLAYER1) {
		if(this.getTurn() == PLAYER1) retval -= promotionCellOpenedValue;
		else retval += promotionCellOpenedValue;
	}

	var piece7 = this.getPiece(x, 7);
	if(this.getPieceOwner(piece7) != PLAYER2) {
		if(this.getTurn() == PLAYER2) retval -= promotionCellOpenedValue;
		else retval += promotionCellOpenedValue;
	}
   }

   // some noise
   retval += 4 - Math.floor(Math.random()*9);
   
   return retval;
}

Draughts.prototype.isQuiescenceMove = function(move) {
  return (move.promotion == NONE && move.killedX == -1);
}

Draughts.prototype.getMovements = function() {
  if(!this.movements) {
    this.movements = [];
    var player = this.getTurn();
    for(var y=0; y<8; y++) {
      for(var x=0; x<8; x++) { 
        var piece = this.getPiece(x,y);
        if( (piece != NONE) && (player == this.getPieceOwner(piece)) ) {
          this.getPieceMovements(player, x,y, this.movements);
        }
      } 
    }
  }
  return this.movements;
}


Draughts.prototype.getPieceMovements = function(player, x,y, movs) {
  var dx, dy;
  var piece = this.getPiece(x,y);
  switch( this.getPieceType(piece) ) { 
    case PAWN:
      dy=(player == PLAYER1) ? 1 : -1;
      this.getUniDirPawnMovements(player, x,y, -1, dy, null, movs);
      this.getUniDirPawnMovements(player, x,y, +1, dy, null, movs);
      break;
    case QUEEN:
      this.getUniDirQueenMovements(player, x,y, -1,+1, null, movs);
      this.getUniDirQueenMovements(player, x,y, +1,+1, null, movs);
      this.getUniDirQueenMovements(player, x,y, -1,-1, null, movs);
      this.getUniDirQueenMovements(player, x,y, +1,-1, null, movs);
      break;
  }
  return movs;
}

Draughts.prototype.inRange = function(x,y) {
  return ( (x >= 0) && (y >= 0) && (x < 8) && (y < 8) );
}

Draughts.prototype.addMoveIfPriorityIsGreaterOrEqual = function(a, m) {
  if(a.length == 0) {
    a.push(m);
  } else {
    var m0 = a[0];
    var p0 = m0.getPriority();
    var pm = m.getPriority();
    if(pm >  p0) a.length = 0;
    if(pm >= p0) a.push(m); 
  }
}

Draughts.prototype.getUniDirPawnMovements = function(player, x,y, dx,dy, parentMove, movs) {
  var x2=x+dx;
  var y2=y+dy;
  var move, nextMove;
  var killedPawns = 0;
  var killedQueens = 0;

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
      x2=x2+dx; 
      y2=y2+dy;
      if(this.getPieceType(piece) == PAWN)  killedPawns++;
      if(this.getPieceType(piece) == QUEEN) killedQueens++;
      if( this.inRange(x2,y2) && (this.getPiece(x2,y2) == NONE) ) {
        var movRecurs = [];
        move = new app.model.Move();
        move.setKilledPiece(killedX,killedY);
        move.setKills(PAWN, killedPawns, killedQueens);
        move.setFrom(x,y);
        move.setTarget(x2,y2);
        this.addMoveIfPriorityIsGreaterOrEqual(movs, move);

        this.getUniDirPawnMovements(player, x2,y2,  1, dy, move, movRecurs);
        this.getUniDirPawnMovements(player, x2,y2, -1, dy, move, movRecurs);
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

Draughts.prototype.getUniDirQueenMovements = function(player, x,y, dx,dy, parentMove, movs) {
  var x2, y2, piece;
  var move, nextMove;
  var cnt, regRec, someEaten;
  var killedX = -1, killedY = -1;
  var killedPawns = 0, killedQueens = 0;

  x2=x; y2=y;
  someEaten=false;
  for(cnt=true; cnt; ) { 
      regRec = false;
      x2 = x2 + dx;
      y2 = y2 + dy;
      if( !this.inRange(x2,y2) ) { 
          cnt=false; 
          continue; 
      }
      piece = this.getPiece(x2,y2);
      if( (player == this.getPieceOwner(piece))) {
        cnt=false;
      } else if(piece == NONE) {          // EMPTY
        if(someEaten)
          regRec = true;
        else if(!parentMove) {
          move = new app.model.Move();
          move.setFrom(x,y);
	  move.setTarget(x2,y2); 
          this.addMoveIfPriorityIsGreaterOrEqual(movs, move);
        }
      } else { // OPPONENT'S PIECE
        if(someEaten) {
	  cnt = false;  // only 1 kill/simple move
        } else {
          killedX = x2;
          killedY = y2;
          if(this.getPieceType(piece) == PAWN)  killedPawns++;
          if(this.getPieceType(piece) == QUEEN) killedQueens++;

          x2 = x2 + dx;
          y2 = y2 + dy;
          if( !this.inRange(x2,y2) || (this.getPiece(x2,y2) != NONE) ) {
            // PROTECTED PIECE 
            cnt=false;                    
          } else { 
            regRec=true;
            someEaten=true;
          }
        }
      }

      if(regRec) {  
        var dx2, dy2;
        var movRecurs = [];

        move = new app.model.Move();
        move.setFrom(x,y);
	move.setTarget(x2,y2);
        move.setKills(QUEEN, killedPawns, killedQueens);
        move.setKilledPiece(killedX, killedY);
        this.addMoveIfPriorityIsGreaterOrEqual(movs, move);

        for(dy2=-1; dy2<=1; dy2++) { 
          for(dx2=-1; dx2<=1; dx2++) { 
            if( (dx2 != 0) && (dy2 != 0) &&
                !( (dx == -dx2) && (dy == -dy2) ) ) { 
              // WARNING: infinite recursion when limit > 3
              var tempTable = this.clone();
              tempTable.makeStep(player, move);
              tempTable.getUniDirQueenMovements(player, x2,y2, dx2,dy2, move, movRecurs);
            }
          } 
        }

        while(movRecurs.length > 0) { 
          nextMove = movRecurs.pop();
          if(nextMove == null) break;
          move = new app.model.Move();
	  move.setFrom(x,y);
	  move.setTarget(x2,y2);
          move.setNextMove(nextMove);
          move.setKilledPiece(killedX,killedY);
	  move.setKills(QUEEN, killedPawns + nextMove.getKilledPawns(), killedQueens + nextMove.getKilledQueens());
          this.addMoveIfPriorityIsGreaterOrEqual(movs, move);
        }
      }
  } 
}

return Draughts;
})();
