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


var CASTLE_LONG_INDEX = 0;
var CASTLE_SHORT_INDEX = 1;
var CHESS_PIECE_VALUES = [ 0, 30, 165, 10000, 80, 80, 90 ];

Chess.prototype = new Game();
Chess.prototype.constructor = Chess;
Chess.prototype.constructor.name = "Chess";

function Chess() {
  return this;
}

Chess.prototype.getBoardRotationDegrees = function() {
  return 90;
}

Chess.prototype.getPreferedLevelAI = function() {
  return 3;
}

Chess.prototype.clone = function() {
  var copy=Game.prototype.clone.call(this);

  copy.lastPawnLargeMoveCol = this.lastPawnLargeMoveCol;
  copy.enrocsValids = Array();
  copy.enrocsValids[0] = this.enrocsValids[0].slice(0);
  copy.enrocsValids[1] = this.enrocsValids[1].slice(0);

  /* manual clone
  copy.enrocsValids[0] = new Array();
  copy.enrocsValids[1] = new Array();

  copy.enrocsValids[0][0] = this.enrocsValids[0][0];
  copy.enrocsValids[0][1] = this.enrocsValids[0][1];
  copy.enrocsValids[1][0] = this.enrocsValids[1][0];
  copy.enrocsValids[1][1] = this.enrocsValids[1][1];
  */
 
  return copy;
}

Chess.prototype.toString = function() {
   var retval = [];
   retval.push("Chess:");
   retval.push( (this.getTurn() == PLAYER1) ? "1" : "2" );
   retval.push( (this.enrocsValids[0][0]) ? "Y" : "N" );
   retval.push( (this.enrocsValids[0][1]) ? "Y" : "N" );
   retval.push( (this.enrocsValids[1][0]) ? "Y" : "N" );
   retval.push( (this.enrocsValids[1][1]) ? "Y" : "N" );
   retval.push( this.lastPawnLargeMoveCol );
   for(var y = 0; y < 8; y++) {
     for(var x = 0; x < 8; x++) {
       var piece = this.getPiece(x,y);
       var pieceType  = this.getPieceType(piece);
       var pieceOwner = this.getPieceOwner(piece);
       var pieceChar  = this.getPieceChar(pieceType, pieceOwner);
       retval.push(pieceChar);
     }
   }
   return retval.join("");
}

Chess.prototype.initFromStateStr = function(str) {
  try {
    var startIndex = str.indexOf(':');
    if(startIndex != -1) str = str.substring(1+startIndex);

    var index = 0;
    this.turn = (str.charAt(index++) == '1') ? PLAYER1 : PLAYER2;

    this.enrocsValids = Array();
    this.enrocsValids[0] = new Array();
    this.enrocsValids[1] = new Array();

    this.enrocsValids[0][0] = (str.charAt(index++) == 'N') ? false : true; 
    this.enrocsValids[0][1] = (str.charAt(index++) == 'N') ? false : true; 
    this.enrocsValids[1][0] = (str.charAt(index++) == 'N') ? false : true; 
    this.enrocsValids[1][1] = (str.charAt(index++) == 'N') ? false : true; 

    this.lastPawnLargeMoveCol = "0123456789".indexOf(str.charAt(index++));

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
          } 
      }
    }

  } catch(e) {
    alert("Error: " + e.message);
  }

  this.movements = null;
}



