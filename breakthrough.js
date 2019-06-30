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

/*
Breakthrough was designed by William Daniel 'Dan' Troyka in 2000 and originally played on a 7x7 board. After the size of the board was changed, it won the 2001 8x8 Game Design Competition, sponsored by About Board Games, Abstract Games Magazine and the Strategy Gaming Society. 
*/


var app = app || {}
app.model = app.model || {}
app.model.Breakthrough = (function() {

function Breakthrough() {
  return this;
}

Breakthrough.prototype = new app.model.Game();
Breakthrough.prototype.constructor = Breakthrough;
Breakthrough.prototype.constructor.name = "Breakthrough";


Breakthrough.prototype.getPreferedLevelAI = function(alg) {
  if(alg == "MCTS") return 112;  // max moves
  else return 4;
}

Breakthrough.prototype.clone = function() {
  var copy=app.model.Game.prototype.clone.call(this);
  copy.pieceCount = this.pieceCount.slice(0);
  return copy;
}

Breakthrough.prototype.toString = function() {
   var retval = [];
   retval.push("Breakthrough:");
   retval.push( (this.getTurn() == PLAYER1) ? "1" : "2" );
   for(var y = 0; y < 8; y++) {
     for(var x = 0; x < 8; x++) {
        var piece = this.getPiece(x,y);
        var pieceType = this.getPieceType(piece);
        var pieceOwner = this.getPieceOwner(piece);
        var pieceChar  = this.getPieceChar(pieceType, pieceOwner);
        retval.push(pieceChar);
     }
   }
   return retval.join("");
}

Breakthrough.prototype.initFromStateStr = function(str) {
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

  } catch(e) {
    alert("Error: " + e.message);
  }

  this.movements = null;
}



Breakthrough.prototype.newGame = function() {
  var rows = 2;

  this.turn = PLAYER1;
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
	this.setPiece(x,y,PLAYER1, PAWN);
	this.pieceCount[PLAYER1]++;

	this.setPiece(x,7-y,PLAYER2, PAWN);
	this.pieceCount[PLAYER2]++;
      }  
  }

  this.movements = null;
}


