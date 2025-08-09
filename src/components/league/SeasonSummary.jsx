import React from 'react';

const SeasonSummary = ({ leaguesData, allYearsData, userData, showingAllYears, onChampionshipsClick }) => {
  if (showingAllYears && allYearsData) {
    const allLeagues = Object.values(allYearsData).flat();
    const championships = allLeagues.filter(l => 
      l.placement === 1 || 
      (l.champion && (l.champion.username === userData?.display_name || l.champion.username === userData?.username))
    );
    const totalWins = allLeagues.filter(l => l.regularSeasonRecord).reduce((sum, l) => sum + l.regularSeasonRecord.wins, 0);
    const totalLosses = allLeagues.filter(l => l.regularSeasonRecord).reduce((sum, l) => sum + l.regularSeasonRecord.losses, 0);

    return (
      <div className="card p-6 mb-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Career Summary</h3>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
            <div className="text-xl font-bold text-blue-600">{allLeagues.length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Leagues</div>
          </div>
          <button
            onClick={() => {
              const championshipData = Object.entries(allYearsData).flatMap(([year, leagues]) => 
                leagues.filter(l => 
                  l.placement === 1 || 
                  (l.champion && (l.champion.username === userData?.display_name || l.champion.username === userData?.username))
                ).map(league => ({ ...league, year }))
              );
              onChampionshipsClick(championshipData);
            }}
            className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded hover:bg-green-100 dark:hover:bg-green-800/30 transition-colors cursor-pointer w-full"
          >
            <div className="text-xl font-bold text-green-600">{championships.length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Championships</div>
          </button>
          <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded">
            <div className="text-xl font-bold text-yellow-600">{Object.keys(allYearsData).length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Years Played</div>
          </div>
          <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded">
            <div className="text-xl font-bold text-purple-600">{totalWins}-{totalLosses}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Career Record</div>
          </div>
        </div>
      </div>
    );
  }

  if (leaguesData) {
    const championships = leaguesData.filter(l => 
      l.placement === 1 || (l.champion && l.champion.username === userData?.display_name) || (l.champion && l.champion.username === userData?.username)
    );
    const totalWins = leaguesData.filter(l => l.regularSeasonRecord).reduce((sum, l) => sum + l.regularSeasonRecord.wins, 0);
    const totalLosses = leaguesData.filter(l => l.regularSeasonRecord).reduce((sum, l) => sum + l.regularSeasonRecord.losses, 0);

    return (
      <div className="card p-6 mb-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Season Summary</h3>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
            <div className="text-xl font-bold text-blue-600">{leaguesData.length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Leagues</div>
          </div>
          <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded">
            <div className="text-xl font-bold text-green-600">{championships.length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Championships</div>
          </div>
          <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded">
            <div className="text-xl font-bold text-purple-600">{totalWins}-{totalLosses}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Combined Record</div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default SeasonSummary;