import React from 'react';
import { motion } from 'framer-motion';

function LeagueInfoModal({
  showLeagueInfo,
  leagueInfoData,
  loadingLeagueInfo,
  leagueInfoTab,
  setLeagueInfoTab,
  tradeFilter,
  setTradeFilter,
  waiverFilter,
  setWaiverFilter,
  expandedTeams,
  setExpandedTeams,
  sortConfig,
  onClose,
  onPlayerModalClick,
  onPlayerStatsClick,
  onSort,
  getSortedStandings,
  userData
}) {
  if (!showLeagueInfo) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200] p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">{leagueInfoData?.league.name} - League Info</h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>
          
          {loadingLeagueInfo ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : leagueInfoData && (
            <div>
              {/* Tabs */}
              <div className="grid grid-cols-2 sm:flex sm:space-x-1 gap-1 sm:gap-0 mb-6 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                {[
                  { id: 'standings', label: 'Standings', icon: '🏆' },
                  { id: 'teams', label: 'All Teams', icon: '👥' },
                  { id: 'trades', label: 'Trades', icon: '🔄' },
                  { id: 'waivers', label: 'Waivers', icon: '📋' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setLeagueInfoTab(tab.id)}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                      leagueInfoTab === tab.id
                        ? 'bg-white dark:bg-gray-800 text-primary-600 shadow-sm'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>
              
              {/* Standings Tab */}
              {leagueInfoTab === 'standings' && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6">
                  <h4 className="text-xl font-bold mb-4 text-center text-blue-800 dark:text-blue-200">League Standings</h4>
                  <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-lg">
                    <div className="grid grid-cols-6 gap-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 text-sm font-semibold">
                      <div className="flex items-center gap-1">🏅 Rank</div>
                      <button 
                        onClick={() => onSort('username')}
                        className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left"
                      >
                        👤 Team {sortConfig.key === 'username' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </button>
                      <button 
                        onClick={() => onSort('record')}
                        className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left"
                      >
                        📊 Record {sortConfig.key === 'record' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </button>
                      <button 
                        onClick={() => onSort('points_for')}
                        className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left"
                      >
                        ⚡ Points For {sortConfig.key === 'points_for' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </button>
                      <button 
                        onClick={() => onSort('points_against')}
                        className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left"
                      >
                        🛡️ Points Against {sortConfig.key === 'points_against' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </button>
                      <button 
                        onClick={() => onSort('diff')}
                        className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left"
                      >
                        📈 Diff {sortConfig.key === 'diff' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </button>
                    </div>
                    {getSortedStandings(leagueInfoData.standings).map((team, index) => (
                      <div key={team.roster_id} className={`grid grid-cols-6 gap-4 p-4 border-t border-gray-200 dark:border-gray-600 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                        index < 4 ? 'bg-green-50/50 dark:bg-green-900/10' : index >= leagueInfoData.standings.length - 2 ? 'bg-red-50/50 dark:bg-red-900/10' : ''
                      }`}>
                        <div className="font-bold flex items-center gap-2">
                          {index === 0 && '🥇'}
                          {index === 1 && '🥈'}
                          {index === 2 && '🥉'}
                          {index + 1}
                        </div>
                        <div className="flex flex-col items-start">
                          {index === 0 && (
                            <div className="text-yellow-500 text-lg mb-1" title="League Champion">
                              👑
                            </div>
                          )}
                          <button 
                            onClick={() => onPlayerModalClick(team.username, leagueInfoData.league.league_id, leagueInfoData.league.season)}
                            className="font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left"
                          >
                            {team.username}
                          </button>
                        </div>
                        <div className="font-semibold">{team.wins}-{team.losses}{team.ties > 0 && `-${team.ties}`}</div>
                        <div className="text-blue-600 dark:text-blue-400 font-medium">{team.points_for.toFixed(1)}</div>
                        <div className="text-red-600 dark:text-red-400">{team.points_against.toFixed(1)}</div>
                        <div className={`font-bold ${
                          team.points_for - team.points_against > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {team.points_for - team.points_against > 0 ? '+' : ''}{(team.points_for - team.points_against).toFixed(1)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* All Teams Tab */}
              {leagueInfoTab === 'teams' && (
                <div>
                  <h4 className="text-xl font-bold mb-4 text-center">All Team Rosters</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {leagueInfoData.teams.map((team, index) => {
                      const isExpanded = expandedTeams.has(team.roster_id);
                      const isSearchedUser = userData && team.owner_id === userData.user_id;
                      
                      return (
                        <div key={team.roster_id} className={`bg-gradient-to-br p-6 rounded-xl shadow-lg border transition-all duration-200 ${
                          isSearchedUser 
                            ? 'from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40 border-blue-400 ring-2 ring-blue-300 dark:ring-blue-600'
                            : 'from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 border-gray-200 dark:border-gray-600'
                        }`}>
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <h5 className="text-lg font-bold">{team.username}</h5>
                              {isSearchedUser && <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded-full">YOU</span>}
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                                #{index + 1} • {team.wins}-{team.losses}
                              </div>
                              <div className="text-xs text-gray-500">
                                {team.points_for.toFixed(1)} PF
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Top Players:</div>
                            <div className="space-y-1">
                              {team.players.slice(0, isExpanded ? team.players.length : 8).map((player, playerIndex) => (
                                <div key={player.id} className={`flex justify-between items-center p-2 rounded text-xs transition-colors ${
                                  playerIndex < 8 ? 'bg-gray-100 dark:bg-gray-600' : 'bg-gray-50 dark:bg-gray-700'
                                }`}>
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <span className={`px-1.5 py-0.5 rounded text-xs font-bold flex-shrink-0 ${
                                      player.position === 'QB' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                      player.position === 'RB' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                      player.position === 'WR' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                      player.position === 'TE' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                      'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                    }`}>
                                      {player.position}
                                    </span>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onPlayerStatsClick(player.id, player.name, leagueInfoData.league.season);
                                      }}
                                      className="font-medium truncate hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left"
                                    >
                                      {player.name}
                                    </button>
                                  </div>
                                  <div className="text-right flex-shrink-0">
                                    <div className="font-bold text-green-600 dark:text-green-400">
                                      {player.fantasyPoints.toFixed(1)}
                                    </div>
                                    <div className="text-xs text-gray-500">pts</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                            {team.players.length > 8 && (
                              <button
                                onClick={() => {
                                  const newExpanded = new Set(expandedTeams);
                                  if (isExpanded) {
                                    newExpanded.delete(team.roster_id);
                                  } else {
                                    newExpanded.add(team.roster_id);
                                  }
                                  setExpandedTeams(newExpanded);
                                }}
                                className="w-full text-center text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                              >
                                {isExpanded ? '▲ Show Less' : `▼ Show All ${team.players.length} Players`}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Trades Tab */}
              {leagueInfoTab === 'trades' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-xl font-bold">Trade History ({leagueInfoData.trades.length})</h4>
                    <select 
                      value={tradeFilter} 
                      onChange={(e) => setTradeFilter(e.target.value)}
                      className="px-3 py-1 border rounded bg-white dark:bg-gray-700 text-sm"
                    >
                      <option value="all">All Trades</option>
                      {[...new Set(
                        leagueInfoData.trades.flatMap(t => 
                          t.participants ? t.participants.map(p => p.username) : [t.username]
                        )
                      )].map(username => (
                        <option key={username} value={username}>{username}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {leagueInfoData.trades
                      .filter(trade => 
                        tradeFilter === 'all' || 
                        trade.username === tradeFilter ||
                        (trade.participants && trade.participants.some(p => p.username === tradeFilter))
                      )
                      .length > 0 ? (
                      leagueInfoData.trades
                        .filter(trade => 
                          tradeFilter === 'all' || 
                          trade.username === tradeFilter ||
                          (trade.participants && trade.participants.some(p => p.username === tradeFilter))
                        )
                        .map((trade, index) => (
                        <div key={index} className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-4 rounded-lg border-l-4 border-blue-500">
                          <div className="flex justify-between items-center mb-3">
                            <span className="font-semibold text-blue-800 dark:text-blue-200">
                              {trade.participants ? `${trade.participants.length}-Team Trade` : trade.username}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded text-xs font-medium">
                                Week {trade.leg}
                              </span>
                              <span className="text-xs text-gray-500">🔄 Trade</span>
                            </div>
                          </div>
                          
                          {trade.participants ? (
                            <div className="space-y-4">
                              {trade.participants.map((participant, pIndex) => (
                                <div key={pIndex} className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                                  <h5 className="font-semibold mb-3 text-purple-700 dark:text-purple-300">
                                    {participant.username}
                                  </h5>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded">
                                      <div className="font-semibold text-green-700 dark:text-green-300 mb-2 flex items-center gap-1">
                                        ⬆️ Acquired ({participant.acquired.length}):
                                      </div>
                                      <div className="space-y-1">
                                        {participant.acquired.length > 0 ? participant.acquired.map(player => (
                                          <div key={player.id} className="text-sm bg-white dark:bg-gray-800 p-2 rounded flex justify-between">
                                            <button 
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                onPlayerStatsClick(player.id, player.name, leagueInfoData.league.season);
                                              }}
                                              className="font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left"
                                            >
                                              {player.name}
                                            </button>
                                            <span className="text-gray-500">({player.position})</span>
                                          </div>
                                        )) : (
                                          <div className="text-sm text-gray-500 italic">No players acquired</div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded">
                                      <div className="font-semibold text-red-700 dark:text-red-300 mb-2 flex items-center gap-1">
                                        ⬇️ Traded Away ({participant.traded.length}):
                                      </div>
                                      <div className="space-y-1">
                                        {participant.traded.length > 0 ? participant.traded.map(player => (
                                          <div key={player.id} className="text-sm bg-white dark:bg-gray-800 p-2 rounded flex justify-between">
                                            <button 
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                onPlayerStatsClick(player.id, player.name, leagueInfoData.league.season);
                                              }}
                                              className="font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left"
                                            >
                                              {player.name}
                                            </button>
                                            <span className="text-gray-500">({player.position})</span>
                                          </div>
                                        )) : (
                                          <div className="text-sm text-gray-500 italic">No players traded away</div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded">
                                <div className="font-semibold text-green-700 dark:text-green-300 mb-2 flex items-center gap-1">
                                  ⬆️ Acquired:
                                </div>
                                <div className="space-y-1">
                                  {trade.adds.map(player => (
                                    <div key={player.id} className="text-sm bg-white dark:bg-gray-800 p-2 rounded flex justify-between">
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onPlayerStatsClick(player.id, player.name, leagueInfoData.league.season);
                                        }}
                                        className="font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left"
                                      >
                                        {player.name}
                                      </button>
                                      <span className="text-gray-500">({player.position})</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded">
                                <div className="font-semibold text-red-700 dark:text-red-300 mb-2 flex items-center gap-1">
                                  ⬇️ Traded Away:
                                </div>
                                <div className="space-y-1">
                                  {trade.drops.map(player => (
                                    <div key={player.id} className="text-sm bg-white dark:bg-gray-800 p-2 rounded flex justify-between">
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onPlayerStatsClick(player.id, player.name, leagueInfoData.league.season);
                                        }}
                                        className="font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left"
                                      >
                                        {player.name}
                                      </button>
                                      <span className="text-gray-500">({player.position})</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <div className="text-4xl mb-2">📈</div>
                        <p className="text-gray-500">No trades found</p>
                        <p className="text-sm text-gray-400 mt-1">
                          {tradeFilter === 'all' ? 'No trades this season' : `No trades by ${tradeFilter}`}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Waivers Tab */}
              {leagueInfoTab === 'waivers' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-xl font-bold">Waiver Activity ({leagueInfoData.waivers.length})</h4>
                    <div className="flex gap-2">
                      <select 
                        value={waiverFilter} 
                        onChange={(e) => setWaiverFilter(e.target.value)}
                        className="px-3 py-1 border rounded bg-white dark:bg-gray-700 text-sm"
                      >
                        <option value="all">All Activity</option>
                        <option value="waiver">Waivers Only</option>
                        <option value="free_agent">Free Agents Only</option>
                      </select>
                      <select 
                        value={tradeFilter} 
                        onChange={(e) => setTradeFilter(e.target.value)}
                        className="px-3 py-1 border rounded bg-white dark:bg-gray-700 text-sm"
                      >
                        <option value="all">All Users</option>
                        {[...new Set(leagueInfoData.waivers.map(w => w.username))].map(username => (
                          <option key={username} value={username}>{username}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {leagueInfoData.waivers
                      .filter(waiver => 
                        (waiverFilter === 'all' || waiver.type === waiverFilter) &&
                        (tradeFilter === 'all' || waiver.username === tradeFilter)
                      )
                      .length > 0 ? (
                      leagueInfoData.waivers
                        .filter(waiver => 
                          (waiverFilter === 'all' || waiver.type === waiverFilter) &&
                          (tradeFilter === 'all' || waiver.username === tradeFilter)
                        )
                        .map((waiver, index) => (
                        <div key={index} className={`p-4 rounded-lg border-l-4 ${
                          waiver.type === 'waiver' 
                            ? 'bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-500'
                            : 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-500'
                        }`}>
                          <div className="flex justify-between items-center mb-3">
                            <button 
                              onClick={() => onPlayerModalClick(waiver.username, leagueInfoData.league.league_id, leagueInfoData.league.season)}
                              className="font-semibold hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            >
                              {waiver.username}
                            </button>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                waiver.type === 'waiver'
                                  ? 'bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200'
                                  : 'bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200'
                              }`}>
                                Week {waiver.leg}
                              </span>
                              <span className="text-xs text-gray-500">
                                {waiver.type === 'waiver' ? '📋 Waiver' : '🆓 Free Agent'}
                              </span>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded">
                              <div className="font-semibold text-green-700 dark:text-green-300 mb-2 flex items-center gap-1">
                                ➕ Added:
                              </div>
                              <div className="space-y-1">
                                {waiver.adds.map(player => (
                                  <div key={player.id} className="text-sm bg-white dark:bg-gray-800 p-2 rounded flex justify-between">
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onPlayerStatsClick(player.id, player.name, leagueInfoData.league.season);
                                      }}
                                      className="font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left"
                                    >
                                      {player.name}
                                    </button>
                                    <span className="text-gray-500">({player.position})</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded">
                              <div className="font-semibold text-red-700 dark:text-red-300 mb-2 flex items-center gap-1">
                                ➖ Dropped:
                              </div>
                              <div className="space-y-1">
                                {waiver.drops.map(player => (
                                  <div key={player.id} className="text-sm bg-white dark:bg-gray-800 p-2 rounded flex justify-between">
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onPlayerStatsClick(player.id, player.name, leagueInfoData.league.season);
                                      }}
                                      className="font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left"
                                    >
                                      {player.name}
                                    </button>
                                    <span className="text-gray-500">({player.position})</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <div className="text-4xl mb-2">📋</div>
                        <p className="text-gray-500">No waiver activity found</p>
                        <p className="text-sm text-gray-400 mt-1">
                          {waiverFilter === 'all' ? 'No activity this season' : `No ${waiverFilter.replace('_', ' ')} activity`}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default LeagueInfoModal;