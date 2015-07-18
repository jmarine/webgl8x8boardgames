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
app.model.Chess960 = (function() {

function Chess960() {
  return this;
}

Chess960.prototype = new app.model.Chess();
Chess960.prototype.constructor = Chess960;
Chess960.prototype.constructor.name = "Chess960";


Chess960.prototype.toString = function() {
   var retval = [];
   retval.push("Chess960:");
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


Chess960.prototype.newGame = function() {
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

  var pos = 0; 
  while( (pos = Math.floor(Math.random()*8)) % 2 == 0 );
  this.setPiece(pos,0,PLAYER1, BISHOP);
  this.setPiece(pos,7,PLAYER2, BISHOP);

  while( (pos = Math.floor(Math.random()*8)) % 2 == 1 );
  this.setPiece(pos,0,PLAYER1, BISHOP);
  this.setPiece(pos,7,PLAYER2, BISHOP);

  while( this.getPiece(pos = Math.floor(Math.random()*8), 0) != NONE );
  this.setPiece(pos,0,PLAYER1, KNIGHT);
  this.setPiece(pos,7,PLAYER2, KNIGHT);

  while( this.getPiece(pos = Math.floor(Math.random()*8), 0) != NONE );
  this.setPiece(pos,0,PLAYER1, KNIGHT);
  this.setPiece(pos,7,PLAYER2, KNIGHT);

  while( this.getPiece(pos = Math.floor(Math.random()*8), 0) != NONE );
  this.setPiece(pos,0,PLAYER1, QUEEN);
  this.setPiece(pos,7,PLAYER2, QUEEN);

  var free = 3;
  for(x=0; x<8; x++) { 
     if(this.getPiece(x,0) == NONE) {
       this.setPiece(x,0,PLAYER1, ((free % 2) == 1)? ROOK : KING);
       this.setPiece(x,7,PLAYER2, ((free % 2) == 1)? ROOK : KING);
       free--;
     }
     this.setPiece(x,1,PLAYER1, PAWN);
     this.setPiece(x,6,PLAYER2, PAWN);
  }

  this.movements = null;
}


return Chess960;
})();
