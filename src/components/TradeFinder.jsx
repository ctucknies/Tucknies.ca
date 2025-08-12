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
import PositionPlayersModal from './PositionPlayersModal';
import TradeCrafterModal from './TradeCrafterModal';

function TradeFinder({ onBack, onShowPlayerStats, onShowTeamModal, onShowAuth, onShowProfile }) {
  const { user } = useAuth();
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
  const [showPositionModal, setShowPositionModal] = useState(false);
  const [selectedPositionData, setSelectedPositionData] = useState(null);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [positionWeights, setPositionWeights] = useState({ QB: 0.625, RB: 1.0, WR: 0.95, TE: 1.05 });
  const defaultWeights = { QB: 0.625, RB: 1.0, WR: 0.95, TE: 1.05 };
  const [showTradeCrafter, setShowTradeCrafter] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [hasSleeperUsername, setHasSleeperUsername] = useState(false);

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
        setHasSleeperUsername(true);
        const userResponse = await secureApiCall(`https://api.sleeper.app/v1/user/${data.sleeper_username}`);
        const userData = await userResponse.json();
        
        const leaguesResponse = await secureApiCall(`https://api.sleeper.app/v1/user/${userData.user_id}/leagues/nfl/${year}`);
        const leagues = await leaguesResponse.json();
        
        setUserLeagues(leagues.map(league => ({
          id: league.league_id,
          name: league.name,
          total_rosters: league.total_rosters
        })));
      } else {
        setHasSleeperUsername(false);
      }
    } catch (err) {
      console.error('Error loading leagues:', err);
      setHasSleeperUsername(false);
    } finally {
      setLoadingLeagues(false);
    }
  };

  useEffect(() => {
    loadAllPlayers();
    if (user) {
      loadUserLeagues(selectedYear);
    }
  }, [user, selectedYear]);

  useEffect(() => {
    loadPlayerStats(selectedYear);
  }, [selectedYear]);

  // Don't render main content if not authenticated or no sleeper username
  if (!user || !hasSleeperUsername) {
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
                  {!user ? 'Please log in to access the Trade Finder' : 'Please add your Sleeper username to access the Trade Finder'}
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
            <h2 className="text-xl font-bold mb-4">{!user ? 'Authentication Required' : 'Sleeper Username Required'}</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {!user 
                ? 'You need to be logged in to use the Trade Finder feature.'
                : 'You need to add your Sleeper username in your profile to use this feature.'}
            </p>
            <button
              onClick={() => {
                if (!user && onShowAuth) {
                  onShowAuth();
                } else if (onShowProfile) {
                  onShowProfile();
                } else {
                  onBack();
                }
              }}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              {!user ? 'Go Back to Sign In' : 'Add Sleeper Username'}
            </button>
          </motion.div>
        </div>
        

      </div>
    );
  }

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
    const seenTrades = new Set();
    const teams = Object.values(strengths);
    
    // Only show trades involving the user's team
    if (!userTeamName) return matches;

    const createTradeSignature = (trade) => {
      const team1Players = trade.team1Gives.map(g => g.player.id).sort().join(',');
      const team2Players = trade.team2Gives.map(g => g.player.id).sort().join(',');
      return `${trade.team1}-${trade.team2}-${team1Players}-${team2Players}`;
    };

    const addTradeIfUnique = (trade) => {
      if (trade) {
        const signature = createTradeSignature(trade);
        if (!seenTrades.has(signature)) {
          seenTrades.add(signature);
          matches.push(trade);
        }
      }
    };

    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const team1 = teams[i];
        const team2 = teams[j];
        
        // Skip if neither team is the user's team
        if (team1.teamName !== userTeamName && team2.teamName !== userTeamName) {
          continue;
        }

        const positions = ['QB', 'RB', 'WR', 'TE'];
        const positionScarcity = { QB: .9, RB: 1.0, WR: 0.9, TE: 1.05 };
        
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
              addTradeIfUnique(trade);
            }
            
            // Team1 surplus -> Team2 deficit/balanced (direct position)
            if (team1[`${pos1}_status`] === 'surplus' && 
                (team2[`${pos1}_status`] === 'deficit' || team2[`${pos1}_status`] === 'balanced')) {
              
              const trade = generate1for1Trade(team1, team2, pos1, pos2);
              addTradeIfUnique(trade);
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
                addTradeIfUnique(trade);
              }
              
              // Team2 gives 2 surplus, Team1 gives 1 surplus/balanced
              if (team2[`${pos1}_status`] === 'surplus' && team2[`${pos2}_status`] === 'surplus' &&
                  (team1[`${pos3}_status`] === 'surplus' || team1[`${pos3}_status`] === 'balanced')) {
                
                const trade = generate2for1Trade(team2, team1, [pos1, pos2], pos3);
                addTradeIfUnique(trade);
              }
            }
          }
        }

        // 3-for-2 trades
        for (const pos1 of positions) {
          for (const pos2 of positions) {
            for (const pos3 of positions) {
              for (const pos4 of positions) {
                for (const pos5 of positions) {
                  // Team1 gives 3, Team2 gives 2
                  if (team1[`${pos1}_status`] === 'surplus' && team1[`${pos2}_status`] === 'surplus' &&
                      (team2[`${pos4}_status`] === 'surplus' || team2[`${pos4}_status`] === 'balanced') &&
                      (team2[`${pos5}_status`] === 'surplus' || team2[`${pos5}_status`] === 'balanced')) {
                    
                    const trade = generate3for2Trade(team1, team2, [pos1, pos2, pos3], [pos4, pos5]);
                    addTradeIfUnique(trade);
                  }
                  
                  // Team2 gives 3, Team1 gives 2
                  if (team2[`${pos1}_status`] === 'surplus' && team2[`${pos2}_status`] === 'surplus' &&
                      (team1[`${pos4}_status`] === 'surplus' || team1[`${pos4}_status`] === 'balanced') &&
                      (team1[`${pos5}_status`] === 'surplus' || team1[`${pos5}_status`] === 'balanced')) {
                    
                    const trade = generate3for2Trade(team2, team1, [pos1, pos2, pos3], [pos4, pos5]);
                    addTradeIfUnique(trade);
                  }
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

  const handleTeamClick = async (teamName) => {
    const team = Object.values(teamStrengths).find(t => t.teamName === teamName);
    if (team && onShowTeamModal && selectedLeague) {
      try {
        const usersResponse = await secureApiCall(`https://api.sleeper.app/v1/league/${selectedLeague}/users`);
        const users = await usersResponse.json();
        const rostersResponse = await secureApiCall(`https://api.sleeper.app/v1/league/${selectedLeague}/rosters`);
        const rosters = await rostersResponse.json();
        
        const roster = rosters.find(r => r.roster_id === team.rosterId);
        const user = users.find(u => u.user_id === roster?.owner_id);
        
        if (user) {
          const actualUsername = user.display_name || user.username;
          onShowTeamModal(actualUsername, selectedLeague, selectedYear);
        }
      } catch (err) {
        console.error('Error fetching team data:', err);
      }
    }
  };

  const handlePositionClick = (team, position) => {
    const positionPlayers = team.players[position.toLowerCase() + 's'] || [];
    
    // Calculate score explanation based on position
    let scoreCalculation = '';
    if (position === 'QB' || position === 'TE') {
      scoreCalculation = `Score based on top ${position} player's average fantasy points per game.`;
    } else if (position === 'RB') {
      scoreCalculation = 'Score based on average fantasy points of top 3 RB players per game.';
    } else if (position === 'WR') {
      scoreCalculation = 'Score based on average fantasy points of top 4 WR players per game.';
    }
    
    setSelectedPositionData({
      position,
      players: positionPlayers,
      teamName: team.teamName,
      positionScore: team[position],
      scoreCalculation
    });
    setShowPositionModal(true);
  };

  const closePositionModal = () => {
    setShowPositionModal(false);
    setSelectedPositionData(null);
  };

  const handleTradeClick = (trade) => {
    setSelectedTrade(trade);
    setShowTradeCrafter(true);
  };

  const closeTradeCrafter = () => {
    setShowTradeCrafter(false);
    setSelectedTrade(null);
  };

  const getPositionScarcity = (position) => {
    return positionWeights[position] || 1.0;
  };

  const findLikelyDroppedPlayer = (team) => {
    const allPlayers = [];
    ['QB', 'RB', 'WR', 'TE'].forEach(pos => {
      const players = team.players[pos.toLowerCase() + 's'] || [];
      players.forEach(player => {
        allPlayers.push({ ...player, position: pos, adjustedValue: player.fantasyPoints * getPositionScarcity(pos) });
      });
    });
    
    // Sort by adjusted value and return the lowest
    allPlayers.sort((a, b) => a.adjustedValue - b.adjustedValue);
    return allPlayers[0] || null;
  };

  const calculateBestPlayerBonus = (team1Gives, team2Gives, tradeType = '1-for-1') => {
    const allPlayers = [...team1Gives, ...team2Gives];
    const bestPlayer = allPlayers.reduce((best, current) => 
      current.adjustedValue > best.adjustedValue ? current : best
    );
    
    const bonusValue = tradeType === '1-for-1' ? 1.0 : 3.0;
    const team1HasBest = team1Gives.some(give => give.player.id === bestPlayer.player.id);
    return {
      team1Bonus: team1HasBest ? bonusValue : 0,
      team2Bonus: team1HasBest ? 0 : bonusValue,
      bestPlayer: bestPlayer.player,
      bonusValue
    };
  };

  const resetWeights = () => {
    setPositionWeights({ ...defaultWeights });
  };

  const updateWeight = (position, value) => {
    setPositionWeights(prev => ({ ...prev, [position]: parseFloat(value) || 0 }));
  };

  const getReplacementValue = (position) => {
    // Replacement level values based on typical waiver wire players
    const replacementValues = { QB: 12, RB: 6, WR: 8, TE: 5 };
    return replacementValues[position] || 0;
  };

  const calculatePositionValue = (players, position) => {
    if (!players || players.length === 0) return getReplacementValue(position);
    
    const sorted = [...players].sort((a, b) => b.fantasyPoints - a.fantasyPoints);
    
    if (position === 'QB' || position === 'TE') {
      return sorted[0]?.fantasyPoints || getReplacementValue(position);
    }
    
    if (position === 'RB') {
      const topPlayers = sorted.slice(0, 3);
      if (topPlayers.length === 0) return getReplacementValue(position);
      const total = topPlayers.reduce((sum, p) => sum + p.fantasyPoints, 0);
      const missing = Math.max(0, 3 - topPlayers.length);
      return (total + (missing * getReplacementValue(position))) / 3;
    }
    
    if (position === 'WR') {
      const topPlayers = sorted.slice(0, 4);
      if (topPlayers.length === 0) return getReplacementValue(position);
      const total = topPlayers.reduce((sum, p) => sum + p.fantasyPoints, 0);
      const missing = Math.max(0, 4 - topPlayers.length);
      return (total + (missing * getReplacementValue(position))) / 4;
    }
    
    return sorted[0]?.fantasyPoints || getReplacementValue(position);
  };

  const simulateTrade = (team1, team2, team1Gives, team2Gives) => {
    // Create new rosters after trade
    const newTeam1Players = { ...team1.players };
    const newTeam2Players = { ...team2.players };
    
    // Remove given players and add received players
    team1Gives.forEach(give => {
      const posKey = give.position.toLowerCase() + 's';
      newTeam1Players[posKey] = newTeam1Players[posKey]?.filter(p => p.id !== give.player.id) || [];
    });
    
    team2Gives.forEach(give => {
      const posKey = give.position.toLowerCase() + 's';
      newTeam1Players[posKey] = [...(newTeam1Players[posKey] || []), give.player];
    });
    
    team2Gives.forEach(give => {
      const posKey = give.position.toLowerCase() + 's';
      newTeam2Players[posKey] = newTeam2Players[posKey]?.filter(p => p.id !== give.player.id) || [];
    });
    
    team1Gives.forEach(give => {
      const posKey = give.position.toLowerCase() + 's';
      newTeam2Players[posKey] = [...(newTeam2Players[posKey] || []), give.player];
    });
    
    // Calculate new position values
    const newTeam1Values = {
      QB: calculatePositionValue(newTeam1Players.qbs, 'QB'),
      RB: calculatePositionValue(newTeam1Players.rbs, 'RB'),
      WR: calculatePositionValue(newTeam1Players.wrs, 'WR'),
      TE: calculatePositionValue(newTeam1Players.tes, 'TE')
    };
    
    const newTeam2Values = {
      QB: calculatePositionValue(newTeam2Players.qbs, 'QB'),
      RB: calculatePositionValue(newTeam2Players.rbs, 'RB'),
      WR: calculatePositionValue(newTeam2Players.wrs, 'WR'),
      TE: calculatePositionValue(newTeam2Players.tes, 'TE')
    };
    
    // Calculate net gains
    const team1NetGain = Object.keys(newTeam1Values).reduce((sum, pos) => 
      sum + (newTeam1Values[pos] - team1[pos]), 0);
    const team2NetGain = Object.keys(newTeam2Values).reduce((sum, pos) => 
      sum + (newTeam2Values[pos] - team2[pos]), 0);
    
    return { team1NetGain, team2NetGain, valid: team1NetGain > 0 && team2NetGain > 0 };
  };

  const generate1for1Trade = (team1, team2, pos1, pos2) => {
    const team1Players = team1.players[pos1.toLowerCase() + 's'] || [];
    const team2Players = team2.players[pos2.toLowerCase() + 's'] || [];

    if (team1Players.length === 0 || team2Players.length === 0) return null;

    const team1Player = team1Players[0];
    const team2Player = team2Players[0];

    const team1Gives = [{ player: team1Player, position: pos1 }];
    const team2Gives = [{ player: team2Player, position: pos2 }];
    
    const simulation = simulateTrade(team1, team2, team1Gives, team2Gives);
    if (!simulation.valid) return null;

    const team1Give = { player: team1Player, position: pos1, adjustedValue: team1Player.fantasyPoints * getPositionScarcity(pos1) };
    const team2Give = { player: team2Player, position: pos2, adjustedValue: team2Player.fantasyPoints * getPositionScarcity(pos2) };
    
    const bonus = calculateBestPlayerBonus([team1Give], [team2Give], '1-for-1');
    const team1Value = team1Give.adjustedValue + bonus.team1Bonus;
    const team2Value = team2Give.adjustedValue + bonus.team2Bonus;
    const valueDiff = Math.abs(team1Value - team2Value);
    
    // If value gap is 2+, try to create a 2-for-1 trade instead
    if (valueDiff >= 2) {
      const lowerValueTeam = team1Value < team2Value ? team1 : team2;
      const higherValueTeam = team1Value < team2Value ? team2 : team1;
      const lowerPos = team1Value < team2Value ? pos1 : pos2;
      const higherPos = team1Value < team2Value ? pos2 : pos1;
      
      // Try to find a second player from lower value team to balance the trade
      const positions = ['QB', 'RB', 'WR', 'TE'];
      for (const addPos of positions) {
        if (addPos === lowerPos) continue;
        const addPlayers = lowerValueTeam.players[addPos.toLowerCase() + 's'] || [];
        if (addPlayers.length > 0) {
          const addPlayer = addPlayers[0];
          const addValue = addPlayer.fantasyPoints * getPositionScarcity(addPos);
          const newCombinedValue = (team1Value < team2Value ? team1Value + addValue : team2Value + addValue);
          const newValueDiff = Math.abs(newCombinedValue - (team1Value < team2Value ? team2Value : team1Value));
          
          if (newValueDiff <= 8 && newCombinedValue >= (team1Value < team2Value ? team2Value : team1Value) * 0.8) {
            return generate2for1Trade(lowerValueTeam, higherValueTeam, [lowerPos, addPos], higherPos);
          }
        }
      }
      
      // If 2-for-1 didn't work, try 3-for-2
      for (const addPos1 of positions) {
        for (const addPos2 of positions) {
          const addPlayers1 = lowerValueTeam.players[addPos1.toLowerCase() + 's'] || [];
          const addPlayers2 = higherValueTeam.players[addPos2.toLowerCase() + 's'] || [];
          if (addPlayers1.length > 0 && addPlayers2.length > 0) {
            const trade = generate3for2Trade(lowerValueTeam, higherValueTeam, [lowerPos, addPos1, addPos1], [higherPos, addPos2]);
            if (trade) {
              return trade;
            }
          }
        }
      }
    }
    
    // Reject trades that are too one-sided (value difference > 6 points for 1-for-1)
    if (valueDiff > 6) return null;
    
    // Always put user's team first
    const isTeam1User = team1.teamName === userTeamName;
    return {
      type: '1-for-1',
      team1: isTeam1User ? team1.teamName : team2.teamName,
      team2: isTeam1User ? team2.teamName : team1.teamName,
      team1Gives: isTeam1User ? [team1Give] : [team2Give],
      team2Gives: isTeam1User ? [team2Give] : [team1Give],
      bestPlayerBonus: bonus,
      valueDifference: valueDiff,
      fairness: valueDiff <= 1 ? 'Fair' : valueDiff <= 1.5 ? 'Good' : 'Moderate'
    };
  };

  const generate2for1Trade = (givingTeam, receivingTeam, givingPositions, receivingPosition) => {
    const usedPlayerIds = new Set();
    
    const player1 = givingTeam.players[givingPositions[0].toLowerCase() + 's']?.[0];
    if (!player1) return null;
    usedPlayerIds.add(player1.id);
    
    const pos2Players = givingTeam.players[givingPositions[1].toLowerCase() + 's'] || [];
    const player2 = pos2Players.find(p => !usedPlayerIds.has(p.id));
    if (!player2) return null;
    usedPlayerIds.add(player2.id);
    
    const receivingPlayers = receivingTeam.players[receivingPosition.toLowerCase() + 's'] || [];
    const receivingPlayer = receivingPlayers.find(p => !usedPlayerIds.has(p.id));
    if (!receivingPlayer) return null;


    const givingTeamGives = [
      { player: player1, position: givingPositions[0] },
      { player: player2, position: givingPositions[1] }
    ];
    const receivingTeamGives = [{ player: receivingPlayer, position: receivingPosition }];
    
    const simulation = simulateTrade(givingTeam, receivingTeam, givingTeamGives, receivingTeamGives);
    if (!simulation.valid) return null;

    const givingTeamGivesWithValues = [
      { player: player1, position: givingPositions[0], adjustedValue: player1.fantasyPoints * getPositionScarcity(givingPositions[0]) },
      { player: player2, position: givingPositions[1], adjustedValue: player2.fantasyPoints * getPositionScarcity(givingPositions[1]) }
    ];
    const receivingTeamGivesWithValues = [{ player: receivingPlayer, position: receivingPosition, adjustedValue: receivingPlayer.fantasyPoints * getPositionScarcity(receivingPosition) }];
    
    const bonus = calculateBestPlayerBonus(givingTeamGivesWithValues, receivingTeamGivesWithValues, '2-for-1');
    const givingValue = givingTeamGivesWithValues.reduce((sum, give) => sum + give.adjustedValue, 0) + bonus.team1Bonus;
    const receivingValue = receivingTeamGivesWithValues.reduce((sum, give) => sum + give.adjustedValue, 0) + bonus.team2Bonus;
    const valueDiff = Math.abs(givingValue - receivingValue);
    
    // Reject trades that are too one-sided (value difference > 8 points)
    if (valueDiff > 8) return null;
    
    // For 2-for-1 trades, the single player should be significantly better
    // The receiving player should be worth at least 80% of the combined giving value
    if (receivingValue < givingValue * 0.8) return null;

    // Find likely dropped player for the team receiving multiple players
    const receivingTeamDropped = findLikelyDroppedPlayer(receivingTeam);
    
    // Always put user's team first
    const isGivingUser = givingTeam.teamName === userTeamName;
    return {
      type: '2-for-1',
      team1: isGivingUser ? givingTeam.teamName : receivingTeam.teamName,
      team2: isGivingUser ? receivingTeam.teamName : givingTeam.teamName,
      team1Gives: isGivingUser ? givingTeamGivesWithValues : receivingTeamGivesWithValues,
      team2Gives: isGivingUser ? receivingTeamGivesWithValues : givingTeamGivesWithValues,
      bestPlayerBonus: bonus,
      likelyDropped: isGivingUser ? null : receivingTeamDropped,
      team2Dropped: isGivingUser ? receivingTeamDropped : null,
      valueDifference: valueDiff,
      fairness: valueDiff <= 2 ? 'Fair' : valueDiff <= 5 ? 'Good' : 'Moderate'
    };
  };

  const generate3for2Trade = (givingTeam, receivingTeam, givingPositions, receivingPositions) => {
    const usedPlayerIds = new Set();
    const givingPlayers = [];
    
    for (let i = 0; i < givingPositions.length; i++) {
      const pos = givingPositions[i];
      const players = givingTeam.players[pos.toLowerCase() + 's'] || [];
      const availablePlayer = players.find(p => !usedPlayerIds.has(p.id));
      if (availablePlayer) {
        givingPlayers.push(availablePlayer);
        usedPlayerIds.add(availablePlayer.id);
      }
    }
    
    const receivingPlayers = [];
    for (let i = 0; i < receivingPositions.length; i++) {
      const pos = receivingPositions[i];
      const players = receivingTeam.players[pos.toLowerCase() + 's'] || [];
      const availablePlayer = players.find(p => !usedPlayerIds.has(p.id));
      if (availablePlayer) {
        receivingPlayers.push(availablePlayer);
        usedPlayerIds.add(availablePlayer.id);
      }
    }
    
    if (givingPlayers.length !== 3 || receivingPlayers.length !== 2) return null;

    const givingTeamGives = givingPlayers.map((player, idx) => ({ player, position: givingPositions[idx] }));
    const receivingTeamGives = receivingPlayers.map((player, idx) => ({ player, position: receivingPositions[idx] }));
    
    const simulation = simulateTrade(givingTeam, receivingTeam, givingTeamGives, receivingTeamGives);
    if (!simulation.valid) return null;

    const givingTeamGivesWithValues = givingPlayers.map((player, idx) => ({ 
      player, 
      position: givingPositions[idx], 
      adjustedValue: player.fantasyPoints * getPositionScarcity(givingPositions[idx]) 
    }));
    const receivingTeamGivesWithValues = receivingPlayers.map((player, idx) => ({ 
      player, 
      position: receivingPositions[idx], 
      adjustedValue: player.fantasyPoints * getPositionScarcity(receivingPositions[idx]) 
    }));
    
    const bonus = calculateBestPlayerBonus(givingTeamGivesWithValues, receivingTeamGivesWithValues, '3-for-2');
    const givingValue = givingTeamGivesWithValues.reduce((sum, give) => sum + give.adjustedValue, 0) + bonus.team1Bonus;
    const receivingValue = receivingTeamGivesWithValues.reduce((sum, give) => sum + give.adjustedValue, 0) + bonus.team2Bonus;
    const valueDiff = Math.abs(givingValue - receivingValue);
    
    if (valueDiff > 10) return null;
    if (receivingValue < givingValue * 0.75) return null;

    // Find likely dropped player for the team receiving more players
    const receivingTeamDropped = findLikelyDroppedPlayer(receivingTeam);
    
    const isGivingUser = givingTeam.teamName === userTeamName;
    return {
      type: '3-for-2',
      team1: isGivingUser ? givingTeam.teamName : receivingTeam.teamName,
      team2: isGivingUser ? receivingTeam.teamName : givingTeam.teamName,
      team1Gives: isGivingUser ? givingTeamGivesWithValues : receivingTeamGivesWithValues,
      team2Gives: isGivingUser ? receivingTeamGivesWithValues : givingTeamGivesWithValues,
      bestPlayerBonus: bonus,
      likelyDropped: isGivingUser ? null : receivingTeamDropped,
      team2Dropped: isGivingUser ? receivingTeamDropped : null,
      valueDifference: valueDiff,
      fairness: valueDiff <= 3 ? 'Fair' : valueDiff <= 6 ? 'Good' : 'Moderate'
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-7xl mx-auto p-6 sm:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={onBack}
              className="w-14 h-14 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all duration-300 shadow-2xl"
            >
              <ArrowLeftIcon className="w-6 h-6 text-white" />
            </button>
            <div>
              <h1 className="text-5xl font-black bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Trade Finder
              </h1>
              <p className="text-xl text-gray-300 font-medium">
                Find optimal trades based on team strengths and deficits
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-8 mb-8 shadow-2xl"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center">
              <ArrowsRightLeftIcon className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">Select League & Year</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-3">Year</label>
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
                className="w-full p-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                  <option key={year} value={year} className="bg-gray-800">{year}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-300 mb-3">Your Leagues</label>
              <select
                value={selectedLeague}
                onChange={(e) => setSelectedLeague(e.target.value)}
                className="w-full p-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                disabled={loadingLeagues}
              >
                <option value="" className="bg-gray-800">Select a league...</option>
                {userLeagues.map(league => (
                  <option key={league.id} value={league.id} className="bg-gray-800">
                    {league.name} ({league.total_rosters} teams)
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <button
                onClick={analyzeLeague}
                disabled={!selectedLeague || loading}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-bold shadow-lg"
              >
                {loading ? 'Analyzing...' : 'Find Trades'}
              </button>
              <button
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                className="px-4 py-4 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-2xl hover:bg-white/20 transition-all duration-300"
              >
                ⚙️
              </button>
            </div>
          </div>
          {showAdvancedOptions && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-8 p-6 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10"
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center">
                    <span className="text-white text-sm font-bold">⚖️</span>
                  </div>
                  <h3 className="text-xl font-bold text-white">Position Weights</h3>
                </div>
                <button
                  onClick={resetWeights}
                  className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl text-sm hover:from-green-600 hover:to-emerald-600 transition-all duration-300 font-bold"
                >
                  Reset to Default
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {Object.entries(positionWeights).map(([position, weight]) => (
                  <div key={position} className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/20">
                    <label className="block text-sm font-bold text-gray-300 mb-3">{position}</label>
                    <input
                      type="number"
                      step="0.05"
                      min="0.1"
                      max="2.0"
                      value={weight}
                      onChange={(e) => updateWeight(position, e.target.value)}
                      className="w-full p-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-400 mt-4 bg-blue-500/10 p-3 rounded-xl border border-blue-500/20">
                💡 Higher values make positions more valuable in trades. Changes apply to new trade searches.
              </p>
            </motion.div>
          )}
        </motion.div>

        {/* Trade Matches Section - Now appears first */}
        {tradeMatches.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-8 mb-8 shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center">
                <ArrowsRightLeftIcon className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">
                Recommended Trades ({tradeMatches.length})
              </h2>
            </div>
            <div className="space-y-6">
              {tradeMatches.map((trade, index) => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => handleTradeClick(trade)}
                  className="bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-xl rounded-2xl border border-white/20 p-6 hover:bg-white/15 hover:border-white/30 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-2xl"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTeamClick(trade.team1);
                        }}
                        className="font-bold text-lg text-white hover:text-blue-400 transition-colors"
                      >
                        {trade.team1}
                      </button>
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                        <ArrowsRightLeftIcon className="w-4 h-4 text-white" />
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTeamClick(trade.team2);
                        }}
                        className="font-bold text-lg text-white hover:text-blue-400 transition-colors"
                      >
                        {trade.team2}
                      </button>
                      <span className="px-3 py-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-full text-sm font-bold">
                        {trade.type}
                      </span>
                    </div>
                    <span className={`px-4 py-2 rounded-2xl text-sm font-bold shadow-lg ${
                      trade.fairness === 'Fair' ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' :
                      trade.fairness === 'Good' ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white' :
                      'bg-gradient-to-r from-yellow-500 to-orange-500 text-white'
                    }`}>
                      {trade.fairness}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-red-500/10 backdrop-blur-sm p-4 rounded-2xl border border-red-500/20">
                      <div className="font-bold text-red-400 mb-4 flex items-center gap-2">
                        <span className="text-lg">📤</span>
                        {trade.team1} gives:
                      </div>
                      <div className="space-y-3">
                        {trade.team1Gives.map((give, idx) => (
                          <div key={idx} className="bg-white/10 backdrop-blur-sm p-3 rounded-xl border border-white/20 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-white ${
                                give.position === 'QB' ? 'bg-red-500' :
                                give.position === 'RB' ? 'bg-green-500' :
                                give.position === 'WR' ? 'bg-blue-500' :
                                'bg-yellow-500'
                              }`}>
                                {give.position[0]}
                              </div>
                              <div>
                                <button
                                  onClick={() => handlePlayerClick(give.player)}
                                  className="hover:text-blue-400 transition-colors font-semibold text-white text-sm"
                                >
                                  {give.player.full_name}
                                </button>
                                <div className="text-xs text-gray-400">
                                  {give.player.fantasyPoints.toFixed(1)} pts
                                  {give.adjustedValue && (
                                    <span className="text-blue-400 ml-1">({give.adjustedValue.toFixed(1)} adj)</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-green-500/10 backdrop-blur-sm p-4 rounded-2xl border border-green-500/20">
                      <div className="font-bold text-green-400 mb-4 flex items-center gap-2">
                        <span className="text-lg">📥</span>
                        {trade.team2} gives:
                      </div>
                      <div className="space-y-3">
                        {trade.team2Gives.map((give, idx) => (
                          <div key={idx} className="bg-white/10 backdrop-blur-sm p-3 rounded-xl border border-white/20 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-white ${
                                give.position === 'QB' ? 'bg-red-500' :
                                give.position === 'RB' ? 'bg-green-500' :
                                give.position === 'WR' ? 'bg-blue-500' :
                                'bg-yellow-500'
                              }`}>
                                {give.position[0]}
                              </div>
                              <div>
                                <button
                                  onClick={() => handlePlayerClick(give.player)}
                                  className="hover:text-blue-400 transition-colors font-semibold text-white text-sm"
                                >
                                  {give.player.full_name}
                                </button>
                                <div className="text-xs text-gray-400">
                                  {give.player.fantasyPoints.toFixed(1)} pts
                                  {give.adjustedValue && (
                                    <span className="text-blue-400 ml-1">({give.adjustedValue.toFixed(1)} adj)</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Best Player Bonus */}
                  {trade.bestPlayerBonus && (
                    <div className="mt-6 pt-4 border-t border-white/20">
                      <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 backdrop-blur-sm p-4 rounded-2xl border border-yellow-500/30">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">🏆</span>
                          <span className="text-sm font-bold text-yellow-400">Best Player Bonus (+{trade.bestPlayerBonus.bonusValue} pts)</span>
                        </div>
                        <button
                          onClick={() => handlePlayerClick(trade.bestPlayerBonus.bestPlayer)}
                          className="font-bold hover:text-blue-400 transition-colors text-white"
                        >
                          {trade.bestPlayerBonus.bestPlayer.full_name}
                        </button>
                        <span className="text-gray-400 ml-2">({trade.bestPlayerBonus.bestPlayer.position})</span>
                        <div className="text-yellow-300 text-sm mt-1">
                          Highest value player in trade
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Likely Dropped Player */}
                  {(trade.likelyDropped || trade.team2Dropped) && (
                    <div className="mt-4">
                      <div className="bg-gray-500/20 backdrop-blur-sm p-4 rounded-2xl border border-gray-500/30">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">⬇️</span>
                          <span className="text-sm font-bold text-gray-400">Likely to be dropped:</span>
                        </div>
                        <button
                          onClick={() => handlePlayerClick(trade.likelyDropped || trade.team2Dropped)}
                          className="font-bold hover:text-blue-400 transition-colors text-white"
                        >
                          {(trade.likelyDropped || trade.team2Dropped).full_name}
                        </button>
                        <span className="text-gray-400 ml-2">({(trade.likelyDropped || trade.team2Dropped).position})</span>
                        <div className="text-gray-300 text-sm mt-1">
                          {((trade.likelyDropped || trade.team2Dropped).fantasyPoints * getPositionScarcity((trade.likelyDropped || trade.team2Dropped).position)).toFixed(1)} pts
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* No Trades Found Message - Also appears before team analysis */}
        {Object.keys(teamStrengths).length > 0 && tradeMatches.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 mb-8 shadow-lg text-center"
          >
            <h2 className="text-xl font-bold mb-2 flex items-center justify-center gap-2">
              <ArrowsRightLeftIcon className="w-5 h-5" />
              No Trade Matches Found
            </h2>
            <p className="text-gray-500 mb-4">
              No complementary surplus/deficit matches were found in this league.
            </p>
            <p className="text-sm text-gray-400">
              Try adjusting the <button 
                onClick={() => setShowAdvancedOptions(true)}
                className="text-blue-500 hover:text-blue-600 underline"
              >
                Advanced Options
              </button> position weights to find more trade opportunities.
            </p>
          </motion.div>
        )}

        {/* Team Strengths Analysis - Now appears after trades */}
        {Object.keys(teamStrengths).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-8 mb-8 shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
                <ChartBarIcon className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">
                Team Strengths Analysis
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {Object.values(teamStrengths).map((team, index) => (
                <motion.div 
                  key={team.rosterId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-xl p-6 rounded-3xl border border-white/20 shadow-2xl hover:bg-white/15 hover:border-white/30 transition-all duration-300"
                >
                  <button
                    onClick={() => handleTeamClick(team.teamName)}
                    className="text-xl font-bold mb-6 text-white hover:text-blue-400 transition-colors"
                  >
                    {team.teamName}
                  </button>
                  <div className="space-y-4">
                    {['QB', 'RB', 'WR', 'TE'].map(pos => (
                      <button
                        key={pos}
                        onClick={() => handlePositionClick(team, pos)}
                        className="w-full bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20 hover:bg-white/20 hover:border-white/30 transition-all duration-300 group"
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold text-white ${
                              pos === 'QB' ? 'bg-red-500' :
                              pos === 'RB' ? 'bg-green-500' :
                              pos === 'WR' ? 'bg-blue-500' :
                              'bg-yellow-500'
                            }`}>
                              {pos}
                            </div>
                            <span className="font-bold text-white group-hover:text-blue-400 transition-colors">
                              {pos}s
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-xl font-black text-white">{team[pos].toFixed(1)}</span>
                            <span className={`px-4 py-2 rounded-2xl text-sm font-bold shadow-lg ${
                              team[`${pos}_status`] === 'surplus' ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' :
                              team[`${pos}_status`] === 'deficit' ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white' :
                              'bg-gradient-to-r from-gray-500 to-gray-600 text-white'
                            }`}>
                              {team[`${pos}_status`]}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Position Players Modal */}
      <PositionPlayersModal
        isOpen={showPositionModal}
        onClose={closePositionModal}
        position={selectedPositionData?.position}
        players={selectedPositionData?.players || []}
        teamName={selectedPositionData?.teamName}
        onPlayerClick={handlePlayerClick}
        positionScore={selectedPositionData?.positionScore || 0}
        scoreCalculation={selectedPositionData?.scoreCalculation}
      />

      {/* Trade Crafter Modal */}
      <TradeCrafterModal
        isOpen={showTradeCrafter}
        onClose={closeTradeCrafter}
        initialTrade={selectedTrade}
        teamStrengths={teamStrengths}
        getPositionScarcity={getPositionScarcity}
        simulateTrade={simulateTrade}
        onPlayerClick={handlePlayerClick}
        positionWeights={positionWeights}
      />
    </div>
  );
}

export default TradeFinder;