Chess.prototype.newGame = function() {
  var rows = 3;

  this.turn = PLAYER1;
  this.pieces = Array();

  this.lastPawnLargeMoveCol = 9;

  this.enrocsValids = Array();
  this.enrocsValids[0] = new Array();
  this.enrocsValids[1] = new Array();

  this.enrocsValids[0][0] = true; 
  this.enrocsValids[0][1] = true; 
  this.enrocsValids[1][0] = true; 
  this.enrocsValids[1][1] = true; 

  var x,y;
  for(y=0; y<8; y++) {
      for(x=0; x<=8; x++) {
         this.setPiece(x,y,NONE, NONE);
      }
  }

  this.setPiece(0,0,PLAYER1, ROOK);
  this.setPiece(1,0,PLAYER1, KNIGHT);
  this.setPiece(2,0,PLAYER1, BISHOP);
  this.setPiece(3,0,PLAYER1, QUEEN);
  this.setPiece(4,0,PLAYER1, KING);
  this.setPiece(5,0,PLAYER1, BISHOP);
  this.setPiece(6,0,PLAYER1, KNIGHT);
  this.setPiece(7,0,PLAYER1, ROOK);

  this.setPiece(0,7,PLAYER2, ROOK);
  this.setPiece(1,7,PLAYER2, KNIGHT);
  this.setPiece(2,7,PLAYER2, BISHOP);
  this.setPiece(3,7,PLAYER2, QUEEN);
  this.setPiece(4,7,PLAYER2, KING);
  this.setPiece(5,7,PLAYER2, BISHOP);
  this.setPiece(6,7,PLAYER2, KNIGHT);
  this.setPiece(7,7,PLAYER2, ROOK);

  for(x=0; x<8; x++) { 
     this.setPiece(x,1,PLAYER1, PAWN);
     this.setPiece(x,6,PLAYER2, PAWN);
  }

  this.movements = null;
}

Chess.prototype.parseMoveString = function(str) {
  if(str) {
    var movs = this.getMovements();
    if(movs.length > 0) {
      var promotion = NONE;
      if(str.length > 4) {
	promotion = this.parsePieceType(str.substring(4));
	str = str.substring(0,4);
      }

      str = str.toLowerCase();
      for(var i = 0; i < movs.length; i++) {
        var move = movs[i];
        if(str == this.getMoveString(move).substring(0,4)) {  // ignore default QUEEN promotion
	  move.promotion = promotion;  // update promotion type
	  return move;
	}
      }
    }
  }
  return null;
}

Chess.prototype.getMoveString = function(move) {
  if(!move) return "null";
  var str = colNames.charAt(move.x1) + rowNames.charAt(move.y1);
  for(var tmp = move; tmp != null; tmp = tmp.getNextMove()) {
    str = str + colNames.charAt(tmp.x2) + rowNames.charAt(tmp.y2);
  }
  if(move.promotion != NONE) str += this.getPieceChar(move.promotion, NONE);
  return str;
} 


Chess.prototype.getWinner = function() {
  if(!this.isOver()) {
    return NONE;
  } else {
    var opponent = this.getOpponent();
    if(this.isCheckFrom(opponent)) return opponent;
    else return NONE;
  }
}


Chess.prototype.getValidMove = function(m) {
  var validMoves = this.getMovements();
  for(var index = 0; index < validMoves.length; index++) {
      var vm = validMoves[index];
      if(vm.x1 == m.x1 && vm.y1 == m.y1 && vm.x2 == m.x2 && vm.y2 == m.y2) return vm;
  }
  return null;
}


