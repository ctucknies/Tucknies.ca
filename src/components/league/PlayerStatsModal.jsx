import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { secureApiCall, validatePlayerId } from '../../utils/security';

const PlayerStatsModal = ({ 
  showPlayerStats, 
  playerStatsData, 
  loadingPlayerStats, 
  playerStatsTab, 
  setPlayerStatsTab,
  allYearStats,
  onClose,
  onSwitchToYear 
}) => {
  const [weeklyStats, setWeeklyStats] = useState(null);
  const [loadingWeekly, setLoadingWeekly] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [weeklyCache, setWeeklyCache] = useState({});

  const fetchWeeklyStats = async (playerId, year) => {
    const cacheKey = `${playerId}-${year}`;
    
    // Check cache first
    if (weeklyCache[cacheKey]) {
      setWeeklyStats(weeklyCache[cacheKey]);
      return;
    }
    
    setLoadingWeekly(true);
    try {
      const weeklyData = [];
      for (let week = 1; week <= 18; week++) {
        try {
          const response = await secureApiCall(`https://api.sleeper.app/v1/stats/nfl/regular/${encodeURIComponent(year)}/${encodeURIComponent(week)}`);
          const weekStats = await response.json();
          const playerWeekStats = weekStats[playerId] || {};
          weeklyData.push({
            week,
            points: playerWeekStats.pts_ppr || playerWeekStats.pts_std || playerWeekStats.pts_half_ppr || 0,
            stats: playerWeekStats
          });
        } catch (err) {
          weeklyData.push({ week, points: 0, stats: {} });
        }
      }
      
      // Cache the result
      setWeeklyCache(prev => ({ ...prev, [cacheKey]: weeklyData }));
      setWeeklyStats(weeklyData);
      
      // Auto-expand target week if specified
      if (playerStatsData?.targetWeek) {
        setSelectedWeek(playerStatsData.targetWeek);
      }
    } catch (err) {
      console.error('Error fetching weekly stats:', err);
      setWeeklyStats([]);
    } finally {
      setLoadingWeekly(false);
    }
  };

  useEffect(() => {
    if (playerStatsTab === 'weekly' && playerStatsData && playerStatsData.playerId && validatePlayerId(playerStatsData.playerId)) {
      const cacheKey = `${playerStatsData.playerId}-${playerStatsData.year}`;
      if (weeklyCache[cacheKey]) {
        setWeeklyStats(weeklyCache[cacheKey]);
        if (playerStatsData.targetWeek) {
          setSelectedWeek(playerStatsData.targetWeek);
        }
      } else {
        fetchWeeklyStats(playerStatsData.playerId, playerStatsData.year);
      }
    }
  }, [playerStatsTab, playerStatsData?.playerId, playerStatsData?.year, weeklyCache]);

  // Reset weekly stats when player changes, but not year
  useEffect(() => {
    setWeeklyStats(null);
    setSelectedWeek(null);
  }, [playerStatsData?.playerId]);

  if (!showPlayerStats) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[150] p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold flex items-center gap-2">
              🏈 {playerStatsData?.playerName} - {playerStatsData?.year} Stats
            </h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>
          
          {loadingPlayerStats ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : playerStatsData && (
            <div>
              <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 mb-6">
                <button
                  onClick={() => setPlayerStatsTab('current')}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    playerStatsTab === 'current'
                      ? 'bg-white dark:bg-gray-800 text-primary-600 shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {playerStatsData.year} Stats
                </button>
                <button
                  onClick={() => {
                    setPlayerStatsTab('weekly');
                    if (!weeklyStats && playerStatsData.playerId) {
                      fetchWeeklyStats(playerStatsData.playerId, playerStatsData.year);
                    }
                  }}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    playerStatsTab === 'weekly'
                      ? 'bg-white dark:bg-gray-800 text-primary-600 shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Weekly Breakdown
                </button>
                <button
                  onClick={() => setPlayerStatsTab('summary')}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    playerStatsTab === 'summary'
                      ? 'bg-white dark:bg-gray-800 text-primary-600 shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Career Summary
                </button>
                {playerStatsTab !== 'summary' && allYearStats && Object.keys(allYearStats).filter(y => (allYearStats[y].stats.gp || 0) > 0).map(year => (
                  <button
                    key={year}
                    onClick={() => onSwitchToYear(year)}
                    className={`py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                      year == playerStatsData.year
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {year}
                  </button>
                ))}
              </div>
              
              {playerStatsTab === 'current' && (
                <div className="space-y-6">
                  {/* Player Info */}
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-4 rounded-lg">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Position:</span>
                        <p className="font-bold">{playerStatsData.playerInfo?.position || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Team:</span>
                        <p className="font-bold">{playerStatsData.playerInfo?.team || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Age:</span>
                        <p className="font-bold">{playerStatsData.playerInfo?.age || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Games:</span>
                        <p className="font-bold">{playerStatsData.stats.gp || 0}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Overall Rank:</span>
                        <p className="font-bold text-blue-600 dark:text-blue-400">#{playerStatsData.overallRank}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Position Rank:</span>
                        <p className="font-bold text-green-600 dark:text-green-400">#{playerStatsData.positionRank}</p>
                      </div>
                    </div>
                  </div>

                  {/* Fantasy Points */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-green-600">{(playerStatsData.stats.pts_ppr || 0).toFixed(1)}</div>
                      <div className="text-sm text-gray-500">PPR Points</div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-blue-600">{(playerStatsData.stats.pts_std || 0).toFixed(1)}</div>
                      <div className="text-sm text-gray-500">Standard Points</div>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-purple-600">{playerStatsData.derivedStats.fantasy_ppg || 'N/A'}</div>
                      <div className="text-sm text-gray-500">PPR Per Game</div>
                    </div>
                  </div>

                  {/* Passing Stats */}
                  {(playerStatsData.stats.pass_att || 0) > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold mb-3">Passing Stats</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                          <div className="font-bold">{playerStatsData.stats.pass_yd || 0}</div>
                          <div className="text-sm text-gray-500">Pass Yards</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                          <div className="font-bold">{playerStatsData.stats.pass_td || 0}</div>
                          <div className="text-sm text-gray-500">Pass TDs</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                          <div className="font-bold">{playerStatsData.stats.pass_int || 0}</div>
                          <div className="text-sm text-gray-500">Interceptions</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                          <div className="font-bold">{playerStatsData.derivedStats.completion_pct || 'N/A'}%</div>
                          <div className="text-sm text-gray-500">Completion %</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Rushing Stats */}
                  {(playerStatsData.stats.rush_att || 0) > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold mb-3">Rushing Stats</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                          <div className="font-bold">{playerStatsData.stats.rush_yd || 0}</div>
                          <div className="text-sm text-gray-500">Rush Yards</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                          <div className="font-bold">{playerStatsData.stats.rush_td || 0}</div>
                          <div className="text-sm text-gray-500">Rush TDs</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                          <div className="font-bold">{playerStatsData.stats.rush_att || 0}</div>
                          <div className="text-sm text-gray-500">Attempts</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                          <div className="font-bold">{playerStatsData.derivedStats.yards_per_carry || 'N/A'}</div>
                          <div className="text-sm text-gray-500">Yards/Carry</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Receiving Stats */}
                  {(playerStatsData.stats.rec || 0) > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold mb-3">Receiving Stats</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                          <div className="font-bold">{playerStatsData.stats.rec_yd || 0}</div>
                          <div className="text-sm text-gray-500">Rec Yards</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                          <div className="font-bold">{playerStatsData.stats.rec_td || 0}</div>
                          <div className="text-sm text-gray-500">Rec TDs</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                          <div className="font-bold">{playerStatsData.stats.rec || 0}</div>
                          <div className="text-sm text-gray-500">Receptions</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                          <div className="font-bold">{playerStatsData.derivedStats.yards_per_reception || 'N/A'}</div>
                          <div className="text-sm text-gray-500">Yards/Rec</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Additional Stats */}
                  <div>
                    <h4 className="text-lg font-semibold mb-3">Additional Stats</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded">
                        <div className="font-bold">{playerStatsData.derivedStats.total_td || 0}</div>
                        <div className="text-sm text-gray-500">Total TDs</div>
                      </div>
                      {playerStatsData.stats.fum && (
                        <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded">
                          <div className="font-bold">{playerStatsData.stats.fum}</div>
                          <div className="text-sm text-gray-500">Fumbles</div>
                        </div>
                      )}
                      {playerStatsData.stats.fum_lost && (
                        <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded">
                          <div className="font-bold">{playerStatsData.stats.fum_lost}</div>
                          <div className="text-sm text-gray-500">Fumbles Lost</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {playerStatsTab === 'weekly' && (
                <div className="space-y-6">
                  <h4 className="text-lg font-semibold">Week-by-Week Performance ({playerStatsData.year})</h4>
                  
                  {loadingWeekly ? (
                    <div className="flex justify-center py-8">
                      <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : weeklyStats ? (
                    <div className="space-y-4">
                      {/* Weekly Stats Summary */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg text-center">
                          <div className="text-xl font-bold text-green-600">
                            {weeklyStats.reduce((sum, week) => sum + week.points, 0).toFixed(1)}
                          </div>
                          <div className="text-sm text-gray-500">Total Points</div>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-center">
                          <div className="text-xl font-bold text-blue-600">
                            {weeklyStats.filter(w => w.points > 0).length}
                          </div>
                          <div className="text-sm text-gray-500">Games Played</div>
                        </div>
                        <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg text-center">
                          <div className="text-xl font-bold text-purple-600">
                            {weeklyStats.length > 0 ? Math.max(...weeklyStats.map(w => w.points)).toFixed(1) : '0'}
                          </div>
                          <div className="text-sm text-gray-500">Best Week</div>
                        </div>
                        <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg text-center">
                          <div className="text-xl font-bold text-orange-600">
                            {(() => {
                              const gamesPlayed = weeklyStats.filter(w => w.points > 0);
                              return gamesPlayed.length > 0 ? (gamesPlayed.reduce((sum, w) => sum + w.points, 0) / gamesPlayed.length).toFixed(1) : '0';
                            })()}
                          </div>
                          <div className="text-sm text-gray-500">Avg/Game</div>
                        </div>
                      </div>

                      {/* Weekly Breakdown */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {weeklyStats.map((week) => (
                          <button
                            key={week.week}
                            onClick={() => setSelectedWeek(selectedWeek === week.week ? null : week.week)}
                            className={`p-4 rounded-lg border-l-4 text-left hover:shadow-md transition-all cursor-pointer ${
                              week.points === 0 
                                ? 'bg-gray-50 dark:bg-gray-700 border-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600'
                                : week.points >= 20
                                ? 'bg-green-50 dark:bg-green-900/20 border-green-500 hover:bg-green-100 dark:hover:bg-green-900/30'
                                : week.points >= 10
                                ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500 hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
                                : 'bg-red-50 dark:bg-red-900/20 border-red-500 hover:bg-red-100 dark:hover:bg-red-900/30'
                            } ${selectedWeek === week.week ? 'ring-2 ring-blue-500' : ''}`}
                          >
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-semibold">Week {week.week}</span>
                              <span className={`text-lg font-bold ${
                                week.points === 0 
                                  ? 'text-gray-500'
                                  : week.points >= 20
                                  ? 'text-green-600 dark:text-green-400'
                                  : week.points >= 10
                                  ? 'text-yellow-600 dark:text-yellow-400'
                                  : 'text-red-600 dark:text-red-400'
                              }`}>
                                {week.points.toFixed(1)}
                              </span>
                            </div>
                            
                            {selectedWeek === week.week && week.points > 0 && week.stats && (
                              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600 space-y-2">
                                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Detailed Stats:</div>
                                {week.stats.pass_yd > 0 && (
                                  <div className="text-sm">
                                    <span className="font-medium">Passing:</span> {week.stats.pass_cmp || 0}/{week.stats.pass_att || 0}, {week.stats.pass_yd} yds, {week.stats.pass_td || 0} TD, {week.stats.pass_int || 0} INT
                                  </div>
                                )}
                                {week.stats.rush_att > 0 && (
                                  <div className="text-sm">
                                    <span className="font-medium">Rushing:</span> {week.stats.rush_att} att, {week.stats.rush_yd} yds, {week.stats.rush_td || 0} TD
                                  </div>
                                )}
                                {week.stats.rec > 0 && (
                                  <div className="text-sm">
                                    <span className="font-medium">Receiving:</span> {week.stats.rec} rec, {week.stats.rec_yd} yds, {week.stats.rec_td || 0} TD
                                  </div>
                                )}
                                {week.stats.fum_lost > 0 && (
                                  <div className="text-sm text-red-600 dark:text-red-400">
                                    <span className="font-medium">Fumbles Lost:</span> {week.stats.fum_lost}
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {selectedWeek !== week.week && week.points > 0 && week.stats && (
                              <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                                {week.stats.pass_yd > 0 && <div>Pass: {week.stats.pass_yd} yds, {week.stats.pass_td || 0} TD</div>}
                                {week.stats.rush_yd > 0 && <div>Rush: {week.stats.rush_yd} yds, {week.stats.rush_td || 0} TD</div>}
                                {week.stats.rec_yd > 0 && <div>Rec: {week.stats.rec || 0} rec, {week.stats.rec_yd} yds, {week.stats.rec_td || 0} TD</div>}
                              </div>
                            )}
                            
                            {week.points === 0 && (
                              <div className="text-xs text-gray-500 italic">Did not play</div>
                            )}
                            
                            <div className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                              {selectedWeek === week.week ? 'Click to collapse' : 'Click for details'}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No weekly data available
                    </div>
                  )}
                </div>
              )}
              
              {playerStatsTab === 'summary' && allYearStats && (
                <div className="space-y-6">
                  <h4 className="text-lg font-semibold">Career Summary</h4>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {Object.values(allYearStats).filter(year => Object.keys(year.stats).length > 0).reduce((sum, year) => sum + (year.stats.pts_ppr || year.stats.pts_std || 0), 0).toFixed(1)}
                      </div>
                      <div className="text-sm text-gray-500">Career Fantasy Points</div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {Object.values(allYearStats).filter(year => Object.keys(year.stats).length > 0).reduce((sum, year) => sum + year.derivedStats.total_td, 0)}
                      </div>
                      <div className="text-sm text-gray-500">Career TDs</div>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {Object.values(allYearStats).filter(year => Object.keys(year.stats).length > 0).length}
                      </div>
                      <div className="text-sm text-gray-500">Active Seasons</div>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {(() => {
                          const yearsWithStats = Object.values(allYearStats).filter(year => Object.keys(year.stats).length > 0);
                          return yearsWithStats.length > 0 ? (yearsWithStats.reduce((sum, year) => sum + (year.stats.pts_ppr || year.stats.pts_std || 0), 0) / yearsWithStats.length).toFixed(1) : '0';
                        })()}
                      </div>
                      <div className="text-sm text-gray-500">Avg Points/Season</div>
                    </div>
                  </div>
                  
                  <div>
                    <h5 className="text-md font-semibold mb-3">Year-by-Year Performance</h5>
                    <div className="space-y-2">
                      {(() => {
                        const yearsWithGames = Object.entries(allYearStats).filter(([year, data]) => (data.stats.gp || 0) > 0);
                        const rookieYear = yearsWithGames.length > 0 ? Math.min(...yearsWithGames.map(([year]) => parseInt(year))) : null;
                        return yearsWithGames.sort(([a], [b]) => parseInt(b) - parseInt(a)).map(([year, data]) => (
                        <div key={year} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <button
                              onClick={() => onSwitchToYear(year)}
                              className="text-lg font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 flex items-center gap-2"
                            >
                              {year} Season
                              {parseInt(year) === rookieYear && <span className="text-xs bg-green-500 text-white px-2 py-1 rounded-full">ROOKIE</span>}
                            </button>
                            <div className="text-sm text-gray-500">#{data.positionRank} {playerStatsData.playerInfo?.position}</div>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Fantasy Points:</span>
                              <div className="font-bold">{(data.stats.pts_ppr || data.stats.pts_std || 0).toFixed(1)}</div>
                            </div>
                            <div>
                              <span className="text-gray-500">Games:</span>
                              <div className="font-bold">{data.stats.gp || 0}</div>
                            </div>
                            <div>
                              <span className="text-gray-500">PPG:</span>
                              <div className="font-bold">{data.derivedStats.fantasy_ppg}</div>
                            </div>
                            <div>
                              <span className="text-gray-500">Total TDs:</span>
                              <div className="font-bold">{data.derivedStats.total_td}</div>
                            </div>
                          </div>
                        </div>
                        ));
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default PlayerStatsModal;