Breakthrough.prototype.parseMoveString = function(str) {
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


Breakthrough.prototype.getMoveString = function(move) {
  if(!move) return "null";
  var str = colNames.charAt(move.x1) + rowNames.charAt(move.y1);
  while(move != null) {
    str = str + colNames.charAt(move.x2) + rowNames.charAt(move.y2);
    move = move.getNextMove();
  }
  return str;
} 


Breakthrough.prototype.existsPlayersPawnOnRow = function(player, row) {
  for(var x = 0; x < 8; x++) {
     var piece = this.getPiece(x, row);
     if(this.getPieceOwner(piece) == player) return true;
  }
  return false;
}

Breakthrough.prototype.isOver = function() {
  var winner = this.getWinner();
  return (winner != NONE);
}

Breakthrough.prototype.getWinner = function() {
  if(this.pieceCount[PLAYER1] == 0 || this.existsPlayersPawnOnRow(PLAYER2, 0)) return PLAYER2;
  else if(this.pieceCount[PLAYER2] == 0 || this.existsPlayersPawnOnRow(PLAYER1, 7)) return PLAYER1;
  else return NONE;
}


Breakthrough.prototype.getValidMove = function(m) {
  var validMoves = this.getMovements();
  for(var index = 0; index < validMoves.length; index++) {
      var move = validMoves[index];
      if(this.getMoveString(m) == this.getMoveString(move)) return move;
  }
  return null;
}

Breakthrough.prototype.makeStep = function(player, move) {

  if(move == null) return;

  var x1, y1, x2, y2;
  var myPiece, oldPiece, piece, pieceType;

  x1=move.x1; y1=move.y1;
  x2=move.x2; y2=move.y2;
  myPiece=oldPiece=this.getPieceType(this.getPiece(x1,y1));
  this.setPiece(x1,y1, player, NONE);

  piece=this.getPiece(x2,y2);
  pieceType=this.getPieceType(piece);
  if(pieceType != NONE) { 
        // kill piece 
        this.pieceCount[this.getPieceOwner(piece)]--;
  }

  this.setPiece(x1,y1, player, NONE);
  this.setPiece(x2,y2, player, myPiece);

  this.movements = null;
}


Breakthrough.prototype.getPieceValue = function(pieceType) {
  switch(pieceType) {
    case PAWN:   return 30;
    default:     return 0;
  }
}

Breakthrough.prototype.evaluateState = function(depth) {
   var x,y;
   var retval = 0;

   var winner = this.getWinner();
   if(winner == PLAYER2) {
       return (this.getTurn() == PLAYER1) ? -10000-depth : 10000+depth;
   } else if(winner == PLAYER1) {
       return (this.getTurn() == PLAYER2) ? -10000-depth : 10000+depth;
   } 

   // balance of power 
   for(y = 0; y < 8; y++) {
     for(x = 0; x < 8; x++) {
        var piece = this.getPiece(x,y);
        if(piece != NONE) {
          var pieceType = this.getPieceType(piece);
          var pieceValue = this.getPieceValue(pieceType);
          var pieceOwner = this.getPieceOwner(piece);
          var factor = (this.getTurn() == pieceOwner)? 1 : -1;
          if(pieceOwner == PLAYER1) retval += factor * pieceValue * Math.pow(2, y);
          else retval += factor * pieceValue * Math.pow(2, 7-y);
        }
     }
   } 

   var holeValue = 100;
   for(x = 0; x < 8; x = x+1) {
     var player1, player2;
     var factor = (this.getTurn() == PLAYER1)? 1 : -1;

     // eval holes
     if(this.getPieceOwner(this.getPiece(x,0)) != PLAYER1) {
       retval -= factor * holeValue;
     }
     if((x==0 || x==7) && this.getPieceOwner(this.getPiece(x,1)) != PLAYER1) {
       retval -= factor * holeValue/2;
     }

     if(this.getPieceOwner(this.getPiece(x,7)) != PLAYER2) {
       retval += factor * holeValue;
     }
     if((x==0 || x==7) && this.getPieceOwner(this.getPiece(x,6)) != PLAYER2) {
       retval += factor * holeValue/2;
     }


     /* eval advanced pieces
     var advancedValue = 100;
     for(player1 = 7; player1 >= 0; player1--) {
       var piece = this.getPiece(x,player1);
       if(this.getPieceOwner(piece) == PLAYER1) break;
     }
     for(player2 = 7; player2 >= 0; player2--) {
       var piece = this.getPiece(x,7-player2);
       if(this.getPieceOwner(piece) == PLAYER2) break;
     }
     if(player1 > player2) {
        if(this.getTurn() == PLAYER1) player2 = 0;
        else player1 = 0;
     }
     retval += factor * advancedValue * (player1-player2); 
     */
   }

   // some noise
   retval += 4 - Math.floor(Math.random()*9);
   
   return retval;
}

Breakthrough.prototype.isQuiescenceMove = function(move) {
  return (move.killedX == -1);
}


Breakthrough.prototype.isOver = function() {
  var moves = [];
  var winner = this.getWinner();
  if(winner == NONE) {
      var player = this.getTurn();
      for(var y=0; y<8; y++) {
        for(var x=0; x<8; x++) { 
          var piece = this.getPiece(x,y);
          if( (piece != NONE) && (player == this.getPieceOwner(piece)) ) {
            this.getPieceMovements(player, x,y, moves);
            if(moves.length > 0) return false;
          }
        } 
      }
  }
  return true;
}


Breakthrough.prototype.getMovements = function() {
  if(!this.movements) {
    this.movements = [];
    var winner = this.getWinner();
    if(winner == NONE) {
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
  }
  return this.movements;
}


Breakthrough.prototype.getPieceMovements = function(player, x,y, movs) {
  var dx, dy;
  var piece = this.getPiece(x,y);
  if(this.getPieceType(piece) == PAWN) { 
      dy=(player == PLAYER1) ? 1 : -1;
      this.getUniDirPawnMovements(player, x,y, -1, dy, movs);
      this.getUniDirPawnMovements(player, x,y,  0, dy, movs);
      this.getUniDirPawnMovements(player, x,y, +1, dy, movs);
  }
  return movs;
}

Breakthrough.prototype.inRange = function(x,y) {
  return ( (x >= 0) && (y >= 0) && (x < 8) && (y < 8) );
}


Breakthrough.prototype.getUniDirPawnMovements = function(player, x,y, dx,dy, movs) {
  var x2=x+dx;
  var y2=y+dy;
  var move, nextMove;
  var killedPawns = 0;
  var killedQueens = 0;

  if(this.inRange(x2,y2)) {
    var piece = this.getPiece(x2,y2);

    move = new app.model.Move();
    move.setFrom(x,y);
    move.setTarget(x2,y2);
 
    if(piece == NONE) { 
       movs.push(move);
    }
    else if( (player != this.getPieceOwner(piece)) && (dx != 0) ) {
       var killedX = x2;
       var killedY = y2;
       if(this.getPieceType(piece) == PAWN)  killedPawns++;

       move.setKilledPiece(killedX,killedY);
       move.setKills(PAWN, killedPawns, 0);
       movs.push(move);
    }

  }
}


return Breakthrough;
})();
