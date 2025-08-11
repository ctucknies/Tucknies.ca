import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, ArrowsRightLeftIcon } from '@heroicons/react/24/outline';

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
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto"
        >
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Trade Crafter</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="p-6">
            {/* Trade Areas */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              {/* Team 1 Trade Area */}
              <div>
                <h3 className="text-lg font-semibold mb-4">{initialTrade?.team1} Gives</h3>
                <div
                  className="min-h-24 p-4 border-2 border-dashed border-red-300 dark:border-red-600 rounded-lg bg-red-50/50 dark:bg-red-900/10"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, 'team1')}
                >
                  {team1Gives.length === 0 ? (
                    <p className="text-gray-500 text-center text-sm">Drag players here</p>
                  ) : (
                    <div className="space-y-2">
                      {team1Gives.map((give, idx) => (
                        <div
                          key={idx}
                          draggable
                          onDragStart={(e) => handleDragStart(e, give.player, give.position, 'team1')}
                          className="bg-red-100 dark:bg-red-900/30 p-2 rounded cursor-move flex justify-between items-center text-sm"
                        >
                          <div>
                            <button
                              onClick={() => onPlayerClick?.(give.player)}
                              className="font-medium hover:text-blue-600 transition-colors"
                            >
                              {give.player.full_name}
                            </button>
                            <span className="text-gray-500 ml-1">({give.position})</span>
                            <div className="text-xs text-gray-600">
                              {(give.player.fantasyPoints * getPositionScarcity(give.position)).toFixed(1)} pts
                            </div>
                          </div>
                          <button
                            onClick={() => removePlayer(give.player.id, 'team1')}
                            className="text-red-600 hover:text-red-800 text-xs"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Team 2 Trade Area */}
              <div>
                <h3 className="text-lg font-semibold mb-4">{initialTrade?.team2} Gives</h3>
                <div
                  className="min-h-24 p-4 border-2 border-dashed border-green-300 dark:border-green-600 rounded-lg bg-green-50/50 dark:bg-green-900/10"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, 'team2')}
                >
                  {team2Gives.length === 0 ? (
                    <p className="text-gray-500 text-center text-sm">Drag players here</p>
                  ) : (
                    <div className="space-y-2">
                      {team2Gives.map((give, idx) => (
                        <div
                          key={idx}
                          draggable
                          onDragStart={(e) => handleDragStart(e, give.player, give.position, 'team2')}
                          className="bg-green-100 dark:bg-green-900/30 p-2 rounded cursor-move flex justify-between items-center text-sm"
                        >
                          <div>
                            <button
                              onClick={() => onPlayerClick?.(give.player)}
                              className="font-medium hover:text-blue-600 transition-colors"
                            >
                              {give.player.full_name}
                            </button>
                            <span className="text-gray-500 ml-1">({give.position})</span>
                            <div className="text-xs text-gray-600">
                              {(give.player.fantasyPoints * getPositionScarcity(give.position)).toFixed(1)} pts
                            </div>
                          </div>
                          <button
                            onClick={() => removePlayer(give.player.id, 'team2')}
                            className="text-red-600 hover:text-red-800 text-xs"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Team Rosters */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              {/* Team 1 Roster */}
              <div>
                <h4 className="font-semibold mb-3">{initialTrade?.team1} Roster</h4>
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {['QB', 'RB', 'WR', 'TE'].map(pos => (
                    <div key={pos}>
                      <div className="text-xs font-medium text-gray-600 mb-1">{pos}s</div>
                      {(team1Data?.players[pos.toLowerCase() + 's'] || []).map(player => {
                        const inTrade = team1Gives.some(g => g.player.id === player.id) || team2Gives.some(g => g.player.id === player.id);
                        return (
                          <div
                            key={player.id}
                            draggable={!inTrade}
                            onDragStart={(e) => !inTrade && handleDragStart(e, player, pos, 'team1', true)}
                            className={`p-2 rounded text-xs flex justify-between items-center ${
                              inTrade 
                                ? 'bg-gray-200 dark:bg-gray-700 opacity-50 cursor-not-allowed'
                                : 'bg-gray-100 dark:bg-gray-700 cursor-move hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                          >
                            <div>
                              <button
                                onClick={() => onPlayerClick?.(player)}
                                className="font-medium hover:text-blue-600 transition-colors"
                              >
                                {player.full_name}
                              </button>
                              <div className="text-gray-600">{player.fantasyPoints.toFixed(1)} pts</div>
                            </div>
                            {!inTrade && (
                              <button
                                onClick={() => addPlayerToTrade(player, pos, 'team1')}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                +
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Team 2 Roster */}
              <div>
                <h4 className="font-semibold mb-3">{initialTrade?.team2} Roster</h4>
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {['QB', 'RB', 'WR', 'TE'].map(pos => (
                    <div key={pos}>
                      <div className="text-xs font-medium text-gray-600 mb-1">{pos}s</div>
                      {(team2Data?.players[pos.toLowerCase() + 's'] || []).map(player => {
                        const inTrade = team1Gives.some(g => g.player.id === player.id) || team2Gives.some(g => g.player.id === player.id);
                        return (
                          <div
                            key={player.id}
                            draggable={!inTrade}
                            onDragStart={(e) => !inTrade && handleDragStart(e, player, pos, 'team2', true)}
                            className={`p-2 rounded text-xs flex justify-between items-center ${
                              inTrade 
                                ? 'bg-gray-200 dark:bg-gray-700 opacity-50 cursor-not-allowed'
                                : 'bg-gray-100 dark:bg-gray-700 cursor-move hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                          >
                            <div>
                              <button
                                onClick={() => onPlayerClick?.(player)}
                                className="font-medium hover:text-blue-600 transition-colors"
                              >
                                {player.full_name}
                              </button>
                              <div className="text-gray-600">{player.fantasyPoints.toFixed(1)} pts</div>
                            </div>
                            {!inTrade && (
                              <button
                                onClick={() => addPlayerToTrade(player, pos, 'team2')}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                +
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Trade Analysis */}
            {analysis && (
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <ArrowsRightLeftIcon className="w-5 h-5" />
                  Live Trade Analysis
                </h4>
                <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                  <div className="text-center">
                    <div className="font-medium text-red-600">{initialTrade?.team1}</div>
                    <div className="text-2xl font-bold">{analysis.team1Value.toFixed(1)}</div>
                    <div className="text-xs text-gray-500">Total Value</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">Fairness</div>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${
                      analysis.fairness === 'Fair' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                      analysis.fairness === 'Good' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    }`}>
                      {analysis.fairness}
                    </span>
                    <div className="text-xs text-gray-500 mt-1">
                      Diff: {analysis.valueDiff.toFixed(1)} pts
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-green-600">{initialTrade?.team2}</div>
                    <div className="text-2xl font-bold">{analysis.team2Value.toFixed(1)}</div>
                    <div className="text-xs text-gray-500">Total Value</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-xs text-gray-500 bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
                    <strong>Position Weights:</strong> QB: {positionWeights?.QB || 0.625}x, RB: {positionWeights?.RB || 1.0}x, WR: {positionWeights?.WR || 0.95}x, TE: {positionWeights?.TE || 1.05}x
                  </div>
                  {analysis.bestPlayerBonus && (
                    <div className="text-xs text-gray-500 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded">
                      <strong>Best Player Bonus:</strong> {analysis.bestPlayerBonus.bestPlayer.full_name} earns +{analysis.bestPlayerBonus.bonusValue} pts for being the highest value player in the trade
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default TradeCrafterModal;