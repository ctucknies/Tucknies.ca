import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeftIcon,
  ArrowsRightLeftIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { secureApiCall } from '../utils/security';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Auth from './Auth';

function TradeFinder({ onBack, onShowPlayerStats, onShowTeamModal }) {
  const { user } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!user) {
      setShowAuth(true);
    }
  }, [user]);

  // Don't render main content if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-blue-900/20">
        <div className="max-w-7xl mx-auto p-6 sm:p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={onBack}
                className="w-12 h-12 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-xl border border-gray-200/50 dark:border-gray-700/50 flex items-center justify-center hover:bg-white dark:hover:bg-gray-800 transition-all duration-200 shadow-lg"
              >
                <ArrowLeftIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              </button>
              <div>
                <h1 className="text-4xl font-black bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-white dark:via-gray-100 dark:to-white bg-clip-text text-transparent">
                  Trade Finder
                </h1>
                <p className="text-lg text-gray-500 dark:text-gray-400 font-medium">
                  Please log in to access the Trade Finder
                </p>
              </div>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-8 text-center shadow-lg"
          >
            <h2 className="text-xl font-bold mb-4">Authentication Required</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              You need to be logged in to use the Trade Finder feature.
            </p>
            <button
              onClick={() => setShowAuth(true)}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Log In
            </button>
          </motion.div>
        </div>
        
        {/* Auth Modal */}
        {showAuth && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200] p-2 sm:p-4"
            onClick={() => setShowAuth(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowAuth(false)}
                className="absolute top-4 right-4 z-10 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 bg-white dark:bg-gray-800 rounded-full p-2"
              >
                ✕
              </button>
              <Auth />
            </motion.div>
          </motion.div>
        )}
      </div>
    );
  }
  const [selectedLeague, setSelectedLeague] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [userLeagues, setUserLeagues] = useState([]);
  const [loadingLeagues, setLoadingLeagues] = useState(false);
  const [leagueData, setLeagueData] = useState(null);
  const [rosters, setRosters] = useState([]);
  const [allPlayers, setAllPlayers] = useState({});
  const [playerStats, setPlayerStats] = useState({});
  const [tradeMatches, setTradeMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [teamStrengths, setTeamStrengths] = useState({});
  const [userTeamName, setUserTeamName] = useState('');


  useEffect(() => {
    loadAllPlayers();
    if (user) {
      loadUserLeagues(selectedYear);
    }
  }, [user, selectedYear]);

  useEffect(() => {
    loadPlayerStats(selectedYear);
  }, [selectedYear]);

  const loadAllPlayers = async () => {
    try {
      const response = await secureApiCall('https://api.sleeper.app/v1/players/nfl');
      const players = await response.json();
      setAllPlayers(players);
    } catch (err) {
      console.error('Error loading players:', err);
    }
  };

  const loadPlayerStats = async (year = selectedYear) => {
    try {
      const response = await secureApiCall(`https://api.sleeper.app/v1/stats/nfl/regular/${year}`);
      const stats = await response.json();
      setPlayerStats(stats);
    } catch (err) {
      console.error('Error loading player stats:', err);
    }
  };

  const loadUserLeagues = async (year = selectedYear) => {
    setLoadingLeagues(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('sleeper_username')
        .eq('id', user.id)
        .single();
      
      if (data?.sleeper_username) {
        const userResponse = await secureApiCall(`https://api.sleeper.app/v1/user/${data.sleeper_username}`);
        const userData = await userResponse.json();
        
        const leaguesResponse = await secureApiCall(`https://api.sleeper.app/v1/user/${userData.user_id}/leagues/nfl/${year}`);
        const leagues = await leaguesResponse.json();
        
        setUserLeagues(leagues.map(league => ({
          id: league.league_id,
          name: league.name,
          total_rosters: league.total_rosters
        })));
      }
    } catch (err) {
      console.error('Error loading leagues:', err);
    } finally {
      setLoadingLeagues(false);
    }
  };

  const analyzeLeague = async () => {
    if (!selectedLeague) return;
    
    setLoading(true);
    try {
      const leagueResponse = await secureApiCall(`https://api.sleeper.app/v1/league/${selectedLeague}`);
      const league = await leagueResponse.json();
      setLeagueData(league);

      const rostersResponse = await secureApiCall(`https://api.sleeper.app/v1/league/${selectedLeague}/rosters`);
      const rostersData = await rostersResponse.json();
      setRosters(rostersData);

      const usersResponse = await secureApiCall(`https://api.sleeper.app/v1/league/${selectedLeague}/users`);
      const users = await usersResponse.json();

      // Get current user's Sleeper username
      const { data: profileData } = await supabase
        .from('profiles')
        .select('sleeper_username')
        .eq('id', user.id)
        .single();

      const rosterWithUsers = rostersData.map(roster => {
        const rosterUser = users.find(u => u.user_id === roster.owner_id);
        return { ...roster, user: rosterUser };
      });

      // Find user's team name
      const userRoster = rosterWithUsers.find(roster => 
        roster.user?.username === profileData?.sleeper_username ||
        roster.user?.display_name === profileData?.sleeper_username
      );
      
      if (userRoster) {
        setUserTeamName(userRoster.user?.display_name || `Team ${userRoster.roster_id}`);
      }

      const strengths = calculateTeamStrengths(rosterWithUsers);
      setTeamStrengths(strengths);
      
      const matches = findTradeMatches(strengths, rosterWithUsers);
      setTradeMatches(matches);
    } catch (err) {
      console.error('Error analyzing league:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateTeamStrengths = (rosters) => {
    const teamStrengths = {};
    const allStrengths = { QB: [], RB: [], WR: [], TE: [] };

    rosters.forEach(roster => {
      const players = (roster.players || []).map(playerId => {
        const stats = playerStats[playerId];
        const totalPoints = stats?.pts_ppr || 0;
        const gamesPlayed = stats?.gp || 1;
        return {
          id: playerId,
          ...allPlayers[playerId],
          fantasyPoints: totalPoints / gamesPlayed
        };
      }).filter(p => p.position);

      const qbs = players.filter(p => p.position === 'QB').sort((a, b) => b.fantasyPoints - a.fantasyPoints);
      const rbs = players.filter(p => p.position === 'RB').sort((a, b) => b.fantasyPoints - a.fantasyPoints);
      const wrs = players.filter(p => p.position === 'WR').sort((a, b) => b.fantasyPoints - a.fantasyPoints);
      const tes = players.filter(p => p.position === 'TE').sort((a, b) => b.fantasyPoints - a.fantasyPoints);

      const qbStrength = qbs[0]?.fantasyPoints || 0;
      const rbStrength = rbs.slice(0, 3).reduce((sum, p) => sum + p.fantasyPoints, 0) / 3;
      const wrStrength = wrs.slice(0, 4).reduce((sum, p) => sum + p.fantasyPoints, 0) / 4;
      const teStrength = tes[0]?.fantasyPoints || 0;

      teamStrengths[roster.roster_id] = {
        rosterId: roster.roster_id,
        teamName: roster.user?.display_name || `Team ${roster.roster_id}`,
        QB: qbStrength,
        RB: rbStrength,
        WR: wrStrength,
        TE: teStrength,
        players: { qbs, rbs, wrs, tes }
      };

      allStrengths.QB.push(qbStrength);
      allStrengths.RB.push(rbStrength);
      allStrengths.WR.push(wrStrength);
      allStrengths.TE.push(teStrength);
    });

    // Calculate averages and standard deviations
    const stats = {};
    ['QB', 'RB', 'WR', 'TE'].forEach(pos => {
      const values = allStrengths[pos];
      const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);
      
      stats[pos] = { avg, stdDev };
    });

    // Tag surplus/deficit teams
    Object.values(teamStrengths).forEach(team => {
      ['QB', 'RB', 'WR', 'TE'].forEach(pos => {
        const { avg, stdDev } = stats[pos];
        if (team[pos] > avg + stdDev) {
          team[`${pos}_status`] = 'surplus';
        } else if (team[pos] < avg - stdDev) {
          team[`${pos}_status`] = 'deficit';
        } else {
          team[`${pos}_status`] = 'balanced';
        }
      });
    });

    return teamStrengths;
  };

  const findTradeMatches = (strengths, rosters) => {
    const matches = [];
    const teams = Object.values(strengths);
    
    // Only show trades involving the user's team
    if (!userTeamName) return matches;

    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const team1 = teams[i];
        const team2 = teams[j];
        
        // Skip if neither team is the user's team
        if (team1.teamName !== userTeamName && team2.teamName !== userTeamName) {
          continue;
        }

        const positions = ['QB', 'RB', 'WR', 'TE'];
        const positionScarcity = { QB: 1.1, RB: 1.0, WR: 0.9, TE: 0.85 };
        
        // 1-for-1 trades - ensure at least one surplus involved
        for (const pos1 of positions) {
          for (const pos2 of positions) {
            // Skip same position trades
            if (pos1 === pos2) continue;
            
            // Team1 surplus -> Team2 deficit/balanced (but not balanced -> balanced)
            if (team1[`${pos1}_status`] === 'surplus' && 
                (team2[`${pos2}_status`] === 'deficit' || team2[`${pos2}_status`] === 'balanced') &&
                (team2[`${pos1}_status`] === 'deficit' || team2[`${pos1}_status`] === 'balanced') && 
                team1[`${pos2}_status`] === 'surplus') {
              
              const trade = generate1for1Trade(team1, team2, pos1, pos2);
              if (trade) {
                matches.push(trade);
              }
            }
            
            // Team1 surplus -> Team2 deficit/balanced (direct position)
            if (team1[`${pos1}_status`] === 'surplus' && 
                (team2[`${pos1}_status`] === 'deficit' || team2[`${pos1}_status`] === 'balanced')) {
              
              const trade = generate1for1Trade(team1, team2, pos1, pos2);
              if (trade) {
                matches.push(trade);
              }
            }
          }
        }

        // 2-for-1 trades - ensure surplus involved
        for (const pos1 of positions) {
          for (const pos2 of positions) {
            for (const pos3 of positions) {
              // Team1 gives 2 surplus, Team2 gives 1 surplus/balanced
              if (team1[`${pos1}_status`] === 'surplus' && team1[`${pos2}_status`] === 'surplus' &&
                  (team2[`${pos3}_status`] === 'surplus' || team2[`${pos3}_status`] === 'balanced')) {
                
                const trade = generate2for1Trade(team1, team2, [pos1, pos2], pos3);
                if (trade) {
                  matches.push(trade);
                }
              }
              
              // Team2 gives 2 surplus, Team1 gives 1 surplus/balanced
              if (team2[`${pos1}_status`] === 'surplus' && team2[`${pos2}_status`] === 'surplus' &&
                  (team1[`${pos3}_status`] === 'surplus' || team1[`${pos3}_status`] === 'balanced')) {
                
                const trade = generate2for1Trade(team2, team1, [pos1, pos2], pos3);
                if (trade) {
                  matches.push(trade);
                }
              }
            }
          }
        }
      }
    }

    // Sort by trade quality: surplus->deficit first, then surplus->balanced
    const sortedMatches = matches.sort((a, b) => {
      const aScore = getTradeScore(a);
      const bScore = getTradeScore(b);
      return bScore - aScore; // Higher score first
    });
    
    return sortedMatches.slice(0, 15);
  };

  const getTradeScore = (trade) => {
    let score = 0;
    
    // Check if any position involves surplus->deficit (highest priority)
    const team1Positions = trade.team1Gives.map(g => g.position);
    const team2Positions = trade.team2Gives.map(g => g.position);
    
    const team1Data = Object.values(teamStrengths).find(t => t.teamName === trade.team1);
    const team2Data = Object.values(teamStrengths).find(t => t.teamName === trade.team2);
    
    if (team1Data && team2Data) {
      team1Positions.forEach(pos => {
        if (team1Data[`${pos}_status`] === 'surplus' && team2Data[`${pos}_status`] === 'deficit') {
          score += 10; // Surplus to deficit = best
        } else if (team1Data[`${pos}_status`] === 'surplus' && team2Data[`${pos}_status`] === 'balanced') {
          score += 5; // Surplus to balanced = good
        }
      });
      
      team2Positions.forEach(pos => {
        if (team2Data[`${pos}_status`] === 'surplus' && team1Data[`${pos}_status`] === 'deficit') {
          score += 10; // Surplus to deficit = best
        } else if (team2Data[`${pos}_status`] === 'surplus' && team1Data[`${pos}_status`] === 'balanced') {
          score += 5; // Surplus to balanced = good
        }
      });
    }
    
    // Bonus for lower value difference (more fair trades)
    score += Math.max(0, 5 - trade.valueDifference);
    
    return score;
  };

  const handlePlayerClick = (player) => {
    if (onShowPlayerStats) {
      onShowPlayerStats(player.player_id || player.id, player.full_name, selectedYear);
    }
  };

  const handleTeamClick = (teamName) => {
    const team = Object.values(teamStrengths).find(t => t.teamName === teamName);
    if (team && onShowTeamModal) {
      const teamData = {
        ...team,
        season: selectedYear,
        rosterWithStats: [...(team.players.qbs || []), ...(team.players.rbs || []), ...(team.players.wrs || []), ...(team.players.tes || [])]
      };
      onShowTeamModal(teamData);
    }
  };

  const getPositionScarcity = (position) => {
    const scarcity = { QB: 0.8075, RB: 1.0, WR: 0.9, TE: 0.85 };
    return scarcity[position] || 1.0;
  };

  const generate1for1Trade = (team1, team2, pos1, pos2) => {
    const team1Players = team1.players[pos1.toLowerCase() + 's'] || [];
    const team2Players = team2.players[pos2.toLowerCase() + 's'] || [];

    if (team1Players.length === 0 || team2Players.length === 0) return null;

    const team1Player = team1Players[0];
    const team2Player = team2Players[0];

    const team1Value = team1Player.fantasyPoints * getPositionScarcity(pos1);
    const team2Value = team2Player.fantasyPoints * getPositionScarcity(pos2);
    const valueDiff = Math.abs(team1Value - team2Value);
    
    // Only suggest if within 2 pts/wk after scarcity adjustment
    if (valueDiff > 2) return null;

    return {
      type: '1-for-1',
      team1: team1.teamName,
      team2: team2.teamName,
      team1Gives: [{ player: team1Player, position: pos1, adjustedValue: team1Value }],
      team2Gives: [{ player: team2Player, position: pos2, adjustedValue: team2Value }],
      valueDifference: valueDiff,
      fairness: 'Fair'
    };
  };

  const generate2for1Trade = (givingTeam, receivingTeam, givingPositions, receivingPosition) => {
    const player1 = givingTeam.players[givingPositions[0].toLowerCase() + 's']?.[0];
    const player2 = givingTeam.players[givingPositions[1].toLowerCase() + 's']?.[1] || 
                   givingTeam.players[givingPositions[1].toLowerCase() + 's']?.[0];
    const receivingPlayer = receivingTeam.players[receivingPosition.toLowerCase() + 's']?.[0];
    
    if (!player1 || !player2 || !receivingPlayer) return null;

    // Get worst player from receiving team for roster spot value
    const allReceivingPlayers = [...(receivingTeam.players.qbs || []), 
                               ...(receivingTeam.players.rbs || []), 
                               ...(receivingTeam.players.wrs || []),
                               ...(receivingTeam.players.tes || [])]
                               .sort((a, b) => a.fantasyPoints - b.fantasyPoints);
    const worstPlayer = allReceivingPlayers[0];
    const rosterSpotValue = (worstPlayer?.fantasyPoints || 0) * getPositionScarcity(worstPlayer?.position || 'WR');

    const givingValue = (player1.fantasyPoints * getPositionScarcity(givingPositions[0])) + 
                       (player2.fantasyPoints * getPositionScarcity(givingPositions[1]));
    const receivingValue = (receivingPlayer.fantasyPoints * getPositionScarcity(receivingPosition)) - rosterSpotValue;
    const valueDiff = Math.abs(givingValue - receivingValue);
    
    // Check fairness: giving team should get +4 pts extra, or receiving team gets 1 pt less
    const isGivingFair = (receivingValue - givingValue) >= 4 || (givingValue - receivingValue) <= 1;
    if (!isGivingFair) return null;

    return {
      type: '2-for-1',
      team1: givingTeam.teamName,
      team2: receivingTeam.teamName,
      team1Gives: [
        { player: player1, position: givingPositions[0], adjustedValue: player1.fantasyPoints * getPositionScarcity(givingPositions[0]) },
        { player: player2, position: givingPositions[1], adjustedValue: player2.fantasyPoints * getPositionScarcity(givingPositions[1]) }
      ],
      team2Gives: [{ player: receivingPlayer, position: receivingPosition, adjustedValue: receivingPlayer.fantasyPoints * getPositionScarcity(receivingPosition) }],
      valueDifference: valueDiff,
      rosterSpotValue,
      fairness: valueDiff <= 1 ? 'Fair' : valueDiff <= 4 ? 'Good' : 'Moderate'
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-blue-900/20">
      <div className="max-w-7xl mx-auto p-6 sm:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={onBack}
              className="w-12 h-12 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-xl border border-gray-200/50 dark:border-gray-700/50 flex items-center justify-center hover:bg-white dark:hover:bg-gray-800 transition-all duration-200 shadow-lg"
            >
              <ArrowLeftIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </button>
            <div>
              <h1 className="text-4xl font-black bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-white dark:via-gray-100 dark:to-white bg-clip-text text-transparent">
                Trade Finder
              </h1>
              <p className="text-lg text-gray-500 dark:text-gray-400 font-medium">
                Find optimal trades based on team strengths and deficits
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 mb-8 shadow-lg"
        >
          <h2 className="text-xl font-bold mb-4">Select League & Year</h2>
          <div className="flex gap-4 items-end">
            <div className="w-32">
              <label className="block text-sm font-medium mb-2">Year</label>
              <select
                value={selectedYear}
                onChange={(e) => {
                  const year = parseInt(e.target.value);
                  setSelectedYear(year);
                  setSelectedLeague('');
                  setLeagueData(null);
                  setRosters([]);
                  setTeamStrengths({});
                  setTradeMatches([]);
                }}
                className="w-full p-3 border rounded-lg bg-white dark:bg-gray-700"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Your Leagues</label>
              <select
                value={selectedLeague}
                onChange={(e) => setSelectedLeague(e.target.value)}
                className="w-full p-3 border rounded-lg bg-white dark:bg-gray-700"
                disabled={loadingLeagues}
              >
                <option value="">Select a league...</option>
                {userLeagues.map(league => (
                  <option key={league.id} value={league.id}>
                    {league.name} ({league.total_rosters} teams)
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={analyzeLeague}
              disabled={!selectedLeague || loading}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Analyzing...' : 'Find Trades'}
            </button>
          </div>
        </motion.div>

        {Object.keys(teamStrengths).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 mb-8 shadow-lg"
          >
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <ChartBarIcon className="w-5 h-5" />
              Team Strengths Analysis
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.values(teamStrengths).map(team => (
                <div key={team.rosterId} className="p-4 border rounded-lg">
                  <button
                    onClick={() => handleTeamClick(team.teamName)}
                    className="font-semibold mb-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    {team.teamName}
                  </button>
                  <div className="space-y-1 text-sm">
                    {['QB', 'RB', 'WR', 'TE'].map(pos => (
                      <div key={pos} className="flex justify-between items-center">
                        <span>{pos}:</span>
                        <div className="flex items-center gap-2">
                          <span>{team[pos].toFixed(1)}</span>
                          <span className={`px-2 py-1 rounded text-xs ${
                            team[`${pos}_status`] === 'surplus' ? 'bg-green-100 text-green-800' :
                            team[`${pos}_status`] === 'deficit' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {team[`${pos}_status`]}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {tradeMatches.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-lg"
          >
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <ArrowsRightLeftIcon className="w-5 h-5" />
              Recommended Trades ({tradeMatches.length})
            </h2>
            <div className="space-y-4">
              {tradeMatches.map((trade, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => handleTeamClick(trade.team1)}
                        className="font-semibold hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        {trade.team1}
                      </button>
                      <ArrowsRightLeftIcon className="w-4 h-4 text-gray-400" />
                      <button 
                        onClick={() => handleTeamClick(trade.team2)}
                        className="font-semibold hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        {trade.team2}
                      </button>
                      <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                        {trade.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {trade.fairness === 'Fair' && <CheckCircleIcon className="w-4 h-4 text-green-500" />}
                      {trade.fairness === 'Moderate' && <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500" />}
                      {trade.fairness === 'Unbalanced' && <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />}
                      <span className={`text-sm px-2 py-1 rounded ${
                        trade.fairness === 'Fair' ? 'bg-green-100 text-green-800' :
                        trade.fairness === 'Moderate' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {trade.fairness}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">{trade.team1} gives:</span>
                      <div className="mt-1 space-y-1">
                        {trade.team1Gives.map((give, idx) => (
                          <div key={idx}>
                            <button
                              onClick={() => handlePlayerClick(give.player)}
                              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium"
                            >
                              {give.player.full_name}
                            </button>
                            <span className="text-gray-600 ml-1">({give.position})</span>
                            <div className="text-gray-500">
                              {give.player.fantasyPoints.toFixed(1)} pts/wk
                              {give.adjustedValue && (
                                <span className="text-blue-600 ml-1">({give.adjustedValue.toFixed(1)} adj)</span>
                              )}
                            </div>
                          </div>
                        ))}
                        {trade.team1Gives.length > 1 && (
                          <div className="text-xs text-blue-600 font-medium">
                            Total: {trade.team1Gives.reduce((sum, g) => sum + g.player.fantasyPoints, 0).toFixed(1)} pts/wk
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium">{trade.team2} gives:</span>
                      <div className="mt-1 space-y-1">
                        {trade.team2Gives.map((give, idx) => (
                          <div key={idx}>
                            <button
                              onClick={() => handlePlayerClick(give.player)}
                              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium"
                            >
                              {give.player.full_name}
                            </button>
                            <span className="text-gray-600 ml-1">({give.position})</span>
                            <div className="text-gray-500">
                              {give.player.fantasyPoints.toFixed(1)} pts/wk
                              {give.adjustedValue && (
                                <span className="text-blue-600 ml-1">({give.adjustedValue.toFixed(1)} adj)</span>
                              )}
                            </div>
                          </div>
                        ))}
                        {trade.type === '2-for-1' && (
                          <div className="text-xs text-orange-600">
                            Roster spot value: -{trade.rosterSpotValue.toFixed(1)} pts/wk
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    Value difference: {trade.valueDifference.toFixed(1)} pts/wk
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {tradeMatches.length === 0 && Object.keys(teamStrengths).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-lg text-center"
          >
            <h2 className="text-xl font-bold mb-2">No Trade Matches Found</h2>
            <p className="text-gray-500">
              No complementary surplus/deficit matches were found in this league.
            </p>
          </motion.div>
        )}
      </div>


    </div>
  );
}

export default TradeFinder;