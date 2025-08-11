import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeftIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';

const LeagueScouter = ({ onBack, onShowAuth, onLeagueInfoClick }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({ 
    username: '', 
    year: new Date().getFullYear().toString() 
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [leagueMembers, setLeagueMembers] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'totalLeagues', direction: 'desc' });
  const [filterConfig, setFilterConfig] = useState({ minLeagues: '', minChampionships: '', minWins: '' });
  const [memberSortConfig, setMemberSortConfig] = useState({ key: 'championships', direction: 'desc' });
  const [expandedUser, setExpandedUser] = useState(null);
  const [expandedUserData, setExpandedUserData] = useState({});


  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.username.trim()) {
      setError('Please enter a username');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setResults(null);
    
    try {
      console.log('Searching for user leagues:', formData);
      
      const { userSummaries, allMembers } = await getUserSeasonSummaries(formData.username.trim(), formData.year);
      setResults(userSummaries);
      setLeagueMembers(allMembers);
      
    } catch (err) {
      console.error('Error:', err);
      setError(err.message || 'Failed to search user data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getUserSeasonSummaries = async (username, year) => {
    const userResponse = await fetch(`https://api.sleeper.app/v1/user/${username}`);
    if (!userResponse.ok) {
      throw new Error('User not found. Please check the username.');
    }
    const userData = await userResponse.json();
    
    const searchYears = year === 'all' ? 
      Array.from({ length: new Date().getFullYear() - 2020 + 1 }, (_, i) => new Date().getFullYear() - i) : 
      [parseInt(year)];
    
    const userSummaries = [];
    const memberTracker = new Map();
    const leagueCache = new Map(); // Cache league data
    const userLeagueCache = new Map(); // Cache user leagues by year
    
    // First pass: Get searched user's leagues and build member list
    for (const searchYear of searchYears) {
      try {
        const leaguesResponse = await fetch(`https://api.sleeper.app/v1/user/${userData.user_id}/leagues/nfl/${searchYear}`);
        if (!leaguesResponse.ok) continue;
        
        const leagues = await leaguesResponse.json();
        if (leagues.length === 0) continue;
        
        let totalWins = 0, totalLosses = 0, totalTies = 0, championships = 0, totalPointsFor = 0, totalPointsAgainst = 0;
        
        // Batch fetch league data
        const leaguePromises = leagues.map(async (league) => {
          if (leagueCache.has(league.league_id)) {
            return leagueCache.get(league.league_id);
          }
          
          try {
            const [rostersResponse, usersResponse, playoffResponse] = await Promise.all([
              fetch(`https://api.sleeper.app/v1/league/${league.league_id}/rosters`),
              fetch(`https://api.sleeper.app/v1/league/${league.league_id}/users`),
              league.status === 'complete' ? fetch(`https://api.sleeper.app/v1/league/${league.league_id}/winners_bracket`) : Promise.resolve(null)
            ]);
            
            const rosters = rostersResponse.ok ? await rostersResponse.json() : [];
            const users = usersResponse.ok ? await usersResponse.json() : [];
            const playoffs = playoffResponse?.ok ? await playoffResponse.json() : null;
            
            const leagueData = { league, rosters, users, playoffs };
            leagueCache.set(league.league_id, leagueData);
            return leagueData;
          } catch (err) {
            return null;
          }
        });
        
        const leagueResults = await Promise.all(leaguePromises);
        
        leagueResults.forEach(result => {
          if (!result) return;
          const { league, rosters, users, playoffs } = result;
          const userRoster = rosters.find(r => r.owner_id === userData.user_id);
          
          // Track members
          users.forEach(user => {
            if (user.user_id !== userData.user_id) {
              if (!memberTracker.has(user.user_id)) {
                memberTracker.set(user.user_id, {
                  user_id: user.user_id,
                  username: user.display_name || user.username,
                  avatar: user.avatar,
                  sharedLeagues: [],
                  totalSharedLeagues: 0,
                  yearsPlayed: new Set(),
                  totalWins: 0, totalLosses: 0, totalTies: 0, championships: 0,
                  totalPointsFor: 0, totalPointsAgainst: 0, totalLeagues: 0
                });
              }
              const member = memberTracker.get(user.user_id);
              member.sharedLeagues.push({ name: league.name, year: searchYear, league_id: league.league_id });
              member.totalSharedLeagues++;
              member.yearsPlayed.add(searchYear);
            }
          });
          
          // User stats
          if (userRoster) {
            totalWins += userRoster.settings?.wins || 0;
            totalLosses += userRoster.settings?.losses || 0;
            totalTies += userRoster.settings?.ties || 0;
            totalPointsFor += userRoster.settings?.fpts || 0;
            totalPointsAgainst += userRoster.settings?.fpts_against || 0;
            
            if (playoffs?.length > 0) {
              const finalMatch = playoffs.reduce((max, match) => match.r > max.r ? match : max, playoffs[0]);
              if (finalMatch?.w === userRoster.roster_id) championships++;
            }
          }
        });
        
        if (leagues.length > 0) {
          userSummaries.push({
            year: searchYear, username: userData.display_name || userData.username,
            totalLeagues: leagues.length, totalWins, totalLosses, totalTies, championships,
            totalPointsFor, totalPointsAgainst,
            winPercentage: totalWins + totalLosses > 0 ? (totalWins / (totalWins + totalLosses) * 100).toFixed(1) : '0.0',
            avgPointsPerGame: totalWins + totalLosses > 0 ? (totalPointsFor / (totalWins + totalLosses)).toFixed(1) : '0.0',
            pointsDiff: totalPointsFor - totalPointsAgainst
          });
        }
      } catch (err) {
        console.log(`Could not search leagues for year ${searchYear}`);
      }
    }
    
    if (userSummaries.length === 0) {
      throw new Error(`No league data found for user "${username}".`);
    }
    
    // Second pass: Get all leagues for each member (batch by user)
    const memberPromises = Array.from(memberTracker.values()).map(async (member) => {
      try {
        const memberStats = { ...member };
        
        // Batch fetch all years for this member
        const yearPromises = searchYears.map(async (year) => {
          const cacheKey = `${member.user_id}-${year}`;
          if (userLeagueCache.has(cacheKey)) {
            return userLeagueCache.get(cacheKey);
          }
          
          try {
            const response = await fetch(`https://api.sleeper.app/v1/user/${member.user_id}/leagues/nfl/${year}`);
            const leagues = response.ok ? await response.json() : [];
            userLeagueCache.set(cacheKey, leagues);
            return leagues;
          } catch {
            return [];
          }
        });
        
        const allYearLeagues = await Promise.all(yearPromises);
        
        // Process all leagues for this member
        for (let i = 0; i < allYearLeagues.length; i++) {
          const leagues = allYearLeagues[i];
          const year = searchYears[i];
          
          for (const league of leagues) {
            let leagueData = leagueCache.get(league.league_id);
            
            if (!leagueData) {
              try {
                const [rostersResponse, playoffResponse] = await Promise.all([
                  fetch(`https://api.sleeper.app/v1/league/${league.league_id}/rosters`),
                  league.status === 'complete' ? fetch(`https://api.sleeper.app/v1/league/${league.league_id}/winners_bracket`) : Promise.resolve(null)
                ]);
                
                const rosters = rostersResponse.ok ? await rostersResponse.json() : [];
                const playoffs = playoffResponse?.ok ? await playoffResponse.json() : null;
                
                leagueData = { league, rosters, users: [], playoffs };
                leagueCache.set(league.league_id, leagueData);
              } catch {
                continue;
              }
            }
            
            const memberRoster = leagueData.rosters.find(r => r.owner_id === member.user_id);
            if (memberRoster) {
              memberStats.totalWins += memberRoster.settings?.wins || 0;
              memberStats.totalLosses += memberRoster.settings?.losses || 0;
              memberStats.totalTies += memberRoster.settings?.ties || 0;
              memberStats.totalPointsFor += memberRoster.settings?.fpts || 0;
              memberStats.totalPointsAgainst += memberRoster.settings?.fpts_against || 0;
              memberStats.totalLeagues++;
              
              if (leagueData.playoffs?.length > 0) {
                const finalMatch = leagueData.playoffs.reduce((max, match) => match.r > max.r ? match : max, leagueData.playoffs[0]);
                if (finalMatch?.w === memberRoster.roster_id) memberStats.championships++;
              }
            }
          }
        }
        
        memberStats.yearsPlayedCount = memberStats.yearsPlayed.size;
        memberStats.yearsPlayed = Array.from(memberStats.yearsPlayed).sort((a, b) => b - a);
        memberStats.winPercentage = memberStats.totalWins + memberStats.totalLosses > 0 ? 
          (memberStats.totalWins / (memberStats.totalWins + memberStats.totalLosses) * 100).toFixed(1) : '0.0';
        memberStats.avgPointsPerGame = memberStats.totalWins + memberStats.totalLosses > 0 ? 
          (memberStats.totalPointsFor / (memberStats.totalWins + memberStats.totalLosses)).toFixed(1) : '0.0';
        memberStats.pointsDiff = memberStats.totalPointsFor - memberStats.totalPointsAgainst;
        
        return memberStats;
      } catch {
        return null;
      }
    });
    
    const allMembers = (await Promise.all(memberPromises)).filter(Boolean);
    
    return { userSummaries, allMembers };
  };

  const handleSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedResults = (data) => {
    if (!sortConfig.key || !data) return data;
    
    return [...data].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];
      
      if (typeof aValue === 'string' && !isNaN(parseFloat(aValue))) {
        aValue = parseFloat(aValue);
        bValue = parseFloat(bValue);
      }
      
      if (sortConfig.direction === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  };

  const handleMemberSort = (key) => {
    let direction = 'desc';
    if (memberSortConfig.key === key && memberSortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setMemberSortConfig({ key, direction });
  };

  const getSortedMembers = (data) => {
    if (!memberSortConfig.key || !data) return data;
    
    return [...data].sort((a, b) => {
      let aValue = a[memberSortConfig.key];
      let bValue = b[memberSortConfig.key];
      
      if (memberSortConfig.key === 'sharedLeagues') {
        aValue = a.totalSharedLeagues;
        bValue = b.totalSharedLeagues;
      } else if (memberSortConfig.key === 'totalLeagues') {
        aValue = a.totalLeagues;
        bValue = b.totalLeagues;
      } else if (memberSortConfig.key === 'avgPointsPerGame') {
        aValue = parseFloat(a.avgPointsPerGame);
        bValue = parseFloat(b.avgPointsPerGame);
      } else if (memberSortConfig.key === 'pointsDiff') {
        aValue = a.pointsDiff;
        bValue = b.pointsDiff;
      } else if (memberSortConfig.key === 'username') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (memberSortConfig.direction === 'asc') {
        const result = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        if (result === 0 && memberSortConfig.key === 'championships') {
          return parseFloat(b.winPercentage) - parseFloat(a.winPercentage);
        }
        return result;
      } else {
        const result = aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        if (result === 0 && memberSortConfig.key === 'championships') {
          return parseFloat(b.winPercentage) - parseFloat(a.winPercentage);
        }
        return result;
      }
    });
  };

  const getFilteredResults = (data) => {
    if (!data) return data;
    
    return data.filter(user => {
      if (filterConfig.minLeagues && user.totalLeagues < parseInt(filterConfig.minLeagues)) return false;
      if (filterConfig.minChampionships && user.championships < parseInt(filterConfig.minChampionships)) return false;
      if (filterConfig.minWins && user.totalWins < parseInt(filterConfig.minWins)) return false;
      return true;
    });
  };

  const loadUserBreakdown = async (member) => {
    if (expandedUserData[member.user_id]) return;
    
    try {
      const searchYears = formData.year === 'all' ? 
        Array.from({ length: new Date().getFullYear() - 2020 + 1 }, (_, i) => new Date().getFullYear() - i) : 
        [parseInt(formData.year)];
      
      const leagueData = [];
      
      for (const year of searchYears) {
        try {
          const response = await fetch(`https://api.sleeper.app/v1/user/${member.user_id}/leagues/nfl/${year}`);
          if (!response.ok) continue;
          
          const leagues = await response.json();
          if (leagues.length === 0) continue;
          
          for (const league of leagues) {
            try {
              const [rostersResponse, playoffResponse] = await Promise.all([
                fetch(`https://api.sleeper.app/v1/league/${league.league_id}/rosters`),
                league.status === 'complete' ? fetch(`https://api.sleeper.app/v1/league/${league.league_id}/winners_bracket`) : Promise.resolve(null)
              ]);
              
              const rosters = rostersResponse.ok ? await rostersResponse.json() : [];
              const playoffs = playoffResponse?.ok ? await playoffResponse.json() : null;
              
              const userRoster = rosters.find(r => r.owner_id === member.user_id);
              if (userRoster) {
                const wins = userRoster.settings?.wins || 0;
                const losses = userRoster.settings?.losses || 0;
                const ties = userRoster.settings?.ties || 0;
                const pointsFor = userRoster.settings?.fpts || 0;
                const pointsAgainst = userRoster.settings?.fpts_against || 0;
                
                let isChampion = false;
                if (playoffs?.length > 0) {
                  const finalMatch = playoffs.reduce((max, match) => match.r > max.r ? match : max, playoffs[0]);
                  isChampion = finalMatch?.w === userRoster.roster_id;
                }
                
                leagueData.push({
                  year,
                  leagueName: league.name,
                  league_id: league.league_id,
                  wins,
                  losses,
                  ties,
                  isChampion,
                  pointsFor,
                  pointsAgainst,
                  winPercentage: wins + losses > 0 ? (wins / (wins + losses) * 100).toFixed(1) : '0.0',
                  avgPointsPerGame: wins + losses > 0 ? (pointsFor / (wins + losses)).toFixed(1) : '0.0',
                  pointsDiff: pointsFor - pointsAgainst
                });
              }
            } catch {}
          }
        } catch {}
      }
      
      setExpandedUserData(prev => ({
        ...prev,
        [member.user_id]: leagueData.sort((a, b) => 
          (b.isChampion ? 1 : 0) - (a.isChampion ? 1 : 0) || 
          b.wins - a.wins
        )
      }));
    } catch {}
  };

  const resetSearch = () => {
    setError(null);
    setResults(null);
    setLeagueMembers(null);
    setFormData({ username: '', year: new Date().getFullYear().toString() });
    setSortConfig({ key: 'totalLeagues', direction: 'desc' });
    setFilterConfig({ minLeagues: '', minChampionships: '', minWins: '' });
    setMemberSortConfig({ key: 'championships', direction: 'desc' });
    setExpandedUserData({});
  };

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
                  League Scouter
                </h1>
                <p className="text-lg text-gray-500 dark:text-gray-400 font-medium">
                  Please log in to access the League Scouter
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
              You need to be logged in to use the League Scouter feature.
            </p>
            <button
              onClick={() => {
                if (onShowAuth) {
                  onShowAuth();
                } else {
                  onBack();
                }
              }}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Go Back to Sign In
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

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
                League Scouter
              </h1>
              <p className="text-lg text-gray-500 dark:text-gray-400 font-medium">
                Search and analyze fantasy leagues by sleeper username
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-lg">
            <h2 className="text-xl font-bold mb-4">Search User Season Summary</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Sleeper Username
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="Enter sleeper username..."
                      className="w-full px-4 py-3 bg-white/70 dark:bg-gray-700/70 border border-gray-300/50 dark:border-gray-600/50 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 backdrop-blur-sm"
                      disabled={isLoading}
                    />
                    <MagnifyingGlassIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Season Year
                  </label>
                  <select
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    className="w-full px-4 py-3 bg-white/70 dark:bg-gray-700/70 border border-gray-300/50 dark:border-gray-600/50 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 backdrop-blur-sm"
                    disabled={isLoading}
                  >
                    <option value="all">All Years</option>
                    {Array.from({ length: new Date().getFullYear() - 2020 + 1 }, (_, i) => {
                      const year = new Date().getFullYear() - i;
                      return (
                        <option key={year} value={year.toString()}>
                          {year}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div className="flex gap-4 items-end">
                <button
                  type="submit"
                  disabled={isLoading || !formData.username.trim()}
                  className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? 'Searching...' : 'Search Leagues'}
                </button>
              </div>
            </form>
          </div>
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8"
          >
            <div className="bg-red-50/80 dark:bg-red-900/20 backdrop-blur-xl border border-red-200/50 dark:border-red-800/50 rounded-2xl p-6 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center">
                  <span className="text-red-600 dark:text-red-400 text-sm">⚠️</span>
                </div>
                <div>
                  <p className="text-red-800 dark:text-red-200 font-medium">{error}</p>
                  <button
                    onClick={resetSearch}
                    className="mt-1 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium transition-colors"
                  >
                    Try again →
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}



        {results !== null && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {results.length > 0 ? (
              <div className="space-y-6">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <MagnifyingGlassIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                      User Analysis
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">
                      {results[0]?.username} - {results.length} season{results.length !== 1 ? 's' : ''} • {leagueMembers?.length || 0} league members
                    </p>
                  </div>
                </div>

                {/* Searched User Season Summaries - Highlighted */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 backdrop-blur-xl rounded-2xl shadow-2xl border-2 border-blue-200 dark:border-blue-700 overflow-hidden mb-8">
                  <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      🎯 {results[0]?.username} - Yearly Summaries
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-800 dark:to-purple-800 border-b border-blue-200 dark:border-blue-600">
                          <th className="text-left py-4 px-6 font-semibold text-blue-800 dark:text-blue-200">
                            <button 
                              onClick={() => handleSort('year')}
                              className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            >
                              Year {sortConfig.key === 'year' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
                            </button>
                          </th>
                          <th className="text-center py-4 px-6 font-semibold text-blue-800 dark:text-blue-200">
                            <button 
                              onClick={() => handleSort('totalLeagues')}
                              className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors mx-auto"
                            >
                              Leagues {sortConfig.key === 'totalLeagues' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
                            </button>
                          </th>
                          <th className="text-center py-4 px-6 font-semibold text-blue-800 dark:text-blue-200">
                            <button 
                              onClick={() => handleSort('totalWins')}
                              className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors mx-auto"
                            >
                              Record {sortConfig.key === 'totalWins' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
                            </button>
                          </th>
                          <th className="text-center py-4 px-6 font-semibold text-blue-800 dark:text-blue-200">
                            <button 
                              onClick={() => handleSort('championships')}
                              className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors mx-auto"
                            >
                              Championships {sortConfig.key === 'championships' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
                            </button>
                          </th>
                          <th className="text-center py-4 px-6 font-semibold text-blue-800 dark:text-blue-200">
                            <button 
                              onClick={() => handleSort('winPercentage')}
                              className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors mx-auto"
                            >
                              Win % {sortConfig.key === 'winPercentage' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
                            </button>
                          </th>
                          <th className="text-center py-4 px-6 font-semibold text-blue-800 dark:text-blue-200">
                            <button 
                              onClick={() => handleSort('avgPointsPerGame')}
                              className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors mx-auto"
                            >
                              Avg/Game {sortConfig.key === 'avgPointsPerGame' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
                            </button>
                          </th>
                          <th className="text-center py-4 px-6 font-semibold text-blue-800 dark:text-blue-200">
                            <button 
                              onClick={() => handleSort('pointsDiff')}
                              className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors mx-auto"
                            >
                              +/- {sortConfig.key === 'pointsDiff' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
                            </button>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {getSortedResults(getFilteredResults(results)).map((userSeason, index) => (
                          <tr key={`${userSeason.username}-${userSeason.year}`} className={`border-b border-blue-100 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors ${
                            userSeason.championships > 0 ? 'bg-yellow-50/50 dark:bg-yellow-900/20' : ''
                          }`}>
                            <td className="py-4 px-6">
                              <span className="font-bold text-blue-700 dark:text-blue-300">
                                {userSeason.year}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-center">
                              <span className="font-semibold text-blue-600 dark:text-blue-400">
                                {userSeason.totalLeagues}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-center">
                              <span className="font-semibold">
                                {userSeason.totalWins}-{userSeason.totalLosses}
                                {userSeason.totalTies > 0 && `-${userSeason.totalTies}`}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-center">
                              <span className={`font-bold flex items-center justify-center gap-1 ${
                                userSeason.championships > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-400'
                              }`}>
                                {userSeason.championships > 0 && '🏆'}
                                {userSeason.championships}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-center">
                              <span className={`font-medium ${
                                parseFloat(userSeason.winPercentage) >= 60 ? 'text-green-600 dark:text-green-400' :
                                parseFloat(userSeason.winPercentage) >= 40 ? 'text-yellow-600 dark:text-yellow-400' :
                                'text-red-600 dark:text-red-400'
                              }`}>
                                {userSeason.winPercentage}%
                              </span>
                            </td>
                            <td className="py-4 px-6 text-center">
                              <span className="font-medium text-purple-600 dark:text-purple-400">
                                {userSeason.avgPointsPerGame}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-center">
                              <span className={`font-bold ${
                                userSeason.pointsDiff > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                              }`}>
                                {userSeason.pointsDiff > 0 ? '+' : ''}{userSeason.pointsDiff.toFixed(1)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* League Members */}
                {leagueMembers && (
                  <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
                    <div className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 px-6 py-4">
                      <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                        🏆 Personal Leaderboard ({leagueMembers.length + 1})
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 border-b border-gray-200 dark:border-gray-600">
                            <th className="text-left py-4 px-6 font-semibold text-gray-700 dark:text-gray-300">
                              <button 
                                onClick={() => handleMemberSort('username')}
                                className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                              >
                                Username {memberSortConfig.key === 'username' && (memberSortConfig.direction === 'desc' ? '↓' : '↑')}
                              </button>
                            </th>
                            <th className="text-center py-4 px-6 font-semibold text-gray-700 dark:text-gray-300">
                              <button 
                                onClick={() => handleMemberSort('totalLeagues')}
                                className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors mx-auto"
                              >
                                Total Leagues {memberSortConfig.key === 'totalLeagues' && (memberSortConfig.direction === 'desc' ? '↓' : '↑')}
                              </button>
                            </th>
                            <th className="text-center py-4 px-6 font-semibold text-gray-700 dark:text-gray-300">
                              <button 
                                onClick={() => handleMemberSort('totalWins')}
                                className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors mx-auto"
                              >
                                Record {memberSortConfig.key === 'totalWins' && (memberSortConfig.direction === 'desc' ? '↓' : '↑')}
                              </button>
                            </th>
                            <th className="text-center py-4 px-6 font-semibold text-gray-700 dark:text-gray-300">
                              <button 
                                onClick={() => handleMemberSort('championships')}
                                className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors mx-auto"
                              >
                                Championships {memberSortConfig.key === 'championships' && (memberSortConfig.direction === 'desc' ? '↓' : '↑')}
                              </button>
                            </th>
                            <th className="text-center py-4 px-6 font-semibold text-gray-700 dark:text-gray-300">
                              <button 
                                onClick={() => handleMemberSort('winPercentage')}
                                className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors mx-auto"
                              >
                                Win % {memberSortConfig.key === 'winPercentage' && (memberSortConfig.direction === 'desc' ? '↓' : '↑')}
                              </button>
                            </th>
                            <th className="text-center py-4 px-6 font-semibold text-gray-700 dark:text-gray-300">
                              <button 
                                onClick={() => handleMemberSort('avgPointsPerGame')}
                                className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors mx-auto"
                              >
                                Avg/Game {memberSortConfig.key === 'avgPointsPerGame' && (memberSortConfig.direction === 'desc' ? '↓' : '↑')}
                              </button>
                            </th>
                            <th className="text-center py-4 px-6 font-semibold text-gray-700 dark:text-gray-300">
                              <button 
                                onClick={() => handleMemberSort('pointsDiff')}
                                className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors mx-auto"
                              >
                                +/- {memberSortConfig.key === 'pointsDiff' && (memberSortConfig.direction === 'desc' ? '↓' : '↑')}
                              </button>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {getSortedMembers([...leagueMembers, (() => {
                            const searchedUserStats = {
                              user_id: 'searched_user',
                              username: results[0].username,
                              totalLeagues: results.reduce((sum, r) => sum + r.totalLeagues, 0),
                              totalWins: results.reduce((sum, r) => sum + r.totalWins, 0),
                              totalLosses: results.reduce((sum, r) => sum + r.totalLosses, 0),
                              totalTies: results.reduce((sum, r) => sum + r.totalTies, 0),
                              championships: results.reduce((sum, r) => sum + r.championships, 0),
                              totalPointsFor: results.reduce((sum, r) => sum + r.totalPointsFor, 0),
                              totalPointsAgainst: results.reduce((sum, r) => sum + r.totalPointsAgainst, 0),
                              winPercentage: (() => {
                                const totalW = results.reduce((sum, r) => sum + r.totalWins, 0);
                                const totalL = results.reduce((sum, r) => sum + r.totalLosses, 0);
                                return totalW + totalL > 0 ? (totalW / (totalW + totalL) * 100).toFixed(1) : '0.0';
                              })(),
                              avgPointsPerGame: (() => {
                                const totalW = results.reduce((sum, r) => sum + r.totalWins, 0);
                                const totalL = results.reduce((sum, r) => sum + r.totalLosses, 0);
                                const totalPF = results.reduce((sum, r) => sum + r.totalPointsFor, 0);
                                return totalW + totalL > 0 ? (totalPF / (totalW + totalL)).toFixed(1) : '0.0';
                              })(),
                              pointsDiff: results.reduce((sum, r) => sum + r.totalPointsFor, 0) - results.reduce((sum, r) => sum + r.totalPointsAgainst, 0)
                            };
                            return searchedUserStats;
                          })()]).map((member, index) => (
                            <React.Fragment key={member.user_id}>
                              <tr 
                                onClick={async () => {
                                  const newExpandedUser = expandedUser === member.user_id ? null : member.user_id;
                                  setExpandedUser(newExpandedUser);
                                  if (newExpandedUser && !expandedUserData[member.user_id]) {
                                    await loadUserBreakdown(member);
                                  }
                                }}
                                className={`border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer ${
                                  member.user_id === 'searched_user' ? 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 border-2 border-blue-200 dark:border-blue-700' : ''
                                }`}>
                                <td className="py-4 px-6">
                                  <span className={`font-medium ${
                                    member.user_id === 'searched_user' ? 'font-bold text-blue-700 dark:text-blue-300 flex items-center gap-2' : 'text-gray-900 dark:text-white'
                                  }`}>
                                    {member.user_id === 'searched_user' && '🎯'} {member.username}
                                  </span>
                                </td>
                                <td className="py-4 px-6 text-center">
                                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                                    {member.totalLeagues}
                                  </span>
                                </td>
                                <td className="py-4 px-6 text-center">
                                  <span className="font-semibold">
                                    {member.totalWins}-{member.totalLosses}
                                    {member.totalTies > 0 && `-${member.totalTies}`}
                                  </span>
                                </td>
                                <td className="py-4 px-6 text-center">
                                  <span className={`font-bold flex items-center justify-center gap-1 ${
                                    member.championships > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-400'
                                  }`}>
                                    {member.championships > 0 && '🏆'}
                                    {member.championships}
                                  </span>
                                </td>
                                <td className="py-4 px-6 text-center">
                                  <span className={`font-medium ${
                                    parseFloat(member.winPercentage) >= 60 ? 'text-green-600 dark:text-green-400' :
                                    parseFloat(member.winPercentage) >= 40 ? 'text-yellow-600 dark:text-yellow-400' :
                                    'text-red-600 dark:text-red-400'
                                  }`}>
                                    {member.winPercentage}%
                                  </span>
                                </td>
                                <td className="py-4 px-6 text-center">
                                  <span className="font-medium text-purple-600 dark:text-purple-400">
                                    {member.avgPointsPerGame}
                                  </span>
                                </td>
                                <td className="py-4 px-6 text-center">
                                  <span className={`font-bold ${
                                    member.pointsDiff > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                  }`}>
                                    {member.pointsDiff > 0 ? '+' : ''}{member.pointsDiff.toFixed(1)}
                                  </span>
                                </td>
                              </tr>
                              {expandedUser === member.user_id && (
                                <tr>
                                  <td colSpan={7} className="p-0">
                                    <div className="bg-gradient-to-r from-slate-50 to-gray-100 dark:from-slate-800 dark:to-gray-700 border-l-4 border-blue-500 mx-4 mb-4 rounded-lg overflow-hidden shadow-inner">
                                      <div className="p-6">
                                        <div className="flex items-center gap-3 mb-4">
                                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                                            <span className="text-white text-sm font-bold">📈</span>
                                          </div>
                                          <h4 className="text-lg font-bold text-gray-800 dark:text-gray-200">
                                            {member.username} - League Breakdown
                                          </h4>
                                        </div>
                                        {!expandedUserData[member.user_id] ? (
                                          <div className="text-center py-8">
                                            <div className="text-3xl mb-3">🔄</div>
                                            <p className="text-gray-600 dark:text-gray-400">Loading league details...</p>
                                          </div>
                                        ) : expandedUserData[member.user_id].length === 0 ? (
                                          <div className="text-center py-8">
                                            <div className="text-3xl mb-3">📋</div>
                                            <p className="text-gray-600 dark:text-gray-400">No league data found</p>
                                          </div>
                                        ) : (
                                          <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                              <thead>
                                                <tr className="bg-gray-100 dark:bg-gray-600">
                                                  <th className="text-left py-2 px-3 font-semibold">Year</th>
                                                  <th className="text-left py-2 px-3 font-semibold">League Name</th>
                                                  <th className="text-center py-2 px-3 font-semibold">Record</th>
                                                  <th className="text-center py-2 px-3 font-semibold">Champion</th>
                                                  <th className="text-center py-2 px-3 font-semibold">Win %</th>
                                                  <th className="text-center py-2 px-3 font-semibold">Avg/Game</th>
                                                  <th className="text-center py-2 px-3 font-semibold">+/-</th>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                {expandedUserData[member.user_id].map((leagueData, idx) => (
                                                  <tr key={`${leagueData.year}-${leagueData.leagueName}-${idx}`} className="border-b border-gray-200 dark:border-gray-600">
                                                    <td className="py-2 px-3 font-medium">{leagueData.year}</td>
                                                    <td className="py-2 px-3">
                                                      <button 
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          console.log('League name clicked:', leagueData.leagueName);
                                                          if (onLeagueInfoClick) {
                                                            const leagueObj = {
                                                              league_id: leagueData.league_id,
                                                              name: leagueData.leagueName,
                                                              season: leagueData.year.toString(),
                                                              total_rosters: 12 // Default value
                                                            };
                                                            console.log('Calling onLeagueInfoClick with:', leagueObj);
                                                            onLeagueInfoClick(leagueObj);
                                                          } else {
                                                            console.log('onLeagueInfoClick not available');
                                                          }
                                                        }}
                                                        className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors text-left"
                                                      >
                                                        {leagueData.leagueName}
                                                      </button>
                                                    </td>
                                                    <td className="py-2 px-3 text-center">
                                                      {leagueData.wins}-{leagueData.losses}{leagueData.ties > 0 && `-${leagueData.ties}`}
                                                    </td>
                                                    <td className="py-2 px-3 text-center">
                                                      <span className={leagueData.isChampion ? 'text-yellow-600 dark:text-yellow-400 font-bold' : 'text-gray-400'}>
                                                        {leagueData.isChampion ? '🏆' : '-'}
                                                      </span>
                                                    </td>
                                                    <td className="py-2 px-3 text-center">
                                                      <span className={`font-medium ${
                                                        parseFloat(leagueData.winPercentage) >= 60 ? 'text-green-600 dark:text-green-400' :
                                                        parseFloat(leagueData.winPercentage) >= 40 ? 'text-yellow-600 dark:text-yellow-400' :
                                                        'text-red-600 dark:text-red-400'
                                                      }`}>
                                                        {leagueData.winPercentage}%
                                                      </span>
                                                    </td>
                                                    <td className="py-2 px-3 text-center text-purple-600 dark:text-purple-400">
                                                      {leagueData.avgPointsPerGame}
                                                    </td>
                                                    <td className="py-2 px-3 text-center">
                                                      <span className={`font-bold ${
                                                        leagueData.pointsDiff > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                                      }`}>
                                                        {leagueData.pointsDiff > 0 ? '+' : ''}{leagueData.pointsDiff.toFixed(1)}
                                                      </span>
                                                    </td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">📊</div>
                <p className="text-gray-500 dark:text-gray-400 text-lg">No season data found</p>
                <p className="text-sm text-gray-400 mt-2">
                  Try searching with a different username or year
                </p>
              </div>
            )}
          </motion.div>
        )}
      </div>


    </div>
  );
};

export default LeagueScouter;