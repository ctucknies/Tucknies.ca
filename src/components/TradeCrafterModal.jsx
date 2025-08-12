import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, ArrowsRightLeftIcon, SparklesIcon, TrophyIcon } from '@heroicons/react/24/outline';

function TradeCrafterModal({ 
  isOpen, 
  onClose, 
  initialTrade, 
  teamStrengths, 
  getPositionScarcity,
  simulateTrade,
  onPlayerClick,
  positionWeights 
}) {
  const [team1Gives, setTeam1Gives] = useState([]);
  const [team2Gives, setTeam2Gives] = useState([]);
  const [draggedPlayer, setDraggedPlayer] = useState(null);
  const [team1Data, setTeam1Data] = useState(null);
  const [team2Data, setTeam2Data] = useState(null);

  useEffect(() => {
    if (initialTrade && teamStrengths) {
      setTeam1Gives(initialTrade.team1Gives || []);
      setTeam2Gives(initialTrade.team2Gives || []);
      
      const t1 = Object.values(teamStrengths).find(t => t.teamName === initialTrade.team1);
      const t2 = Object.values(teamStrengths).find(t => t.teamName === initialTrade.team2);
      setTeam1Data(t1);
      setTeam2Data(t2);
    }
  }, [initialTrade, teamStrengths]);

  const calculateTradeAnalysis = () => {
    if (team1Gives.length === 0 || team2Gives.length === 0) return null;

    const team1GivesWithValues = team1Gives.map(give => ({
      ...give,
      adjustedValue: give.player.fantasyPoints * getPositionScarcity(give.position)
    }));
    const team2GivesWithValues = team2Gives.map(give => ({
      ...give,
      adjustedValue: give.player.fantasyPoints * getPositionScarcity(give.position)
    }));

    // Calculate best player bonus
    const totalPlayers = team1GivesWithValues.length + team2GivesWithValues.length;
    const tradeType = totalPlayers === 2 ? '1-for-1' : totalPlayers === 3 ? '2-for-1' : '3-for-2';
    const allPlayers = [...team1GivesWithValues, ...team2GivesWithValues];
    const bestPlayer = allPlayers.reduce((best, current) => 
      current.adjustedValue > best.adjustedValue ? current : best
    );
    const bonusValue = tradeType === '1-for-1' ? 1.0 : 3.0;
    const team1HasBest = team1GivesWithValues.some(give => give.player.id === bestPlayer.player.id);
    const bestPlayerBonus = {
      team1Bonus: team1HasBest ? bonusValue : 0,
      team2Bonus: team1HasBest ? 0 : bonusValue,
      bestPlayer: bestPlayer.player,
      bonusValue
    };

    const team1Value = team1GivesWithValues.reduce((sum, give) => sum + give.adjustedValue, 0) + bestPlayerBonus.team1Bonus;
    const team2Value = team2GivesWithValues.reduce((sum, give) => sum + give.adjustedValue, 0) + bestPlayerBonus.team2Bonus;
    const valueDiff = Math.abs(team1Value - team2Value);

    return {
      team1Value,
      team2Value,
      valueDiff,
      bestPlayerBonus,
      fairness: valueDiff <= 2 ? 'Fair' : valueDiff <= 5 ? 'Good' : 'Moderate'
    };
  };

  const handleDragStart = (e, player, position, fromTeam, fromRoster = false) => {
    setDraggedPlayer({ player, position, fromTeam, fromRoster });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, toTeam) => {
    e.preventDefault();
    if (!draggedPlayer) return;

    const { player, position, fromTeam, fromRoster } = draggedPlayer;
    
    if (fromTeam === toTeam && !fromRoster) return;

    // Check if player already in trade
    const inTeam1 = team1Gives.some(g => g.player.id === player.id);
    const inTeam2 = team2Gives.some(g => g.player.id === player.id);
    if (inTeam1 || inTeam2) {
      setDraggedPlayer(null);
      return;
    }

    // Remove from source if moving between trade sides
    if (!fromRoster) {
      if (fromTeam === 'team1') {
        setTeam1Gives(prev => prev.filter(g => g.player.id !== player.id));
      } else {
        setTeam2Gives(prev => prev.filter(g => g.player.id !== player.id));
      }
    }

    // Add to destination
    if (toTeam === 'team1') {
      setTeam1Gives(prev => [...prev, { player, position }]);
    } else {
      setTeam2Gives(prev => [...prev, { player, position }]);
    }

    setDraggedPlayer(null);
  };

  const removePlayer = (playerId, fromTeam) => {
    if (fromTeam === 'team1') {
      setTeam1Gives(prev => prev.filter(g => g.player.id !== playerId));
    } else {
      setTeam2Gives(prev => prev.filter(g => g.player.id !== playerId));
    }
  };

  const addPlayerToTrade = (player, position, toTeam) => {
    const inTeam1 = team1Gives.some(g => g.player.id === player.id);
    const inTeam2 = team2Gives.some(g => g.player.id === player.id);
    if (inTeam1 || inTeam2) return;

    if (toTeam === 'team1') {
      setTeam1Gives(prev => [...prev, { player, position }]);
    } else {
      setTeam2Gives(prev => [...prev, { player, position }]);
    }
  };

  const analysis = calculateTradeAnalysis();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-gradient-to-br from-white via-gray-50 to-blue-50/30 dark:from-gray-800 dark:via-gray-800 dark:to-blue-900/20 rounded-3xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 max-w-7xl w-full max-h-[95vh] overflow-hidden backdrop-blur-xl"
        >
          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                  <ArrowsRightLeftIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    Trade Crafter
                    <SparklesIcon className="w-5 h-5 text-yellow-300" />
                  </h2>
                  <p className="text-blue-100 text-sm">Craft and analyze custom trades</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-xl transition-all duration-200 text-white hover:text-gray-200"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(95vh-120px)]">
            {/* Trade Areas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Team 1 Trade Area */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-rose-500 rounded-xl flex items-center justify-center">
                    <span className="text-white text-sm font-bold">📤</span>
                  </div>
                  <h3 className="text-xl font-bold bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">
                    {initialTrade?.team1} Gives
                  </h3>
                </div>
                <div
                  className="min-h-32 p-6 border-2 border-dashed border-red-300 dark:border-red-500 rounded-2xl bg-gradient-to-br from-red-50 via-rose-50 to-red-100/50 dark:from-red-900/20 dark:via-rose-900/20 dark:to-red-800/20 backdrop-blur-sm transition-all duration-300 hover:border-red-400 dark:hover:border-red-400"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, 'team1')}
                >
                  {team1Gives.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-3">🎯</div>
                      <p className="text-gray-500 font-medium">Drag players here</p>
                      <p className="text-xs text-gray-400 mt-1">or click + on roster players</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {team1Gives.map((give, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          draggable
                          onDragStart={(e) => handleDragStart(e, give.player, give.position, 'team1')}
                          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 rounded-xl cursor-move flex justify-between items-center shadow-lg border border-red-200 dark:border-red-700 hover:shadow-xl transition-all duration-200"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white ${
                              give.position === 'QB' ? 'bg-red-500' :
                              give.position === 'RB' ? 'bg-green-500' :
                              give.position === 'WR' ? 'bg-blue-500' :
                              'bg-yellow-500'
                            }`}>
                              {give.position}
                            </div>
                            <div>
                              <button
                                onClick={() => onPlayerClick?.(give.player)}
                                className="font-semibold hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left"
                              >
                                {give.player.full_name}
                              </button>
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                {(give.player.fantasyPoints * getPositionScarcity(give.position)).toFixed(1)} pts
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => removePlayer(give.player.id, 'team1')}
                            className="w-8 h-8 bg-red-100 dark:bg-red-900/50 hover:bg-red-200 dark:hover:bg-red-800 rounded-lg flex items-center justify-center text-red-600 dark:text-red-400 transition-colors"
                          >
                            ×
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Team 2 Trade Area */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                    <span className="text-white text-sm font-bold">📥</span>
                  </div>
                  <h3 className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    {initialTrade?.team2} Gives
                  </h3>
                </div>
                <div
                  className="min-h-32 p-6 border-2 border-dashed border-green-300 dark:border-green-500 rounded-2xl bg-gradient-to-br from-green-50 via-emerald-50 to-green-100/50 dark:from-green-900/20 dark:via-emerald-900/20 dark:to-green-800/20 backdrop-blur-sm transition-all duration-300 hover:border-green-400 dark:hover:border-green-400"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, 'team2')}
                >
                  {team2Gives.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-3">🎯</div>
                      <p className="text-gray-500 font-medium">Drag players here</p>
                      <p className="text-xs text-gray-400 mt-1">or click + on roster players</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {team2Gives.map((give, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          draggable
                          onDragStart={(e) => handleDragStart(e, give.player, give.position, 'team2')}
                          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 rounded-xl cursor-move flex justify-between items-center shadow-lg border border-green-200 dark:border-green-700 hover:shadow-xl transition-all duration-200"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white ${
                              give.position === 'QB' ? 'bg-red-500' :
                              give.position === 'RB' ? 'bg-green-500' :
                              give.position === 'WR' ? 'bg-blue-500' :
                              'bg-yellow-500'
                            }`}>
                              {give.position}
                            </div>
                            <div>
                              <button
                                onClick={() => onPlayerClick?.(give.player)}
                                className="font-semibold hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left"
                              >
                                {give.player.full_name}
                              </button>
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                {(give.player.fantasyPoints * getPositionScarcity(give.position)).toFixed(1)} pts
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => removePlayer(give.player.id, 'team2')}
                            className="w-8 h-8 bg-red-100 dark:bg-red-900/50 hover:bg-red-200 dark:hover:bg-red-800 rounded-lg flex items-center justify-center text-red-600 dark:text-red-400 transition-colors"
                          >
                            ×
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Team Rosters */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8"
            >
              {/* Team 1 Roster */}
              <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
                    <span className="text-white text-sm font-bold">👥</span>
                  </div>
                  <h4 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    {initialTrade?.team1} Roster
                  </h4>
                </div>
                <div className="max-h-80 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                  {['QB', 'RB', 'WR', 'TE'].map(pos => (
                    <div key={pos} className="mb-4">
                      <div className={`text-sm font-bold mb-2 px-2 py-1 rounded-lg inline-block ${
                        pos === 'QB' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                        pos === 'RB' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                        pos === 'WR' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                      }`}>
                        {pos}s
                      </div>
                      <div className="space-y-2">
                        {(team1Data?.players[pos.toLowerCase() + 's'] || []).map(player => {
                          const inTrade = team1Gives.some(g => g.player.id === player.id) || team2Gives.some(g => g.player.id === player.id);
                          return (
                            <div
                              key={player.id}
                              draggable={!inTrade}
                              onDragStart={(e) => !inTrade && handleDragStart(e, player, pos, 'team1', true)}
                              className={`p-3 rounded-xl flex justify-between items-center transition-all duration-200 ${
                                inTrade 
                                  ? 'bg-gray-200/50 dark:bg-gray-700/50 opacity-50 cursor-not-allowed'
                                  : 'bg-white/80 dark:bg-gray-700/80 cursor-move hover:bg-white dark:hover:bg-gray-600 hover:shadow-md border border-gray-200/50 dark:border-gray-600/50'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-white ${
                                  pos === 'QB' ? 'bg-red-500' :
                                  pos === 'RB' ? 'bg-green-500' :
                                  pos === 'WR' ? 'bg-blue-500' :
                                  'bg-yellow-500'
                                }`}>
                                  {pos[0]}
                                </div>
                                <div>
                                  <button
                                    onClick={() => onPlayerClick?.(player)}
                                    className="font-semibold hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left text-sm"
                                  >
                                    {player.full_name}
                                  </button>
                                  <div className="text-xs text-gray-600 dark:text-gray-400">
                                    {player.fantasyPoints.toFixed(1)} pts
                                  </div>
                                </div>
                              </div>
                              {!inTrade && (
                                <button
                                  onClick={() => addPlayerToTrade(player, pos, 'team1')}
                                  className="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400 transition-colors font-bold"
                                >
                                  +
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Team 2 Roster */}
              <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                    <span className="text-white text-sm font-bold">👥</span>
                  </div>
                  <h4 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    {initialTrade?.team2} Roster
                  </h4>
                </div>
                <div className="max-h-80 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                  {['QB', 'RB', 'WR', 'TE'].map(pos => (
                    <div key={pos} className="mb-4">
                      <div className={`text-sm font-bold mb-2 px-2 py-1 rounded-lg inline-block ${
                        pos === 'QB' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                        pos === 'RB' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                        pos === 'WR' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                      }`}>
                        {pos}s
                      </div>
                      <div className="space-y-2">
                        {(team2Data?.players[pos.toLowerCase() + 's'] || []).map(player => {
                          const inTrade = team1Gives.some(g => g.player.id === player.id) || team2Gives.some(g => g.player.id === player.id);
                          return (
                            <div
                              key={player.id}
                              draggable={!inTrade}
                              onDragStart={(e) => !inTrade && handleDragStart(e, player, pos, 'team2', true)}
                              className={`p-3 rounded-xl flex justify-between items-center transition-all duration-200 ${
                                inTrade 
                                  ? 'bg-gray-200/50 dark:bg-gray-700/50 opacity-50 cursor-not-allowed'
                                  : 'bg-white/80 dark:bg-gray-700/80 cursor-move hover:bg-white dark:hover:bg-gray-600 hover:shadow-md border border-gray-200/50 dark:border-gray-600/50'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-white ${
                                  pos === 'QB' ? 'bg-red-500' :
                                  pos === 'RB' ? 'bg-green-500' :
                                  pos === 'WR' ? 'bg-blue-500' :
                                  'bg-yellow-500'
                                }`}>
                                  {pos[0]}
                                </div>
                                <div>
                                  <button
                                    onClick={() => onPlayerClick?.(player)}
                                    className="font-semibold hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left text-sm"
                                  >
                                    {player.full_name}
                                  </button>
                                  <div className="text-xs text-gray-600 dark:text-gray-400">
                                    {player.fantasyPoints.toFixed(1)} pts
                                  </div>
                                </div>
                              </div>
                              {!inTrade && (
                                <button
                                  onClick={() => addPlayerToTrade(player, pos, 'team2')}
                                  className="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400 transition-colors font-bold"
                                >
                                  +
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Trade Analysis */}
            {analysis && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-gradient-to-br from-white via-gray-50 to-blue-50/30 dark:from-gray-800 dark:via-gray-700 dark:to-blue-900/20 p-6 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center">
                    <TrophyIcon className="w-5 h-5 text-white" />
                  </div>
                  <h4 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Live Trade Analysis
                  </h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="text-center bg-gradient-to-br from-red-50 to-rose-100 dark:from-red-900/20 dark:to-rose-900/20 p-4 rounded-2xl border border-red-200 dark:border-red-700">
                    <div className="font-bold text-red-600 dark:text-red-400 mb-2">{initialTrade?.team1}</div>
                    <div className="text-3xl font-black text-red-700 dark:text-red-300">{analysis.team1Value.toFixed(1)}</div>
                    <div className="text-sm text-red-600/70 dark:text-red-400/70 font-medium">Total Value</div>
                  </div>
                  <div className="text-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 p-4 rounded-2xl border border-gray-200 dark:border-gray-600">
                    <div className="font-bold text-gray-700 dark:text-gray-300 mb-2">Fairness</div>
                    <span className={`inline-block px-4 py-2 rounded-2xl text-sm font-bold shadow-lg ${
                      analysis.fairness === 'Fair' ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' :
                      analysis.fairness === 'Good' ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white' :
                      'bg-gradient-to-r from-yellow-500 to-orange-500 text-white'
                    }`}>
                      {analysis.fairness}
                    </span>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-2 font-medium">
                      Diff: {analysis.valueDiff.toFixed(1)} pts
                    </div>
                  </div>
                  <div className="text-center bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-2xl border border-green-200 dark:border-green-700">
                    <div className="font-bold text-green-600 dark:text-green-400 mb-2">{initialTrade?.team2}</div>
                    <div className="text-3xl font-black text-green-700 dark:text-green-300">{analysis.team2Value.toFixed(1)}</div>
                    <div className="text-sm text-green-600/70 dark:text-green-400/70 font-medium">Total Value</div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-700">
                    <div className="flex items-center gap-2 mb-2">
                      <SparklesIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="font-bold text-blue-800 dark:text-blue-200">Position Weights</span>
                    </div>
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                      QB: {positionWeights?.QB || 0.625}x • RB: {positionWeights?.RB || 1.0}x • WR: {positionWeights?.WR || 0.95}x • TE: {positionWeights?.TE || 1.05}x
                    </div>
                  </div>
                  {analysis.bestPlayerBonus && (
                    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 p-4 rounded-xl border border-yellow-200 dark:border-yellow-700">
                      <div className="flex items-center gap-2 mb-2">
                        <TrophyIcon className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                        <span className="font-bold text-yellow-800 dark:text-yellow-200">Best Player Bonus</span>
                      </div>
                      <div className="text-sm text-yellow-700 dark:text-yellow-300">
                        <span className="font-semibold">{analysis.bestPlayerBonus.bestPlayer.full_name}</span> earns +{analysis.bestPlayerBonus.bonusValue} pts for being the highest value player in the trade
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default TradeCrafterModal;