import React, { useState } from 'react';
import { motion } from 'framer-motion';

const MatchupSection = ({ matchups, leagueId, season, onPlayerClick }) => {
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [weekDetails, setWeekDetails] = useState(null);
  const [loadingWeek, setLoadingWeek] = useState(false);

  const fetchWeekDetails = async (week, matchup) => {
    setLoadingWeek(true);
    setSelectedWeek(week);
    
    try {
      // Get all players data
      const playersResponse = await fetch('https://api.sleeper.app/v1/players/nfl');
      const allPlayers = await playersResponse.json();
      
      // Get matchup details for the week
      const matchupResponse = await fetch(`https://api.sleeper.app/v1/league/${leagueId}/matchups/${week}`);
      const weekMatchups = await matchupResponse.json();
      
      const userMatchup = weekMatchups.find(m => m.roster_id === matchup.userRosterId);
      const opponentMatchup = weekMatchups.find(m => 
        m.matchup_id === userMatchup?.matchup_id && m.roster_id !== matchup.userRosterId
      );
      
      // Process player scores
      const processPlayerScores = (matchupData) => {
        if (!matchupData?.players_points) return { starters: [], bench: [] };
        
        const positionOrder = { QB: 1, RB: 2, WR: 3, TE: 4, K: 5, DEF: 6 };
        
        const playersList = Object.entries(matchupData.players_points).map(([playerId, points]) => ({
          id: playerId,
          name: allPlayers[playerId]?.full_name || 'Unknown Player',
          position: allPlayers[playerId]?.position || 'N/A',
          team: allPlayers[playerId]?.team || 'FA',
          points: points || 0,
          isStarter: matchupData.starters?.includes(playerId) || false
        }));
        
        const sortByPositionThenPoints = (a, b) => {
          const posA = positionOrder[a.position] || 99;
          const posB = positionOrder[b.position] || 99;
          if (posA !== posB) return posA - posB;
          return b.points - a.points;
        };
        
        return {
          starters: playersList.filter(p => p.isStarter).sort(sortByPositionThenPoints),
          bench: playersList.filter(p => !p.isStarter).sort(sortByPositionThenPoints)
        };
      };
      
      const userPlayers = processPlayerScores(userMatchup);
      const opponentPlayers = processPlayerScores(opponentMatchup);
      
      setWeekDetails({
        week,
        userStarters: userPlayers.starters,
        userBench: userPlayers.bench,
        opponentStarters: opponentPlayers.starters,
        opponentBench: opponentPlayers.bench,
        userTotal: userMatchup?.points || 0,
        opponentTotal: opponentMatchup?.points || 0,
        won: (userMatchup?.points || 0) > (opponentMatchup?.points || 0)
      });
    } catch (err) {
      console.error('Error fetching week details:', err);
    } finally {
      setLoadingWeek(false);
    }
  };

  const closeWeekDetails = () => {
    setSelectedWeek(null);
    setWeekDetails(null);
  };

  return (
    <div className="space-y-4">
      <h4 className="text-lg font-semibold">Weekly Matchups ({matchups.length})</h4>
      <div className="space-y-2">
        {matchups.map(matchup => (
          <button
            key={matchup.week}
            onClick={() => fetchWeekDetails(matchup.week, matchup)}
            className={`w-full p-3 rounded border-l-4 transition-all hover:shadow-md ${
              matchup.won 
                ? 'bg-green-50 dark:bg-green-900/20 border-green-500 hover:bg-green-100 dark:hover:bg-green-900/30' 
                : 'bg-red-50 dark:bg-red-900/20 border-red-500 hover:bg-red-100 dark:hover:bg-red-900/30'
            }`}
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="font-semibold">Week {matchup.week}</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  matchup.won 
                    ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                    : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                }`}>
                  {matchup.won ? 'W' : 'L'}
                </span>
              </div>
              <div className="text-right">
                <div className="font-semibold">
                  {matchup.userPoints.toFixed(1)} - {matchup.opponentPoints.toFixed(1)}
                </div>
                <div className="text-sm text-gray-500">
                  {matchup.won ? '+' : ''}{(matchup.userPoints - matchup.opponentPoints).toFixed(1)}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Week Details Modal */}
      {selectedWeek && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={closeWeekDetails}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold">Week {selectedWeek} Matchup</h3>
                <button
                  onClick={closeWeekDetails}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>

              {loadingWeek ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : weekDetails && (
                <div className="space-y-6">
                  {/* Score Header */}
                  <div className={`p-6 rounded-xl text-center ${
                    weekDetails.won 
                      ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                      : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                  }`}>
                    <div className="text-3xl font-bold mb-2">
                      {weekDetails.userTotal.toFixed(1)} - {weekDetails.opponentTotal.toFixed(1)}
                    </div>
                    <div className={`text-lg font-semibold ${
                      weekDetails.won ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {weekDetails.won ? 'Victory' : 'Defeat'} by {Math.abs(weekDetails.userTotal - weekDetails.opponentTotal).toFixed(1)} points
                    </div>
                  </div>

                  {/* Player Breakdowns */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* User Team */}
                    <div className="space-y-4">
                      <h4 className="text-lg font-semibold text-blue-600 dark:text-blue-400">Your Team ({weekDetails.userTotal.toFixed(1)} pts)</h4>
                      
                      {/* Starters */}
                      <div className="space-y-2">
                        <h5 className="font-medium text-blue-500 dark:text-blue-400">Starters</h5>
                        {weekDetails.userStarters.map((player) => (
                          <div key={player.id} className="p-3 rounded-lg border-l-4 bg-blue-50 dark:bg-blue-900/20 border-blue-500">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-3">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${
                                  player.position === 'QB' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                  player.position === 'RB' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                  player.position === 'WR' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                  player.position === 'TE' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                  'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                }`}>
                                  {player.position}
                                </span>
                                <div>
                                  <button 
                                    onClick={() => onPlayerClick?.(player.id, player.name, season, weekDetails.week)}
                                    className="font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left"
                                  >
                                    {player.name}
                                  </button>
                                  <div className="text-xs text-gray-500">{player.team}</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className={`font-bold ${
                                  player.points > 15 ? 'text-green-600 dark:text-green-400' :
                                  player.points > 8 ? 'text-yellow-600 dark:text-yellow-400' :
                                  'text-red-600 dark:text-red-400'
                                }`}>
                                  {player.points.toFixed(1)}
                                </div>
                                <div className="text-xs text-gray-500">pts</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Bench */}
                      {weekDetails.userBench.length > 0 && (
                        <div className="space-y-2">
                          <h5 className="font-medium text-gray-500 dark:text-gray-400">Bench</h5>
                          {weekDetails.userBench.map((player) => (
                            <div key={player.id} className="p-3 rounded-lg border-l-4 bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                                    player.position === 'QB' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                    player.position === 'RB' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                    player.position === 'WR' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                    player.position === 'TE' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                  }`}>
                                    {player.position}
                                  </span>
                                  <div>
                                    <button 
                                      onClick={() => onPlayerClick?.(player.id, player.name, season, weekDetails.week)}
                                      className="font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left"
                                    >
                                      {player.name}
                                    </button>
                                    <div className="text-xs text-gray-500">{player.team}</div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className={`font-bold ${
                                    player.points > 15 ? 'text-green-600 dark:text-green-400' :
                                    player.points > 8 ? 'text-yellow-600 dark:text-yellow-400' :
                                    'text-red-600 dark:text-red-400'
                                  }`}>
                                    {player.points.toFixed(1)}
                                  </div>
                                  <div className="text-xs text-gray-500">pts</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Opponent Team */}
                    <div className="space-y-4">
                      <h4 className="text-lg font-semibold text-red-600 dark:text-red-400">Opponent ({weekDetails.opponentTotal.toFixed(1)} pts)</h4>
                      
                      {/* Starters */}
                      <div className="space-y-2">
                        <h5 className="font-medium text-red-500 dark:text-red-400">Starters</h5>
                        {weekDetails.opponentStarters.map((player) => (
                          <div key={player.id} className="p-3 rounded-lg border-l-4 bg-red-50 dark:bg-red-900/20 border-red-500">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-3">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${
                                  player.position === 'QB' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                  player.position === 'RB' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                  player.position === 'WR' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                  player.position === 'TE' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                  'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                }`}>
                                  {player.position}
                                </span>
                                <div>
                                  <div className="font-medium">{player.name}</div>
                                  <div className="text-xs text-gray-500">{player.team}</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className={`font-bold ${
                                  player.points > 15 ? 'text-green-600 dark:text-green-400' :
                                  player.points > 8 ? 'text-yellow-600 dark:text-yellow-400' :
                                  'text-red-600 dark:text-red-400'
                                }`}>
                                  {player.points.toFixed(1)}
                                </div>
                                <div className="text-xs text-gray-500">pts</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Bench */}
                      {weekDetails.opponentBench.length > 0 && (
                        <div className="space-y-2">
                          <h5 className="font-medium text-gray-500 dark:text-gray-400">Bench</h5>
                          {weekDetails.opponentBench.map((player) => (
                            <div key={player.id} className="p-3 rounded-lg border-l-4 bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                                    player.position === 'QB' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                    player.position === 'RB' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                    player.position === 'WR' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                    player.position === 'TE' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                  }`}>
                                    {player.position}
                                  </span>
                                  <div>
                                    <div className="font-medium">{player.name}</div>
                                    <div className="text-xs text-gray-500">{player.team}</div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className={`font-bold ${
                                    player.points > 15 ? 'text-green-600 dark:text-green-400' :
                                    player.points > 8 ? 'text-yellow-600 dark:text-yellow-400' :
                                    'text-red-600 dark:text-red-400'
                                  }`}>
                                    {player.points.toFixed(1)}
                                  </div>
                                  <div className="text-xs text-gray-500">pts</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default MatchupSection;