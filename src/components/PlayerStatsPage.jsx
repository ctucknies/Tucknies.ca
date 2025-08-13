import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  ChartBarIcon,
  UserIcon,
  ArrowLeftIcon,
  StarIcon,

} from '@heroicons/react/24/outline';
import { secureApiCall, validatePlayerId } from '../utils/security';
import PlayerStatsModal from './league/PlayerStatsModal';
import PlayerComparisonModal from './league/PlayerComparisonModal';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

function PlayerStatsPage({ onBack, onShowAuth, onShowProfile }) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [allPlayers, setAllPlayers] = useState(null);
  const [filters, setFilters] = useState({
    position: 'QB',
    team: 'all',
    availability: 'all',
    league: ''
  });
  const [tempFilters, setTempFilters] = useState({
    position: 'QB',
    team: 'all',
    availability: 'all',
    league: ''
  });
  const [userLeagues, setUserLeagues] = useState([]);
  const [loadingUserLeagues, setLoadingUserLeagues] = useState(false);
  const [sleeperUsername, setSleeperUsername] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [sortBy, setSortBy] = useState('fantasyPoints');
  const [showFilters, setShowFilters] = useState(true);
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [showComparison, setShowComparison] = useState(false);
  const [hasSleeperUsername, setHasSleeperUsername] = useState(false);

  const [showPlayerStats, setShowPlayerStats] = useState(false);
  const [playerStatsData, setPlayerStatsData] = useState(null);
  const [loadingPlayerStats, setLoadingPlayerStats] = useState(false);
  const [playerStatsTab, setPlayerStatsTab] = useState('current');
  const [allYearStats, setAllYearStats] = useState(null);
  const [leagueData, setLeagueData] = useState(null);
  const [loadingLeague, setLoadingLeague] = useState(false);
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [playerStats, setPlayerStats] = useState({});

  const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
  const teams = [
    'ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE', 'DAL', 'DEN',
    'DET', 'GB', 'HOU', 'IND', 'JAX', 'KC', 'LV', 'LAC', 'LAR', 'MIA',
    'MIN', 'NE', 'NO', 'NYG', 'NYJ', 'PHI', 'PIT', 'SF', 'SEA', 'TB',
    'TEN', 'WAS'
  ];

  useEffect(() => {
    loadAllPlayers();
    loadPlayerStats();
    if (user) {
      loadUserProfile();
    }
  }, [user]);

  const loadPlayerStats = async () => {
    try {
      const response = await secureApiCall(`https://api.sleeper.app/v1/stats/nfl/regular/${selectedYear}`);
      const stats = await response.json();
      setPlayerStats(stats);
    } catch (err) {
      console.error('Error loading player stats:', err);
    }
  };

  const loadUserProfile = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('sleeper_username, favorite_year, favorite_league')
        .eq('id', user.id)
        .single();
      
      if (data?.sleeper_username) {
        setSleeperUsername(data.sleeper_username);
        setHasSleeperUsername(true);
        if (data.favorite_year) {
          setSelectedYear(parseInt(data.favorite_year));
        }
        syncUserLeagues(data.sleeper_username, data.favorite_league);
      } else {
        setHasSleeperUsername(false);
      }
    } catch (error) {
      console.log('No saved profile found');
      setHasSleeperUsername(false);
    }
  };

  const syncUserLeagues = async (username = sleeperUsername, favoriteLeague = null) => {
    if (!username) return;
    
    setLoadingUserLeagues(true);
    try {
      const userResponse = await secureApiCall(`https://api.sleeper.app/v1/user/${username}`);
      if (!userResponse.ok) throw new Error('User not found');
      
      const userData = await userResponse.json();
      
      const leaguesResponse = await secureApiCall(`https://api.sleeper.app/v1/user/${userData.user_id}/leagues/nfl/${selectedYear}`);
      if (!leaguesResponse.ok) throw new Error('No leagues found');
      
      const leagues = await leaguesResponse.json();
      const leaguesList = leagues.map(league => ({
        id: league.league_id,
        name: league.name,
        total_rosters: league.total_rosters,
        season: league.season
      }));
      setUserLeagues(leaguesList);
      
      // Auto-select favorite league if it exists - use setTimeout to ensure state is updated
      if (favoriteLeague) {
        setTimeout(() => {
          const favoriteLeagueMatch = leaguesList.find(league => 
            league.name.toLowerCase().includes(favoriteLeague.toLowerCase())
          );
          if (favoriteLeagueMatch) {
            setTempFilters(prev => ({ ...prev, league: favoriteLeagueMatch.id }));
            setFilters(prev => ({ ...prev, league: favoriteLeagueMatch.id }));
          }
        }, 100);
      }
    } catch (err) {
      console.error('Error syncing leagues:', err);
      setUserLeagues([]);
    } finally {
      setLoadingUserLeagues(false);
    }
  };

  useEffect(() => {
    if (!allPlayers) return;
    
    const debounceTimer = setTimeout(() => {
      if (filters.league) {
        searchLeaguePlayers();
      } else if (searchQuery.length >= 2 || filters.position !== 'all' || filters.team !== 'all' || filters.availability !== 'all') {
        searchPlayers(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, searchQuery ? 300 : 0);
    
    return () => clearTimeout(debounceTimer);
  }, [allPlayers, filters, searchQuery, playerStats, sortBy]);

  const loadAllPlayers = async () => {
    try {
      const response = await secureApiCall('https://api.sleeper.app/v1/players/nfl');
      const players = await response.json();
      setAllPlayers(players);
    } catch (err) {
      console.error('Error loading players:', err);
    }
  };



  const getLeagueScoring = (league) => {
    if (!league?.scoring_settings) return 'pts_ppr'; // default
    
    const rec = league.scoring_settings.rec || 0;
    if (rec === 1) return 'pts_ppr';
    if (rec === 0.5) return 'pts_half_ppr';
    return 'pts_std';
  };

  const getFantasyPoints = (stats, league = null) => {
    if (!stats) return 0;
    
    if (league) {
      const scoringType = getLeagueScoring(league);
      return stats[scoringType] || 0;
    }
    
    // Fallback to PPR if no league specified
    return stats.pts_ppr || stats.pts_std || stats.pts_half_ppr || 0;
  };

  const searchLeaguePlayers = async () => {
    if (!filters.league.trim()) {
      setAvailablePlayers([]);
      return;
    }

    setLoadingLeague(true);
    try {
      const response = await secureApiCall(`https://api.sleeper.app/v1/league/${filters.league.trim()}`);
      
      if (!response.ok) {
        throw new Error('League not found');
      }
      
      const league = await response.json();
      setLeagueData(league);
      
      const rostersResponse = await secureApiCall(`https://api.sleeper.app/v1/league/${league.league_id}/rosters`);
      const rosters = await rostersResponse.json();
      
      const takenPlayerIds = new Set();
      rosters.forEach(roster => {
        if (roster.players) {
          roster.players.forEach(playerId => takenPlayerIds.add(playerId));
        }
      });
      
      const available = Object.entries(allPlayers)
        .filter(([id, player]) => {
          if (!player.position || !positions.includes(player.position)) return false;
          if (filters.position !== 'all' && player.position !== filters.position) return false;
          if (filters.team !== 'all' && player.team !== filters.team) return false;
          
          // Add search query filtering
          if (searchQuery.length >= 2) {
            const name = player.full_name || '';
            if (!name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
          }
          
          // Add availability filter based on roster status
          const isRostered = takenPlayerIds.has(id);
          if (filters.availability === 'available' && isRostered) return false;
          if (filters.availability === 'not_available' && !isRostered) return false;
          
          return true;
        })
        .map(([id, player]) => {
          const stats = playerStats[id] || {};
          const fantasyPoints = getFantasyPoints(stats, league);
          const gamesPlayed = stats.gp || 0;
          const ppg = gamesPlayed > 0 ? (fantasyPoints / gamesPlayed) : 0;
          const isRostered = takenPlayerIds.has(id);
          
          return {
            id,
            name: player.full_name,
            position: player.position,
            team: player.team,
            status: player.status,
            age: player.age,
            years_exp: player.years_exp,
            fantasyPoints,
            ppg,
            gamesPlayed,
            stats,
            isRostered
          };
        })
        .sort((a, b) => {
          let aValue = a[sortBy];
          let bValue = b[sortBy];
          
          if (typeof aValue === 'string') {
            aValue = (aValue || '').toLowerCase();
            bValue = (bValue || '').toLowerCase();
            return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
          }
          
          return (bValue || 0) - (aValue || 0);
        })
        .slice(0, 100);
      
      setAvailablePlayers(available);
    } catch (err) {
      console.error('Error fetching league data:', err);
      setLeagueData(null);
      setAvailablePlayers([]);
    } finally {
      setLoadingLeague(false);
    }
  };

  const searchPlayers = async (query) => {
    if (!allPlayers) {
      setSearchResults([]);
      return;
    }
    
    if (query.length < 2 && filters.position === 'all' && filters.team === 'all' && filters.availability === 'all') {
      setSearchResults([]);
      return;
    }

    setLoadingSearch(true);
    try {
      let results = Object.entries(allPlayers)
        .filter(([id, player]) => {
          const name = player.full_name || '';
          const matchesName = query.length === 0 || name.toLowerCase().includes(query.toLowerCase());
          const matchesPosition = filters.position === 'all' || player.position === filters.position;
          const matchesTeam = filters.team === 'all' || player.team === filters.team;
          const isValidPosition = player.position && positions.includes(player.position);
          
          // Add availability filter
          let matchesAvailability = true;
          if (filters.availability === 'available') {
            matchesAvailability = player.status === 'Active' || !player.status;
          } else if (filters.availability === 'not_available') {
            matchesAvailability = player.status && player.status !== 'Active';
          }
          
          return matchesName && matchesPosition && matchesTeam && isValidPosition && matchesAvailability;
        })
        .map(([id, player]) => {
          const stats = playerStats[id] || {};
          const fantasyPoints = getFantasyPoints(stats);
          const gamesPlayed = stats.gp || 0;
          const ppg = gamesPlayed > 0 ? (fantasyPoints / gamesPlayed) : 0;
          
          return {
            id,
            name: player.full_name,
            position: player.position,
            team: player.team,
            status: player.status,
            age: player.age,
            years_exp: player.years_exp,
            fantasyPoints,
            ppg,
            gamesPlayed,
            stats
          };
        });

      results.sort((a, b) => {
        let aValue = a[sortBy];
        let bValue = b[sortBy];
        
        if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        }
        
        return bValue - aValue;
      });

      setSearchResults(results.slice(0, 50));
    } catch (err) {
      console.error('Error searching players:', err);
      setSearchResults([]);
    } finally {
      setLoadingSearch(false);
    }
  };



  useEffect(() => {
    if (selectedYear) {
      loadPlayerStats();
      if (sleeperUsername) {
        syncUserLeagues();
      }
    }
  }, [selectedYear]);

  const fetchPlayerStats = async (playerId, playerName, year, targetWeek = null) => {
    if (!validatePlayerId(playerId)) {
      console.error('Invalid player ID');
      return;
    }
    
    setLoadingPlayerStats(true);
    setShowPlayerStats(true);
    setPlayerStatsTab('current');
    
    try {
      const playerInfo = allPlayers[playerId];
      const currentYear = new Date().getFullYear();
      const startYear = 2020;
      const yearlyStats = {};
      
      // Use Promise.allSettled for better performance
      const statsPromises = [];
      for (let statsYear = startYear; statsYear <= currentYear; statsYear++) {
        statsPromises.push(
          secureApiCall(`https://api.sleeper.app/v1/stats/nfl/regular/${statsYear}`)
            .then(response => response.json())
            .then(allStats => ({ year: statsYear, stats: allStats[playerId] || {}, allStats }))
            .catch(() => ({ year: statsYear, stats: {}, allStats: {} }))
        );
      }
      
      const results = await Promise.allSettled(statsPromises);
      
      results.forEach(result => {
        if (result.status === 'fulfilled' && Object.keys(result.value.stats).length > 0) {
          const { year: statsYear, stats: playerStats, allStats } = result.value;
            

              
              const allPlayersWithStats = Object.entries(allStats)
                .map(([id, stats]) => ({
                  id,
                  position: allPlayers[id]?.position,
                  fantasyPoints: getFantasyPoints(stats)
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
              
              if (playerStats.pass_att > 0) {
                derivedStats.completion_pct = ((playerStats.pass_cmp || 0) / playerStats.pass_att * 100).toFixed(1);
                derivedStats.yards_per_attempt = ((playerStats.pass_yd || 0) / playerStats.pass_att).toFixed(1);
              }
              
              if (playerStats.rush_att > 0) {
                derivedStats.yards_per_carry = ((playerStats.rush_yd || 0) / playerStats.rush_att).toFixed(1);
              }
              
              if (playerStats.rec > 0) {
                derivedStats.yards_per_reception = ((playerStats.rec_yd || 0) / playerStats.rec).toFixed(1);
              }
              
              yearlyStats[statsYear] = {
                stats: playerStats,
                derivedStats,
                overallRank: overallRank > 0 ? overallRank : 'N/A',
                positionRank: positionRank > 0 ? positionRank : 'N/A',
                team: playerInfo?.team || 'N/A'
              };
        }
      });
      
      const currentYearData = yearlyStats[year] || {
        stats: {},
        derivedStats: { total_td: 0, fantasy_ppg: '0' },
        overallRank: 'N/A',
        positionRank: 'N/A',
        team: playerInfo?.team || 'N/A'
      };
      
      setPlayerStatsData({
        playerInfo,
        stats: currentYearData.stats,
        derivedStats: currentYearData.derivedStats,
        year,
        playerName,
        playerId,
        overallRank: currentYearData.overallRank,
        positionRank: currentYearData.positionRank,
        targetWeek
      });
      
      setAllYearStats(yearlyStats);
      
      if (targetWeek) {
        setPlayerStatsTab('weekly');
      }
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
        positionRank: yearData.positionRank,
        team: yearData.team
      });
    }
  };

  const togglePlayerSelection = (player) => {
    setSelectedPlayers(prev => {
      const isSelected = prev.find(p => p.id === player.id);
      if (isSelected) {
        return prev.filter(p => p.id !== player.id);
      } else if (prev.length < 3) {
        return [...prev, player];
      }
      return prev;
    });
  };

  const getPositionColor = useCallback((position) => {
    switch (position) {
      case 'QB': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'RB': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'WR': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'TE': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'K': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'DEF': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  }, []);

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
                  Player Statistics
                </h1>
                <p className="text-xl text-gray-300 font-medium">
                  {!user ? 'Please log in to access Player Statistics' : 'Please add your Sleeper username to access Player Statistics'}
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
                ? 'You need to be logged in to use the Player Statistics feature.'
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-y-auto">
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
                Player Statistics
              </h1>
              <p className="text-xl text-gray-300 font-medium">
                Search, filter, and analyze NFL player performance
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
          <div className="space-y-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search for any NFL player..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all duration-200 backdrop-blur-sm text-lg"
              />
              {loadingSearch && (
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl text-white hover:bg-white/20 transition-all duration-300"
              >
                <FunnelIcon className="w-4 h-4" />
                Filters {showFilters ? '▲' : '▼'}
              </button>
              
              {selectedPlayers.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">
                    {selectedPlayers.length} selected for comparison
                  </span>
                  <button
                    onClick={() => setShowComparison(true)}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-2xl hover:from-blue-600 hover:to-purple-600 transition-all duration-300 shadow-lg font-semibold"
                  >
                    Compare Players
                  </button>
                </div>
              )}
            </div>

            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="grid grid-cols-1 md:grid-cols-6 gap-4 pt-4 border-t border-gray-200 dark:border-gray-600"
              >
                {user ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-white">Year</label>
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700"
                      >
                        {[2025, 2024, 2023, 2022, 2021, 2020].map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2 text-white">Your Leagues</label>
                      <div className="space-y-2">
                        <select
                          value={tempFilters.league}
                          onChange={(e) => {
                            const newValue = e.target.value;
                            setTempFilters(prev => ({ ...prev, league: newValue }));
                            setFilters(prev => ({ ...prev, league: newValue }));
                          }}
                          className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700"
                          disabled={loadingUserLeagues}
                        >
                          <option value="">Select a league...</option>
                          {userLeagues.map(league => (
                            <option key={league.id} value={league.id}>
                              {league.name} ({league.season})
                            </option>
                          ))}
                        </select>
                        {userLeagues.length === 0 && !loadingUserLeagues && (
                          <button
                            onClick={() => syncUserLeagues()}
                            className="w-full text-sm bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition-colors"
                          >
                            Sync Leagues
                          </button>
                        )}
                        {loadingUserLeagues && (
                          <div className="text-sm text-gray-500 flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            Loading leagues...
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="col-span-2">
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
                        Please sign in to sync leagues and access year selection
                      </p>
                      <button
                        onClick={onShowAuth}
                        className="text-sm bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition-colors"
                      >
                        Sign In
                      </button>
                    </div>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">Position</label>
                  <select
                    value={tempFilters.position}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      setTempFilters(prev => ({ ...prev, position: newValue }));
                      setFilters(prev => ({ ...prev, position: newValue }));
                    }}
                    className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700"
                  >
                    <option value="all">All Positions</option>
                    {positions.map(pos => (
                      <option key={pos} value={pos}>{pos}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">Team</label>
                  <select
                    value={tempFilters.team}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      setTempFilters(prev => ({ ...prev, team: newValue }));
                      setFilters(prev => ({ ...prev, team: newValue }));
                    }}
                    className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700"
                  >
                    <option value="all">All Teams</option>
                    {teams.map(team => (
                      <option key={team} value={team}>{team}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">Availability</label>
                  <select
                    value={tempFilters.availability}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      setTempFilters(prev => ({ ...prev, availability: newValue }));
                      setFilters(prev => ({ ...prev, availability: newValue }));
                    }}
                    className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700"
                  >
                    <option value="all">All Players</option>
                    <option value="available">Available</option>
                    <option value="not_available">Not Available</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">Sort By</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700"
                  >
                    <option value="name">Name</option>
                    <option value="fantasyPoints">Total Points</option>
                    <option value="ppg">Points Per Game</option>
                    <option value="position">Position</option>
                    <option value="team">Team</option>
                    <option value="age">Age</option>
                    <option value="years_exp">Experience</option>
                  </select>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>



        {filters.league && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-8 shadow-2xl mb-8"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                {leagueData ? `Available Players in ${leagueData.name}` : 'League Players'} ({availablePlayers.length})
              </h3>
              {loadingLeague && (
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              )}
            </div>

            {leagueData && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>{leagueData.name}</strong> • {leagueData.total_rosters} teams • {leagueData.season} season
                </div>
              </div>
            )}

            {availablePlayers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availablePlayers.map((player) => {
                  const isSelected = selectedPlayers.find(p => p.id === player.id);
                  
                  return (
                    <div
                      key={player.id}
                      onClick={() => fetchPlayerStats(player.id, player.name, selectedYear)}
                      className={`p-6 rounded-2xl border transition-all duration-300 cursor-pointer ${
                        isSelected 
                          ? 'bg-white/95 dark:bg-gray-800/95 border-blue-500 ring-2 ring-blue-400/50 shadow-xl'
                          : 'bg-white/90 dark:bg-gray-800/90 border-gray-200/50 dark:border-gray-600/50 hover:bg-white/95 dark:hover:bg-gray-700/95 hover:border-gray-300 dark:hover:border-gray-500 shadow-lg hover:shadow-xl'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${getPositionColor(player.position)}`}>
                            {player.position}
                          </span>
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{player.team || 'FA'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePlayerSelection(player);
                            }}
                            className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                              isSelected 
                                ? 'bg-blue-500 border-blue-500 text-white'
                                : 'border-gray-400 dark:border-gray-500 hover:border-blue-500 text-gray-600 dark:text-gray-400'
                            }`}
                          >
                            {isSelected && '✓'}
                          </button>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-white mb-3 text-lg">
                          {player.name}
                        </h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded-lg">
                            <span className="text-green-700 dark:text-green-300 font-medium">Total:</span>
                            <div className="font-bold text-green-800 dark:text-green-200 text-lg">{(player.fantasyPoints || 0).toFixed(1)}</div>
                          </div>
                          <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg">
                            <span className="text-blue-700 dark:text-blue-300 font-medium">PPG:</span>
                            <div className="font-bold text-blue-800 dark:text-blue-200 text-lg">{(player.ppg || 0).toFixed(1)}</div>
                          </div>
                          {player.gamesPlayed > 0 && (
                            <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg">
                              <span className="text-gray-700 dark:text-gray-300 font-medium">GP:</span>
                              <div className="font-bold text-gray-800 dark:text-gray-200">{player.gamesPlayed}</div>
                            </div>
                          )}
                          {player.age && (
                            <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg">
                              <span className="text-gray-700 dark:text-gray-300 font-medium">Age:</span>
                              <div className="font-bold text-gray-800 dark:text-gray-200">{player.age}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : loadingLeague ? (
              <div className="text-center py-8 text-gray-500">
                Loading available players...
              </div>
            ) : leagueData ? (
              <div className="text-center py-8 text-gray-500">
                No available players found with current filters
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Enter a league ID to see available players
              </div>
            )}
          </motion.div>
        )}

        {!filters.league && (searchQuery || searchResults.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-8 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                Search Results ({searchResults.length})
              </h3>
              {searchResults.length > 0 && (
                <div className="text-sm text-gray-500">
                  Click to view stats • Select up to 3 for comparison
                </div>
              )}
            </div>

            {searchResults.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {searchResults.map((player) => {
                  const isSelected = selectedPlayers.find(p => p.id === player.id);
                  
                  return (
                    <div
                      key={player.id}
                      onClick={() => fetchPlayerStats(player.id, player.name, selectedYear)}
                      className={`p-6 rounded-2xl border transition-all duration-300 cursor-pointer ${
                        isSelected 
                          ? 'bg-white/95 dark:bg-gray-800/95 border-blue-500 ring-2 ring-blue-400/50 shadow-xl'
                          : 'bg-white/90 dark:bg-gray-800/90 border-gray-200/50 dark:border-gray-600/50 hover:bg-white/95 dark:hover:bg-gray-700/95 hover:border-gray-300 dark:hover:border-gray-500 shadow-lg hover:shadow-xl'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${getPositionColor(player.position)}`}>
                            {player.position}
                          </span>
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{player.team || 'FA'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePlayerSelection(player);
                            }}
                            className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                              isSelected 
                                ? 'bg-blue-500 border-blue-500 text-white'
                                : 'border-gray-400 dark:border-gray-500 hover:border-blue-500 text-gray-600 dark:text-gray-400'
                            }`}
                          >
                            {isSelected && '✓'}
                          </button>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-white mb-3 text-lg">
                          {player.name}
                        </h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded-lg">
                            <span className="text-green-700 dark:text-green-300 font-medium">Total:</span>
                            <div className="font-bold text-green-800 dark:text-green-200 text-lg">{(player.fantasyPoints || 0).toFixed(1)}</div>
                          </div>
                          <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg">
                            <span className="text-blue-700 dark:text-blue-300 font-medium">PPG:</span>
                            <div className="font-bold text-blue-800 dark:text-blue-200 text-lg">{(player.ppg || 0).toFixed(1)}</div>
                          </div>
                          {player.gamesPlayed > 0 && (
                            <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg">
                              <span className="text-gray-700 dark:text-gray-300 font-medium">GP:</span>
                              <div className="font-bold text-gray-800 dark:text-gray-200">{player.gamesPlayed}</div>
                            </div>
                          )}
                          {player.age && (
                            <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg">
                              <span className="text-gray-700 dark:text-gray-300 font-medium">Age:</span>
                              <div className="font-bold text-gray-800 dark:text-gray-200">{player.age}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : searchQuery.length >= 2 && !loadingSearch ? (
              <div className="text-center py-8 text-gray-500">
                No players found matching "{searchQuery}"
              </div>
            ) : searchQuery.length < 2 ? (
              <div className="text-center py-8 text-gray-500">
                Type at least 2 characters to search for players
              </div>
            ) : null}
          </motion.div>
        )}

        <PlayerStatsModal
          showPlayerStats={showPlayerStats}
          playerStatsData={playerStatsData}
          loadingPlayerStats={loadingPlayerStats}
          playerStatsTab={playerStatsTab}
          setPlayerStatsTab={setPlayerStatsTab}
          allYearStats={allYearStats}
          onClose={closePlayerStats}
          onSwitchToYear={switchToYear}
          leagueData={leagueData}
        />

        <PlayerComparisonModal
          show={showComparison}
          players={selectedPlayers}
          onClose={() => setShowComparison(false)}
          onClearSelection={() => setSelectedPlayers([])}
        />
      </div>
    </div>
  );
}

export default PlayerStatsPage;