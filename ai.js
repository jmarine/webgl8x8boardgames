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



var transpositionTable = new Array();

function resetTranspositionTable() 
{
   transpositionTable = new Array();
}


function getMovements(state, searchingQuiescence)
{
  var moves = state.getMovements();
  if(searchingQuiescence) {
    var retval = [];
    for(var index = 0; index < moves.length; index++) {
      if(!state.isQuiescenceMove(moves[index])) {
        retval[retval.length] = moves[index];
      }
    } 
    return retval;
  } else {
    return moves;
  }
}


function alphaBeta(state, depth, alpha, beta, searchingQuiescence) 
{
   state.bestMove = null;

   var key = state.toString();
   var val = transpositionTable[key];

   if(val != null) {
        if(val.depth >= depth) {
		state.bestMove = val.bestMove;
		return val.alpha;
	}
        //else alpha = Math.max(alpha, val.alpha);
   }

   if(depth <= 0) {
        return state.evaluateState(depth);
   }

   var moves = getMovements(state, searchingQuiescence);
   if(moves.length == 0) return state.evaluateState(depth); 

   for(var index = moves.length-1; index >= 0; index--) {
      var move = moves[index];
      if(!state.bestMove) state.bestMove = move;

      var depthForSearch   = depth-1;
      var quiescenceSearch = searchingQuiescence;
      /** Disabling quiescence search code (slow for chess game) 
      if(!depthForSearch && !state.isQuiescenceMove(move)) {
        depthForSearch   = 1; 
        quiescenceSearch = true;
      }
      **/

      var child = state.clone();
      child.makeMove(move);

      var score = -alphaBeta(child, depthForSearch, -beta, -alpha, quiescenceSearch);
      if(score > alpha) {
        alpha = Math.max( alpha, score );
        state.bestMove = move;
      }

      //alert("Level=" + depth + ", alpha=" + alpha + ", move=" + move);
      if(beta <= alpha) break;
   }
   transpositionTable[key] = { depth: depth, alpha: alpha, beta: beta, bestMove: state.bestMove };
   return ( alpha );
}



function negascout(state, depth, alpha, beta) 
{
   var a, b;

   state.bestMove = null;
   if(depth == 0) return state.evaluateState(depth);

   var moves = state.getMovements();
   if(moves.length == 0) return state.evaluateState(depth); 

   b = beta;
   for(var index = moves.length-1; index >= 0; index--) {
      var move = moves[index];
      var child = state.clone();
      child.makeMove(move);

      a = -negascout(child, depth-1, -b, -alpha );
      if ( (alpha < a) && (a < beta) )
         a = -negascout(child, depth-1, -beta, -alpha );    
      if(a > alpha) {
         alpha = Math.max( alpha, a );
	 state.bestMove = move;
      }
      if ( alpha >= beta ) 
         return ( alpha );                           
      b = alpha + 1;                      
   }
   return ( alpha );
}



function MTDf(state, depth, firstGuess, best) 
{
  var g = firstGuess;
  var upperbound = +30000; 
  var lowerbound = -30000;
  do { 
    var beta = (g == lowerbound) ? (g + 1) : g;
    g = alphaBeta(state, depth, beta - 1, beta);
    if (g < beta) {
      upperbound = g;
      if(state.bestMove) best = state.bestMove;
    } else {
      lowerbound = g;
    }
  } while(upperbound > lowerbound);
  state.bestMove = best;
  return g;
}


// MCTS
// Based on:
// https://github.com/dsesclei/mcts/blob/master/js/ai/ai.js

function MCTS_Node(board, move, player) {
  this.move = move;
  this.player = player;
  this.untriedMoves = board.getMovements();
  this.children = [];
  this.wins = 0;
  this.visits = 0;
  return this;
}

MCTS_Node.prototype.addChild = function(board, move) {
    var child = new MCTS_Node(board.clone(), move, board.getOpponent());
    child.parent = this;
    this.untriedMoves.splice(this.untriedMoves.indexOf(move), 1);
    this.children.push(child);
    return child;
};

MCTS_Node.prototype.uctSelectChild = function() {
    var bestChild = this.children.sort((a, b) => {
      var aVal = a.wins / a.visits + Math.sqrt(2 * Math.log(this.visits) / a.visits);
      var bVal = b.wins / b.visits + Math.sqrt(2 * Math.log(this.visits) / b.visits);
      if (aVal > bVal) return -1;
      if (aVal < bVal) return 1;
      return 0;
    })[0];

    return bestChild;
};

MCTS_Node.prototype.update = function(result) {
    this.visits++;
    this.wins += result;
}



function MCTS(rootBoard, depth, thinkingTimeMillis)
{
    var startTime = Date.now();
    var rootNode = new MCTS_Node(rootBoard.clone(), null, rootBoard.getOpponent());

    rootBoard.bestMove = null;
    while (Date.now() - startTime < thinkingTimeMillis) {
      var board = rootBoard.clone();
      var node = rootNode;

      // select
      while (node.untriedMoves.length === 0 && node.children.length > 0) {
        node = node.uctSelectChild();
        board.makeMove(node.move);
      }

      // expand
      if (node.untriedMoves.length > 0) {
        var randomIndex = Math.floor(Math.random() * node.untriedMoves.length);
        var move = node.untriedMoves[randomIndex];
        board.makeMove(move);
        node = node.addChild(board, move);
      }

      // simulate
      var level = depth;
      while (!board.isOver() && level-- > 0) {
	var moves = board.getMovements();
	var randomIndex = Math.floor(Math.random() * moves.length);
      	var randomMove = moves[randomIndex];
        board.makeMove(randomMove);
      }

      // backpropagation
      while (node != null) {
        var result = 0.5;
	if(board.isOver()) {
 	  var winner = board.getWinner();
	  if(winner == NONE) result = 0.5;
	  else if(winner == node.player) result = 1;
	  else result = 0;
	}
        node.update(result);
        node = node.parent;
      }
    }

    if (rootNode.children.length > 0) {
      var bestChild = rootNode.children.sort((a, b) => {
        if (a.visits > b.visits) return -1;
        if (b.visits < a.visits) return 1;
        return 0;
      })[0];

      console.log("Wins: " + rootNode.wins + " / Visits: " + rootNode.visits);
      console.log('Playouts per second:', (rootNode.visits * 1000) / (Date.now() - startTime)); // eslint-disable-line no-console
      rootBoard.bestMove = bestChild.move;
   }
}



function getBestMove(state, alg, level, thinkingTimeSecs) 
{
   var thinkingTimeMillis = 1000 * thinkingTimeSecs;  // only for MCTS
   var alpha = -30000;
   var beta  = 30000;

   var moves = state.getMovements();
   if(moves.length == 0) return null;
   if(moves.length == 1) return moves[0];

   if(!alg) alg = "alphaBeta";


   switch(alg) {
         case "alphaBeta":
   	    alphaBeta(state, level, alpha, beta);
	    break;
         case "negascout":
	    negascout(state, level, alpha, beta);
            break;
         case "MTDf": 
	    var firstGuess = alphaBeta(state, level-2, alpha, beta);
	    firstGuess = MTDf(state, level, firstGuess, state.bestMove);
            break;
	 case "MCTS":
            MCTS(state, level, thinkingTimeMillis);
	    break;
   }


   resetTranspositionTable();

   return state.bestMove;
}

