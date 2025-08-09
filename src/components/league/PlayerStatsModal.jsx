import React from 'react';
import { motion } from 'framer-motion';

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
  if (!showPlayerStats) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
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
                  onClick={() => setPlayerStatsTab('summary')}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    playerStatsTab === 'summary'
                      ? 'bg-white dark:bg-gray-800 text-primary-600 shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Career Summary
                </button>
                {allYearStats && Object.keys(allYearStats).filter(y => (allYearStats[y].stats.gp || 0) > 0).map(year => (
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