Chess.prototype.makeStep = function(player, move) {

    if(move == null) return;

    var fromCol = move.x1;
    var fromRow = move.y1;
    var toCol = move.x2;
    var toRow = move.y2;

    var castleRookMove = null;
    var piece = this.getPiece(fromCol, fromRow);

    var diffCol = toCol - fromCol;
    var diffRow = toRow - fromRow;

    this.lastPawnLargeMoveCol = 9;
    if( (this.getPieceType(piece) == PAWN) && (Math.abs(diffRow) == 2) ) {
        this.lastPawnLargeMoveCol = fromCol;
    }

    if(this.getPieceType(piece) == ROOK) {
        var startRow = (this.getPieceOwner(piece)==PLAYER1) ? 0 : 7;
        var castleTurnIndex = (this.getPieceOwner(piece)==PLAYER1) ? 0 : 1;
        if( (fromRow == startRow) && (fromCol == 0) ) {
            this.enrocsValids[castleTurnIndex][CASTLE_LONG_INDEX] = false;
        } else if( (fromRow == startRow) && (fromCol == 7) ) {
            this.enrocsValids[castleTurnIndex][CASTLE_SHORT_INDEX] = false;
        }
    }

    if(this.getPieceType(piece) == KING) {
        if( ((fromRow - toRow) == 0) && (Math.abs(diffCol) == 2) ) {
            if(diffCol > 0) {
                castleRookMove = new Move();
		castleRookMove.setFrom(7, toRow);
                castleRookMove.setTarget(toCol-1, toRow);
            } else {
                castleRookMove = new Move();
		castleRookMove.setFrom(0,toRow);
		castleRookMove.setTarget(toCol+1, toRow);
            }
            move.setNextMove(castleRookMove);
        }

        var castleTurnIndex = (this.getPieceOwner(piece)==PLAYER1) ? 0 : 1;
        this.enrocsValids[castleTurnIndex][CASTLE_LONG_INDEX] = false;
        this.enrocsValids[castleTurnIndex][CASTLE_SHORT_INDEX] = false;
    }
 
    var killedPiece = this.getPiece(move.killedX, move.killedY);
    if(killedPiece != NONE) {
        this.setPiece(move.killedX, move.killedY, NONE, NONE);
    }
       
    this.setPiece(fromCol, fromRow, NONE, NONE);
    this.setPiece(toCol, toRow, this.getPieceOwner(piece), this.getPieceType(piece));

    /* Note: castleRookMove is already received/processed by makeMove function (as the "nextMove"):
    if(castleRookMove != null) {
        var rook = this.getPiece(castleRookMove.x1, castleRookMove.y1);
        this.setPiece(castleRookMove.x1, castleRookMove.y1, NONE, NONE);
        this.setPiece(castleRookMove.x2, castleRookMove.y2, this.getPieceOwner(rook), ROOK);
    }
    */

    var isPromotion = this.isPawnPromotion(move);
    if(isPromotion) {
        if(!move.promotion) move.promotion = QUEEN;  // it should not happen.
        this.setPiece(toCol, toRow, this.getPieceOwner(piece), move.promotion);
    }

    this.movements = null;
}

Chess.prototype.isPawnPromotion = function(move) 
{
    var piece = this.getPiece(move.x1, move.y1);
    if(piece == NONE) piece = this.getPiece(move.x2, move.y2);
    if( (piece != NONE)
        && (this.getPieceType(piece) == PAWN)
            && ( ((this.getPieceOwner(piece) == PLAYER1) && (move.y2 == 7))
                 || ((this.getPieceOwner(piece) == PLAYER2) && (move.y2 == 0)) ) ) {
        return true;
    } else {
        return false;
    }
}


Chess.prototype.getPieceValue = function(pieceType) {
  return CHESS_PIECE_VALUES[pieceType];
}


Chess.prototype.evaluateState = function(depth) {

   if(this.isOver()) { 
     var winner = this.getWinner();
     if(winner == NONE) {
       return 0;
     } else {
       return (this.getTurn() == winner)? (10000+depth) : (-10000-depth) ;
     }
   }

   // balance of power 
   var retval = 0;
   for(var y = 0; y < 8; y++) {
     for(var x = 0; x < 8; x++) {
        var piece = this.getPiece(x,y);
        var pieceType = this.getPieceType(piece);
        var pieceValue = this.getPieceValue(pieceType);
        var factor = (this.getTurn() == this.getPieceOwner(piece)) ? 1 : -1;
        retval += factor * pieceValue * 10; 
     }
   } 

   // some noise
   retval += 4 - Math.floor(Math.random()*9);

   return retval;
}


Chess.prototype.isQuiescenceMove = function(move) {
  return (move.promotion == NONE && move.killedX == -1 && move.nextMove == null);
}


Chess.prototype.isOver = function() {  // Optimization
  var moves = [];
  var checkValidMoves = true;
  var turn = this.getTurn();
  for(var row = 0; row < 8; row++) {
    for(var col = 0; col < 8; col++) {
      var piece = this.getPiece(col,row);
      if((piece != NONE) && (this.getPieceOwner(piece) == turn)) {
        this.getPieceMovements(turn, col, row, moves, checkValidMoves);
        if(moves.length > 0) return false;
      }
    }
  }
  return true;
}


