import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeftIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';

const LeagueScouter = ({ onBack, onShowAuth }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({ 
    leagueName: '', 
    year: new Date().getFullYear().toString() 
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.leagueName.trim()) {
      setError('Please enter a league ID');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setResults(null);
    
    try {
      console.log('Searching for league:', formData);
      
      // For now, treat league name as league ID since Sleeper doesn't support name search
      const leagueId = formData.leagueName.trim();
      
      if (formData.year === 'all') {
        // Search across multiple years by checking previous_league_id chain
        const allYearResults = await searchLeagueAcrossYears(leagueId);
        setResults(allYearResults);
      } else {
        // Search single league
        const leagueData = await searchLeagueById(leagueId);
        setResults([leagueData]);
      }
      
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to search leagues. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const searchLeaguesByName = async (leagueName, year) => {
    // Since Sleeper doesn't provide direct league name search, we need league IDs
    // This function expects users to provide league IDs or we need a different approach
    throw new Error('League search by name requires specific league IDs. Please provide a league ID instead of a name.');
  };

  const searchLeagueById = async (leagueId) => {
    try {
      // Get league info
      const leagueResponse = await fetch(`https://api.sleeper.app/v1/league/${leagueId}`);
      if (!leagueResponse.ok) {
        throw new Error('League not found');
      }
      const league = await leagueResponse.json();

      // Get league users
      const usersResponse = await fetch(`https://api.sleeper.app/v1/league/${leagueId}/users`);
      const users = await usersResponse.json();

      // Get league rosters
      const rostersResponse = await fetch(`https://api.sleeper.app/v1/league/${leagueId}/rosters`);
      const rosters = await rostersResponse.json();

      // Combine user and roster data
      const userStats = users.map(user => {
        const roster = rosters.find(r => r.owner_id === user.user_id);
        if (!roster) return null;

        return {
          user_id: user.user_id,
          display_name: user.display_name || user.username,
          username: user.username,
          avatar: user.avatar,
          roster_id: roster.roster_id,
          wins: roster.settings?.wins || 0,
          losses: roster.settings?.losses || 0,
          ties: roster.settings?.ties || 0,
          points_for: roster.settings?.fpts || 0,
          points_against: roster.settings?.fpts_against || 0,
          placement: roster.settings?.rank || roster.metadata?.rank || null,
          championships: 0 // Will be calculated if league is complete
        };
      }).filter(Boolean);

      // If league is complete, determine champion
      if (league.status === 'complete') {
        try {
          const playoffResponse = await fetch(`https://api.sleeper.app/v1/league/${leagueId}/winners_bracket`);
          if (playoffResponse.ok) {
            const playoffs = await playoffResponse.json();
            if (playoffs && playoffs.length > 0) {
              const finalMatch = playoffs.reduce((max, match) => 
                match.r > max.r ? match : max, playoffs[0]
              );
              if (finalMatch && finalMatch.w) {
                const championUser = userStats.find(u => u.roster_id === finalMatch.w);
                if (championUser) {
                  championUser.championships = 1;
                }
              }
            }
          }
        } catch (err) {
          console.log('Could not fetch playoff data');
        }
      }

      return {
        league_id: league.league_id,
        name: league.name,
        season: league.season,
        total_rosters: league.total_rosters,
        status: league.status,
        users: userStats
      };
    } catch (err) {
      throw new Error(`Failed to fetch league data: ${err.message}`);
    }
  };

  const searchLeagueAcrossYears = async (leagueId) => {
    const results = [];
    const processedLeagues = new Set();
    let currentLeagueId = leagueId;

    // Follow the league chain backwards and forwards
    while (currentLeagueId && !processedLeagues.has(currentLeagueId)) {
      try {
        const leagueData = await searchLeagueById(currentLeagueId);
        results.push(leagueData);
        processedLeagues.add(currentLeagueId);

        // Get the full league object to check for previous_league_id
        const leagueResponse = await fetch(`https://api.sleeper.app/v1/league/${currentLeagueId}`);
        const league = await leagueResponse.json();
        
        currentLeagueId = league.previous_league_id;
      } catch (err) {
        console.log(`Could not fetch league ${currentLeagueId}:`, err.message);
        break;
      }
    }

    // Sort by season year (newest first)
    return results.sort((a, b) => parseInt(b.season) - parseInt(a.season));
  };

  const resetSearch = () => {
    setError(null);
    setResults(null);
    setFormData({ leagueName: '', year: new Date().getFullYear().toString() });
  };

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
                Search and analyze fantasy leagues by ID
              </p>
            </div>
          </div>
        </motion.div>


        {/* Search Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-lg">
            <h2 className="text-xl font-bold mb-4">Search League</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* League Name Input */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    League ID
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.leagueName}
                      onChange={(e) => setFormData({ ...formData, leagueName: e.target.value })}
                      placeholder="Enter league ID..."
                      className="w-full px-4 py-3 bg-white/70 dark:bg-gray-700/70 border border-gray-300/50 dark:border-gray-600/50 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 backdrop-blur-sm"
                      disabled={isLoading}
                    />
                    <MagnifyingGlassIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  </div>
                </div>

                {/* Year Dropdown */}
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
                  disabled={isLoading || !formData.leagueName.trim()}
                  className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? 'Searching...' : 'Search League'}
                </button>
              </div>
            </form>
          </div>
        </motion.div>

        {/* Error Display */}
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

        {/* Results Display */}
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
                      Search Results
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">
                      {results.length} league{results.length !== 1 ? 's' : ''} found
                    </p>
                  </div>
                </div>

                <div className="space-y-8">
                  {results.map((league, index) => (
                    <div key={league.league_id} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-gray-200/50 dark:border-gray-700/50">
                      {/* League Header */}
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{league.name}</h3>
                          <div className="flex items-center gap-4">
                            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium">
                              {league.season}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              league.status === 'complete' 
                                ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200'
                                : 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200'
                            }`}>
                              {league.status === 'complete' ? 'Complete' : 'In Season'}
                            </span>
                          </div>
                        </div>
                        
                        {/* League Summary Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                          <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <div className="text-xl font-bold text-blue-600">{league.total_rosters}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Teams</div>
                          </div>
                          <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <div className="text-xl font-bold text-green-600">
                              {league.users.filter(u => u.championships > 0).length}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Champions</div>
                          </div>
                          <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                            <div className="text-xl font-bold text-purple-600">
                              {(league.users.reduce((sum, u) => sum + u.points_for, 0) / league.users.length).toFixed(1)}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Avg Points</div>
                          </div>
                          <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                            <div className="text-xl font-bold text-orange-600">
                              {Math.max(...league.users.map(u => u.points_for)).toFixed(1)}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">High Score</div>
                          </div>
                        </div>
                      </div>

                      {/* User Stats Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                              <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Rank</th>
                              <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Team</th>
                              <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Record</th>
                              <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Points For</th>
                              <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Points Against</th>
                              <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Diff</th>
                              <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Avg/Game</th>
                              {league.status === 'complete' && (
                                <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Titles</th>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {league.users
                              .sort((a, b) => {
                                if (b.wins !== a.wins) return b.wins - a.wins;
                                return b.points_for - a.points_for;
                              })
                              .map((user, userIndex) => {
                                const diff = user.points_for - user.points_against;
                                const avgPerGame = user.points_for / (user.wins + user.losses || 1);
                                
                                return (
                                  <tr key={user.user_id} className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                                    userIndex < 4 ? 'bg-green-50/30 dark:bg-green-900/10' : 
                                    userIndex >= league.users.length - 2 ? 'bg-red-50/30 dark:bg-red-900/10' : ''
                                  }`}>
                                    <td className="py-3 px-4">
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-gray-900 dark:text-white">
                                          #{userIndex + 1}
                                        </span>
                                        {userIndex === 0 && <span className="text-yellow-500">🥇</span>}
                                        {userIndex === 1 && <span className="text-gray-400">🥈</span>}
                                        {userIndex === 2 && <span className="text-orange-600">🥉</span>}
                                      </div>
                                    </td>
                                    <td className="py-3 px-4">
                                      <div className="font-medium text-gray-900 dark:text-white">
                                        {user.display_name || user.username}
                                      </div>
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                      <span className="font-semibold">
                                        {user.wins}-{user.losses}{user.ties > 0 && `-${user.ties}`}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                      <span className="font-medium text-blue-600 dark:text-blue-400">
                                        {user.points_for.toFixed(1)}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                      <span className="font-medium text-red-600 dark:text-red-400">
                                        {user.points_against.toFixed(1)}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                      <span className={`font-bold ${
                                        diff > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                      }`}>
                                        {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                      <span className="font-medium text-purple-600 dark:text-purple-400">
                                        {avgPerGame.toFixed(1)}
                                      </span>
                                    </td>
                                    {league.status === 'complete' && (
                                      <td className="py-3 px-4 text-center">
                                        <span className={`font-bold ${
                                          user.championships > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-400'
                                        }`}>
                                          {user.championships > 0 ? `🏆 ${user.championships}` : '-'}
                                        </span>
                                      </td>
                                    )}
                                  </tr>
                                );
                              })
                            }
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">🔍</div>
                <p className="text-gray-500 dark:text-gray-400 text-lg">No leagues found</p>
                <p className="text-sm text-gray-400 mt-2">
                  Try searching with a different league ID or year
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