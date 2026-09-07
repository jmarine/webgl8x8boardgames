var app = app || {}

function updateTournamentsList(id,details,errorURI,payload,payloadKw) {
    app.tournaments.list();
    // TODO: if(payloadKw.cmd == "change" && app.tournaments.selected.id == payloadKw.id) app.tournaments.showDetails(payloadKw.id);
};

app.tournaments = {
    subscriptionId: null,
    selected: null,

    showAccessButton: function() {
      $("#btnTournaments").show(); 
    },

    hideAccessButton: function() {
      $("#btnTournaments").hide();
      app.view.UI.showGames();
    },

    convertISOStringToLocal: function(iso) {
	var d = new Date(iso);
	return d.toLocaleString();
    },

    subscribe: function() {
	let _this = this;
        app.lobby.wgsclient.subscribe("wgs.tournament_event", updateTournamentsList, null, {} ).then(function(id) { _this.subscriptionId = id; });
    },

    unsubscribe: function() {
	let _this = this;
	app.lobby.wgsclient.unsubscribe(_this.subscriptionId, updateTournamentsList, null);
	_this.subscriptionId = null;
    },

    list: function() {
      if(this.subscriptionId == null) this.subscribe();

      var appId = ""; // any
      var status = $('input[name="rbTournamentListFilter"]:checked').val();

      app.lobby.wgsclient.listTournaments(appId, status, function(id,details,errorURI,result,resultKw) {
	  debugger;
	  $("#tournamentsTable tbody tr").remove();

	  var tableBody = $("#tournamentsTable tbody");
	  if(!errorURI) {
	    if(resultKw.tournaments == null || resultKw.tournaments.length == 0) {
	      var tr = $("<tr>");
	      tr.attr('height', "50");
	      tr.append("<td colspan='7' align='center'>No tournaments found</td>");
	      tableBody.append(tr);
	    } else {
	      resultKw.tournaments.forEach(function(item) {
		var isOpen = item.status.toLowerCase() == "open";
		var roundType = (item.type == 0) ? "Swiss system" : ((item.type == 1) ? "Single knockout" : "Double knockout");
	        var tr = $("<tr>");
	        tr.attr('class', "scrollTableRow");
                tr.append('<td data-l10n-id="app.games.' + item.appName + '">' + item.appName + '</td>');
                tr.append('<td>' + app.tournaments.convertISOStringToLocal(item.start) + '</td>');
                tr.append('<td><a href="#" onclick="javascript:app.tournaments.showDetails(' + item.id + '); return false;">' + item.name + '</a></td>');
		tr.append('<td><span data-l10n-id="app.group.status.'+item.status.toLowerCase()+'">' + item.status + '</td>');
                tr.append('<td>' + item.round + ' - ' + roundType + '</td>');
		let enrolls = $('<td>' + item.enrolls + '</td>');
                tr.append(enrolls);

		var buttons = "";
		if(isOpen && item.userTeamsEnrolled != null && item.userTeamsEnrolled.length > 0) {
		  item.userTeamsEnrolled.forEach(function(enrollInfo) {
		    buttons = buttons + '<button onclick="javascript:app.tournaments.unenroll(' + enrollInfo.tournamentEnrollmentId + ')">Unenroll (' + enrollInfo.teamName + ')</button>';
		  });
		}

		if(isOpen) {
			if(buttons.length == 0) {
				buttons = buttons + '<button onclick="javascript:app.tournaments.enroll(' + item.id + '); return false;">Enroll</button>';
			}
			if(item.owner == app.lobby.wgsclient.user) {
				buttons = buttons + '<button onclick="javascript:app.tournaments.start('+ item.id + '); return false;">Start</button>';
			}
		}
		if(item.owner == app.lobby.wgsclient.user) {
			buttons = buttons + '<button onclick="javascript:app.tournaments.deleteTournament(' + item.id + '); return false;">Delete</button></td>' 
		}
                tr.append('<td>' + buttons + '</tr>');
	        tableBody.append(tr);
	      });
	    }  
	  }
      });
    },

    showCreateOptions: function() {
      // reset fields?
      this.closeDetails();
      $("#tournament_new").show();
    },

    hideCreateOptions: function() {
      $("#tournament_new").hide();
    },

    create: function() {
      var appId = $("#new_tournament_app option:selected").val();
      if(appId == null || appId == "") {
	      alert("Select game type");
	      return;
      }

      var name = $("#new_tournament_name").val();
      if(name == "") {
              alert("Enter tournament name");
              return;
      }

      var type = parseInt($("#new_tournament_type option:selected").val()); 
      var options = {};
      options.start_datetime = (new Date($("#new_tournament_start_datetime").val())).toISOString();
      options.max_teams = parseInt($("#new_tournament_max_teams").val());
      options.min_teams = parseInt($("#new_tournament_min_teams").val());
      options.max_round_duration = parseInt($("#new_tournament_duration").val()) * parseInt($("#new_tournament_duration_type option:selected").val());

      debugger;
      app.lobby.wgsclient.newTournament(appId, type, name, options, function(id,details,errorURI,result,resultKw) {
	if(errorURI) {
	  alert("Error: " + errorURI);
	} else {
	  app.tournaments.hideCreateOptions();
	  app.tournaments.list();
	}
      });
    },

    deleteTournament: function(id) {
      let _this = this;
      app.lobby.wgsclient.deleteTournament(id, function(id,details,errorURI,result,resultKw) {
	if(errorURI) {
          alert("Error: " + errorURI);
        } else {
          app.tournaments.list();
	  if(id == _this.selected.id) {
		  _this.closeDetails();
	  }
        }
      });
    },

    enroll: function(id) {
      var options = {};
      // options.teamName = input("Enter team name:");
      // options.participants = [];
      app.lobby.wgsclient.enrollTournament(id, options, function(id,details,errorURI,result,resultKw) {
        if(errorURI) {
          alert("Error: " + errorURI);
        } else {
          app.tournaments.list();
        }
      });

    },

    unenroll: function(tournamentEnrollId) {
      app.lobby.wgsclient.unenrollTournament(tournamentEnrollId, function(id,details,errorURI,result,resultKw) {
	debugger;
        if(errorURI) {
          alert("Error: " + errorURI);
        } else {
          app.tournaments.list();
        }
      });
    },

    start: function(id) {
      app.lobby.wgsclient.startTournament(id, function(id,details,errorURI,result,resultKw) {
        if(errorURI) {
          alert("Error: " + errorURI);
        } else {
          app.tournaments.list();
        }
      });
    },

    closeDetails: function() {
      $("#tournament_details_name").text("");
      this.clearTournamentRoundsDetails();
      $("#tournament_details").hide();
      this.selected = null;
    },

    showDetails: function(id) {
      let _this = this;
      this.hideCreateOptions();
      this.closeDetails();

      app.lobby.wgsclient.getTournamentDetails(id, function(id,details,errorURI,result,resultKw) {
        if(errorURI) {
          alert("Error: " + errorURI);
        } else {
	  console.log("Details:", resultKw);
	  _this.selected = resultKw;
          $("#tournament_details_name").text(resultKw.name);
	  $("#tournament_details_round option:not(:first)").remove();

	  var isFinished = (resultKw.status.toLowerCase() == "finished");
	  var roundId = 0;
	  if(_this.selected != null && _this.selected.rounds != null && _this.selected.rounds.length > 0) {
	      while(roundId < _this.selected.rounds.length) {
		 roundId++;
		 $("#tournament_details_round").append($('<option value="'+roundId+'"' + ((!isFinished && roundId == _this.selected.rounds.length)? "selected" : "") + '>' + roundId + '</option>'));
	      }
	  }
	  // show last round for active tournament, or summary when finished
	  if(isFinished) roundId = 0;
          _this.showTournamentDetails(roundId);
        }
      });
    },

    onRoundChange: function() {
	    var roundId = $("#tournament_details_round option:selected").val();
	    this.showTournamentDetails(roundId);
    },

    showTournamentDetails: function(roundId) {
              let _this = this;
	      if(roundId == 0) {
                  _this.showTournamentSummary();
              } else {
                  _this.showRoundDetails(roundId);  // last
              }

              $("#tournament_details").show();
    },

    clearTournamentRoundsDetails: function() {
            $("#tournament_details_info tbody tr").remove();
            $("#tournament_summary_info tbody tr").remove();
            $("#tournament_summary_info thead tr th:not(:nth-child(-n+2))").remove();
    },

    isCurrentUserMemberOfTeam: function(team) {
	    let isMember = false;
	    if(team != null && team.users != null) {
	      team.users.forEach(function(member) {
		    if(app.lobby.wgsclient.user == member.user) {
			    isMember = true;
		    }
	      });
	    }
	    return isMember;
    },

    showRoundDetails: function(roundId) {
	    let _this = this;
	    this.clearTournamentRoundsDetails();

	    
            let tableBody = $("#tournament_details_info tbody");
	    if(this.selected == null || this.selected.rounds == null || roundId > this.selected.rounds.length) {
	        let tr = $("<tr>");
		tr.append("<td colspan='7'>No data</td>");
	        tableBody.append(tr);
	    } else {

                var round = this.selected.rounds[roundId - 1];
	        $("#tournament_round_start_date").text((new Date(round.start)).toLocaleString());
	        $("#tournament_round_end_date").text((new Date(round.due)).toLocaleString());

		round.matches.forEach(function(match, index) {
			debugger;
		     var isFinished = match.status.toLowerCase() == "finished";
		     var t1 = match.teams[0];
		     var t2 = match.teams[1];
		     var weight1 = _this.isCurrentUserMemberOfTeam(t1)? "bold" : "normal";
		     var weight2 = _this.isCurrentUserMemberOfTeam(t2)? "bold" : "normal";
		     var color1 = (t1.result == "BYE" || t2 == null) ? "purple" : ((t1.result == "WIN") ? "green" : ((t1.result == "LOSE") ? "red" : "orange"));
		     var color2 = (t1.result == "BYE" || t2 == null) ? "purple" : ((t2.result == "WIN") ? "green" : ((t2.result == "LOSE") ? "red" : "orange"));

	             let tr = $("<tr class='scrollRow' height='38px'>");
	             tr.append('<td>' + (index+1) + '</td>');
                     tr.append('<td data-l10n-id="app.group.status.'+match.status.toLowerCase()+'">' + match.status + '</td>');

                     tr.append('<td style="text-align: left; font-weight: ' + weight1 + '">' + t1.teamName + '</td>');
		     if(!isFinished) {
		       tr.append('<td colspan="2" align="center" style="padding-right: 0px"><span style="text-align: left;  background-color: '+color1+'; border-top-left-radius: 8px;  border-bottom-left-radius: 8px; border-top-right-radius: 8px; border-bottom-right-radius: 8px;  padding: 5px; text-wrap: nowrap;" data-l10n-id="app.group.status.not_finished">In progress</span></td>');
		     } else {
		       tr.append('<td align="right" style="padding-right: 0px">' + ((!isFinished)? '' : '<span style="text-align: left;  background-color: '+color1+'; border-top-left-radius: 8px;  border-bottom-left-radius: 8px;  padding: 5px">(+'+t1.points+')</span>') + '</td>');
                       tr.append('<td style="padding-right: 0px">' + ((!isFinished || t2 == null) ? '' : '<span style="text-align: right; background-color: '+color2+'; border-top-right-radius: 8px; border-bottom-right-radius: 8px; padding: 5px">(+' + t2.points + ')</span>') + '</td>');
		     }
                     tr.append('<td style="text-align: right; font-weight: ' + weight2 + '">' + ((t2 != null) ? t2.teamName : '') + '</td>');

		     var joinButton = '';
		     var gid = null;
		     let playerSlot = -1;
		     if(match.group != null) {
			 match.group.members.forEach(function(member) {
				       if(member.user == app.lobby.wgsclient.user) {
					       playerSlot = member.slot;
				       }
			 });
		         if(playerSlot != -1) {
		             joinButton = '<button style="margin-left: 10px" onclick="javascript:app.lobby.exitGame(false); app.lobby.reserve_group_slot(' + "'" +  _this.selected.appId + "','" + match.group.gid + "'," + playerSlot + '); return false;" data-l10n-id="app.group.play">Play</button>';
		         } else {
		             joinButton = '<button style="margin-left: 10px" onclick="javascript:app.lobby.exitGame(false); app.lobby.view_group(' + "'" + _this.selected.appId + "','" + match.group.gid + "');" + ' return false;" data-l10n-id="app.group.view">View</button>';
			 }
		     }

                     tr.append('<td align="center">' + joinButton + '</td>');
	             tableBody.append(tr);
		});
	    }


	    $("#tournament_summary_info").hide();
	    $("#tournament_details_info").show();
    },

    showTournamentSummary: function() {
	    let _this = this;
	    // TODO
	    _this.clearTournamentRoundsDetails();
            let tableBody = $("#tournament_summary_info tbody");
            if(_this.selected == null || _this.selected.teams == null || _this.selected.teams.length == 0) {
                let tr = $("<tr>");
                tr.append("<td colspan='2'>No data</td>");
                tableBody.append(tr);
            } else {
		let tableHead = $("#tournament_summary_info thead tr");
                _this.selected.rounds.forEach(function(round, index) {
			tableHead.append($('<th width="40" style="text-align: center">R' + (index+1) + '</th>'));
		});
		tableHead.append($('<th width="80" style="text-align: center">TOTAL</th>'));

                _this.selected.teams.forEach(function(team, index) {
		        var weight = _this.isCurrentUserMemberOfTeam(team)? "bold" : "normal";
			var tr = $("<tr class='scrollRow'>");
			tr.append('<td align="center">' + (index+1) + '</td>');
			tr.append('<td style="font-weight: ' + weight + '">' + team.teamName + '</td>');
                        _this.selected.rounds.forEach(function(round) {
			    let found = false;
			    round.matches.forEach(function(match) {
				match.teams.forEach(function(matchTeam) {
				    if(matchTeam.teamId == team.teamId) {
					    found = true;
		                            var color = (matchTeam.result == "BYE") ? "purple" : ((matchTeam.result == "WIN") ? "green" : ((matchTeam.result == "LOSE") ? "red" : "orange"));
					    tr.append('<td align="center"><span style="color: ' + color + '">'+ ((match.status.toLowerCase()=="finished")? matchTeam.points : '-') +'</span></td>');
				    }
				});
			    });
		            if(!found) {
				    tr.append('<td align="center">-</td>');
			    }
			});
			tr.append('<td style="font-weight: bold" align="center">' + team.points + '</td>');
			tableBody.append(tr);
		});
	    }

	    $("#tournament_details_info").hide();
	    $("#tournament_summary_info").show();
    },
    
};
