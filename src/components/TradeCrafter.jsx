import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeftIcon,
  ArrowsRightLeftIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { secureApiCall } from '../utils/security';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import TradeCrafterModal from './TradeCrafterModal';
import PositionPlayersModal from './PositionPlayersModal';
import PlayerStatsModal from './league/PlayerStatsModal';

function TradeCrafter({ onBack, onShowPlayerStats, onShowTeamModal, onShowAuth, onShowProfile }) {
  const { user } = useAuth();
  const [selectedLeague, setSelectedLeague] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [userLeagues, setUserLeagues] = useState([]);
  const [loadingLeagues, setLoadingLeagues] = useState(false);
  const [hasSleeperUsername, setHasSleeperUsername] = useState(false);
  const [showTradeCrafterModal, setShowTradeCrafterModal] = useState(false);
  const [leagueData, setLeagueData] = useState(null);
  const [teamStrengths, setTeamStrengths] = useState({});
  const [allPlayers, setAllPlayers] = useState({});
  const [playerStats, setPlayerStats] = useState({});
  const [userTeamName, setUserTeamName] = useState('');
  const [selectedTradePartner, setSelectedTradePartner] = useState('');
  const [availableTeams, setAvailableTeams] = useState([]);
  const [showPositionModal, setShowPositionModal] = useState(false);
  const [selectedPositionData, setSelectedPositionData] = useState(null);
  const [showPlayerStats, setShowPlayerStats] = useState(false);
  const [playerStatsData, setPlayerStatsData] = useState(null);
  const [loadingPlayerStats, setLoadingPlayerStats] = useState(false);
  const [playerStatsTab, setPlayerStatsTab] = useState('current');
  const [allYearStats, setAllYearStats] = useState(null);

  const loadUserLeagues = async (year = selectedYear) => {
    setLoadingLeagues(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('sleeper_username, favorite_league, favorite_year')
        .eq('id', user.id)
        .single();
      
      if (data?.sleeper_username) {
        setHasSleeperUsername(true);
        
        // Set favorite year if not already loaded
        if (!profileLoaded && data.favorite_year) {
          setSelectedYear(parseInt(data.favorite_year));
          year = parseInt(data.favorite_year);
          setProfileLoaded(true);
        }
        
        const userResponse = await secureApiCall(`https://api.sleeper.app/v1/user/${data.sleeper_username}`);
        const userData = await userResponse.json();
        
        const leaguesResponse = await secureApiCall(`https://api.sleeper.app/v1/user/${userData.user_id}/leagues/nfl/${year}`);
        const leagues = await leaguesResponse.json();
        
        const leaguesList = leagues.map(league => ({
          id: league.league_id,
          name: league.name,
          total_rosters: league.total_rosters
        }));
        setUserLeagues(leaguesList);
        
        // Auto-select favorite league if it exists
        if (data?.favorite_league) {
          const favoriteLeague = leaguesList.find(league => 
            league.name.toLowerCase().includes(data.favorite_league.toLowerCase())
          );
          if (favoriteLeague) {
            setSelectedLeague(favoriteLeague.id);
            
            // Auto-load teams and analyze league when favorite league is selected
            setTimeout(() => {
              loadAvailableTeams(favoriteLeague.id);
            }, 500);
          }
        }
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
    loadPlayerStats();
    if (user) {
      loadUserLeagues(selectedYear);
      // Auto-load first league for analysis
      setTimeout(() => {
        if (userLeagues.length > 0 && !selectedLeague) {
          const firstLeague = userLeagues[0].id;
          setSelectedLeague(firstLeague);
          loadAvailableTeams(firstLeague);
        }
      }, 1000);
    }
  }, [user, selectedYear, userLeagues.length]);

  const loadAllPlayers = async () => {
    try {
      const response = await secureApiCall('https://api.sleeper.app/v1/players/nfl');
      const players = await response.json();
      setAllPlayers(players);
    } catch (err) {
      console.error('Error loading players:', err);
    }
  };

  const loadPlayerStats = async () => {
    try {
      const response = await secureApiCall(`https://api.sleeper.app/v1/stats/nfl/regular/${selectedYear}`);
      const stats = await response.json();
      setPlayerStats(stats);
    } catch (err) {
      console.error('Error loading player stats:', err);
    }
  };

  const analyzeLeague = async () => {
    if (!selectedLeague) return;
    
    try {
      const leagueResponse = await secureApiCall(`https://api.sleeper.app/v1/league/${selectedLeague}`);
      const league = await leagueResponse.json();
      setLeagueData(league);

      const rostersResponse = await secureApiCall(`https://api.sleeper.app/v1/league/${selectedLeague}/rosters`);
      const rostersData = await rostersResponse.json();

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
      
      // Set available teams for dropdown (excluding user's team)
      const teams = Object.values(strengths)
        .filter(team => team.teamName !== userTeamName)
        .map(team => ({ id: team.rosterId, name: team.teamName }));
      setAvailableTeams(teams);
      
      setShowTradeCrafterModal(true);
    } catch (err) {
      console.error('Error analyzing league:', err);
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

  const getPositionScarcity = (position) => {
    const positionWeights = { QB: 0.625, RB: 1.0, WR: 0.95, TE: 1.05 };
    return positionWeights[position] || 1.0;
  };

  const loadAvailableTeams = async (leagueId) => {
    try {
      const leagueResponse = await secureApiCall(`https://api.sleeper.app/v1/league/${leagueId}`);
      const league = await leagueResponse.json();
      setLeagueData(league);

      const rostersResponse = await secureApiCall(`https://api.sleeper.app/v1/league/${leagueId}/rosters`);
      const rostersData = await rostersResponse.json();

      const usersResponse = await secureApiCall(`https://api.sleeper.app/v1/league/${leagueId}/users`);
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

      // Calculate team strengths for analysis display
      const strengths = calculateTeamStrengths(rosterWithUsers);
      setTeamStrengths(strengths);

      const teams = rostersData.map(roster => {
        const rosterUser = users.find(u => u.user_id === roster.owner_id);
        const teamName = rosterUser?.display_name || `Team ${roster.roster_id}`;
        const isUserTeam = rosterUser?.username === profileData?.sleeper_username ||
                          rosterUser?.display_name === profileData?.sleeper_username;
        
        return {
          id: roster.roster_id,
          name: teamName,
          isUser: isUserTeam
        };
      }).filter(team => !team.isUser); // Exclude user's team
      
      setAvailableTeams(teams);
    } catch (err) {
      console.error('Error loading available teams:', err);
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

  const fetchPlayerStats = async (playerId, playerName, year) => {
    setLoadingPlayerStats(true);
    setShowPlayerStats(true);
    setPlayerStatsTab('current');
    
    try {
      const playerInfo = allPlayers[playerId];
      const currentYear = new Date().getFullYear();
      const startYear = 2020;
      const yearlyStats = {};
      
      for (let statsYear = startYear; statsYear <= currentYear; statsYear++) {
        try {
          const response = await secureApiCall(`https://api.sleeper.app/v1/stats/nfl/regular/${statsYear}`);
          const allStats = await response.json();
          const playerStats = allStats[playerId] || {};
          
          if (Object.keys(playerStats).length > 0) {
            const allPlayersWithStats = Object.entries(allStats)
              .map(([id, stats]) => ({
                id,
                position: allPlayers[id]?.position,
                fantasyPoints: stats.pts_ppr || stats.pts_std || stats.pts_half_ppr || 0
              }))
              .filter(p => p.fantasyPoints > 0)
              .sort((a, b) => b.fantasyPoints - a.fantasyPoints);
            
            const overallRank = allPlayersWithStats.findIndex(p => p.id === playerId) + 1;
            const positionPlayers = allPlayersWithStats.filter(p => p.position === playerInfo?.position);
            const positionRank = positionPlayers.findIndex(p => p.id === playerId) + 1;
            
            const derivedStats = {
              total_td: (playerStats.pass_td || 0) + (playerStats.rush_td || 0) + (playerStats.rec_td || 0),
              fantasy_ppg: playerStats.gp > 0 ? ((playerStats.pts_ppr || playerStats.pts_std || 0) / playerStats.gp).toFixed(1) : '0'
            };
            
            yearlyStats[statsYear] = {
              stats: playerStats,
              derivedStats,
              overallRank: overallRank > 0 ? overallRank : 'N/A',
              positionRank: positionRank > 0 ? positionRank : 'N/A'
            };
          }
        } catch (err) {
          console.log(`No stats found for ${statsYear}`);
        }
      }
      
      const currentYearData = yearlyStats[year] || {
        stats: {},
        derivedStats: { total_td: 0, fantasy_ppg: '0' },
        overallRank: 'N/A',
        positionRank: 'N/A'
      };
      
      setPlayerStatsData({
        playerInfo,
        stats: currentYearData.stats,
        derivedStats: currentYearData.derivedStats,
        year,
        playerName,
        playerId,
        overallRank: currentYearData.overallRank,
        positionRank: currentYearData.positionRank
      });
      
      setAllYearStats(yearlyStats);
    } catch (err) {
      console.error('Error fetching player stats:', err);
    } finally {
      setLoadingPlayerStats(false);
    }
  };

  const closePlayerStats = () => {
    setShowPlayerStats(false);
    setPlayerStatsData(null);
    setAllYearStats(null);
    setPlayerStatsTab('current');
  };

  const switchToYear = (year) => {
    if (allYearStats && allYearStats[year]) {
      const yearData = allYearStats[year];
      setPlayerStatsData({
        ...playerStatsData,
        stats: yearData.stats,
        derivedStats: yearData.derivedStats,
        year,
        overallRank: yearData.overallRank,
        positionRank: yearData.positionRank
      });
    }
  };

  const createInitialTrade = () => {
    const userTeam = Object.values(teamStrengths).find(t => t.teamName === userTeamName);
    const partnerTeam = Object.values(teamStrengths).find(t => t.rosterId === parseInt(selectedTradePartner));
    
    if (!userTeam || !partnerTeam) return null;
    
    return {
      team1: userTeam.teamName,
      team2: partnerTeam.teamName,
      team1Gives: [],
      team2Gives: []
    };
  };

  if (!user || !hasSleeperUsername) {
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
                  Trade Crafter
                </h1>
                <p className="text-xl text-gray-300 font-medium">
                  {!user ? 'Please log in to access the Trade Crafter' : 'Please add your Sleeper username to access the Trade Crafter'}
                </p>
              </div>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-12 text-center shadow-2xl"
          >
            <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">🔒</span>
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">{!user ? 'Authentication Required' : 'Sleeper Username Required'}</h2>
            <p className="text-gray-300 text-lg mb-8">
              {!user 
                ? 'You need to be logged in to use the Trade Crafter feature.'
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
              className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-2xl hover:from-blue-600 hover:to-purple-600 transition-all duration-300 shadow-lg font-semibold text-lg"
            >
              {!user ? 'Go Back to Sign In' : 'Add Sleeper Username'}
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

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
                Trade Crafter
              </h1>
              <p className="text-xl text-gray-300 font-medium">
                Craft custom trades with advanced analysis tools
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-end">
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-3">Year</label>
              <select
                value={selectedYear}
                onChange={(e) => {
                  const year = parseInt(e.target.value);
                  setSelectedYear(year);
                  setSelectedLeague('');
                  setSelectedTradePartner('');
                  setAvailableTeams([]);
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
                onChange={(e) => {
                  const leagueId = e.target.value;
                  setSelectedLeague(leagueId);
                  setSelectedTradePartner('');
                  setAvailableTeams([]);
                  if (leagueId) {
                    loadAvailableTeams(leagueId);
                  }
                }}
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
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-300 mb-3">Trade Partner</label>
              <select
                value={selectedTradePartner}
                onChange={(e) => setSelectedTradePartner(e.target.value)}
                className="w-full p-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                disabled={!selectedLeague || availableTeams.length === 0}
              >
                <option value="" className="bg-gray-800">Select trade partner...</option>
                {availableTeams.map(team => (
                  <option key={team.id} value={team.id} className="bg-gray-800">
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <button
                onClick={analyzeLeague}
                disabled={!selectedLeague || !selectedTradePartner}
                className="w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-bold shadow-lg"
              >
                Start Crafting
              </button>
            </div>
          </div>
        </motion.div>

        {/* Team Strengths Analysis - Always show when leagues are loaded */}
        {userLeagues.length > 0 && selectedLeague && Object.keys(teamStrengths).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-8 shadow-2xl"
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
                  <div className="text-xl font-bold mb-6 text-white">
                    {team.teamName}
                  </div>
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
        
        {/* Trade Crafter Modal */}
        <TradeCrafterModal
          isOpen={showTradeCrafterModal}
          onClose={() => setShowTradeCrafterModal(false)}
          initialTrade={createInitialTrade()}
          teamStrengths={teamStrengths}
          getPositionScarcity={getPositionScarcity}
          positionWeights={{ QB: 0.625, RB: 1.0, WR: 0.95, TE: 1.05 }}
        />
        
        {/* Position Players Modal */}
        <PositionPlayersModal
          isOpen={showPositionModal}
          onClose={closePositionModal}
          position={selectedPositionData?.position}
          players={selectedPositionData?.players || []}
          teamName={selectedPositionData?.teamName}
          onPlayerClick={(player) => fetchPlayerStats(player.id, player.full_name, selectedYear)}
          positionScore={selectedPositionData?.positionScore || 0}
          scoreCalculation={selectedPositionData?.scoreCalculation}
        />
        
        {/* Player Stats Modal */}
        <PlayerStatsModal
          showPlayerStats={showPlayerStats}
          playerStatsData={playerStatsData}
          loadingPlayerStats={loadingPlayerStats}
          playerStatsTab={playerStatsTab}
          setPlayerStatsTab={setPlayerStatsTab}
          allYearStats={allYearStats}
          onClose={closePlayerStats}
          onSwitchToYear={switchToYear}
        />
      </div>
    </div>
  );
}

export default TradeCrafter;