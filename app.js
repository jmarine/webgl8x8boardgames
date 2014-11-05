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
$(window).error(function(err) {  
    alert('Msg: ' + err.originalEvent.message + ' | line: ' + err.originalEvent.lineno );  
});
*/

$(window).bind('beforeunload', function() {
  if(Network) {
    var wgsclient = Network.getWgsClient(null);
    if(wgsclient) wgsclient.goodbye("wamp.close.normal");
  }
});


$(document).ready(function(){

  function swapPlayerTypes() {
    var player1 = $('select[id=player1]');
    var player2 = $('select[id=player2]');
    var tmp = player1.val();
    if(tmp != REMOTE_USER) {
        acceptHumanMove(false);
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
		$('#connect_section').show();
		$('#network').fadeIn();

	} else {
		$('#connect_section').hide();
		$('#network').hide();
		$('button.btnStartGame').fadeIn();
                $('button.btnStartGame').each(function() { 
	            this.disabled = false;
                });

                Network.disconnect();
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
        var links = [ "http://en.wikipedia.org/wiki/Draughts#Long-range_kings.3B_men_cannot_capture_backwards_.28Spanish_draughts_family.29", "http://en.wikipedia.org/wiki/English_draughts", "http://en.wikipedia.org/wiki/Chess", "http://en.wikipedia.org/wiki/Chess960", "http://en.wikipedia.org/wiki/Breakthrough_(board_game)" ];
	window.open(links[game]);
	return false;
  });


  $('#promotion_option').hide();
  $('#player1').change(onPlayerTypeChange);
  $('#player2').change(onPlayerTypeChange);

  $('#game_type').change(function() {
        window.undoManager.clearUndo();
        hideGameStorage();
        $('#promotion_option').hide();

        var gameType = UI.getGameType();
        var tmpGame = eval("new " + gameType + "()");
        var level = tmpGame.getPreferedLevelAI(); 
        $('input[id=level]').val(level);

        if($(this).val().indexOf('chess') == 0) {
          $('#promotion_option').show();
        }
  });

  $('#shadows').change(function() {
	var enabled = $(this).attr('checked');
	board.setShadows(enabled);
  });

  $('#reflections').change(function() {
	var enabled = $(this).attr('checked');
	board.setReflections(enabled);
  });


  $('#bgcolor').change(function(evt) {
    var hexString = $(this).val().substr(1);
    var r = parseInt(hexString.substr(0, 2), 16) / 255.0;
    var g = parseInt(hexString.substr(2, 2), 16) / 255.0;
    var b = parseInt(hexString.substr(4, 2), 16) / 255.0;
    board.setBackgroundColor(r,g,b);
  });

  $('#color1').change(function(evt) {
    var hexString = $(this).val().substr(1);
    var r = parseInt(hexString.substr(0, 2), 16) / 255.0;
    var g = parseInt(hexString.substr(2, 2), 16) / 255.0;
    var b = parseInt(hexString.substr(4, 2), 16) / 255.0;
    board.setPlayer1PieceColor(r,g,b);
    board.setCustomPieceColors(true);
  });

  $('#color2').change(function(evt) {
    var hexString = $(this).val().substr(1);
    var r = parseInt(hexString.substr(0, 2), 16) / 255.0;
    var g = parseInt(hexString.substr(2, 2), 16) / 255.0;
    var b = parseInt(hexString.substr(4, 2), 16) / 255.0;
    board.setPlayer2PieceColor(r,g,b);
    board.setCustomPieceColors(true);
  });




  onPlayerTypeChange();

  $('#btnSendChatLine').click(function() {
        UI.sendChatLine();
	return false;
  });


  $('#btnSaveGame').click(function() {
	saveGame();	
	return false;
  });

  $('#btnRetractMove').each(function() {
     this.disabled = true;
  });

  $('#btnRetractMove').click(function() {
        stopEnginePlayer();
	document.execCommand("undo");
	return false;
  });



  $('#btnLoadGame').click(function() {
        loadGame();
	return false;
  });

  $('#btnDeleteGame').click(function() {
        deleteGame();
	return false;
  });

  $('#btnFinishGame').click(function() {
        if(confirm("Do you really want to resign?")) {
          Network.group_finished();
          Network.exitGame();
        }
        return false;
  });

  $('#btnDeleteAllGames').click(function() {
        deleteGames();
	return false;
  });


  $('#btnDisconnect').click(function() {
	try {
	  showMessage(false);
          if(Network) Network.disconnect();
        } catch(e) { alert(e.message); }
	return false;
  });

  $("#btnRegister").click(function() {
        var url = $("#server_url").val();
        var user = $("#user").val();
        var pass = $("#password").val();
        if(user.length == 0 || pass.length == 0) {
          alert("User and password must be entered.");
        } else {
          $("#user").val("");
          $("#password").val("");
          $("#user_picture").hide();
       
          var wgsclient = Network.getWgsClient(url);
          var realm = wgsclient.getDefaultRealm(); 
          var email = prompt("Enter e-mail:");
          if(email) wgsclient.registerUser(realm, user, pass, email, authentication);
        }
        return false;
  });


  $('button.btnStartGame').click(function() {
        // Quick access button
        showMessage(false);
        hideOptions();
	UI.createGame();
        return false;
  });


  $("#btnCreateGame").click(function() {

        // Network game creation
        showMessage(false);
        if( ($('select[id=player1] > option:selected').attr('value') == REMOTE_USER )
            && ($('select[id=player2] > option:selected').attr('value') == REMOTE_USER ) ) {

          showMessage("Only 1 remote player is allowed");
          return false;
        }

        Network.new_group();
        return false;
  });


  $("#btnHideMatchingOptions").click(function() {
        Network.exitGame(true);
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
        if(Network.user.friends) {
          Network.user.friends.forEach(function(item) {
            var option = $('<option>').attr('value',item.user).text(item.name);
            if(item.picture) option.attr("style","height:34px;background-repeat:no-repeat;background-image:url("+item.picture+");padding-left:35px;background-size: auto 30px;background-position:2px 2px;vertical-align: middle");
            $("#new_grp_opponent").append(option);
          });
        }

        return false;
  });

  $("#btnDeleteFinishedGames").click(function() {
        Network.deleteFinishedGroups();
        return false;  
  });

  $("#gameCanvas").mousedown(function() {
      hideOptions();
      return false;
  });

  $("#btnConnect")
            .click(function() {
              if(provider.length > 0) {
                if(providerAuthUrl == null) openid_connect_menu(null);
                else window.open(providerAuthUrl,'_blank'); 
              } else {
                showMessage(false);
                $("#openid_providers_menu").hide();

                var url = $("#server_url").val();
                var user = $("#user").val();
                if(user.length == 0) {
                  alert("Sorry. Anonymous players don't work fine, yet.");
                } else {
                  var pass = $("#password").val();
                  $("#password").val("");  // clear credentials
                  Network.login(url, user, pass);
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
                    if(providerAuthUrl == null) openid_connect_menu(null);
                    else window.open(providerAuthUrl,'_blank'); 
                    return false;
                })
                    .next()
                    .next()
		    .buttonset()
                        .hide()
                        .menu();  



});