Chess.prototype.getMovements = function() {
  if(!this.movements) {
    var player = this.getTurn();
    this.movements = this.generateMoves(player, true); 
  }
  return this.movements;
}

Chess.prototype.generateMoves = function(turn, checkValidMoves)
{
  var moves = [];
  for(var row = 0; row < 8; row++) {
    for(var col = 0; col < 8; col++) {
      var piece = this.getPiece(col,row);
      if((piece != NONE) && (this.getPieceOwner(piece) == turn)) {
        this.getPieceMovements(turn, col, row, moves, checkValidMoves);
      }
    }
  }
  return moves;
}

Chess.prototype.getPieceMovements = function(player, x,y, moves, checkValidMoves) {
  var dx, dy;
  var uncheckedMoves = [];
  var piece = this.getPiece(x,y);
  switch( this.getPieceType(piece) ) { 
    case PAWN:
      this.generatePawnMoves(player, x,y, uncheckedMoves);
      break;
    case KNIGHT:
      this.generateKnightMoves(player, x,y, uncheckedMoves);
      break;
    case ROOK:
      this.generateRookMoves(player, x,y, uncheckedMoves);
      break;
    case BISHOP:
      this.generateBishopMoves(player, x,y, uncheckedMoves);
      break;
    case QUEEN:
      this.generateQueenMoves(player, x,y, uncheckedMoves);
      break;
    case KING:
      this.generateKingMoves(player, x,y, uncheckedMoves, checkValidMoves);
      break;
  }

  if(!checkValidMoves) {
     for(var index = 0; index < uncheckedMoves.length; index++) {
        moves.push(uncheckedMoves[index]);
     }
  } else {
     for(var index = 0; index < uncheckedMoves.length; index++) {
         var move = uncheckedMoves[index];
         var tempState = this.clone();
         tempState.makeMove(move);
         var checked = tempState.isCheckFrom(tempState.getTurn());
         if(!checked) moves.push(move);
     }
  }
  return moves;
}

Chess.prototype.inRange = function(x,y) {
  return ( (x >= 0) && (y >= 0) && (x < 8) && (y < 8) );
}

Chess.prototype.acumulatePieceMoveWhenValidDestination = function(moves, fromRow, fromCol, destRow, destCol) {
    var currentPiece = this.getPiece(fromCol, fromRow);
    var currentPiecePlayer = this.getPieceOwner(currentPiece);
    if( this.inRange(destCol, destRow) ) {
        var killedPiece = this.getPiece(destCol, destRow);
        var killedPiecePlayer = this.getPieceOwner(killedPiece);
        if( (killedPiece == NONE) || (currentPiecePlayer != killedPiecePlayer) ) {
            var move = new Move();
            move.setFrom(fromCol, fromRow);
            move.setTarget(destCol, destRow);
            if(killedPiece != NONE) move.setKilledPiece(destCol, destRow);
            else if(this.getPieceType(currentPiece) == PAWN) {
              if( ((currentPiecePlayer==PLAYER1) && (Math.abs(this.lastPawnLargeMoveCol-fromCol)==1) && (fromRow==4)) 
                  || ((currentPiecePlayer==PLAYER2) && (Math.abs(this.lastPawnLargeMoveCol-fromCol)==1) && (fromRow==3)) ) {
                move.setKilledPiece(this.lastPawnLargeMoveCol, fromRow);
              }
            }

            moves.push(move);
        }
    }
}

