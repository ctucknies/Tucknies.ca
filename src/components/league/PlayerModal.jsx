import React from 'react';
import { motion } from 'framer-motion';
import TradeHistorySection from './TradeHistorySection';
import MatchupSection from './MatchupSection';

function PlayerModal({ 
  showPlayerModal, 
  selectedPlayerData, 
  loadingPlayerModal, 
  activeTab, 
  setActiveTab,
  selectedPlayer1,
  setSelectedPlayer1,
  selectedPlayer2,
  setSelectedPlayer2,
  onClose,
  onPlayerStatsClick,
  leagueInfoData,
  allLeagueRosters
}) {
  if (!showPlayerModal) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[300] p-4"
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
              👤 {selectedPlayerData?.user?.display_name || selectedPlayerData?.user?.username || 'Player'} - {selectedPlayerData?.season} Season
            </h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>
          
          {loadingPlayerModal ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : selectedPlayerData && (
            <div className="space-y-6">
              {/* Season Stats Overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">{selectedPlayerData.seasonStats.record}</div>
                  <div className="text-sm text-gray-500">Record</div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">{selectedPlayerData.seasonStats.totalPoints}</div>
                  <div className="text-sm text-gray-500">Total Points</div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-purple-600">{selectedPlayerData.seasonStats.avgPoints}</div>
                  <div className="text-sm text-gray-500">Avg/Game</div>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    #{selectedPlayerData.allLeagueRosters ? 
                      selectedPlayerData.allLeagueRosters
                        .sort((a, b) => b.wins !== a.wins ? b.wins - a.wins : b.points_for - a.points_for)
                        .findIndex(r => r.roster_id === selectedPlayerData.roster.roster_id) + 1
                      : selectedPlayerData.roster.settings?.rank || 'N/A'}
                  </div>
                  <div className="text-sm text-gray-500">Season Rank</div>
                </div>
              </div>
              
              {/* Tabs */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                {[
                  { id: 'roster', label: 'Roster', icon: '👥' },
                  { id: 'draft', label: 'Draft', icon: '🎯' },
                  { id: 'trades', label: 'Trades', icon: '🔄' },
                  { id: 'waivers', label: 'Waivers', icon: '📋' },
                  { id: 'matchups', label: 'Matchups', icon: '⚔️' },
                  { id: 'awards', label: 'Awards', icon: '🏆' },
                  { id: 'compare', label: 'Compare', icon: '📊' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-2 px-2 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                      activeTab === tab.id
                        ? 'bg-white dark:bg-gray-800 text-primary-600 shadow-sm'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                ))}
              </div>
              
              {/* Tab Content */}
              <div>
                {/* Roster Tab */}
                {activeTab === 'roster' && (
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold">Season Roster ({selectedPlayerData.rosterWithStats.length} players)</h4>
                    <div className="space-y-2">
                      {selectedPlayerData.rosterWithStats.map((player, index) => (
                        <div key={player.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
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
                            <button 
                              onClick={() => {
                                onPlayerStatsClick(player.id, player.name, selectedPlayerData.season);
                              }}
                              className="font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            >
                              {player.name}
                            </button>
                            <span className="text-sm text-gray-500">{player.team}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-green-600 dark:text-green-400">
                              {player.fantasyPoints.toFixed(1)}
                            </div>
                            <div className="text-xs text-gray-500">fantasy pts</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Trades Tab */}
                {activeTab === 'trades' && (
                  <TradeHistorySection 
                    trades={selectedPlayerData.trades}
                    selectedLeague={{ 
                      ...selectedPlayerData, 
                      season: selectedPlayerData.season,
                      scoring_settings: leagueInfoData?.league?.scoring_settings,
                      userRoster: selectedPlayerData.roster
                    }}
                    allLeagueRosters={allLeagueRosters}
                    rosterData={selectedPlayerData.rosterWithStats}
                    leagueInfoData={leagueInfoData}
                    showAnalytics={false}
                  />
                )}
                
                {/* Waivers Tab */}
                {activeTab === 'waivers' && (
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold">Waiver Activity ({selectedPlayerData.waivers.length})</h4>
                    {selectedPlayerData.waivers.length > 0 ? (
                      <div className="space-y-3">
                        {selectedPlayerData.waivers.map((waiver, index) => (
                          <div key={index} className={`p-4 rounded-lg border-l-4 ${
                            waiver.type === 'waiver' 
                              ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500'
                              : 'bg-green-50 dark:bg-green-900/20 border-green-500'
                          }`}>
                            <div className="flex justify-between items-center mb-3">
                              <span className="font-semibold capitalize">{waiver.type.replace('_', ' ')}</span>
                              <span className="text-sm text-gray-500">Week {waiver.leg}</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded">
                                <div className="font-semibold text-green-700 dark:text-green-300 mb-2">Added:</div>
                                {waiver.adds.map(player => (
                                  <div key={player.id} className="text-sm">
                                    {player.name} ({player.position})
                                  </div>
                                ))}
                              </div>
                              <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded">
                                <div className="font-semibold text-red-700 dark:text-red-300 mb-2">Dropped:</div>
                                {waiver.drops.map(player => (
                                  <div key={player.id} className="text-sm">
                                    {player.name} ({player.position})
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-gray-500 py-8">No waiver activity this season</p>
                    )}
                  </div>
                )}
                
                {/* Draft Tab */}
                {activeTab === 'draft' && (
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold">Draft Picks ({selectedPlayerData.draft?.length || 0})</h4>
                    {selectedPlayerData.draft && selectedPlayerData.draft.length > 0 ? (
                      <div className="space-y-2">
                        {selectedPlayerData.draft.map(pick => (
                          <div key={pick.pick_no} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                            <div className="flex items-center gap-3">
                              <div className="text-center">
                                <div className="text-sm font-bold text-blue-600">{pick.round}</div>
                                <div className="text-xs text-gray-500">R{pick.round}</div>
                              </div>
                              <div className="text-center">
                                <div className="text-sm font-bold">{pick.pick_no}</div>
                                <div className="text-xs text-gray-500">Pick</div>
                              </div>
                              <span className={`px-2 py-1 rounded text-xs font-bold ${
                                pick.player.position === 'QB' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                pick.player.position === 'RB' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                pick.player.position === 'WR' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                pick.player.position === 'TE' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                              }`}>
                                {pick.player.position}
                              </span>
                              <button 
                                onClick={() => {
                                  onPlayerStatsClick(pick.player_id, pick.player.name, selectedPlayerData.season);
                                }}
                                className="font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                              >
                                {pick.player.name}
                              </button>
                              <span className="text-sm text-gray-500">{pick.player.team}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-gray-500 py-8">No draft data available</p>
                    )}
                  </div>
                )}
                
                {/* Awards Tab */}
                {activeTab === 'awards' && (
                  <div className="space-y-4">
                    {selectedPlayerData.achievements && selectedPlayerData.achievements.length > 0 ? (
                      <div className="space-y-6">
                        {/* Championship Awards */}
                        {selectedPlayerData.achievements.filter(a => ['champion', 'runner-up', 'bronze'].includes(a.type)).length > 0 && (
                          <div>
                            <h4 className="text-lg font-semibold mb-3 text-yellow-600 dark:text-yellow-400">🏆 Championship Awards</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {selectedPlayerData.achievements.filter(a => ['champion', 'runner-up', 'bronze'].includes(a.type)).map((achievement, index) => (
                                <div key={index} className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                                  <div className="text-lg font-medium text-center">{achievement.text}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Performance Awards */}
                        {selectedPlayerData.achievements.filter(a => ['explosive', 'high-score', 'scoring-champ', 'elite', 'perfect', 'consistent'].includes(a.type)).length > 0 && (
                          <div>
                            <h4 className="text-lg font-semibold mb-3 text-green-600 dark:text-green-400">⭐ Performance Awards</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {selectedPlayerData.achievements.filter(a => ['explosive', 'high-score', 'scoring-champ', 'elite', 'perfect', 'consistent'].includes(a.type)).map((achievement, index) => (
                                <div key={index} className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                  <div className="text-lg font-medium text-center">{achievement.text}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="text-4xl mb-2">🎯</div>
                        <p className="text-gray-500">No achievements unlocked this season</p>
                        <p className="text-sm text-gray-400 mt-2">Win games, score big, or make the playoffs to earn badges!</p>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Compare Tab */}
                {activeTab === 'compare' && (
                  <div className="space-y-6">
                    <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
                      <h4 className="text-lg font-semibold mb-4">League Member Comparison</h4>
                      {selectedPlayerData.allLeagueRosters && selectedPlayerData.allLeagueRosters.length > 0 ? (
                        <div className="space-y-4">
                          {/* Player Selection */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium mb-2">Select First Player</label>
                              <select 
                                value={selectedPlayer1} 
                                onChange={(e) => setSelectedPlayer1(e.target.value)}
                                className="w-full p-2 border rounded bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                              >
                                <option value="">Choose a player...</option>
                                {selectedPlayerData.allLeagueRosters.map(roster => (
                                  <option key={roster.roster_id} value={roster.roster_id.toString()}>
                                    {roster.username}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2">Select Second Player</label>
                              <select 
                                value={selectedPlayer2} 
                                onChange={(e) => setSelectedPlayer2(e.target.value)}
                                className="w-full p-2 border rounded bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                              >
                                <option value="">Choose a player...</option>
                                {selectedPlayerData.allLeagueRosters.filter(r => r.roster_id.toString() !== selectedPlayer1).map(roster => (
                                  <option key={roster.roster_id} value={roster.roster_id.toString()}>
                                    {roster.username}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          
                          {/* Comparison Results */}
                          {selectedPlayer1 && selectedPlayer2 && (() => {
                            const player1 = selectedPlayerData.allLeagueRosters.find(r => r.roster_id.toString() === selectedPlayer1);
                            const player2 = selectedPlayerData.allLeagueRosters.find(r => r.roster_id.toString() === selectedPlayer2);
                            
                            if (!player1 || !player2) return null;
                            
                            const player1AvgPoints = player1.points_for / Math.max(player1.wins + player1.losses, 1);
                            const player2AvgPoints = player2.points_for / Math.max(player2.wins + player2.losses, 1);
                            const pointDifference = Math.abs(player1.points_for - player2.points_for);
                            
                            // Calculate head-to-head record
                            const headToHeadMatchups = selectedPlayerData.matchups.filter(matchup => 
                              matchup.opponentRosterId === player1.roster_id || matchup.opponentRosterId === player2.roster_id
                            );
                            
                            let h2hRecord = { player1Wins: 0, player2Wins: 0, totalGames: 0 };
                            if (selectedPlayerData.roster.roster_id === player1.roster_id) {
                              // Current user is player1, find matchups against player2
                              const matchupsVsPlayer2 = selectedPlayerData.matchups.filter(m => m.opponentRosterId === player2.roster_id);
                              h2hRecord.totalGames = matchupsVsPlayer2.length;
                              h2hRecord.player1Wins = matchupsVsPlayer2.filter(m => m.won).length;
                              h2hRecord.player2Wins = h2hRecord.totalGames - h2hRecord.player1Wins;
                            } else if (selectedPlayerData.roster.roster_id === player2.roster_id) {
                              // Current user is player2, find matchups against player1
                              const matchupsVsPlayer1 = selectedPlayerData.matchups.filter(m => m.opponentRosterId === player1.roster_id);
                              h2hRecord.totalGames = matchupsVsPlayer1.length;
                              h2hRecord.player2Wins = matchupsVsPlayer1.filter(m => m.won).length;
                              h2hRecord.player1Wins = h2hRecord.totalGames - h2hRecord.player2Wins;
                            }
                            
                            return (
                              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg">
                                <h5 className="text-xl font-bold mb-6 text-center">
                                  {player1.username} vs {player2.username}
                                </h5>
                                
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                  {/* Player 1 Stats */}
                                  <div className="space-y-4">
                                    <h6 className="font-bold text-lg text-blue-600 text-center">{player1.username}</h6>
                                    <div className="space-y-3">
                                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                                        <div className="text-2xl font-bold text-blue-600 text-center">{player1.wins}-{player1.losses}</div>
                                        <div className="text-sm text-gray-600 dark:text-gray-400 text-center font-medium">Record</div>
                                      </div>
                                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                                        <div className="text-2xl font-bold text-blue-600 text-center">{player1.points_for.toFixed(1)}</div>
                                        <div className="text-sm text-gray-600 dark:text-gray-400 text-center font-medium">Points For</div>
                                      </div>
                                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                                        <div className="text-2xl font-bold text-blue-600 text-center">{player1AvgPoints.toFixed(1)}</div>
                                        <div className="text-sm text-gray-600 dark:text-gray-400 text-center font-medium">Avg/Game</div>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Head-to-Head Comparison */}
                                  <div className="space-y-4">
                                    <h6 className="font-bold text-lg text-gray-700 dark:text-gray-300 text-center">Head-to-Head</h6>
                                    <div className="space-y-3">
                                      <div className="bg-gray-100 dark:bg-gray-600 p-4 rounded-lg text-center">
                                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Better Record</div>
                                        <div className="font-bold text-lg">
                                          {player1.wins > player2.wins ? player1.username : 
                                           player2.wins > player1.wins ? player2.username : 'Tie'}
                                        </div>
                                      </div>
                                      <div className="bg-gray-100 dark:bg-gray-600 p-4 rounded-lg text-center">
                                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">More Points</div>
                                        <div className="font-bold text-lg">
                                          {player1.points_for > player2.points_for ? player1.username : player2.username}
                                        </div>
                                      </div>
                                      <div className="bg-gray-100 dark:bg-gray-600 p-4 rounded-lg text-center">
                                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Point Difference</div>
                                        <div className="font-bold text-lg">{pointDifference.toFixed(1)}</div>
                                      </div>
                                      <div className="bg-gray-100 dark:bg-gray-600 p-4 rounded-lg text-center">
                                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Head-to-Head</div>
                                        <div className="font-bold text-lg">{h2hRecord.player1Wins}-{h2hRecord.player2Wins}</div>
                                        <div className="text-xs text-gray-500 mt-1">{h2hRecord.totalGames} games</div>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Player 2 Stats */}
                                  <div className="space-y-4">
                                    <h6 className="font-bold text-lg text-red-600 text-center">{player2.username}</h6>
                                    <div className="space-y-3">
                                      <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                                        <div className="text-2xl font-bold text-red-600 text-center">{player2.wins}-{player2.losses}</div>
                                        <div className="text-sm text-gray-600 dark:text-gray-400 text-center font-medium">Record</div>
                                      </div>
                                      <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                                        <div className="text-2xl font-bold text-red-600 text-center">{player2.points_for.toFixed(1)}</div>
                                        <div className="text-sm text-gray-600 dark:text-gray-400 text-center font-medium">Points For</div>
                                      </div>
                                      <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                                        <div className="text-2xl font-bold text-red-600 text-center">{player2AvgPoints.toFixed(1)}</div>
                                        <div className="text-sm text-gray-600 dark:text-gray-400 text-center font-medium">Avg/Game</div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                          
                          {(!selectedPlayer1 || !selectedPlayer2) && (
                            <div className="text-center py-8 text-gray-500">
                              Select two league members to compare their performance
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-center text-gray-500 py-8">No league data available for comparison</p>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Matchups Tab */}
                {activeTab === 'matchups' && (
                  <MatchupSection 
                    matchups={selectedPlayerData.matchups.map(m => ({ ...m, userRosterId: selectedPlayerData.roster.roster_id }))}
                    leagueId={leagueInfoData?.league?.league_id}
                    season={selectedPlayerData.season}
                    onPlayerClick={onPlayerStatsClick}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default PlayerModal;