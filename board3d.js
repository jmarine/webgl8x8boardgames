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

var game;

var app = app || {};
app.view = app.view || {};
app.view.board = (function() {

var board;
var gl;
var redraw;
var debugShadowBuffer;
var aspectRatio;

var shadowMatrix;
var xform;
var fb;

var currentFirstMove = null;
var currentMove = null;
var oldMove;
var moveGen;
var moveGenLast;
var moveStartTime;
var waitingHumanMove;
var moveElapsedTime;
var validMoves;

var SHIFT_KEYCODE = 16;
var ALT_KEYCODE = 18;

var MOUSE_LEFT_BUTTON   = 0;
var MOUSE_MIDDLE_BUTTON = 1;
var MOUSE_RIGHT_BUTTON  = 2; 

var BOARD_TEXTURE = 0;
var PLAYER1_TEXTURE = 1;
var PLAYER2_TEXTURE = 2;
var CELL_HOVER_TEXTURE = 3;
var CELL_SELECTED_TEXTURE = 4;
var CELL_VALID_TEXTURE = 5;
var CELL_VALID1_TEXTURE = 6;
var CELL_INVALID_TEXTURE = 7;
var GRID_TEXTURE = 8;

var PI = 3.141516;
var MOVE_TIME_IN_MILLIS = 1000.0;
var TIME_BEFORE_JUMP_IN_MILLIS = 300.0;

var JUMP_HEIGHT = 1.8;
var FACTOR_COMPRESION_EXTENSION = 0.125;
var MAX_INCLINATION = PI / 6.0;

var xRot = 0;
var yRot = 0;
var zRot = 0;
var z = 8;


var nullcolor = sglV4C(0.0, 0.0, 0.0, 0.0);

var withShadows = true;
var withReflections = false;
var cellUnderMouse = [-1, -1];
var shadowModelScaling;
var worldLightPos;
var biasToLowerMoirePattern = 0.01;

var brightness;
var ambientColor;
var diffuseLightColor;
var specularLightColor;
var pieceShininess;    
var trackball;
var fov;

function Board3D()
{
  return this;
}

Board3D.prototype =
{
  checkGameStatus: function() {
    validMoves = game.getMovements();
    if(validMoves.length == 0) {
        var winner = game.getWinner();
        if(winner) document.l10n.formatValue("app.messages.player_won", { "player": winner } ).then(function(msg) { app.view.UI.showMessage(msg) }); 
        else document.l10n.formatValue("app.messages.game_stalled", { "player": winner } ).then(function(msg) { app.view.UI.showMessage(msg) });
        $("#btnResignGame").hide();
        $("#btnDrawGame").hide();
        $('#btnRetractMove').each(function() {
          this.disabled = true;
        });
    }
  },

  acceptHumanMove: function(ac) {
    waitingHumanMove = false;
    this.checkGameStatus();
    
    if(ac) {
        waitingHumanMove = true;
        moveGen = null;
        moveGenLast = null;
        moveStartTime = 0;
    }

    this.invalidate();
  },


  movePieceOnBoard: function(move, isReplay) {

    this.acceptHumanMove(false); 
    app.view.UI.setTurn(game.getOpponent());

    if(!isReplay) {
        var player = app.controller.Players.getPlayer(game.getOpponent());
        player.sendCommand(game, game.getOpponent(), 'MOVE', move);
        console.log("movePiceOnBoard: sentMoveToOpponent");
    }

    playSound('move');
    app.view.UI.showMessage(false);
    validMoves = null;
    currentMove = move;
    currentFirstMove = currentMove;
    moveElapsedTime = 0;
    moveStartTime = new Date().getTime();

  },



  init: function() {
    sglRegisterLoadedCanvas("gameCanvas", board, 25.0);
    var canvas = document.getElementById("gameCanvas");
    canvas.contentEditable = false;

    document.addEventListener("touchstart", function(e) { 
        var source = e.target || e.srcElement;
        if(source.id == "gameCanvas") {
          if(e.touches.length == 2) e.preventDefault();
	  board.touchesChanged(e); 
        }
    }, { passive: false} );
    document.addEventListener("touchmove",  function(e) { 
        var source = e.target || e.srcElement;
        if(source.id == "gameCanvas") {
          if(e.touches.length == 2) e.preventDefault();
	  board.touchesMoved(e); 
        }
    }, { passive: false } );    // FIXES SOME SCROLL PROBLEMS
    document.addEventListener("touchend",   function(e) { 
        var source = e.target || e.srcElement;
        if(source.id == "gameCanvas") {
	  board.touchesChanged(e); 
	}
    }, { passive: false } );

    document.addEventListener("gesturestart",   function(e) {
        e.preventDefault();
    } );
    document.addEventListener("gesturechange",   function(e) {
        e.preventDefault();
    } );
    document.addEventListener("gestureend",   function(e) {
        e.preventDefault();
    } );
    document.addEventListener("dragover", function (e) {
        e.preventDefault();
    }, false);

    board.ui._manager.mouseOut = function(e) {
        return false;
    }

/*
    document.onmouseup = function(e)   {
        board.ui._manager.mouseUp(e);
    }

    //document.onmousedown = function(e) { board.ui._manager.mouseDown(e); }  // commented to avoid repeated event

    document.onmousemove = function(e) {
        board.ui._manager.mouseMove(e);
    }
*/

/*
    document.onkeydown = function(e)   {
        board.ui._manager.keyDown(e);
    }
    document.onkeyup = function(e)     {
        board.ui._manager.keyUp(e);
    }
*/

    window.onresize = function(e)      {
        board.ui._manager.resize(e);
    }
},


    load : function(gl)
    {
        console.log("SpiderGL Version : " + SGL_VERSION_STRING + "\n");

        /*************************************************************/

        var canvas = document.getElementById("gameCanvas");
        var parent = canvas.parentNode;
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
        aspectRatio = canvas.width/canvas.height;
	fov = 45;
        xform = new SglTransformStack();
        xform.projection.loadIdentity();
        xform.projection.perspective(sglDegToRad(fov), aspectRatio, 0.10, 1000.0);
        xform.view.loadIdentity();
        xform.view.lookAt(0.0, -z, z, 0.0,0.0,0.0, 0.0,1.0,0.0);
        xform.model.loadIdentity();
        /*************************************************************/


        /*************************************************************/
        var shadowVsrc = sglNodeText("SHADOW_PASS_VERTEX_SHADER");
        var shadowFsrc = sglNodeText("SHADOW_PASS_FRAGMENT_SHADER");
        var shadowProg = new SglProgram(gl, [shadowVsrc], [shadowFsrc]);
        console.log(shadowProg.log);
        this.shadowProg = shadowProg;
        /*************************************************************/


        /*************************************************************/
        var lightVsrc = sglNodeText("LIGHT_PASS_VERTEX_SHADER");
        var lightFsrc = sglNodeText("LIGHT_PASS_FRAGMENT_SHADER");
        var lightProg = new SglProgram(gl, [lightVsrc], [lightFsrc]);
        console.log(lightProg.log);
        this.lightProg = lightProg;
        /*************************************************************/


        /*************************************************************/
        brightness = 0.8;
        this.bgcolor = sglV4C(0.8, 0.65, 0.33, 1.0);
        this.color1 = sglV4C(0.92, 0.69, 0.24, 1.0);
        this.color2 = sglV4C(0.55, 0.33, 0.18, 1.0);
        this.setCustomPieceColors(true);
        this.initTextures(gl);
        this.loadModels(gl, draughtsTheme);
        this.loadModels(gl, chessTheme);
        /*************************************************************/


        /*************************************************************/
        var fbOpt = { depthAsRenderbuffer : true };
        fb = new SglFramebuffer(gl, 2048, 2048, [ gl.RGBA ], gl.DEPTH_COMPONENT16, null, fbOpt);
        console.log("Framebuffer Valid : " + fb.isValid);
        /*************************************************************/


        /*************************************************************/
        shadowMatrix = sglIdentityM4();
        //worldLightPos = sglV3C(-5.0, -10.0, 10.0);     // Perspective shadows (when distance < 400)
        worldLightPos = sglV3C(-500.0, -1000.0, 1000.0); // Orthogonal shadows  (when distance >= 400)
        ambientColor = sglV3C(0.4, 0.4, 0.4);
        diffuseLightColor = sglV3C(0.5, 0.5, 0.5 );
        specularLightColor = sglV3C(0.7, 0.7, 0.7 );
        pieceShininess = 4.0; 
        /*************************************************************/
        trackball = new SglTrackball();
        this.resize(null,null,null);
    },


    loadModels : function(gl, theme) {
        this.initModelBuffers(gl, theme.Board);
        this.initModelBuffers(gl, theme.BoardCell);
        this.initModelBuffers(gl, theme.Pawn);
        this.initModelBuffers(gl, theme.Queen);
        this.initModelBuffers(gl, theme.King);
        this.initModelBuffers(gl, theme.Knight);
        this.initModelBuffers(gl, theme.Bishop);
        this.initModelBuffers(gl, theme.Rook);
    },


    initModelBuffers : function(gl, model) {
        if(model) {
          var mesh = new SglMeshGL(gl);
          mesh.addVertexAttribute("position", 3, new Float32Array(model.vertices));
          mesh.addVertexAttribute("normal",   3, new Float32Array(model.normals));
          mesh.addVertexAttribute("texCoord", 2, new Float32Array(model.texCoords));
          mesh.addArrayPrimitives("triangles", gl.TRIANGLES, 0, model.indices.length);
          mesh.color = [ 0.2, 0.6, 0.2 ];
          model.mesh = mesh;
        }
    },


    initTextures : function(gl) {
        this.textures = Array();
        this.loadedTextures = 0;
        this.loadTexture(gl, BOARD_TEXTURE,         "resources/images/board.jpg");
        this.loadTexture(gl, PLAYER1_TEXTURE,       "resources/images/white.jpg");
        this.loadTexture(gl, PLAYER2_TEXTURE,       "resources/images/black.jpg");
        this.loadTexture(gl, CELL_HOVER_TEXTURE,    "resources/images/cellHover.png");
        this.loadTexture(gl, CELL_SELECTED_TEXTURE, "resources/images/cellSelected.png");
        this.loadTexture(gl, CELL_VALID_TEXTURE,    "resources/images/cellValid.png");
        this.loadTexture(gl, CELL_VALID1_TEXTURE,   "resources/images/cellValid1.png");
        this.loadTexture(gl, CELL_INVALID_TEXTURE,  "resources/images/cellInvalid.png");
        this.loadTexture(gl, GRID_TEXTURE,          "resources/images/board_alone.jpg");
    },


    loadTexture : function(gl, index, texFile) {
        var ui = this.ui;
        var texOpts = {
            minFilter : gl.LINEAR,
            magFilter : gl.LINEAR,
            wrapS     : gl.CLAMP_TO_EDGE,
            wrapT     : gl.CLAMP_TO_EDGE,
            generateMipmap : true,
            onload    : function() { 
	      var msgId = app.view.UI.getNextMsgId();
              board.loadedTextures++; 
              if(board.loadedTextures < board.textures.length) {
		//var percent = Math.floor(board.loadedTextures*100/board.textures.length);
		//document.l10n.formatValue("app.messages.loading_textures", { "percent": percent } ).then(function(msg) { app.view.UI.showMessage(msg, msgId) });
              } else {
                //app.view.UI.showMessage(false, msgId);
		//document.l10n.formatValue("app.messages.cookies_info").then(function(msg) { app.view.UI.showMessage(msg, msgId) });
		ui.requestDraw();
              }
            }
        };
        this.textures[index] = new SglTexture2D(gl, texFile, texOpts);
    },


    setShadows : function(enabled) {
        withShadows = enabled;
        this.invalidate();
    },


    setReflections : function(enabled) {
        withReflections = enabled;
        this.invalidate();
    },

    setBrightness : function(b) {
	brightness = b;
        this.invalidate();
    },

    setFOV : function(a) {
	xform.projection.loadIdentity();
        xform.projection.perspective(sglDegToRad(a), aspectRatio, 0.10, 1000.0);

	var newScale = z*(Math.atan(sglDegToRad(fov/2))) / (Math.atan(sglDegToRad(a/2)));

        fov = a;
	this.pinch(newScale, zRot);

        //this.updateRotationMatrix();
        this.invalidate();
    },


    setCustomPieceColors : function(a) {
       var alpha = a? 1.0 : 0.0
       this.color1[3] = alpha;
       this.color2[3] = alpha;
       this.invalidate();
    },

    setBackgroundColor : function(r,g,b,a) {
       this.bgcolor = sglV4C(r, g, b, this.bgcolor[3]);
       this.invalidate();
    },

    setPlayer1PieceColor : function(r,g,b,a) {
       this.color1 = sglV4C(r, g, b, this.color1[3]);
       this.invalidate();
    },

    setPlayer2PieceColor : function(r,g,b,a) {
       this.color2 = sglV4C(r, g, b, this.color2[3]);
       this.invalidate();
    },



    keyDown : function(gl, keyCode, keyString) {

        if (this.ui.keysDown[ALT_KEYCODE] && keyString == "R") {  // ALT+R: reset camera
            xRot = 0.0;
            yRot = 0.0;
            zRot = 0.0;
            this.updateRotationMatrix();
            this.invalidate();
        }

        if (this.ui.keysDown[ALT_KEYCODE] && keyString == "S") {  // ALT+S: show piece state 
            alert(game.toString());
        }

        if (this.ui.keysDown[ALT_KEYCODE] && keyString == "L") {  // ALT+L: load game state
            var state = prompt("debug state:");
            app.view.UI.setGameState(state);
            this.invalidate();
        }

        return false;
    },


    handlePressedKeys : function() {
        var currentlyPressedKeys = this.ui.keysDown;

        if (currentlyPressedKeys[32]) {
            if(!debugShadowBuffer) {
               debugShadowBuffer = true;
	       this.invalidate();
            }
        } else if(debugShadowBuffer) {
            debugShadowBuffer = false;
	    this.invalidate();
        }

        if (currentlyPressedKeys[33]) {
            // Page Up
            z -= 0.10;
            if(z < 4) z = 4;
            this.updateRotationMatrix();
	    this.invalidate();
        }
        if (currentlyPressedKeys[34]) {
            // Page Down
            z += 0.10;
            if(z > 15) z = 15;
            this.updateRotationMatrix();
	    this.invalidate();
        }
        if (currentlyPressedKeys[37]) {
            // Left cursor key
            zRot -= 1.5;
            this.updateRotationMatrix();
	    this.invalidate();
        }
        if (currentlyPressedKeys[39]) {
            // Right cursor key
            zRot += 1.5;
            this.updateRotationMatrix();
            this.invalidate();
        }
        if (currentlyPressedKeys[38]) {
            // Up cursor key
            xRot -= 1.5;
            if(xRot < -45) xRot = -45;
            this.updateRotationMatrix();
	    this.invalidate();
        }
        if (currentlyPressedKeys[40]) {
            // Down cursor key
            xRot += 1.5;
            if(xRot > 45) xRot = 45;
            this.updateRotationMatrix();
            this.invalidate();
        }
    },


    updateRotationMatrix : function() {
        var matrix = new SglMatrixStack();
        matrix.loadIdentity();
        matrix.rotate(sglDegToRad(xRot), 1.0,0.0,0.0);
        matrix.rotate(sglDegToRad(yRot), 0.0,1.0,0.0);
        matrix.rotate(sglDegToRad(zRot), 0.0,0.0,1.0);
        trackball._matrix = matrix.top;

        xform.view.loadIdentity();
        xform.view.lookAt(0.0, -z, z, 0.0,0.0,0.0, 0.0,1.0,0.0);
    },


    initGesture : function() {
    },

    pinch : function(scale, rotation) {
        this.dragging = true;
        zRot = rotation;
        if(scale) z = scale;
        if(z < 4.5 * Math.atan(sglDegToRad(fov/2)) / Math.sin(sglDegToRad(fov/2))) z = 4.5 * Math.atan(sglDegToRad(fov/2)) / Math.sin(sglDegToRad(fov/2));  // allows max zoom for FOV perspective
        if(z > 8 / Math.sin(sglDegToRad(fov/2))) z = 8 / Math.sin(sglDegToRad(fov/2));  // max zoom 
        this.updateRotationMatrix();
        this.invalidate();
    },

    pan : function(startX, deltaX, startY, deltaY) {
        this.dragging = true;

        var dir = (startY < this.ui.height/2) ? 1.0 : -1.0;
        zRot += deltaX * 180 * dir / this.ui.width;
        zRot = zRot % 360;

        xRot += -deltaY * 90 / this.ui.height;
        if(xRot >  45) xRot = 45;
        if(xRot < -45) xRot = -45;

        this.updateRotationMatrix();
        this.invalidate();
    },

    endGesture : function() {
        this.dragging = false;
	this.initialScaleFactor = null;
	this.initialRotationOffset = null;
    },


    mouseDown : function(gl, button, x, y)
    {
        this.startX = x;
        this.startY = y;
        this.startRot = zRot;
        this.startScale = z;
        this.handleMousePieceSelectionAndMove(x, y, button);
        this.initGesture();
	app.view.UI.hideControls();
	return true;
    },

    mouseMove : function(gl, x, y)
    {
        var ui = this.ui;
        var cell = this.getBoardCoordinatesForMousePosition(x, y);
        if(cell[0]!=cellUnderMouse[0] || cell[1]!=cellUnderMouse[1]) {
            cellUnderMouse = cell;
            this.invalidate();
	}

        if(ui.mouseButtonsDown[MOUSE_LEFT_BUTTON]) {
            var deltaX = this.ui.mouseDeltaPos.x;
            var deltaY = this.ui.mouseDeltaPos.y;
            if(this.ui.keysDown[SHIFT_KEYCODE]) {
		var ox = this.ui.width/2;
		var oy = this.ui.height/2;
		var s1 = this.getScalingDistance(ox,oy, this.startX,this.startY);
		var s2 = this.getScalingDistance(ox,oy, x,y);
		var scale = this.startScale  * s1 / s2;

	        var r1 = this.getRotationAngle(ox,oy, this.startX,this.startY);
	        var r2 = this.getRotationAngle(ox,oy, x,y);
		var rotation = this.startRot + r2 - r1;

                this.pinch(scale, rotation);
            } else {
                this.pan(this.startX, deltaX, this.startY, deltaY);
	    }
            this.invalidate();
        }

	return true;
    },

    mouseUp : function(gl, button, x, y) 
    {
        this.endGesture();
	return true;
    },


    mouseWheel: function(gl, wheelDelta, x, y)
    {
        z += wheelDelta / 10;
        this.pinch(z + wheelDelta/10, zRot);
        this.endGesture();
    },


    handleMousePieceSelectionAndMove : function(x,y,button) {

        if(!waitingHumanMove) return;
     
        var boardCoords = this.getBoardCoordinatesForMousePosition(x,y);
        var col = boardCoords[0];
        var row = boardCoords[1];

        if(this.isSelectedCell(col,row)) {
            var tmp = moveGen;
            while(tmp != null) {
              if( (col != tmp.x1) || (row != tmp.y1) ) {
                tmp = tmp.getNextMove();
              } else {
                if(!this.isValidCell(col,row)) {
                  tmp.setTarget(-1,-1);
                  tmp.setNextMove(null);
                  moveGenLast = tmp;
                  return;
                }
                break;
              } 
            }
        } 

        if(!this.isValidCell(col,row)) {
            moveGen = null;
            return;
        }


        playSound('select');
        var piece = game.getPiece(col,row);
        if(button == MOUSE_LEFT_BUTTON)  { 
            var moveTemp = new app.model.Move();
            var validMove = false;
            if(moveGen != null) {
              moveGenLast.x2 = moveTemp.x1 = col;
              moveGenLast.y2 = moveTemp.y1 = row;
              validMove = game.getValidMove(moveGen);
            }

            var alternatives = 0;
            if(moveGen) {
              for(var index = 0; index < validMoves.length; index++) {
                var move = validMoves[index];
                if(game.getMoveString(move).indexOf(game.getMoveString(moveGen)) == 0) alternatives++;
              }
            }

            if(alternatives == 0)  { 
                // restart move when a cell has a piece of the player or is not being moved by the rules
                moveGen = new app.model.Move();
                moveGen.setFrom(col, row);
                moveGenLast = moveGen;

            } else {

                if(game.constructor.name.indexOf("Chess") != -1) {
                   var searchCastle = true;
                   if(alternatives > 1) {  
                     this.ui.mouseButtonsDown[MOUSE_LEFT_BUTTON] = false;
                     searchCastle = confirm($("#confirm_castle").text());
                   }

                   for(var index = 0; index < validMoves.length; index++) {
                       var move = validMoves[index];
                       if(game.getMoveString(move).indexOf(game.getMoveString(moveGen)) == 0 
                              && (alternatives == 1 || (searchCastle && move.getNextMove() != null) || (!searchCastle && move.getNextMove() == null)) ) {
		 	   validMove = move;
                           break;
                       } 
                   }   
                }


                // chain complex moves
                if(validMove) {
		    window.undoManager.add(game.toString());
                    waitingHumanMove = false;
                    cellUnderMouse = [-1, -1];
		    if(game.isPawnPromotion && game.isPawnPromotion(validMove)) validMove.promotion = game.parsePieceType($('#promotion_piece').val());
                    this.movePieceOnBoard(validMove);
                    moveGen = null;
                    moveGenLast = null;
                } else if(moveGenLast != null) {
                    moveGenLast.setNextMove(moveTemp);
                    moveGenLast = moveTemp;
                }
            }
        }
    },


    getScalingDistance : function(x1,y1, x2,y2){
        var dx = x1 - x2; 
        var dy = y1 - y2; 
        return Math.sqrt(dx*dx + dy*dy);
    },

    getRotationAngle : function(x1,y1, x2,y2){
        var dx = x1 - x2;
        var dy = y1 - y2;
        return(Math.atan2(dy, dx)*180/Math.PI);	
    },

    touchesChanged : function(e) {
        if(e.touches) {
          if(e.touches.length >= 1) {
            this.lastTouchFinger1 = e.touches[0];
  	    if(!this.initialTouchFinger1) this.initialTouchFinger1 = e.touches[0];

            if(e.touches.length >= 2) {
	      if(!this.initialTouchFinger2) {
                this.initGesture();
	        this.initialTouchFinger2 = e.touches[1];
	        this.initialScaleFactor = z * this.getScalingDistance(this.initialTouchFinger1.pageX,this.initialTouchFinger1.pageY, this.initialTouchFinger2.pageX,this.initialTouchFinger2.pageY);
	        this.initialRotationOffset = zRot + this.getRotationAngle(this.initialTouchFinger1.pageX,this.initialTouchFinger1.pageY, this.initialTouchFinger2.pageX,this.initialTouchFinger2.pageY);
	      }

            } else {
              if(!this.ui.keysDown[SHIFT_KEYCODE]) {
                this.initialTouchFinger2 = null;
                this.endGesture();
              } 
            }
          } else {
  	    this.initialTouchFinger1 = null;
	    this.initialTouchFinger2 = null;
            this.endGesture();
          }
        }
    },

    touchesMoved : function(e) {
      var gesture = false;
      var finger1 = this.initialTouchFinger1;
      var finger2 = this.initialTouchFinger2;
      if(e.touches && e.touches.length==1) {
        var deltaPageX = this.lastTouchFinger1.pageX - e.touches[0].pageX;
        var deltaPageY = this.lastTouchFinger1.pageY - e.touches[0].pageY;
        this.lastTouchFinger1 = e.touches[0];

	if(this.ui.keysDown[SHIFT_KEYCODE]) {
          if(!this.initialTouchFinger2) {
            this.initGesture();
            this.initialTouchFinger1 = {pageX: this.ui.width/2.0, pageY: this.ui.height/2.0};
            this.initialTouchFinger2 = e.touches[0];
   	    this.initialScaleFactor = z * this.getScalingDistance(this.initialTouchFinger1.pageX,this.initialTouchFinger1.pageY, this.initialTouchFinger2.pageX,this.initialTouchFinger2.pageY);
	    this.initialRotationOffset = zRot + this.getRotationAngle(this.initialTouchFinger1.pageX,this.initialTouchFinger1.pageY, this.initialTouchFinger2.pageX,this.initialTouchFinger2.pageY);
          }
          finger1 = this.initialTouchFinger1;
          finger2 = e.touches[0];

          gesture = true;
        } else {
          e.preventDefault();
          this.pan(this.initialTouchFinger1.pageX, deltaPageX, this.initialTouchFinger1.pageY, deltaPageY);
        }
      }

      if(this.initialTouchFinger1 && this.initialTouchFinger2 && e.touches && e.touches.length == 2) {
        finger1 = e.touches[0];
        finger2 = e.touches[1];
        gesture = true;
      }

      if(gesture) {
        e.preventDefault();
	var scale = this.initialScaleFactor / this.getScalingDistance(finger1.pageX,finger1.pageY, finger2.pageX,finger2.pageY);
	var rotation = this.initialRotationOffset - this.getRotationAngle(finger1.pageX,finger1.pageY, finger2.pageX,finger2.pageY);
        this.pinch(scale, rotation);
      }
    },
 

    getWorldCoordinates : function(screenPositionX, screenPositionY, zPos) {
        // Calculates homogenius 4D world coordinate for 2D mouse point in camera view (in certain z position):
        var mvp = sglInverseM4(sglMulM4(xform.modelViewProjectionMatrix, trackball.matrix));
        var inverseViewProjectionMatrix = $M([ [mvp[0],mvp[4],mvp[8],mvp[12]],[mvp[1],mvp[5],mvp[9],mvp[13]],[mvp[2],mvp[6],mvp[10],mvp[14]],[mvp[3],mvp[7],mvp[11],mvp[15]] ]);

        var camPos4D = $V([ (screenPositionX/this.ui.width)*2-1, (screenPositionY/this.ui.height)*2-1, zPos*2-1, 1 ]);
        var worldPos4D = inverseViewProjectionMatrix.multiply(camPos4D);

        // Converts 4D coordinate to 3D:
        var w     = 1/worldPos4D.elements[3];
        var coord = worldPos4D.multiply(w);
        coord.elements.length = coord.elements.length - 1;  // to remove last dimension (w) 

        //alert(coord.elements);
        return coord; 
    },


    getBoardCoordinatesForMousePosition : function(x,y) {
        var mouseSource = this.getWorldCoordinates(x,y, 0);
        var mouseTarget = this.getWorldCoordinates(x,y, 1);
        var mouseRayDirection = mouseTarget.subtract(mouseSource);
        var mouseRay = Line.create(mouseSource, mouseRayDirection);

        var boardPlane = Plane.XY;
        var intersection = boardPlane.intersectionWith(mouseRay);

        if(intersection && intersection.elements) {
          var col = Math.floor(intersection.elements[0]) + 4;
          var row = Math.floor(intersection.elements[1]) + 4;
          if( col < 0 || col >= 8 || row < 0 || row >= 8) { 
            col = -1;
            row = -1;
	  }
          return [col, row];
        } else {
          return [-1, -1];
        }
    },


    invalidate : function() 
    {
	redraw = true;
    },

    update : function(gl, dt)
    {
        this.handlePressedKeys();

        if(moveStartTime) {
            var timeNow = new Date().getTime();
            moveElapsedTime = timeNow - moveStartTime;
            if(moveElapsedTime >= TIME_BEFORE_JUMP_IN_MILLIS + MOVE_TIME_IN_MILLIS) {
                if(!this.completePieceMovement()) moveElapsedTime = 0;
            }
	    redraw = true;
        } 

        var retval = redraw;
        redraw = false;
        return retval;
    },

    drawMeshShadowPass : function(gl, m, nullcolor, nulltex, shininess, opacity, t) {
        if (!m) return;

        var uniforms = {
            u_mvp : xform.modelViewProjectionMatrix
        };

        sglRenderMeshGLPrimitives(m, "triangles", t.shadowProg, null, uniforms);
    },


    drawMeshLightPass : function(gl, m, color, tex, shininess, opacity, t) {
        if (!m) return;

        var shadowMat = sglMulM4(shadowMatrix, xform.modelMatrix);
        shadowMat = sglMulM4(shadowMat, shadowModelScaling);

        var uniforms = {
            u_mv                  : xform.modelViewMatrix,
            u_mvp                 : xform.modelViewProjectionMatrix,
            u_worldNormalMatrix   : xform.worldSpaceNormalMatrix,
            u_shadowMatrix        : shadowMat,
            u_worldLightPos       : worldLightPos,
            u_ambientColor	  : ambientColor,
            u_diffuseLightColor   : diffuseLightColor,
            u_specularLightColor  : specularLightColor,
            u_materialShininess   : shininess,
            u_brightness          : brightness,
            u_opacity	          : opacity,
            u_color               : color,
            u_biasToLowerMoirePattern : biasToLowerMoirePattern
        };

        var samplers = {
            u_texture   : tex,
            u_shadowMap : fb.colorTargets[0]
        };

        sglRenderMeshGLPrimitives(m, "triangles", t.lightProg, null, uniforms, samplers);
    },


    drawModel : function(gl, func, mesh, color, tex, shininess, opacity, t) {
        xform.model.push();
        func(gl, mesh, color, tex, shininess, opacity, t);
        xform.model.pop();
    },


    drawPieces : function(gl, func, t) {
        if(!game) return;
        for(y = 0; y < 8; y++) {
            for(x = 0; x < 8; x++) {
                var piece = game.getPiece(x,y);
		var model = this.getPieceModel(piece);
                if(model != null) {
                    xform.model.push();
                    xform.model.translate(x-3.5, y-3.5, 0.00);
                    if(moveStartTime) this.pieceAnimation(moveElapsedTime, x, y, piece); 
		    if(game.getPieceType(piece) == KNIGHT) xform.model.rotate((game.getPieceOwner(piece) == PLAYER1) ? PI/2 : -PI/2, 0, 0, 1);
                    xform.model.scale(0.3, 0.3, 0.3);
                    if(func == this.drawMeshShadowPass) {
                        this.drawModel(gl, func, model.mesh, nullcolor, 0, 0.0, 1.0, this);
                    } else {
                        if( (moveGen) && ( (x == moveGen.x1) && (y == moveGen.y1) ) ) {
	 		    xform.model.translate(0.0, 0.0, 0.25);
                        }

                        /* Transparent effect:
                        if( (currentMove != null) && ( (x == currentMove.killedX) && (y == currentMove.killedY) ) ) {
                          gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
                          gl.enable(gl.BLEND);
                        }
                        */

                        var player = game.getPieceOwner(piece);
                        var color = (player == PLAYER1) ? this.color1 : this.color2;
                        this.drawModel(gl, func, model.mesh, color, this.textures[player == PLAYER1 ? PLAYER1_TEXTURE : PLAYER2_TEXTURE], pieceShininess, 1.0, this);
                        // gl.disable(gl.BLEND);
                    }
                    xform.model.pop();
                }
            }
        }

    },


    drawSceneShadowPass : function(gl) {
        xform.model.push();
        xform.model.multiply(trackball.matrix);
        this.drawPieces(gl, this.drawMeshShadowPass, this); 
        xform.model.pop();
    },


    drawCellMark : function(gl, x, y, texIndex) {
        xform.model.push();
        xform.model.translate(x-3.5, y-3.5, 0.01);
        xform.model.scale(1.0/8.0, 1.0/8.0, 1.0/8.0);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.enable(gl.BLEND);
        this.drawModel(gl, this.drawMeshLightPass, BlenderExport.BoardCell.mesh, nullcolor, this.textures[texIndex], 0.0, 0.0, this);
        gl.disable(gl.BLEND);
        xform.model.pop();
    },


    isSelectedCell : function(x,y) {
        var tmp = moveGen;
        while(tmp != null) {
           if( (x == tmp.x1) && (y == tmp.y1) ) return true;
           tmp = tmp.getNextMove();
        }
        return false;
    },

    isValidCell : function(x,y) {
        if(validMoves) {
            for(var index = 0; index < validMoves.length; index++) {
                var move = validMoves[index];
                if( (x == move.x1) && (y == move.y1) ) {
                    return true;
                } else if(moveGen && (game.getMoveString(move).indexOf(game.getMoveString(moveGen)) == 0) ) {
                    var tmp = moveGen;
                    if(tmp) tmp = tmp.getNextMove();
                    while(tmp != null) {
                        tmp = tmp.getNextMove();
                        if(move) move = move.getNextMove();
                    }
                    if( (move) && (move.x2 == x) && (move.y2 == y) ) return true;
                }
            }
        }
        return false;
    },


    drawFloor : function(gl, opacity) {
        xform.model.push();
        xform.model.rotate(sglDegToRad(game.getBoardRotationDegrees()), 0.0,0.0,1.0);
        this.drawModel(gl, this.drawMeshLightPass, BlenderExport.BoardCell.mesh, nullcolor, this.textures[GRID_TEXTURE], 0.0, opacity, this);
        xform.model.pop();
    },


    drawReflectionPass : function(gl) {

        // Don't update color or depth. 
        gl.disable(gl.DEPTH_TEST);
        gl.colorMask(gl.FALSE, gl.FALSE, gl.FALSE, gl.FALSE);

        // Draw 1 into the stencil buffer. 
        gl.enable(gl.STENCIL_TEST);
        gl.clearStencil(0);
        gl.stencilOp(gl.REPLACE, gl.REPLACE, gl.REPLACE);
        gl.stencilFunc(gl.ALWAYS, 1, 1);

        // Render board surface 
        this.drawFloor(gl, 1.0);

        // Re-enable update of color and depth. 
        gl.colorMask(gl.TRUE, gl.TRUE, gl.TRUE, gl.TRUE);
        gl.enable(gl.DEPTH_TEST);

        // Only render when stencil is set to 1. 
        gl.stencilFunc(gl.EQUAL, 1, 1);  // draw if ==1 
        gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);


        xform.model.push();

        // Inverse Z plane to simulate relection. 
        xform.model.scale(1.0, 1.0, -1.0);

        // Avoid back face culling for reflected model
        gl.cullFace(gl.FRONT);
        gl.enable(gl.CULL_FACE);

        // Draw the reflected pieces. 
        this.drawPieces(gl, this.drawMeshLightPass, this);

        // Enable back face culling. 
        gl.disable(gl.CULL_FACE);

        xform.model.pop();


        // Disable stenciling 
        gl.disable(gl.STENCIL_TEST);

        // Blend the reflections with the scene
        gl.enable(gl.BLEND);

        //gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_ALPHA_SRC);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

        this.drawFloor(gl, 0.3);

        gl.disable(gl.BLEND);

    },


    drawSceneLightPass : function(gl) {
        xform.model.push();
        xform.model.multiply(trackball.matrix);

        if(withReflections) {
            shadowModelScaling = sglScalingM4C(1.0, 1.0, -1.0);
	    this.drawReflectionPass(gl);
        }


        shadowModelScaling = sglScalingM4C(1.0, 1.0, 1.0);

        //debugShadowBuffer = true;
        if(debugShadowBuffer) {
            this.drawModel(gl, this.drawMeshLightPass, BlenderExport.BoardCell.mesh, nullcolor, fb.colorTargets[0], 0.0, 1.0, this);

        } else {

            xform.model.push();
            xform.model.rotate(sglDegToRad(game.getBoardRotationDegrees()), 0.0,0.0,1.0);
            this.drawModel(gl, this.drawMeshLightPass, BlenderExport.Board.mesh, nullcolor, this.textures[BOARD_TEXTURE], 0.0, 1.0, this);
            xform.model.pop();

            if(waitingHumanMove) {
                // MARK SELECTED CELLS
                if( (cellUnderMouse[0] >= 0) && (cellUnderMouse[0] < 8)  
                        && (cellUnderMouse[1] >= 0) && (cellUnderMouse[1] < 8) ) {
                    var texIndex = CELL_INVALID_TEXTURE;
                    if(this.isSelectedCell(cellUnderMouse[0], cellUnderMouse[1]) 
			|| this.isValidCell(cellUnderMouse[0], cellUnderMouse[1])) {
                        texIndex = CELL_HOVER_TEXTURE;	
                    }
                    if(!this.dragging) this.drawCellMark(gl, cellUnderMouse[0], cellUnderMouse[1], texIndex);
                }
 
                // MARK MOVEMENT CELLS
                var move = moveGen;
                while( (move) && (move.x1 >= 0) && (move.x1 < 8) && (move.y1 >= 0) && (move.y2 < 8) ) {
                    this.drawCellMark(gl, move.x1, move.y1, CELL_SELECTED_TEXTURE);
                    move = move.getNextMove();
                }

                if(validMoves) {


                    for(var index = 0; index < validMoves.length; index++) {
                        var move = validMoves[index];
                        if(moveGen && (game.getMoveString(move).indexOf(game.getMoveString(moveGen)) == 0) ) {
                            var tmp = moveGen;
                            if(tmp) tmp = tmp.getNextMove();
                            while(tmp != null) {
                                tmp = tmp.getNextMove();
                                if(move) move = move.getNextMove();
                            }
                            if(move) this.drawCellMark(gl, move.x2, move.y2, CELL_VALID_TEXTURE);
                        }
                    }


                    for(var index = 0; index < validMoves.length; index++) {
                        var move = validMoves[index];
                        this.drawCellMark(gl, move.x1, move.y1, (moveGen? CELL_VALID1_TEXTURE : CELL_VALID_TEXTURE) );
                    }



                }

            }


            this.drawPieces(gl, this.drawMeshLightPass, this); 
        }


        xform.model.pop();
    },

    getPieceModel: function(piece) {
        var pieceType = game.getPieceType(piece);
        switch(pieceType) {
            case PAWN:   return BlenderExport.Pawn;
            case QUEEN:  return BlenderExport.Queen;
            case KING:   return BlenderExport.King;
            case BISHOP: return BlenderExport.Bishop;
            case KNIGHT: return BlenderExport.Knight;
            case ROOK:   return BlenderExport.Rook;
            default:     return NONE;
        }
    },

    pieceAnimation : function(diff, x,y, piece)
    {
        if(diff) {
            if (diff <= TIME_BEFORE_JUMP_IN_MILLIS) {
                if((x == currentMove.x1) && (y == currentMove.y1)) this.jumpingPieceMorphUpdate(diff);
            } else if(diff < TIME_BEFORE_JUMP_IN_MILLIS + MOVE_TIME_IN_MILLIS) {
                // ignorar tiempo de salto (anterior al tiempo de movimiento):
                diff = diff - TIME_BEFORE_JUMP_IN_MILLIS;
                if((x == currentMove.x1) && (y == currentMove.y1)) this.movedPieceMorphUpdate(diff);
                if((x == currentMove.killedX) && (y == currentMove.killedY)) this.killedPieceMorphUpdate(diff);
            }
        }
    },


    jumpingPieceMorphUpdate : function(diff)
    {
        // FX: comprimir y extender hasta tamaño normal (para que parezca que la pieza esta intentando saltar):
        var radians = (diff * PI) / TIME_BEFORE_JUMP_IN_MILLIS;
        var sinRadians = Math.sin(radians);

        xform.model.scale(1.0 + sinRadians*FACTOR_COMPRESION_EXTENSION, 1.0 + sinRadians*FACTOR_COMPRESION_EXTENSION, 1.0 - sinRadians*FACTOR_COMPRESION_EXTENSION);
    },


    movedPieceMorphUpdate : function(diff)
    {
        // FX: cambiar posicion y elevar/descender la pieza:
        var diffCol = currentMove.x2 - currentMove.x1;
        var diffRow = currentMove.y2 - currentMove.y1;
        var radians = PI * diff/MOVE_TIME_IN_MILLIS;
        var sinRadians = Math.sin(radians);

        xform.model.translate((diffCol * diff) / MOVE_TIME_IN_MILLIS, (diffRow * diff) / MOVE_TIME_IN_MILLIS, JUMP_HEIGHT * sinRadians);

        // FX: Inclinar un poco (segun la distancia del moviminento):
        var radians2 = (2.0 * PI * diff ) / MOVE_TIME_IN_MILLIS;
        var sinRadians2 = Math.sin(radians2);

        var modulus = Math.sqrt(diffRow*diffRow + diffCol*diffCol);
        var aRot = (MAX_INCLINATION * sinRadians2) * Math.log(1.0 + 9.0*Math.abs(modulus)/7.0) / Math.log(10);
        xform.model.rotate(aRot, -diffRow, diffCol, 0.0);

        // FX: extender y comprimir hasta tamaño normal (para que parezca que la pieza está saltando):
        xform.model.scale(1.0 - sinRadians*FACTOR_COMPRESION_EXTENSION, 1.0 - sinRadians*FACTOR_COMPRESION_EXTENSION, 1.0 + sinRadians*FACTOR_COMPRESION_EXTENSION);
    },


    killedPieceMorphUpdate : function(diff)
    {
        // FX (ajedrez): reducir altura de la pieza para que parezca que está siendo aplastada:
        var QUARTER_MOVE_TIME_IN_MILLIS = MOVE_TIME_IN_MILLIS / 4.0;
        if(diff > MOVE_TIME_IN_MILLIS - QUARTER_MOVE_TIME_IN_MILLIS) {
            xform.model.scale(1.0, 1.0, (MOVE_TIME_IN_MILLIS - diff)/QUARTER_MOVE_TIME_IN_MILLIS);
        }
    },



    completePieceMovement : function()
    {
        console.log("CompletePieceMovement: enters");
        moveStartTime = 0;
        game.makeStep(game.getTurn(), currentMove);
        console.log("CompletePieceMovement: basic move made ");
        if(!currentFirstMove ) currentFirstMove = currentMove;
        console.log("CompletePieceMovement: currentFirstMove = " + currentFirstMove);
        currentMove = currentMove.getNextMove();
        console.log("CompletePieceMovement: currentMove = " + currentMove);
        if(currentMove != null) {  
            // continue with another jump animation
            playSound('move');
            moveStartTime = new Date().getTime();
            return false;
        } else {          
            // finish animation
            currentMove = null;
            moveStartTime = 0;
            game.toggleTurn();
            console.log("CompletePieceMovement: Turn changed");

    	    this.checkGameStatus();

	    var firstMove = currentFirstMove;
	    var player = app.controller.Players.getPlayer(game.getTurn());
	    currentFirstMove = null;
	    player.sendCommand(game, game.getTurn(), 'MOVED', firstMove);

            return true;
        }
    },


    shadowPass : function(gl) {
        // TODO: auto calculation of bias to lower moire pattern (or correct glPolygonOffset parameters)

        fb.bind();

        gl.clearColor(1.0, 1.0, 1.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);

        xform.projection.push();
        xform.view.push();
        xform.view.loadIdentity();

        var lightPos = new SglVec3(worldLightPos);
        var lightDistance = lightPos.length;
        var lightIsNear = (lightDistance < 400);

        if(lightIsNear) {
          // perspective projection
          var fov = 60 * 10 / lightDistance;
          biasToLowerMoirePattern = 0.00007;    // light:[-0,-0,10], distance: 10, FOV: 60, polyOffset(0,1800) 

          //TODO: auto calculation of bias to lower moire pattern (or fix glPolygonOffset parameters)
          //biasToLowerMoirePattern = 0.00020;    // light:[-0,-0,5], distance: 5, FOV: 120, polyOffset(0,1000)
          //biasToLowerMoirePattern = 0.00007;    // light:[-0,-0,10], distance: 10, FOV: 60, polyOffset(0,1800) 
          //biasToLowerMoirePattern = 0.00002;    // light:[-0,-0,100], distance: 100, FOV: 6 
          //biasToLowerMoirePattern = 0.0000187;  // light:[-50,-80,100], distance: 137.47
          //biasToLowerMoirePattern = 0.0000160;  // light:[-100,-400,400], distance: 574.45, FOV: 1.044

          xform.projection.loadIdentity();
          xform.projection.perspective(sglDegToRad(fov), aspectRatio, 0.10,1000.0);
          xform.view.lookAt(worldLightPos[0],worldLightPos[1],worldLightPos[2], 0.0,0.0,0.0, 0.0,1.0,0.0);
        } else {
          // orthographic projection (to avoid resolution problems with depth values of the shadow map)
          biasToLowerMoirePattern = 0.01;
          var lightDir = sglNormalizedV3(sglNegV3(worldLightPos));
          xform.projection.loadIdentity(); 
          xform.projection.ortho(-5.5, 5.5, -5.5, 5.5, -5.5, 5.5);
          xform.view.lookAt(0.0,0.0,0.0, lightDir[0],lightDir[1],lightDir[2], 0.0,1.0,0.0);
        }


        //xform.view.multiply(sglInverseM4(trackball.matrix));

        //xform.model.push();
        //xform.model.loadIdentity();

        shadowMatrix = sglMulM4(sglTranslationM4C(0.5, 0.5, 0.5), sglScalingM4C(0.5, 0.5, 0.5));
        shadowMatrix = sglMulM4(shadowMatrix, xform.modelViewProjectionMatrix);

        gl.polygonOffset(0.0, 1.0);  // can also be used to lower moire pattern,
                                     // but how the offset parameters should be calculated?
                                     // ok: light distance 10:offset=[0,1800]
                                     // ok: light distance 100:offset=[0,180])
        gl.enable(gl.POLYGON_OFFSET_FILL);
        gl.enable(gl.DEPTH_TEST);
        gl.cullFace(gl.BACK);
        gl.enable(gl.CULL_FACE);

        if(withShadows) this.drawSceneShadowPass(gl);

        gl.disable(gl.CULL_FACE);
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.POLYGON_OFFSET_FILL);

        //xform.model.pop();
        xform.view.pop();
        xform.projection.pop();

        fb.unbind();
    },

    lightPass : function(gl) {
        var w = this.ui.width;
        var h = this.ui.height;

        /*
        if(!game) gl.clearColor(0.8, 0.8, 1.0, 1.0);
        else if(game.getTurn() == PLAYER1) gl.clearColor(0.96, 0.89, 0.54, 1.0);
        else gl.clearColor(0.8, 0.65, 0.33, 1.0);
        */

        gl.clearColor(this.bgcolor[0], this.bgcolor[1], this.bgcolor[2], this.bgcolor[3]);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);

        gl.viewport(0, 0, w, h);

        gl.cullFace(gl.BACK);
        gl.enable(gl.CULL_FACE);
        gl.enable(gl.DEPTH_TEST);

        this.drawSceneLightPass(gl);

        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.CULL_FACE);
    },


    draw : function(gl)
    {
        if(this.loadedTextures == this.textures.length) {
          this.shadowPass(gl);
          this.lightPass(gl);
        }
    },

    resize : function(gl, width, height) 
    {
        var canvas = document.getElementById("gameCanvas");
        var parent = canvas.parentNode;
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
	aspectRatio = canvas.width/canvas.height;
        xform.projection.loadIdentity();
        xform.projection.perspective(sglDegToRad(fov), aspectRatio, 0.10, 1000.0);
        this.invalidate();
        return true;
    }
};

board = new Board3D();
return board;

})();