Chess.prototype.generatePawnMoves = function(player, fromCol, fromRow, moves) {
    var killablePiece = NONE;
    var currentPiece = this.getPiece(fromCol, fromRow);
    switch(player) {
        case PLAYER1:
            if( (fromRow < 7) && (this.getPiece(fromCol, fromRow+1) == NONE) ) {
                this.acumulatePieceMoveWhenValidDestination(moves, fromRow, fromCol, fromRow+1, fromCol);
                if( (fromRow == 1) && (this.getPiece(fromCol, fromRow+2) == NONE) ) {
                    this.acumulatePieceMoveWhenValidDestination(moves, fromRow, fromCol, fromRow+2, fromCol);
                }
            }
                
            if( (fromCol > 0) && ((killablePiece = this.getPiece(fromCol-1, fromRow+1)) != NONE) && (this.getPieceOwner(killablePiece) == PLAYER2) ) {
                this.acumulatePieceMoveWhenValidDestination(moves, fromRow, fromCol, fromRow+1, fromCol-1);
            }
            if( (fromCol < 7) && ((killablePiece = this.getPiece(fromCol+1, fromRow+1)) != NONE) && (this.getPieceOwner(killablePiece) == PLAYER2) ) {
                this.acumulatePieceMoveWhenValidDestination(moves, fromRow, fromCol, fromRow+1, fromCol+1);
            }

            if( (Math.abs(this.lastPawnLargeMoveCol-fromCol) == 1) && (fromRow == 4) ) {
                this.acumulatePieceMoveWhenValidDestination(moves, fromRow, fromCol, fromRow+1, this.lastPawnLargeMoveCol);
            }
            break;

        case PLAYER2:
            if( (fromRow > 0) && (this.getPiece(fromCol, fromRow-1) == NONE) ) {
                this.acumulatePieceMoveWhenValidDestination(moves, fromRow, fromCol, fromRow-1, fromCol);
                if( (fromRow == 6) && (this.getPiece(fromCol, fromRow-2) == NONE) ) {
                    this.acumulatePieceMoveWhenValidDestination(moves, fromRow, fromCol, fromRow-2, fromCol);
                }
            }

            if( (fromCol > 0) && ((killablePiece = this.getPiece(fromCol-1, fromRow-1)) != NONE) && (this.getPieceOwner(killablePiece) == PLAYER1) ) {
                this.acumulatePieceMoveWhenValidDestination(moves, fromRow, fromCol, fromRow-1, fromCol-1);
            }
            if( (fromCol < 7) && ((killablePiece = this.getPiece(fromCol+1, fromRow-1)) != NONE) && (this.getPieceOwner(killablePiece) == PLAYER1) ) {
                this.acumulatePieceMoveWhenValidDestination(moves, fromRow, fromCol, fromRow-1, fromCol+1);
            }
                
            if( (Math.abs(this.lastPawnLargeMoveCol-fromCol) == 1) && (fromRow == 3) ) {
               this.acumulatePieceMoveWhenValidDestination(moves, fromRow, fromCol, fromRow-1, this.lastPawnLargeMoveCol);
            }
            break;
    }
}

Chess.prototype.generateKnightMoves = function(player, fromCol, fromRow, moves) {
    this.acumulatePieceMoveWhenValidDestination(moves, fromRow, fromCol, fromRow-1, fromCol-2);
    this.acumulatePieceMoveWhenValidDestination(moves, fromRow, fromCol, fromRow-1, fromCol+2);
    this.acumulatePieceMoveWhenValidDestination(moves, fromRow, fromCol, fromRow+1, fromCol+2);
    this.acumulatePieceMoveWhenValidDestination(moves, fromRow, fromCol, fromRow+1, fromCol-2);
    this.acumulatePieceMoveWhenValidDestination(moves, fromRow, fromCol, fromRow-2, fromCol-1);
    this.acumulatePieceMoveWhenValidDestination(moves, fromRow, fromCol, fromRow-2, fromCol+1);
    this.acumulatePieceMoveWhenValidDestination(moves, fromRow, fromCol, fromRow+2, fromCol+1);
    this.acumulatePieceMoveWhenValidDestination(moves, fromRow, fromCol, fromRow+2, fromCol-1);
}

