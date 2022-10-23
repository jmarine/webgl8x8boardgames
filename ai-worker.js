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


importScripts('game.js');
importScripts('draughts.js');
importScripts('checkers.js');
importScripts('chess.js');
importScripts('chess960.js');
importScripts('breakthrough.js');
importScripts('dama.js');
importScripts('move.js');
importScripts('ai.js');

onmessage = function (event) {
  var alg  = event.data.alg;
  var level = event.data.level;
  var thinkingTime = event.data.thinkingTime;
  console.log("info: " + event.data.game.toString());
  var gameType = event.data.game.substring(0, event.data.game.indexOf(':'));
  var game = app.model.GameFactory.createGame(gameType);
  game.initFromStateStr(event.data.game);

  var move = getBestMove(game, alg, level, thinkingTime);
  postMessage(game.getMoveString(move));
};
