import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { secureApiCall } from '../../utils/security';

function PlayerComparisonModal({ show, players, onClose, onClearSelection }) {
  const [comparisonData, setComparisonData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (show && players.length > 0) {
      fetchComparisonData();
    }
  }, [show, players, selectedYear]);

  const fetchComparisonData = async () => {
    setLoading(true);
    try {
      const statsResponse = await secureApiCall(`https://api.sleeper.app/v1/stats/nfl/regular/${selectedYear}`);
      const allStats = await statsResponse.json();
      
      const playersResponse = await secureApiCall('https://api.sleeper.app/v1/players/nfl');
      const allPlayers = await playersResponse.json();

      const comparison = players.map(player => {
        const playerInfo = allPlayers[player.id];
        const stats = allStats[player.id] || {};
        
        return {
          ...player,
          ...playerInfo,
          stats,
          fantasyPoints: stats.pts_ppr || stats.pts_std || 0
        };
      });

      setComparisonData(comparison);
    } catch (err) {
      console.error('Error fetching comparison data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPositionColor = (position) => {
    switch (position) {
      case 'QB': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'RB': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'WR': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'TE': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'K': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'DEF': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getStatValue = (player, statKey) => {
    return player.stats[statKey] || 0;
  };

  const getStatLabel = (statKey) => {
    const labels = {
      pts_ppr: 'Fantasy Points (PPR)',
      pass_yd: 'Passing Yards',
      pass_td: 'Passing TDs',
      pass_int: 'Interceptions',
      rush_yd: 'Rushing Yards',
      rush_td: 'Rushing TDs',
      rec: 'Receptions',
      rec_yd: 'Receiving Yards',
      rec_td: 'Receiving TDs',
      gp: 'Games Played'
    };
    return labels[statKey] || statKey;
  };

  const getRelevantStats = () => {
    if (comparisonData.length === 0) return [];
    
    const position = comparisonData[0].position;
    
    switch (position) {
      case 'QB':
        return ['pts_ppr', 'pass_yd', 'pass_td', 'pass_int', 'rush_yd', 'rush_td', 'gp'];
      case 'RB':
        return ['pts_ppr', 'rush_yd', 'rush_td', 'rec', 'rec_yd', 'rec_td', 'gp'];
      case 'WR':
      case 'TE':
        return ['pts_ppr', 'rec', 'rec_yd', 'rec_td', 'rush_yd', 'rush_td', 'gp'];
      default:
        return ['pts_ppr', 'gp'];
    }
  };

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <UserGroupIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Player Comparison
                </h2>
                <p className="text-gray-500 dark:text-gray-400">
                  Comparing {players.length} players for {selectedYear}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {[2024, 2023, 2022, 2021, 2020].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <button
                onClick={onClose}
                className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : comparisonData.length > 0 ? (
              <div className="space-y-6">
                {/* Player Headers */}
                <div className="grid gap-4" style={{ gridTemplateColumns: `200px repeat(${comparisonData.length}, 1fr)` }}>
                  <div></div>
                  {comparisonData.map((player, index) => (
                    <div key={player.id} className="text-center">
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">
                          {player.full_name || player.name}
                        </h3>
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${getPositionColor(player.position)}`}>
                            {player.position}
                          </span>
                          <span className="text-sm text-gray-500">{player.team || 'FA'}</span>
                        </div>
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {player.fantasyPoints.toFixed(1)}
                        </div>
                        <div className="text-xs text-gray-500">Fantasy Points</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Stats Comparison */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden">
                  {getRelevantStats().map((statKey) => (
                    <div key={statKey} className="grid gap-4 p-4 border-b border-gray-200 dark:border-gray-600 last:border-b-0" style={{ gridTemplateColumns: `200px repeat(${comparisonData.length}, 1fr)` }}>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {getStatLabel(statKey)}
                      </div>
                      {comparisonData.map((player) => {
                        const value = getStatValue(player, statKey);
                        const maxValue = Math.max(...comparisonData.map(p => getStatValue(p, statKey)));
                        const isMax = value === maxValue && value > 0;
                        
                        return (
                          <div key={player.id} className="text-center">
                            <div className={`text-lg font-bold ${isMax ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
                              {typeof value === 'number' ? value.toLocaleString() : value}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={onClearSelection}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                  >
                    Clear Selection
                  </button>
                  <button
                    onClick={onClose}
                    className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                No comparison data available
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default PlayerComparisonModal;