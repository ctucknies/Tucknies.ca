import React from 'react';

const TradeHistorySection = ({ 
  trades, 
  selectedLeague, 
  allLeagueRosters, 
  rosterData, 
  leagueInfoData,
  showAnalytics = true 
}) => {
  if (!trades) return null;

  const getPlayerValue = (player) => {
    // Search through all league rosters for this player's stats
    let playerStats = null;
    if (allLeagueRosters) {
      for (const roster of allLeagueRosters) {
        if (roster.players) {
          const foundPlayer = roster.players.find(p => p.name === player.name || p.id === player.id);
          if (foundPlayer) {
            playerStats = foundPlayer;
            break;
          }
        }
      }
    }
    
    // Fallback to roster data if not found in league rosters
    if (!playerStats && rosterData) {
      playerStats = rosterData.find(p => p.name === player.name || p.id === player.id);
    }
    
    // Try leagueInfoData teams as final fallback
    if (!playerStats && leagueInfoData?.teams) {
      for (const team of leagueInfoData.teams) {
        if (team.players) {
          const foundPlayer = team.players.find(p => p.name === player.name || p.id === player.id);
          if (foundPlayer) {
            playerStats = foundPlayer;
            break;
          }
        }
      }
    }
    
    let rawPoints = playerStats?.fantasyPoints || 0;
    
    // If no points found, try to fetch from season stats API
    if (rawPoints === 0 && player.id) {
      // Use cached season stats if available
      if (window.seasonStats && window.seasonStats[player.id]) {
        const stats = window.seasonStats[player.id];
        rawPoints = stats.pts_ppr || stats.pts_std || stats.pts_half_ppr || 0;
      }
    }
    
    const isPPR = selectedLeague?.scoring_settings?.rec === 1;
    const isHalfPPR = selectedLeague?.scoring_settings?.rec === 0.5;
    
    const multipliers = isPPR ? 
      { RB: 1.00, WR: 0.95, TE: 0.80, QB: 0.55 } :
      isHalfPPR ? 
      { RB: 1.00, WR: 0.90, TE: 0.75, QB: 0.60 } :
      { RB: 1.00, WR: 0.85, TE: 0.70, QB: 0.65 };
    
    const multiplier = multipliers[player.position] || 0.5;
    return rawPoints * multiplier;
  };

  const calculateTradeMetrics = () => {
    if (!showAnalytics || trades.length === 0) return null;

    const isPPR = selectedLeague?.scoring_settings?.rec === 1;
    const isHalfPPR = selectedLeague?.scoring_settings?.rec === 0.5;
    const dropCostPerSpot = isPPR ? 5 : isHalfPPR ? 4 : 3;
    
    let totalGrade = 0;
    let validGrades = 0;
    let totalPointsImpact = 0;
    
    trades.forEach(trade => {
      const incomingValue = trade.adds.reduce((sum, player) => sum + getPlayerValue(player), 0);
      const outgoingValue = trade.drops.reduce((sum, player) => sum + getPlayerValue(player), 0);
      const netRawAdj = incomingValue - outgoingValue;
      const rosterSpotDiff = trade.adds.length - trade.drops.length;
      const dropCostTotal = rosterSpotDiff > 0 ? rosterSpotDiff * dropCostPerSpot : 0;
      const netTradeValue = netRawAdj - dropCostTotal;
      
      // Convert to letter grade points
      let gradePoints = 0;
      if (netTradeValue > 15) gradePoints = 4.3; // A+
      else if (netTradeValue > 10) gradePoints = 4.0; // A
      else if (netTradeValue > 5) gradePoints = 3.3; // B+
      else if (netTradeValue > 0) gradePoints = 3.0; // B
      else if (netTradeValue > -5) gradePoints = 2.0; // C
      else if (netTradeValue > -10) gradePoints = 1.0; // D
      else gradePoints = 0.0; // F
      
      totalGrade += gradePoints;
      validGrades++;
      totalPointsImpact += netTradeValue;
    });
    
    const avgGrade = validGrades > 0 ? totalGrade / validGrades : 0;
    let gradeDisplay = 'N/A';
    if (validGrades > 0) {
      if (avgGrade >= 4.15) gradeDisplay = 'A+';
      else if (avgGrade >= 3.85) gradeDisplay = 'A';
      else if (avgGrade >= 3.15) gradeDisplay = 'B+';
      else if (avgGrade >= 2.85) gradeDisplay = 'B';
      else if (avgGrade >= 1.85) gradeDisplay = 'C';
      else if (avgGrade >= 0.85) gradeDisplay = 'D';
      else gradeDisplay = 'F';
    }
    
    return {
      grade: gradeDisplay,
      pointsImpact: totalPointsImpact > 0 ? `+${totalPointsImpact.toFixed(1)}` : totalPointsImpact.toFixed(1),
      totalTrades: trades.length
    };
  };

  const getTradePartner = (trade) => {
    if (!trade.roster_ids || !allLeagueRosters) return 'Unknown';
    const userRosterId = selectedLeague?.userRoster?.roster_id;
    const partnerRosterId = trade.roster_ids.find(id => id !== userRosterId);
    if (!partnerRosterId) return 'Unknown';
    const partnerRoster = allLeagueRosters.find(r => r.roster_id === partnerRosterId);
    return partnerRoster?.username || 'Unknown';
  };

  const metrics = calculateTradeMetrics();

  return (
    <div className="space-y-6">
      {/* Analytics Cards */}
      {showAnalytics && metrics && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-gradient-to-r from-blue-500 to-cyan-600 p-4 rounded-lg text-white text-center">
            <div className="text-2xl font-bold">{metrics.grade}</div>
            <div className="text-sm opacity-90">Trade Grade</div>
          </div>
          <div className="bg-gradient-to-r from-purple-500 to-violet-600 p-4 rounded-lg text-white text-center">
            <div className="text-2xl font-bold">{metrics.pointsImpact}</div>
            <div className="text-sm opacity-90">Points Impact</div>
          </div>
          <div className="bg-gradient-to-r from-orange-500 to-red-600 p-4 rounded-lg text-white text-center">
            <div className="text-2xl font-bold">{metrics.totalTrades}</div>
            <div className="text-sm opacity-90">Total Trades</div>
          </div>
        </div>
      )}
      
      {/* Trade History */}
      <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
        <h4 className="text-lg font-semibold mb-4">Trade History</h4>
        <div className="space-y-4">
          {trades.length > 0 ? (
            trades.map((trade, index) => {
              // Calculate trade value
              const isPPR = selectedLeague?.scoring_settings?.rec === 1;
              const isHalfPPR = selectedLeague?.scoring_settings?.rec === 0.5;
              const dropCostPerSpot = isPPR ? 5 : isHalfPPR ? 4 : 3;
              
              const incomingValue = trade.adds.reduce((sum, player) => sum + getPlayerValue(player), 0);
              const outgoingValue = trade.drops.reduce((sum, player) => sum + getPlayerValue(player), 0);
              const netRawAdj = incomingValue - outgoingValue;
              const rosterSpotDiff = trade.adds.length - trade.drops.length;
              const dropCostTotal = rosterSpotDiff > 0 ? rosterSpotDiff * dropCostPerSpot : 0;
              const netTradeValue = netRawAdj - dropCostTotal;
              
              const winner = netTradeValue > 5 ? 'Won' : netTradeValue < -5 ? 'Lost' : 'Even';
              const grade = netTradeValue > 15 ? 'A+' : 
                           netTradeValue > 10 ? 'A' :
                           netTradeValue > 5 ? 'B+' :
                           netTradeValue > 0 ? 'B' :
                           netTradeValue > -5 ? 'C' :
                           netTradeValue > -10 ? 'D' : 'F';
              
              return (
                <div key={index} className={`p-4 bg-white dark:bg-gray-800 rounded-lg border-l-4 ${
                  winner === 'Won' ? 'border-l-green-500' : 
                  winner === 'Lost' ? 'border-l-red-500' : 'border-l-yellow-500'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-sm text-gray-500">Week {trade.leg} - vs {getTradePartner(trade)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        winner === 'Won' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        winner === 'Lost' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      }`}>
                        {winner} ({grade})
                      </span>
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {netTradeValue > 0 ? '+' : ''}{netTradeValue.toFixed(1)} pts
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-semibold mb-1 text-green-600">Acquired ({incomingValue.toFixed(1)} pts):</div>
                      <div className="space-y-1">
                        {trade.adds.map(player => {
                          const playerValue = getPlayerValue(player);
                          return (
                            <div key={player.id} className="flex justify-between items-center text-gray-600 dark:text-gray-300 bg-green-50 dark:bg-green-900/20 p-2 rounded">
                              <span>{player.name} ({player.position})</span>
                              <span className="font-semibold text-green-600">{playerValue.toFixed(1)} pts</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold mb-1 text-red-600">Traded Away ({outgoingValue.toFixed(1)} pts):</div>
                      <div className="space-y-1">
                        {trade.drops.length > 0 ? trade.drops.map(player => {
                          const playerValue = getPlayerValue(player);
                          return (
                            <div key={player.id} className="flex justify-between items-center text-gray-600 dark:text-gray-300 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                              <span>{player.name} ({player.position})</span>
                              <span className="font-semibold text-red-600">{playerValue > 0 ? playerValue.toFixed(1) : 'N/A'} pts</span>
                            </div>
                          );
                        }) : <div className="text-sm text-gray-500 italic">No players traded away</div>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-center text-gray-500 py-8">No trades found for this season</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TradeHistorySection;