import React from 'react';
import { motion } from 'framer-motion';
import { TrophyIcon } from '@heroicons/react/24/outline';

const LeagueCard = React.memo(({ 
  league, 
  userData, 
  onRosterClick, 
  onHistoryClick, 
  onLeagueInfoClick 
}) => {
  const isChampion = league.placement === 1 || 
    (league.champion && (
      league.champion.username === userData?.display_name || 
      league.champion.username === userData?.username
    ));

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="card p-6 hover:shadow-xl transition-shadow duration-200 cursor-pointer"
      onClick={() => league.userRoster && onRosterClick(league)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-xl font-semibold mb-2">{league.name}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Teams:</span>
              <p className="font-medium">{league.total_rosters}</p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Status:</span>
              <p className="font-medium capitalize">{league.status}</p>
            </div>
            {league.regularSeasonRecord && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">Record:</span>
                <p className="font-medium">
                  {league.regularSeasonRecord.wins}-{league.regularSeasonRecord.losses}
                  {league.regularSeasonRecord.ties > 0 && `-${league.regularSeasonRecord.ties}`}
                </p>
                <p className="text-xs text-gray-400">
                  {league.regularSeasonRecord.points_for.toFixed(1)} PF
                </p>
              </div>
            )}
            {(league.placement || isChampion) && (
              <div>
                <p className="font-medium flex items-center gap-1">
                  <span className="text-lg">
                    {(league.placement === 1 || isChampion) && '🏆'}
                    {league.placement === 2 && '🥈'}
                    {league.placement === 3 && '🥉'}
                  </span>
                  {(league.placement === 1 || isChampion) 
                    ? 'Champion' 
                    : `${league.placement}${league.placement === 2 ? 'nd' : league.placement === 3 ? 'rd' : 'th'}`}
                </p>
              </div>
            )}
            {league.userRoster && !league.placement && !isChampion && (
              <div>
                <p className="font-medium text-gray-400">
                  {league.status === 'complete' ? 'Rank not stored' : 'In progress'}
                </p>
              </div>
            )}
            <div>
              <span className="text-gray-500 dark:text-gray-400">Scoring:</span>
              <p className="font-medium capitalize">{league.scoring_settings?.rec || 'Standard'}</p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Season:</span>
              <p className="font-medium">{league.season}</p>
            </div>
            {league.champion && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">Champion:</span>
                <p className="font-medium flex items-center gap-1">
                  <span className="text-lg">🏆</span>
                  {league.champion.username}
                </p>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onHistoryClick(league);
            }}
            className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded hover:bg-purple-200 dark:hover:bg-purple-800"
          >
            History
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLeagueInfoClick(league);
            }}
            className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded hover:bg-blue-200 dark:hover:bg-blue-800"
          >
            League Info
          </button>
          {league.userRoster && (
            <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded hover:bg-green-200 dark:hover:bg-green-800 transition-colors font-medium">
              View Dashboard
            </span>
          )}
          <TrophyIcon className="w-6 h-6 text-yellow-500 flex-shrink-0" />
        </div>
      </div>
    </motion.div>
  );
});

export default LeagueCard;