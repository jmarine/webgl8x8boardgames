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
      $('input[id=start_submit]').each(function() { 
	var c =  $("select[id=" + list + "] > option:selected").size();
	this.disabled = (c == 0);
      });
}


$(window).error(function(err) {  
    alert('Msg: ' + err.originalEvent.message + ' | Lno: ' + err.originalEvent.lineno + "|" + JSON.stringify(err));  
});


$(window).bind('beforeunload', function() {
  if(Network) Network.disconnect();
});


$(document).ready(function(){

  Strophe.log = function (level, msg) { console.log(msg); } 

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
		  $('#start').hide();
		  $('#connect').show();
		  $('#network').fadeIn();
                }
	} else {
		$('#connect').hide();
		$('#network').hide();
                if(Network) Network.disconnect();
		$('#start').fadeIn();
                $('input[id=start_submit]').each(function() { 
	            this.disabled = false;
                });
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
              $('#start').fadeIn();
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
		$('#start').fadeIn();
		$('#list_games').fadeIn();
	 	updateStartButtonState('users');	
            }
	}
	return false;
     }
  });

  $('#help').click(function() {
        var game = $('#game_type')[0].selectedIndex;
        var links = [ "http://en.wikipedia.org/wiki/Draughts#Long-range_kings.3B_men_cannot_capture_backwards_.28Spanish_draughts_family.29", "http://en.wikipedia.org/wiki/English_draughts", "http://en.wikipedia.org/wiki/Chess", "http://en.wikipedia.org/wiki/Breakthrough_(board_game)" ];
	window.open(links[game]);
	return false;
  });

  $('#start_form').submit(function() {
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

  $('#promotion_form').hide();
  $('#player1').change(onPlayerTypeChange);
  $('#player2').change(onPlayerTypeChange);

  $('#game_type').change(function() {
        window.undoManager.clearUndo();
        hideGameStorage();
        $('#promotion_form').hide();

        var gameType = UI.getGameType();
        var tmpGame = eval("new " + gameType + "()");
        var level = tmpGame.getPreferedLevelAI(); 
        $('input[id=level]').val(level);

        if($(this).val() == 'chess') {
          $('#promotion_form').show();
        }
  	Network.disconnect();
  });

  $('#shadows').change(function() {
	var enabled = $(this).attr('checked');
	board.setShadows(enabled);
  });

  $('#reflections').change(function() {
	var enabled = $(this).attr('checked');
	board.setReflections(enabled);
  });


  onPlayerTypeChange();


  $('#load_form').submit(function() {
        loadGame();
	return false;
  });

  $('#delete_form').submit(function() {
        deleteGame();
	return false;
  });

  $('#delete_all_form').submit(function() {
        deleteGames();
	return false;
  });


  $('#save_form').submit(function() {
	saveGame();	
	return false;
  });


  $('input[id=retract_submit]').each(function() {
     this.disabled = true;
  });

  $('#retract_form').submit(function() {
        stopEnginePlayer();
	document.execCommand("undo");
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


  $('#disconnect_form').submit(function() {
	try {
	  showMessage(false);
          Network.disconnect();
        } catch(e) { alert(e.message); }
	return false;
  });

  $('#connect_form').submit(function() {

    showMessage(false);

    var userid = $("#connect_jid").val();
    var password = $("#connect_password").val();
    var bosh_url = $("#connect_url").val();
    var muc = $("#muc").val();

    Network.connect(bosh_url, muc, userid, password);

    return false;                                                                                                                                                                   
  });                                                                                                                                                                               


  // Network.disconnect();

/* 
  initBoard3D();
  UI.createGame();
  listGames();
  preloadSounds();
*/
  

});
