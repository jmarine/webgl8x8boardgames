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



function updateStartButtonState(list) {
      $('button.btnStartGame').each(function() { 
	var c =  $("select[id=" + list + "] > option:selected").size();
	this.disabled = (c == 0);
      });
}

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

		if(Network && Network.getGameStatus() == Network.GameStatusEnum.GAME_UNDEFINED) {
		  $('button.btnStartGame').hide();
		  $('#connect_section').show();
		  $('#network').fadeIn();
                }
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

  $('#reject_form').submit(function() {
     if(Network.gameRoom != null) {
	Network.exitGame(true);	
        return false;
     } else {

	var req = $("select[id=requests] > option:selected");

	showMessage(false);
	if(req.size() <= 0) {
           if(Network.joinedRemoteUserSession != null) {
              Network.rejectGameRequest(Network.getGameType() + "@" + Network.mucService + "/" + Network.joinedRemoteUserSession, req.size());
              $('#reject').hide();
              $('#join2').hide();
              $('#network_status').hide();
              $('#join').fadeIn();
              $('#list_games').fadeIn();
              updateStartButtonState('users');
           }
        } else {
            var remoteUser = req.val();
            req.remove();
            Network.rejectGameRequest(remoteUser, req.size());
            $('input[id=reject_submit]').each(function() {
               this.disabled = true;
            });

            req = $("select[id=requests] > option");
	    if(req.size() <= 0) {
		$('#reject').hide();
		$('#join2').hide();
		$('#network_status').hide();
		$('#join').fadeIn();
		$('#list_games').fadeIn();
	 	updateStartButtonState('users');	
            }
	}
	return false;
     }
  });

  $('#help').click(function() {
        var game = $('#game_type')[0].selectedIndex;
        var links = [ "http://en.wikipedia.org/wiki/Draughts#Long-range_kings.3B_men_cannot_capture_backwards_.28Spanish_draughts_family.29", "http://en.wikipedia.org/wiki/English_draughts", "http://en.wikipedia.org/wiki/Chess", "http://en.wikipedia.org/wiki/Chess960", "http://en.wikipedia.org/wiki/Breakthrough_(board_game)" ];
	window.open(links[game]);
	return false;
  });

  $('button.btnStartGame').click(function() {
        showMessage(false);

        if( ($('select[id=player1] > option:selected').attr('value') == REMOTE_USER )
            && ($('select[id=player2] > option:selected').attr('value') == REMOTE_USER ) ) {

          showMessage("Only 1 remote player is allowed");
          return false;
        }

	if( ($('select[id=player1] > option:selected').attr('value') == REMOTE_USER )
	    || ($('select[id=player2] > option:selected').attr('value') == REMOTE_USER ) ) {

 		var my_role = ($('select[id=player1] > option:selected').attr('value') == REMOTE_USER) ? "player2" : "player1";
		if(Network.getGameStatus() == Network.GameStatusEnum.GAME_UNDEFINED) {	// users
			var req = $('select[id=users] > option:selected');
			var user_session = req.val();
                        Network.sendGameRequest(user_session, my_role);

		} else if(Network.getGameStatus() == Network.GameStatusEnum.GAME_CREATED) {   // requests
			var req = $('select[id=requests] > option:selected');
			var user_info = req.text();
			var user_role = user_info.split(' ')[2];
			var user_session = req.val();

			if( ( (user_role == 'player1') && ($('select[id=player1] > option:selected').attr('value') != REMOTE_USER) )
			   || ( (user_role == 'player2') && ($('select[id=player2] > option:selected').attr('value') != REMOTE_USER) ) ) {
				swapPlayerTypes();	
 				my_role = ($('select[id=player1] > option:selected').attr('value') == REMOTE_USER) ? "player2" : "player1";
			}

        	        req.remove();
                        Network.acceptGameRequest(user_session, my_role);
		        UI.createGame();
		}

	} else {

		UI.createGame();
	}
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

        if($(this).val() == 'chess') {
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


  $('#list_users_form').submit(function() {
    Network.listUsers();
    return false;
  });

  $('#list_games_form').submit(function() {
    Network.listGames();
    return false;
  });


  $('#open_game_form').submit(function() {
    var gameRoom = $("select[id=requests] > option:selected").attr('value');
    var gameDescription = $("select[id=requests] > option:selected").text();
    Network.openGame(gameRoom, gameDescription);
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
          //$("#user_picture").width(0).height(0);
       
          var wgsclient = Network.getWgsClient(url);
          var realm = wgsclient.getDefaultRealm(); 
          var email = prompt("Enter e-mail:");
          if(email) wgsclient.registerUser(realm, user, pass, email, authentication);
        }
        return false;
  });


  $("#btnCreateGame").click(function() {
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
      $('#credits').hide();
      return false;
  });

  $("#btnConnect")
            .click(function() {
                showMessage(false);

                var url = $("#server_url").val();
                var user = $("#user").val();
                if(user.length == 0) {
                  alert("Sorry. Anonymous players don't work fine, yet.");
                } else {
                  var pass = $("#password").val();
                  $("#password").val("");  // clear credentials
                  Network.login(url, user, pass);
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
                    openid_connect_menu(this);
                    return false;
                })
                    .next()
                    .next()
		    .buttonset()
                        .hide()
                        .menu();  



});
