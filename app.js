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

var app = app || {};


/*
$(window).error(function(err) {  
    alert('Msg: ' + err.originalEvent.message + ' | line: ' + err.originalEvent.lineno );  
});
*/

$(window).bind('beforeunload', function() {
  if(app.lobby) {
    app.lobby.disconnect();
  }
});


$(document).ready(function(){


  function swapPlayerTypes() {
    var player1 = $('select[id=player1]');
    var player2 = $('select[id=player2]');
    var tmp = player1.val();
    if(tmp != REMOTE_USER) {
        app.view.board.acceptHumanMove(false);
	player1.val(player2.val());
	player2.val(tmp);	
    } else {
	tmp = player2.val();
	player2.val(player1.val());
	player1.val(tmp);
    }
  }



  var onPlayerTypeChange = function() {
        if( ($('select[id=player1] > option:selected').attr('value') == REMOTE_USER )
	    || ($('select[id=player2] > option:selected').attr('value') == REMOTE_USER ) ) {

		$('button.btnStartGame').hide();
		$('#btnRetractMove').hide();
		$('#connect_section').show();
		$('#network').fadeIn();

	} else {
		$('#connect_section').hide();
		$('#network').hide();
                app.lobby.disconnect();

		$('button.btnStartGame').show();
                $('button.btnStartGame').each(function() { 
	            this.disabled = false;
                });

		$('#btnRetractMove').show();
	}


        if( ($('select[id=player1] > option:selected').attr('value') == ENGINE )
            || ($('select[id=player2] > option:selected').attr('value') == ENGINE) ) {
		$('#ai').show();
	} else {
		$('#ai').hide();
	}
  };


  $('#help').click(function() {
        var game = $('#game_type')[0].selectedIndex;
        var links = [ "http://en.wikipedia.org/wiki/Draughts#Long-range_kings.3B_men_cannot_capture_backwards_.28Spanish_draughts_family.29", "http://en.wikipedia.org/wiki/English_draughts", "https://en.wikipedia.org/wiki/Turkish_draughts",  "http://en.wikipedia.org/wiki/Chess", "http://en.wikipedia.org/wiki/Chess960", "http://en.wikipedia.org/wiki/Breakthrough_(board_game)"];
	window.open(links[game]);
	return false;
  });

  $('input').keypress(function(e) {
        var code = (e.keyCode ? e.keyCode : e.which);
        if ( (code==13) || (code==10)) {
            jQuery(this).blur();
            return false;
        }
  });


  $('#promotion_option').hide();
  $('#player1').change(onPlayerTypeChange);
  $('#player2').change(onPlayerTypeChange);

  $('#game_type').change(function() {
        window.undoManager.clearUndo();
        app.controller.Storage.hideGameStorage();
        $('#promotion_option').hide();

        var gameType = app.view.UI.getGameType();
        var tmpGame = app.model.GameFactory.createGame(gameType);
        var alg = $("#algorithm_name").val();
        var level = tmpGame.getPreferedLevelAI(alg); 
        $('input[id=level]').val(level);

        if($(this).val().indexOf('chess') == 0) {
          $('#promotion_option').show();
        }
  });

  $("#algorithm_name").change(function() { 
	var gameType = app.view.UI.getGameType();
       	var tmpGame = app.model.GameFactory.createGame(gameType);
	var alg = $("#algorithm_name").val();
       	var level = tmpGame.getPreferedLevelAI(alg);
	$('input[id=level]').val(level);

	if(alg == "MCTS") {
	 	$(".ai_thinkingtime_option").show();
	}
	else {
		$(".ai_thinkingtime_option").hide();
	}
  });

  $('#shadows').change(function() {
	var enabled = $(this).prop('checked');
	app.view.board.setShadows(enabled);
  });

  $('#reflections').change(function(e) {
	var enabled = $(this).prop('checked');
	app.view.board.setReflections(enabled);
  });

  $('#brightness').on("input", function(){
 	var brightness=this.value;
        app.view.board.setBrightness(brightness);
  });

  $('#fov').on("input", function(){
        var fov=this.value;
        app.view.board.setFOV(fov);
  });




  $('#bgcolor').change(function(evt) {
    var hexString = $(this).val().substr(1);
    var r = parseInt(hexString.substr(0, 2), 16) / 255.0;
    var g = parseInt(hexString.substr(2, 2), 16) / 255.0;
    var b = parseInt(hexString.substr(4, 2), 16) / 255.0;
    app.view.board.setBackgroundColor(r,g,b);
  });

  $('#color1').change(function(evt) {
    var hexString = $(this).val().substr(1);
    var r = parseInt(hexString.substr(0, 2), 16) / 255.0;
    var g = parseInt(hexString.substr(2, 2), 16) / 255.0;
    var b = parseInt(hexString.substr(4, 2), 16) / 255.0;
    app.view.board.setPlayer1PieceColor(r,g,b);
    app.view.board.setCustomPieceColors(true);
  });

  $('#color2').change(function(evt) {
    var hexString = $(this).val().substr(1);
    var r = parseInt(hexString.substr(0, 2), 16) / 255.0;
    var g = parseInt(hexString.substr(2, 2), 16) / 255.0;
    var b = parseInt(hexString.substr(4, 2), 16) / 255.0;
    app.view.board.setPlayer2PieceColor(r,g,b);
    app.view.board.setCustomPieceColors(true);
  });




  onPlayerTypeChange();

  $('#btnProfile').click(function() {
        app.lobby.loadProfile(null);
	return false;
  });



  $('#btnSendChatLine').click(function() {
        app.view.UI.sendChatLine();
	return false;
  });


  $('#btnSaveGame').click(function() {
	app.controller.Storage.saveGame();	
	return false;
  });

  $('#btnRetractMove').each(function() {
     this.disabled = true;
  });

  $('#btnRetractMove').click(function() {
        app.controller.Players.stopEnginePlayer();
	document.execCommand("undo");
	return false;
  });



  $('#btnLoadGame').click(function() {
        app.controller.Storage.loadGame();
	return false;
  });

  $('#btnDeleteGame').click(function() {
        app.controller.Storage.deleteGame();
	return false;
  });

  $('#btnDrawGame').click(function() {
        if(confirm($("#confirm_draw_offer").text())) {
          app.lobby.offerDraw();
        }
        return false;
  });

  $('#btnResignGame').click(function() {
        if(confirm($("#confirm_resign").text())) {
            var promise = app.lobby.resign();
            if(promise != null) {
                promise.then(function() { app.lobby.exitGame(false) });
            }
        }
        return false;
  });

  $('#btnDeleteAllGames').click(function() {
        app.controller.Storage.deleteGames();
	return false;
  });


  $('#btnDisconnect').click(function() {
	try {
	  app.view.UI.showMessage(false);
          if(app.lobby) app.lobby.disconnect();
        } catch(e) { alert(e.message); }
	return false;
  });

  $("#btnRegister").click(function() {
        var url = $("#server_url").val();
        var user = $("#user").val();
        var pass = $("#password").val();
        if(user.length == 0 || pass.length == 0) {
	  document.l10n.formatValue("app.network.credentials_required_error").then(function(msg) { alert(msg) });
        } else {
          $("#user").val("");
          $("#password").val("");
          $("#btnProfile").hide();

          document.l10n.formatValue('app.network.email_prompt').then(function(email_prompt) { 
            var wgsclient = app.lobby.getWgsClient(url);
            var realm = wgsclient.getDefaultRealm(); 
            var email = prompt(email_prompt);
            if(email) wgsclient.registerUser(getOAuth2ClientName(), realm, user, pass, email, notificationChannel, authentication);
          });
        }
        return false;
  });


  $('button.btnStartGame').click(function() {
        // Quick access button
        app.view.UI.showMessage(false);
        app.view.UI.hideControls();
	app.view.UI.createGame();
        return false;
  });


  $("#btnCreateGame").click(function() {

        // app.lobby game creation
        app.view.UI.showMessage(false);
        if( ($('select[id=player1] > option:selected').attr('value') == REMOTE_USER )
            && ($('select[id=player2] > option:selected').attr('value') == REMOTE_USER ) ) {

          document.l10n.formatValue('app.network.only1player').then(function(msg) { app.view.UI.showMessage(msg) } );
          return false;
        }

        app.lobby.new_group();
        return false;
  });


  $("#btnHideMatchingOptions").click(function() {
        app.lobby.exitGame(false);
        return false;
  });

  $("#btnShowMatchingOptions").click(function() {
        $("#games_section").hide();
        $("#btnShowMatchingOptions").hide();
        $("#btnDeleteFinishedGames").hide();
        $("#matching_options").show();
        $("#btnCreateGame").show();
        $("#btnHideMatchingOptions").show();

        $("#new_grp_opponent > option[value!='']").remove();
        if(app.lobby.user.friends) {
          app.lobby.user.friends.forEach(function(item) {
            var option = $('<option>').attr('value',item.user).text(item.name);
            if(item.picture) option.attr("style","height:34px;background-repeat:no-repeat;background-image:url("+item.picture+");padding-left:35px;background-size: auto 30px;background-position:2px 2px;vertical-align: middle");
            $("#new_grp_opponent").append(option);
          });
        }

        return false;
  });

  $("#btnDeleteFinishedGames").click(function() {
        app.lobby.deleteFinishedGroups();
        return false;  
  });

  $("#btnConnect")
            .click(function() {
              if(provider.length > 0) {
                if(providerAuthUrl != null) window.open(providerAuthUrl,'_blank'); 
                else openid_connect_menu(null);
              } else {
                app.view.UI.showMessage(false);
                $("#openid_providers_menu").hide();

                var url = $("#server_url").val();
                var user = $("#user").val();
                if(user.length == 0) {
		  document.l10n.formatValue("app.network.anonymous_error").then(function(msg) { alert(msg) });
                } else {
                  var pass = $("#password").val();
                  $("#password").val("");  // clear credentials
                  app.lobby.login(getOAuth2ClientName(), url, user, pass, notificationChannel);
                }
              }
              return false;
            })
            .next()
                .button({
                    text: false,
                    icons: {
                        primary: "ui-icon-triangle-1-s"
                    }
                })
                .click(function() {
                    if(providerAuthUrl != null)  window.open(providerAuthUrl,'_blank'); 
                    else openid_connect_menu(null);
                    return false;
                })
                    .next()
                    .next()
		    .buttonset()
                        .hide()
                        .menu();  



});