Chess.prototype.generateKingMoves = function(player, fromCol, fromRow, moves, checkCastle) {
        var currentPiece = this.getPiece(fromCol, fromRow);
        
        this.acumulatePieceMoveWhenValidDestination(moves, fromRow, fromCol, fromRow-1, fromCol-1);
        this.acumulatePieceMoveWhenValidDestination(moves, fromRow, fromCol, fromRow-1, fromCol+0);
        this.acumulatePieceMoveWhenValidDestination(moves, fromRow, fromCol, fromRow-1, fromCol+1);
        this.acumulatePieceMoveWhenValidDestination(moves, fromRow, fromCol, fromRow+0, fromCol-1);
        this.acumulatePieceMoveWhenValidDestination(moves, fromRow, fromCol, fromRow+0, fromCol+1);
        this.acumulatePieceMoveWhenValidDestination(moves, fromRow, fromCol, fromRow+1, fromCol-1);
        this.acumulatePieceMoveWhenValidDestination(moves, fromRow, fromCol, fromRow+1, fromCol+0);
        this.acumulatePieceMoveWhenValidDestination(moves, fromRow, fromCol, fromRow+1, fromCol+1);

        if(checkCastle) {
            var row = (this.getPieceOwner(currentPiece)==PLAYER1)? 0: 7;
            var attacks = this.generateMoves( (this.getPieceOwner(currentPiece)==PLAYER1) ? PLAYER2 : PLAYER1 , false);
            
            if(this.enrocsValids[(this.getPieceOwner(currentPiece)==PLAYER1)? 0: 1][CASTLE_LONG_INDEX]) {  // O-O-O
                var freeCells = true;
                for(var col = 1; col < 4 ; col++) {
                    if( (this.getPiece(col, row) != NONE) || (this.isAttacked(attacks, row,col)) ) {
                        freeCells = false;
                        break;
                    }
                }
                if( (freeCells) && (!this.isAttacked(attacks, row, 0)) && (!this.isAttacked(attacks, row, 4)) ) {
                    this.acumulatePieceMoveWhenValidDestination(moves, fromRow, fromCol, fromRow, fromCol-2);
                }
            }

            if(this.enrocsValids[(this.getPieceOwner(currentPiece)==PLAYER1)? 0: 1][CASTLE_SHORT_INDEX]) {  // O-O
                var freeCells = true;
                for(var col = 5; col < 7 ; col++) {
                    if( (this.getPiece(col, row) != NONE) || (this.isAttacked(attacks, row,col)) ) {
                        freeCells = false;
                        break;
                    }
                }
                if( (freeCells) && (!this.isAttacked(attacks, row, 4)) && (!this.isAttacked(attacks, row, 7)) ) {
                    this.acumulatePieceMoveWhenValidDestination(moves, fromRow, fromCol, fromRow, fromCol+2);
                }
            }
        }
        
    }


Chess.prototype.generateQueenMoves = function(player, fromCol, fromRow, moves) {
    this.generateBishopMoves(player, fromCol, fromRow, moves);
    this.generateRookMoves(player, fromCol, fromRow, moves);
}


Chess.prototype.generateRookMoves = function(player, fromCol, fromRow, moves) {
        var currentPiece = this.getPiece(fromCol, fromRow);

        for(var destRow = fromRow-1, destCol = fromCol; destRow >= 0; destRow--) {
            var destPiece = this.getPiece(destCol, destRow);
            if(destPiece == NONE) {
                this.acumulatePieceMoveWhenValidDestination(moves, fromRow, fromCol, destRow, destCol);
            } else {
                if(this.getPieceOwner(destPiece) != this.getPieceOwner(currentPiece)) this.acumulatePieceMoveWhenValidDestination(moves, fromRow, fromCol, destRow, destCol);
                break;
            }
        }
        for(var destRow = fromRow, destCol = fromCol-1; destCol >= 0; destCol--) {
            var destPiece = this.getPiece(destCol, destRow);
            if(destPiece == NONE) {
                this.acumulatePieceMoveWhenValidDestination(moves, fromRow, fromCol, destRow, destCol);
            } else {
                if(this.getPieceOwner(destPiece) != this.getPieceOwner(currentPiece)) this.acumulatePieceMoveWhenValidDestination(moves, fromRow, fromCol, destRow, destCol);
                break;
            }
        }
        for(var destRow = fromRow+1, destCol = fromCol; destRow <= 7; destRow++) {
            var destPiece = this.getPiece(destCol, destRow);
            if(destPiece == NONE) {
                this.acumulatePieceMoveWhenValidDestination(moves, fromRow, fromCol, destRow, destCol);
            } else {
                if(this.getPieceOwner(destPiece) != this.getPieceOwner(currentPiece)) this.acumulatePieceMoveWhenValidDestination(moves, fromRow, fromCol, destRow, destCol);
                break;
            }
        }
        for(var destRow = fromRow, destCol = fromCol+1; destCol <= 7; destCol++) {
            var destPiece = this.getPiece(destCol, destRow);
            if(destPiece == NONE) {
                this.acumulatePieceMoveWhenValidDestination(moves, fromRow, fromCol, destRow, destCol);
            } else {
                if(this.getPieceOwner(destPiece) != this.getPieceOwner(currentPiece)) this.acumulatePieceMoveWhenValidDestination(moves, fromRow, fromCol, destRow, destCol);
                break;
            }
        }
    }


