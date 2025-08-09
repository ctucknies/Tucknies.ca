import React from 'react';
import { motion } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';

function PositionPlayersModal({ 
  isOpen, 
  onClose, 
  position, 
  players, 
  teamName, 
  onPlayerClick,
  positionScore,
  scoreCalculation 
}) {
  if (!isOpen) return null;

  const getPositionColor = (pos) => {
    switch (pos) {
      case 'QB': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'RB': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'WR': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'TE': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getPositionIcon = (pos) => {
    switch (pos) {
      case 'QB': return '🏈';
      case 'RB': return '🏃';
      case 'WR': return '🙌';
      case 'TE': return '🎯';
      default: return '👤';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[160] p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-3xl">{getPositionIcon(position)}</div>
              <div>
                <h2 className="text-2xl font-bold">{teamName}</h2>
                <p className="text-blue-100">{position} Players</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Score Summary */}
        <div className="p-6 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Position Strength Score
            </h3>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {positionScore.toFixed(1)}
            </div>
          </div>
          
          {scoreCalculation && (
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <p><strong>How this score was calculated:</strong></p>
              <p>{scoreCalculation}</p>
            </div>
          )}
        </div>

        {/* Players List */}
        <div className="p-6 overflow-y-auto max-h-96">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Players ({players.length})
          </h3>
          
          {players.length > 0 ? (
            <div className="space-y-3">
              {players.map((player, index) => (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-600 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className={`px-2 py-1 rounded-lg text-xs font-bold ${getPositionColor(player.position)}`}>
                        {player.position}
                      </span>
                      <button
                        onClick={() => onPlayerClick(player)}
                        className="font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate"
                      >
                        {player.full_name}
                      </button>
                      {player.team && (
                        <span className="text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">
                          {player.team}
                        </span>
                      )}
                    </div>
                    
                    <div className="text-right flex-shrink-0 ml-4">
                      <div className="text-lg font-bold text-green-600 dark:text-green-400">
                        {player.fantasyPoints.toFixed(1)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        pts/game
                      </div>
                    </div>
                  </div>
                  
                  {/* Additional player stats if available */}
                  {player.gamesPlayed && (
                    <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                        <span>Games Played: {player.gamesPlayed}</span>
                        <span>Total Points: {(player.fantasyPoints * player.gamesPlayed).toFixed(1)}</span>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">🤷‍♂️</div>
              <p className="text-gray-500 dark:text-gray-400">No {position} players found</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
          <button
            onClick={onClose}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default PositionPlayersModal;