Chess.prototype.generateBishopMoves = function(player, fromCol, fromRow, moves) {
        var currentPiece = this.getPiece(fromCol, fromRow);
        for(var destRow = fromRow-1, destCol = fromCol-1; destRow >= 0 && destCol >= 0; destRow--, destCol--) {
            var destPiece = this.getPiece(destCol, destRow);
            if(destPiece == NONE) {
                this.acumulatePieceMoveWhenValidDestination(moves, fromRow, fromCol, destRow, destCol);
            } else {
                if(this.getPieceOwner(destPiece) != this.getPieceOwner(currentPiece)) this.acumulatePieceMoveWhenValidDestination(moves, fromRow, fromCol, destRow, destCol);
                break;
            }
        }
        for(var destRow = fromRow+1, destCol = fromCol-1; destRow <= 7 && destCol >= 0; destRow++, destCol--) {
            var destPiece = this.getPiece(destCol, destRow);
            if(destPiece == NONE) {
                this.acumulatePieceMoveWhenValidDestination(moves, fromRow, fromCol, destRow, destCol);
            } else {
                if(this.getPieceOwner(destPiece) != this.getPieceOwner(currentPiece)) this.acumulatePieceMoveWhenValidDestination(moves, fromRow, fromCol, destRow, destCol);
                break;
            }
        }
        for(var destRow = fromRow+1, destCol = fromCol+1; destRow <= 7 && destCol <= 7; destRow++, destCol++) {
            var destPiece = this.getPiece(destCol, destRow);
            if(destPiece == NONE) {
                this.acumulatePieceMoveWhenValidDestination(moves, fromRow, fromCol, destRow, destCol);
            } else {
                if(this.getPieceOwner(destPiece) != this.getPieceOwner(currentPiece)) this.acumulatePieceMoveWhenValidDestination(moves, fromRow, fromCol, destRow, destCol);
                break;
            }
        }
        for(var destRow = fromRow-1, destCol = fromCol+1; destRow >= 0 && destCol <= 7; destRow--, destCol++) {
            var destPiece = this.getPiece(destCol, destRow);
            if(destPiece == NONE) {
                this.acumulatePieceMoveWhenValidDestination(moves, fromRow, fromCol, destRow, destCol);
            } else {
                if(this.getPieceOwner(destPiece) != this.getPieceOwner(currentPiece)) this.acumulatePieceMoveWhenValidDestination(moves, fromRow, fromCol, destRow, destCol);
                break;
            }
        }
    }


Chess.prototype.isAttacked = function(attacks, destRow, destCol)
{
    if(attacks != null) {
        for(var index = 0; index < attacks.length; index++) {
            var move = attacks[index];
            if( (destRow == move.y2) && (destCol == move.x2) ) {
                return true;
            }
        }
    }
    return false;
}

Chess.prototype.isCheckFrom = function(attacker)
{
    var attacked = (attacker == PLAYER1)? PLAYER2 : PLAYER1;
    var attacks = this.generateMoves(attacker, false);
    for(var row = 0; row < 8; row++) {
        for(var col = 0; col < 8; col++) {
            var piece = this.getPiece(col, row);
            if( (piece != NONE) && (this.getPieceType(piece) == KING) && (this.getPieceOwner(piece) == attacked) ) {
                return this.isAttacked(attacks, row, col);
            }
        }
    }
    return false;
}


