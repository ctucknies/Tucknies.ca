import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useLeagueData } from '../hooks/useLeagueData';
import PlayerModal from './league/PlayerModal';
import LeagueInfoModal from './league/LeagueInfoModal';
import { 
  TrophyIcon, 
  UserGroupIcon,
  HomeIcon,
  ChartBarIcon,
  UserIcon,
  ClipboardDocumentListIcon,
  ArrowsRightLeftIcon,
  StarIcon,
  CheckCircleIcon,
  XCircleIcon,
  Bars3Icon,
  Cog6ToothIcon,
  BellIcon,
  QuestionMarkCircleIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import Auth from './Auth';
import UserProfile from './UserProfile';
import { supabase } from '../lib/supabase';
import LeagueCard from './league/LeagueCard';
import LeagueSearch from './league/LeagueSearch';
import SeasonSummary from './league/SeasonSummary';
import PlayerStatsModal from './league/PlayerStatsModal';
import TradeHistorySection from './league/TradeHistorySection';
import MatchupSection from './league/MatchupSection';
import PlayerStatsPage from './PlayerStatsPage';
import TradeFinder from './TradeFinder';
import LeagueScouter from './LeagueScouter';
import { calculatePlacement, calculateWinStreak, calculateAchievements } from './league/utils';

const getTeamName = (teamAbbr) => {
  const teamNames = {
    'ARI': 'Arizona Cardinals', 'ATL': 'Atlanta Falcons', 'BAL': 'Baltimore Ravens', 'BUF': 'Buffalo Bills',
    'CAR': 'Carolina Panthers', 'CHI': 'Chicago Bears', 'CIN': 'Cincinnati Bengals', 'CLE': 'Cleveland Browns',
    'DAL': 'Dallas Cowboys', 'DEN': 'Denver Broncos', 'DET': 'Detroit Lions', 'GB': 'Green Bay Packers',
    'HOU': 'Houston Texans', 'IND': 'Indianapolis Colts', 'JAX': 'Jacksonville Jaguars', 'KC': 'Kansas City Chiefs',
    'LV': 'Las Vegas Raiders', 'LAC': 'Los Angeles Chargers', 'LAR': 'Los Angeles Rams', 'MIA': 'Miami Dolphins',
    'MIN': 'Minnesota Vikings', 'NE': 'New England Patriots', 'NO': 'New Orleans Saints', 'NYG': 'New York Giants',
    'NYJ': 'New York Jets', 'PHI': 'Philadelphia Eagles', 'PIT': 'Pittsburgh Steelers', 'SF': 'San Francisco 49ers',
    'SEA': 'Seattle Seahawks', 'TB': 'Tampa Bay Buccaneers', 'TEN': 'Tennessee Titans', 'WAS': 'Washington Commanders'
  };
  return teamNames[teamAbbr] || `${teamAbbr || 'Unknown'} Defense`;
};

function LeagueManager() {
  const { user } = useAuth();
  const {
    formData,
    setFormData,
    isLoading,
    error,
    leaguesData,
    userData,
    allYearsData,
    showingAllYears,
    handleSubmit,
    resetSearch
  } = useLeagueData();
  const [showAuth, setShowAuth] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [prevUser, setPrevUser] = useState(null);
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [rosterData, setRosterData] = useState(null);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [transactions, setTransactions] = useState(null);
  const [draftData, setDraftData] = useState(null);
  const [matchupData, setMatchupData] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [showMultiYear, setShowMultiYear] = useState(false);
  const [multiYearData, setMultiYearData] = useState(null);
  const [showLeagueInfo, setShowLeagueInfo] = useState(false);
  const [leagueInfoData, setLeagueInfoData] = useState(null);
  const [loadingLeagueInfo, setLoadingLeagueInfo] = useState(false);
  const [allLeagueRosters, setAllLeagueRosters] = useState(null);
  const [selectedPlayer1, setSelectedPlayer1] = useState('');
  const [selectedPlayer2, setSelectedPlayer2] = useState('');
  const [leagueInfoTab, setLeagueInfoTab] = useState('standings');
  const [tradeFilter, setTradeFilter] = useState('all');
  const [waiverFilter, setWaiverFilter] = useState('all');
  const [expandedTeams, setExpandedTeams] = useState(new Set());
  const [showLeagueHistory, setShowLeagueHistory] = useState(false);
  const [leagueHistoryData, setLeagueHistoryData] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showPlayerStats, setShowPlayerStats] = useState(false);
  const [playerStatsData, setPlayerStatsData] = useState(null);
  const [loadingPlayerStats, setLoadingPlayerStats] = useState(false);
  const [playerStatsTab, setPlayerStatsTab] = useState('current');
  const [allYearStats, setAllYearStats] = useState(null);
  const [showChampionships, setShowChampionships] = useState(false);
  const [championshipData, setChampionshipData] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [selectedPlayerData, setSelectedPlayerData] = useState(null);
  const [loadingPlayerModal, setLoadingPlayerModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showPlayerStatsPage, setShowPlayerStatsPage] = useState(false);
  const [showTradeFinder, setShowTradeFinder] = useState(false);
  const [showLeagueScouter, setShowLeagueScouter] = useState(false);
  const [showTradeCrafter, setShowTradeCrafter] = useState(false);
  
  // API cache to prevent duplicate requests
  const [apiCache, setApiCache] = useState(new Map());
  const [pendingRequests, setPendingRequests] = useState(new Map());
  
  // Lazy load heavy components
  const LazyPlayerStatsPage = React.lazy(() => import('./PlayerStatsPage'));
  const LazyTradeFinder = React.lazy(() => import('./TradeFinder'));
  const LazyLeagueScouter = React.lazy(() => import('./LeagueScouter'));
  const LazyTradeCrafter = React.lazy(() => import('./TradeCrafter'));

  // Memoized cached API call function
  const cachedApiCall = useCallback(async (url, cacheKey = url, ttl = 300000) => { // 5 min TTL
    const now = Date.now();
    const cached = apiCache.get(cacheKey);
    
    // Return cached data if still valid
    if (cached && (now - cached.timestamp) < ttl) {
      return cached.data;
    }
    
    // Check if request is already pending
    if (pendingRequests.has(cacheKey)) {
      return pendingRequests.get(cacheKey);
    }
    
    // Make new request
    const requestPromise = fetch(url).then(async (response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      
      // Cache the result
      setApiCache(prev => new Map(prev.set(cacheKey, { data, timestamp: now })));
      setPendingRequests(prev => {
        const newMap = new Map(prev);
        newMap.delete(cacheKey);
        return newMap;
      });
      
      return data;
    }).catch(error => {
      setPendingRequests(prev => {
        const newMap = new Map(prev);
        newMap.delete(cacheKey);
        return newMap;
      });
      throw error;
    });
    
    setPendingRequests(prev => new Map(prev.set(cacheKey, requestPromise)));
    return requestPromise;
  }, [apiCache, pendingRequests]);
  
  // Load saved profile data if user is logged in
  useEffect(() => {
    if (user) {
      loadUserProfile();
      // Close auth modal if user just logged in
      if (!prevUser && user) {
        setShowAuth(false);
      }
    }
    setPrevUser(user);
  }, [user, prevUser]);

  // Auto-search when form data is populated
  useEffect(() => {
    if (formData.username && formData.year && user) {
      const timer = setTimeout(() => {
        handleSubmit({ preventDefault: () => {} });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [formData.username, formData.year, user]);



  const loadUserProfile = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('sleeper_username, favorite_year, favorite_league')
        .eq('id', user.id)
        .single();
      
      if (data) {
        setFormData({
          username: data.sleeper_username || '',
          year: data.favorite_year || new Date().getFullYear().toString(),
          league: data.favorite_league || ''
        });
        

      }
    } catch (error) {
      // No saved profile found
    }
  };





  const closeModal = () => {
    setSelectedLeague(null);
    setRosterData(null);
    setTransactions(null);
    setDraftData(null);
    setActiveTab('overview');
  };

  const fetchLeagueInfo = async (league) => {
    setLoadingLeagueInfo(true);
    setShowLeagueInfo(true);
    
    try {
      // Get all players data
      const playersResponse = await fetch('https://api.sleeper.app/v1/players/nfl');
      const allPlayers = await playersResponse.json();
      
      // Get all rosters with user info
      const rostersResponse = await fetch(`https://api.sleeper.app/v1/league/${league.league_id}/rosters`);
      const rosters = await rostersResponse.json();
      
      // Get users info
      const usersResponse = await fetch(`https://api.sleeper.app/v1/league/${league.league_id}/users`);
      const users = await usersResponse.json();
      
      // Get all transactions
      const transactionPromises = [];
      for (let week = 1; week <= 18; week++) {
        transactionPromises.push(
          fetch(`https://api.sleeper.app/v1/league/${league.league_id}/transactions/${week}`)
            .then(res => res.ok ? res.json() : [])
            .catch(() => [])
        );
      }
      const weeklyTransactions = await Promise.all(transactionPromises);
      const allTransactions = weeklyTransactions.flat();
      
      // Get champion if league is complete
      let championRosterId = null;
      if (league.status === 'complete') {
        try {
          const playoffResponse = await fetch(`https://api.sleeper.app/v1/league/${league.league_id}/winners_bracket`);
          if (playoffResponse.ok) {
            const playoffs = await playoffResponse.json();
            if (playoffs && playoffs.length > 0) {
              const finalMatch = playoffs.reduce((max, match) => 
                match.r > max.r ? match : max, playoffs[0]
              );
              if (finalMatch && finalMatch.w) {
                championRosterId = finalMatch.w;
              }
            }
          }
        } catch (err) {
          console.log('Could not fetch playoff data');
        }
      }

      // Process standings
      const standings = rosters.map(roster => {
        const user = users.find(u => u.user_id === roster.owner_id);
        return {
          ...roster,
          username: user?.display_name || user?.username || 'Unknown',
          avatar: user?.avatar,
          wins: roster.settings?.wins || 0,
          losses: roster.settings?.losses || 0,
          ties: roster.settings?.ties || 0,
          points_for: roster.settings?.fpts || 0,
          points_against: roster.settings?.fpts_against || 0,
          isChampion: roster.roster_id === championRosterId
        };
      }).sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.points_for - a.points_for;
      });
      
      // Get player stats for the season
      const playerStatsResponse = await fetch(`https://api.sleeper.app/v1/stats/nfl/regular/${league.season}`);
      const playerStats = playerStatsResponse.ok ? await playerStatsResponse.json() : {};
      
      // Process all teams with rosters and player stats
      const teams = standings.map(roster => {
        const playersWithStats = roster.players?.map(playerId => {
          const player = allPlayers[playerId];
          const stats = playerStats[playerId] || {};
          const fantasyPoints = stats.pts_ppr || stats.pts_std || stats.pts_half_ppr || 0;
          
          return {
            id: playerId,
            name: player?.full_name || (player?.position === 'DEF' ? `${player?.team || 'Unknown'} DEF` : 'Unknown Player'),
            position: player?.position || 'N/A',
            team: player?.team || 'FA',
            fantasyPoints: fantasyPoints,
            stats: stats
          };
        }) || [];
        
        // Sort players by fantasy points (best to worst)
        playersWithStats.sort((a, b) => b.fantasyPoints - a.fantasyPoints);
        
        return {
          ...roster,
          players: playersWithStats
        };
      });
      
      // Store teams data in allLeagueRosters for trade calculations
      setAllLeagueRosters(teams);
      
      // Process transactions with player names and all participants
      const processedTransactions = allTransactions.map(transaction => {
        if (transaction.type === 'trade') {
          // For trades, show all participants
          const participants = [];
          const allAdds = {};
          const allDrops = {};
          
          // Group adds and drops by roster
          if (transaction.adds) {
            Object.entries(transaction.adds).forEach(([playerId, rosterId]) => {
              if (!allAdds[rosterId]) allAdds[rosterId] = [];
              allAdds[rosterId].push({
                id: playerId,
                name: allPlayers[playerId]?.full_name || (allPlayers[playerId]?.position === 'DEF' ? `${allPlayers[playerId]?.team || 'Unknown'} DEF` : 'Unknown Player'),
                position: allPlayers[playerId]?.position || 'N/A'
              });
            });
          }
          
          if (transaction.drops) {
            Object.entries(transaction.drops).forEach(([playerId, rosterId]) => {
              if (!allDrops[rosterId]) allDrops[rosterId] = [];
              allDrops[rosterId].push({
                id: playerId,
                name: allPlayers[playerId]?.full_name || (allPlayers[playerId]?.position === 'DEF' ? `${allPlayers[playerId]?.team || 'Unknown'} DEF` : 'Unknown Player'),
                position: allPlayers[playerId]?.position || 'N/A'
              });
            });
          }
          
          // Get all involved rosters
          const involvedRosters = new Set([...Object.values(transaction.adds || {}), ...Object.values(transaction.drops || {})]);
          
          involvedRosters.forEach(rosterId => {
            const roster = rosters.find(r => r.roster_id === rosterId);
            const user = users.find(u => u.user_id === roster?.owner_id);
            participants.push({
              rosterId,
              username: user?.display_name || user?.username || 'Unknown',
              acquired: allAdds[rosterId] || [],
              traded: allDrops[rosterId] || []
            });
          });
          
          return {
            ...transaction,
            participants,
            adds: Object.values(allAdds).flat(),
            drops: Object.values(allDrops).flat()
          };
        } else {
          // For non-trades, use original logic
          let primaryUser = null;
          if (transaction.roster_ids && transaction.roster_ids.length > 0) {
            const roster = rosters.find(r => r.roster_id === transaction.roster_ids[0]);
            primaryUser = users.find(u => u.user_id === roster?.owner_id);
          }
          
          return {
            ...transaction,
            username: primaryUser?.display_name || primaryUser?.username || 'Unknown',
            adds: transaction.adds ? Object.keys(transaction.adds).map(playerId => ({
              id: playerId,
              name: allPlayers[playerId]?.full_name || (allPlayers[playerId]?.position === 'DEF' ? `${allPlayers[playerId]?.team || 'Unknown'} DEF` : 'Unknown Player'),
              position: allPlayers[playerId]?.position || 'N/A'
            })) : [],
            drops: transaction.drops ? Object.keys(transaction.drops).map(playerId => ({
              id: playerId,
              name: allPlayers[playerId]?.full_name || (allPlayers[playerId]?.position === 'DEF' ? `${allPlayers[playerId]?.team || 'Unknown'} DEF` : 'Unknown Player'),
              position: allPlayers[playerId]?.position || 'N/A'
            })) : []
          };
        }
      });
      
      setLeagueInfoData({
        league,
        standings,
        teams,
        transactions: processedTransactions,
        trades: processedTransactions.filter(t => t.type === 'trade'),
        waivers: processedTransactions.filter(t => t.type === 'waiver' || t.type === 'free_agent')
      });
    } catch (err) {
      console.error('Error fetching league info:', err);
    } finally {
      setLoadingLeagueInfo(false);
    }
  };

  const closeLeagueInfo = () => {
    setShowLeagueInfo(false);
    setLeagueInfoData(null);
    setLeagueInfoTab('standings');
    setTradeFilter('all');
    setWaiverFilter('all');
    setExpandedTeams(new Set());
  };

  const fetchLeagueHistory = async (league) => {
    setLoadingHistory(true);
    setShowLeagueHistory(true);
    
    try {
      const currentYear = new Date().getFullYear();
      const startYear = 2020;
      const historyData = [];
      const leagueIds = new Set(); // Track unique league IDs to avoid duplicates
      
      // First, get all years the user participated to find league IDs
      const userLeagueIds = {};
      for (let year = startYear; year <= currentYear; year++) {
        try {
          const userLeaguesResponse = await fetch(`https://api.sleeper.app/v1/user/${userData.user_id}/leagues/nfl/${year}`);
          if (userLeaguesResponse.ok) {
            const yearLeagues = await userLeaguesResponse.json();
            const yearLeague = yearLeagues.find(l => l.name === league.name);
            if (yearLeague) {
              userLeagueIds[year] = yearLeague.league_id;
              leagueIds.add(yearLeague.league_id);
            }
          }
        } catch (err) {
          console.log(`Error fetching user leagues for ${year}:`, err);
        }
      }
      
      // Now check each year, including years user wasn't in the league
      for (let year = startYear; year <= currentYear; year++) {
        try {
          let yearLeague = null;
          
          // If user was in league this year, use that data
          if (userLeagueIds[year]) {
            const leagueResponse = await fetch(`https://api.sleeper.app/v1/league/${userLeagueIds[year]}`);
            if (leagueResponse.ok) {
              yearLeague = await leagueResponse.json();
            }
          } else {
            // Try to find the league by checking previous/next year league IDs
            for (const leagueId of leagueIds) {
              try {
                const leagueResponse = await fetch(`https://api.sleeper.app/v1/league/${leagueId}`);
                if (leagueResponse.ok) {
                  const testLeague = await leagueResponse.json();
                  // Check if this league has the same name and is from the target year
                  if (testLeague.name === league.name && testLeague.season === year.toString()) {
                    yearLeague = testLeague;
                    break;
                  }
                  // Also check previous_league_id for continuity
                  if (testLeague.previous_league_id) {
                    const prevResponse = await fetch(`https://api.sleeper.app/v1/league/${testLeague.previous_league_id}`);
                    if (prevResponse.ok) {
                      const prevLeague = await prevResponse.json();
                      if (prevLeague.name === league.name && prevLeague.season === year.toString()) {
                        yearLeague = prevLeague;
                        leagueIds.add(prevLeague.league_id);
                        break;
                      }
                    }
                  }
                }
              } catch (err) {
                continue;
              }
            }
          }
          
          if (yearLeague) {
            let champion = null;
            
            if (yearLeague.status === 'complete') {
              try {
                const playoffResponse = await fetch(`https://api.sleeper.app/v1/league/${yearLeague.league_id}/winners_bracket`);
                if (playoffResponse.ok) {
                  const playoffs = await playoffResponse.json();
                  if (playoffs && playoffs.length > 0) {
                    const finalMatch = playoffs.reduce((max, match) => 
                      match.r > max.r ? match : max, playoffs[0]
                    );
                    if (finalMatch && finalMatch.w) {
                      const rostersResponse = await fetch(`https://api.sleeper.app/v1/league/${yearLeague.league_id}/rosters`);
                      const usersResponse = await fetch(`https://api.sleeper.app/v1/league/${yearLeague.league_id}/users`);
                      
                      if (rostersResponse.ok && usersResponse.ok) {
                        const rosters = await rostersResponse.json();
                        const users = await usersResponse.json();
                        const championRoster = rosters.find(r => r.roster_id === finalMatch.w);
                        if (championRoster) {
                          const championUser = users.find(u => u.user_id === championRoster.owner_id);
                          champion = {
                            username: championUser?.display_name || championUser?.username || 'Unknown',
                            roster_id: championRoster.roster_id,
                            record: `${championRoster.settings?.wins || 0}-${championRoster.settings?.losses || 0}`,
                            points: championRoster.settings?.fpts || 0
                          };
                        }
                      }
                    }
                  }
                }
              } catch (err) {
                console.log(`Could not fetch playoff data for ${year}`);
              }
            }
            
            historyData.push({
              year,
              league: yearLeague,
              champion,
              status: yearLeague.status,
              userParticipated: !!userLeagueIds[year]
            });
          }
        } catch (err) {
          console.log(`Error fetching data for year ${year}:`, err);
        }
      }
      
      // Sort by year (newest first)
      historyData.sort((a, b) => b.year - a.year);
      
      setLeagueHistoryData({
        leagueName: league.name,
        history: historyData
      });
    } catch (err) {
      console.error('Error fetching league history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const closeLeagueHistory = () => {
    setShowLeagueHistory(false);
    setLeagueHistoryData(null);
  };

  const fetchPlayerStats = async (playerId, playerName, year, targetWeek = null) => {
    setLoadingPlayerStats(true);
    setShowPlayerStats(true);
    setPlayerStatsTab('current');
    
    try {
      const playersResponse = await fetch('https://api.sleeper.app/v1/players/nfl');
      const allPlayers = await playersResponse.json();
      const playerInfo = allPlayers[playerId];
      
      const currentYear = new Date().getFullYear();
      const startYear = 2020;
      const yearlyStats = {};
      
      for (let statsYear = startYear; statsYear <= currentYear; statsYear++) {
        try {
          const statsResponse = await fetch(`https://api.sleeper.app/v1/stats/nfl/regular/${statsYear}`);
          if (statsResponse.ok) {
            const allStats = await statsResponse.json();
            const playerStats = allStats[playerId] || {};
            
            if (Object.keys(playerStats).length > 0) {
              const allPlayersWithStats = Object.entries(allStats)
                .map(([id, stats]) => ({
                  id,
                  position: allPlayers[id]?.position,
                  fantasyPoints: stats.pts_ppr || stats.pts_std || stats.pts_half_ppr || 0
                }))
                .filter(p => p.fantasyPoints > 0)
                .sort((a, b) => b.fantasyPoints - a.fantasyPoints);
              
              const overallRank = allPlayersWithStats.findIndex(p => p.id === playerId) + 1;
              const positionPlayers = allPlayersWithStats.filter(p => p.position === playerInfo?.position);
              const positionRank = positionPlayers.findIndex(p => p.id === playerId) + 1;
              
              const derivedStats = {
                total_td: (playerStats.pass_td || 0) + (playerStats.rush_td || 0) + (playerStats.rec_td || 0),
                fantasy_ppg: playerStats.gp > 0 ? ((playerStats.pts_ppr || playerStats.pts_std || 0) / playerStats.gp).toFixed(1) : '0'
              };
              
              if (playerStats.pass_att > 0) {
                derivedStats.completion_pct = ((playerStats.pass_cmp || 0) / playerStats.pass_att * 100).toFixed(1);
                derivedStats.yards_per_attempt = ((playerStats.pass_yd || 0) / playerStats.pass_att).toFixed(1);
              }
              
              if (playerStats.rush_att > 0) {
                derivedStats.yards_per_carry = ((playerStats.rush_yd || 0) / playerStats.rush_att).toFixed(1);
              }
              
              if (playerStats.rec > 0) {
                derivedStats.yards_per_reception = ((playerStats.rec_yd || 0) / playerStats.rec).toFixed(1);
              }
              
              yearlyStats[statsYear] = {
                stats: playerStats,
                derivedStats,
                overallRank: overallRank > 0 ? overallRank : 'N/A',
                positionRank: positionRank > 0 ? positionRank : 'N/A'
              };
            }
          }
        } catch (err) {
          console.log(`No stats found for ${statsYear}`);
        }
      }
      
      const currentYearData = yearlyStats[year] || {
        stats: {},
        derivedStats: { total_td: 0, fantasy_ppg: '0' },
        overallRank: 'N/A',
        positionRank: 'N/A'
      };
      
      setPlayerStatsData({
        playerInfo,
        stats: currentYearData.stats,
        derivedStats: currentYearData.derivedStats,
        year,
        playerName,
        playerId,
        overallRank: currentYearData.overallRank,
        positionRank: currentYearData.positionRank,
        targetWeek
      });
      
      setAllYearStats(yearlyStats);
      
      if (targetWeek) {
        setPlayerStatsTab('weekly');
      }
    } catch (err) {
      console.error('Error fetching player stats:', err);
    } finally {
      setLoadingPlayerStats(false);
    }
  };

  const closePlayerStats = () => {
    setShowPlayerStats(false);
    setPlayerStatsData(null);
    setAllYearStats(null);
    setPlayerStatsTab('current');
  };

  const switchToYear = (year) => {
    if (allYearStats && allYearStats[year]) {
      const yearData = allYearStats[year];
      setPlayerStatsData({
        ...playerStatsData,
        stats: yearData.stats,
        derivedStats: yearData.derivedStats,
        year,
        overallRank: yearData.overallRank,
        positionRank: yearData.positionRank
      });
    }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedStandings = (standings) => {
    if (!sortConfig.key) return standings;
    
    return [...standings].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];
      
      // Handle special cases
      if (sortConfig.key === 'username') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (sortConfig.key === 'record') {
        aValue = a.wins;
        bValue = b.wins;
      }
      
      if (sortConfig.key === 'diff') {
        aValue = a.points_for - a.points_against;
        bValue = b.points_for - b.points_against;
      }
      
      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  const fetchPlayerModalData = async (username, leagueId, season, isSelfView = false) => {
    setLoadingPlayerModal(true);
    setShowPlayerModal(true);
    setActiveTab('roster');
    
    if (isSelfView) {
      setSelectedLeague({ league_id: leagueId, season, name: selectedLeague?.name || 'League' });
    }
    
    try {
      // Get user ID from username
      const userResponse = await fetch(`https://api.sleeper.app/v1/user/${username}`);
      if (!userResponse.ok) throw new Error('User not found');
      const userData = await userResponse.json();
      
      // Get league users to find the user
      const usersResponse = await fetch(`https://api.sleeper.app/v1/league/${leagueId}/users`);
      const users = await usersResponse.json();
      const user = users.find(u => u.user_id === userData.user_id);
      
      // Get rosters
      const rostersResponse = await fetch(`https://api.sleeper.app/v1/league/${leagueId}/rosters`);
      const rosters = await rostersResponse.json();
      const userRoster = rosters.find(r => r.owner_id === userData.user_id);
      
      if (!userRoster) {
        throw new Error('User not found in this league');
      }
      
      // Get all players data
      const playersResponse = await fetch('https://api.sleeper.app/v1/players/nfl');
      const allPlayers = await playersResponse.json();
      
      // Get player stats for the season
      const playerStatsResponse = await fetch(`https://api.sleeper.app/v1/stats/nfl/regular/${season}`);
      const playerStats = playerStatsResponse.ok ? await playerStatsResponse.json() : {};
      
      // Process roster with stats
      const rosterWithStats = userRoster.players?.map(playerId => {
        const player = allPlayers[playerId];
        const stats = playerStats[playerId] || {};
        const fantasyPoints = stats.pts_ppr || stats.pts_std || stats.pts_half_ppr || 0;
        
        return {
          id: playerId,
          name: player?.full_name || (player?.position === 'DEF' ? `${player?.team || 'Unknown'} DEF` : 'Unknown Player'),
          position: player?.position || 'N/A',
          team: player?.team || 'FA',
          fantasyPoints: fantasyPoints,
          stats: stats
        };
      }) || [];
      
      // Sort by fantasy points
      rosterWithStats.sort((a, b) => b.fantasyPoints - a.fantasyPoints);
      
      // Get all transactions
      const transactionPromises = [];
      for (let week = 1; week <= 18; week++) {
        transactionPromises.push(
          fetch(`https://api.sleeper.app/v1/league/${leagueId}/transactions/${week}`)
            .then(res => res.ok ? res.json() : [])
            .catch(() => [])
        );
      }
      const weeklyTransactions = await Promise.all(transactionPromises);
      const allTransactions = weeklyTransactions.flat().filter(t => 
        t.roster_ids?.includes(userRoster.roster_id) ||
        (t.adds && Object.values(t.adds).includes(userRoster.roster_id)) ||
        (t.drops && Object.values(t.drops).includes(userRoster.roster_id))
      );
      
      // Process transactions
      const processedTransactions = allTransactions.map(transaction => {
        const userRosterId = userRoster.roster_id;
        const userAdds = [];
        const userDrops = [];
        
        if (transaction.adds) {
          Object.entries(transaction.adds).forEach(([playerId, rosterId]) => {
            if (rosterId === userRosterId) {
              userAdds.push({
                id: playerId,
                name: allPlayers[playerId]?.full_name || (allPlayers[playerId]?.position === 'DEF' ? `${allPlayers[playerId]?.team || 'Unknown'} Defense` : 'Unknown Player'),
                position: allPlayers[playerId]?.position || 'N/A'
              });
            }
          });
        }
        
        if (transaction.drops) {
          Object.entries(transaction.drops).forEach(([playerId, rosterId]) => {
            if (rosterId === userRosterId) {
              userDrops.push({
                id: playerId,
                name: allPlayers[playerId]?.full_name || (allPlayers[playerId]?.position === 'DEF' ? `${allPlayers[playerId]?.team || 'Unknown'} Defense` : 'Unknown Player'),
                position: allPlayers[playerId]?.position || 'N/A'
              });
            }
          });
        }
        
        return {
          ...transaction,
          adds: userAdds,
          drops: userDrops
        };
      });
      
      // Get matchup data
      const matchupPromises = [];
      for (let week = 1; week <= 18; week++) {
        matchupPromises.push(
          fetch(`https://api.sleeper.app/v1/league/${leagueId}/matchups/${week}`)
            .then(res => res.ok ? res.json() : [])
            .catch(() => [])
        );
      }
      const weeklyMatchups = await Promise.all(matchupPromises);
      const userMatchups = weeklyMatchups.map((week, index) => {
        const userMatchup = week.find(m => m.roster_id === userRoster.roster_id);
        if (!userMatchup) return null;
        const opponent = week.find(m => m.matchup_id === userMatchup.matchup_id && m.roster_id !== userRoster.roster_id);
        return {
          week: index + 1,
          userPoints: userMatchup.points || 0,
          opponentPoints: opponent?.points || 0,
          won: (userMatchup.points || 0) > (opponent?.points || 0),
          opponentRosterId: opponent?.roster_id
        };
      }).filter(Boolean);
      
      // Calculate season stats
      const validMatchups = userMatchups.filter(m => m.userPoints > 0);
      const wins = validMatchups.filter(m => m.won).length;
      const totalPoints = validMatchups.reduce((sum, m) => sum + m.userPoints, 0);
      
      const seasonStats = {
        record: `${wins}-${validMatchups.length - wins}`,
        totalPoints: totalPoints.toFixed(1),
        avgPoints: validMatchups.length > 0 ? (totalPoints / validMatchups.length).toFixed(1) : '0',
        highestScore: validMatchups.length > 0 ? Math.max(...validMatchups.map(m => m.userPoints)).toFixed(1) : '0',
        lowestScore: validMatchups.length > 0 ? Math.min(...validMatchups.map(m => m.userPoints)).toFixed(1) : '0',
        pointsAgainst: validMatchups.reduce((sum, m) => sum + m.opponentPoints, 0).toFixed(1)
      };
      
      // Get draft data
      let userDraftPicks = [];
      try {
        const draftsResponse = await fetch(`https://api.sleeper.app/v1/league/${leagueId}/drafts`);
        if (draftsResponse.ok) {
          const drafts = await draftsResponse.json();
          if (drafts.length > 0) {
            const draftPicksResponse = await fetch(`https://api.sleeper.app/v1/draft/${drafts[0].draft_id}/picks`);
            if (draftPicksResponse.ok) {
              const allPicks = await draftPicksResponse.json();
              userDraftPicks = allPicks.filter(pick => pick.roster_id === userRoster.roster_id);
            }
          }
        }
      } catch (error) {
        // Draft data failed to load
      }
      
      // Process draft picks with player names
      const processedDraft = userDraftPicks.map(pick => ({
        ...pick,
        player: {
          name: allPlayers[pick.player_id]?.full_name || (allPlayers[pick.player_id]?.position === 'DEF' ? `${allPlayers[pick.player_id]?.team || 'Unknown'} DEF` : 'Unknown Player'),
          position: allPlayers[pick.player_id]?.position || 'N/A',
          team: allPlayers[pick.player_id]?.team || 'FA'
        }
      }));
      
      // Calculate achievements for self-view
      let userAchievements = [];
      if (isSelfView) {
        const analytics = {
          record: seasonStats.record,
          totalPoints: seasonStats.totalPoints,
          avgPoints: seasonStats.avgPoints,
          highestScore: seasonStats.highestScore,
          lowestScore: seasonStats.lowestScore,
          winStreak: calculateWinStreak(userMatchups.filter(m => m.userPoints > 0)),
          pointsAgainst: seasonStats.pointsAgainst
        };
        userAchievements = calculateAchievements(analytics, userMatchups, { display_name: username }, { league_id: leagueId, season });
      }
      
      // Get all league rosters for comparison
      const [allRosters, allUsers] = await Promise.all([
        fetch(`https://api.sleeper.app/v1/league/${leagueId}/rosters`).then(r => r.ok ? r.json() : []),
        fetch(`https://api.sleeper.app/v1/league/${leagueId}/users`).then(r => r.ok ? r.json() : [])
      ]);
      
      setSelectedPlayerData({
        user,
        roster: userRoster,
        rosterWithStats,
        transactions: processedTransactions,
        trades: processedTransactions.filter(t => t.type === 'trade'),
        waivers: processedTransactions.filter(t => t.type === 'waiver' || t.type === 'free_agent'),
        matchups: userMatchups,
        seasonStats,
        season,
        draft: processedDraft,
        achievements: userAchievements,
        isSelfView,
        allLeagueRosters: allRosters.map(roster => {
          const rosterUser = allUsers.find(u => u.user_id === roster.owner_id);
          return {
            ...roster,
            username: rosterUser?.display_name || rosterUser?.username || 'Unknown',
            wins: roster.settings?.wins || 0,
            losses: roster.settings?.losses || 0,
            points_for: roster.settings?.fpts || 0
          };
        })
      });
    } catch (err) {
      console.error('Error fetching player data:', err);
      setSelectedPlayerData(null);
    } finally {
      setLoadingPlayerModal(false);
    }
  };

  const closePlayerModal = () => {
    setShowPlayerModal(false);
    setSelectedPlayerData(null);
  };

  const fetchRosterDetails = useCallback(async (league) => {
    try {
      // Use the player modal data structure instead
      const username = userData?.display_name || userData?.username || 'You';
      await fetchPlayerModalData(username, league.league_id, league.season, true); // true flag for self-view
    } catch (err) {
      console.error('Error fetching league details:', err);
    }
  }, [userData, fetchPlayerModalData]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50 dark:from-slate-900 dark:via-purple-900 dark:to-slate-900">
      {/* Navigation Bar */}
      <nav className="fixed top-0 w-full z-50 bg-black/20 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <TrophyIcon className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-400" />
              <span className="text-lg sm:text-xl font-bold text-white">Fantasy Hub</span>
            </div>
            
            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-white p-2"
              >
                <Bars3Icon className="w-6 h-6" />
              </button>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-4 lg:gap-6">
              <button 
                onClick={() => setShowPlayerStatsPage(true)}
                className="text-gray-300 hover:text-white transition-colors text-sm lg:text-base"
              >
                Player Stats
              </button>
              <button 
                onClick={() => setShowTradeFinder(true)}
                className="text-gray-300 hover:text-white transition-colors text-sm lg:text-base"
              >
                Trade Finder
              </button>
              <button 
                onClick={() => setShowTradeCrafter(true)}
                className="text-gray-300 hover:text-white transition-colors text-sm lg:text-base"
              >
                Trade Crafter
              </button>
              <button 
                onClick={() => setShowLeagueScouter(true)}
                className="text-gray-300 hover:text-white transition-colors text-sm lg:text-base"
              >
                League Scouter
              </button>
              {user ? (
                <button
                  onClick={() => setShowProfile(true)}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-3 py-2 lg:px-4 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all text-sm lg:text-base"
                >
                  Profile
                </button>
              ) : (
                <button
                  onClick={() => setShowAuth(true)}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-3 py-2 lg:px-4 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all text-sm lg:text-base"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Mobile Menu */}
        {sidebarOpen && (
          <div className="md:hidden bg-black/30 backdrop-blur-xl border-t border-white/10">
            <div className="px-4 py-3 space-y-3">
              <button 
                onClick={() => { setShowPlayerStatsPage(true); setSidebarOpen(false); }}
                className="block w-full text-left text-gray-300 hover:text-white transition-colors py-2"
              >
                Player Stats
              </button>
              <button 
                onClick={() => { setShowTradeFinder(true); setSidebarOpen(false); }}
                className="block w-full text-left text-gray-300 hover:text-white transition-colors py-2"
              >
                Trade Finder
              </button>
              <button 
                onClick={() => { setShowTradeCrafter(true); setSidebarOpen(false); }}
                className="block w-full text-left text-gray-300 hover:text-white transition-colors py-2"
              >
                Trade Crafter
              </button>
              <button 
                onClick={() => { setShowLeagueScouter(true); setSidebarOpen(false); }}
                className="block w-full text-left text-gray-300 hover:text-white transition-colors py-2"
              >
                League Scouter
              </button>
              {user ? (
                <button
                  onClick={() => { setShowProfile(true); setSidebarOpen(false); }}
                  className="block w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all mt-3"
                >
                  Profile
                </button>
              ) : (
                <button
                  onClick={() => { setShowAuth(true); setSidebarOpen(false); }}
                  className="block w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all mt-3"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center min-h-screen px-6 pt-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-4xl mx-auto"
        >
          <div className="mb-6 sm:mb-8">
            <TrophyIcon className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 mx-auto text-yellow-400 mb-4 sm:mb-6" />
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white mb-4 sm:mb-6 leading-tight px-2">
              Fantasy Football
              <span className="block text-transparent bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text">
                Reimagined
              </span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-300 mb-8 sm:mb-12 max-w-2xl mx-auto px-4">
              Analyze your leagues, track player stats, find trades, and dominate your competition with advanced fantasy football tools.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 sm:p-6 md:p-8 border border-white/20 shadow-2xl mx-2 sm:mx-4">
            <LeagueSearch 
              formData={formData}
              setFormData={setFormData}
              onSubmit={handleSubmit}
              isLoading={isLoading}
            />
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mt-8 sm:mt-12 md:mt-16 px-2 sm:px-4">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white/5 backdrop-blur-xl rounded-xl p-4 sm:p-6 border border-white/10 hover:bg-white/10 transition-all cursor-pointer"
              onClick={() => setShowPlayerStatsPage(true)}
            >
              <ChartBarIcon className="w-12 h-12 text-blue-400 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Player Stats</h3>
              <p className="text-gray-300">Search NFL players, compare stats, and analyze performance trends</p>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white/5 backdrop-blur-xl rounded-xl p-4 sm:p-6 border border-white/10 hover:bg-white/10 transition-all cursor-pointer"
              onClick={() => setShowTradeFinder(true)}
            >
              <ArrowsRightLeftIcon className="w-12 h-12 text-green-400 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Trade Finder</h3>
              <p className="text-gray-300">Trade suggestions based on team strengths and needs</p>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white/5 backdrop-blur-xl rounded-xl p-4 sm:p-6 border border-white/10 hover:bg-white/10 transition-all cursor-pointer"
              onClick={() => setShowTradeCrafter(true)}
            >
              <Cog6ToothIcon className="w-12 h-12 text-orange-400 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Trade Crafter</h3>
              <p className="text-gray-300">Build and analyze custom trades with detailed team breakdowns</p>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white/5 backdrop-blur-xl rounded-xl p-4 sm:p-6 border border-white/10 hover:bg-white/10 transition-all cursor-pointer"
              onClick={() => setShowLeagueScouter(true)}
            >
              <UserGroupIcon className="w-12 h-12 text-purple-400 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">League Scouter</h3>
              <p className="text-gray-300">Scout opponents, analyze league history, and track member stats</p>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed top-20 sm:top-24 left-2 right-2 sm:left-1/2 sm:right-auto sm:transform sm:-translate-x-1/2 sm:max-w-md bg-red-500/90 backdrop-blur-xl border border-red-400/50 rounded-xl p-4 shadow-lg z-50"
        >
          <div className="flex items-center gap-3">
            <span className="text-white text-sm">⚠️</span>
            <div>
              <p className="text-white font-medium">{error}</p>
              <button
                onClick={resetSearch}
                className="mt-1 text-sm text-red-100 hover:text-white font-medium transition-colors"
              >
                Try again →
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Single Year Display */}
      {leaguesData && !showingAllYears && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <SeasonSummary 
            leaguesData={leaguesData}
            allYearsData={null}
            userData={userData}
            showingAllYears={false}
            onChampionshipsClick={(data) => {
              setChampionshipData(data);
              setShowChampionships(true);
            }}
          />
          
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <UserGroupIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                Your Leagues ({leaguesData[0]?.season || formData.year})
              </h2>
              <p className="text-gray-500 dark:text-gray-400 font-medium">
                {leaguesData.length} league{leaguesData.length !== 1 ? 's' : ''} found
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            {leaguesData.map((league) => (
              <LeagueCard
                key={league.league_id}
                league={league}
                userData={userData}
                onRosterClick={fetchRosterDetails}
                onHistoryClick={fetchLeagueHistory}
                onLeagueInfoClick={fetchLeagueInfo}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* All Years Display */}
      {allYearsData && showingAllYears && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <SeasonSummary 
            leaguesData={null}
            allYearsData={allYearsData}
            userData={userData}
            showingAllYears={true}
            onChampionshipsClick={(data) => {
              setChampionshipData(data);
              setShowChampionships(true);
            }}
          />
          
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
              <UserGroupIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                All Your Leagues
              </h2>
              <p className="text-gray-500 dark:text-gray-400 font-medium">
                Complete history across all years
              </p>
            </div>
          </div>

          {Object.entries(allYearsData)
            .sort(([a], [b]) => parseInt(b) - parseInt(a))
            .map(([year, leagues]) => (
            <div key={year} className="space-y-4">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-2xl font-black text-white">{year}</span>
                </div>
                <div>
                  <div className="text-xl font-bold text-gray-800 dark:text-gray-200">{year} Season</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                    {leagues.length} league{leagues.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
              
              <div className="grid gap-4">
                {leagues.map((league) => (
                  <LeagueCard
                    key={league.league_id}
                    league={league}
                    userData={userData}
                    onRosterClick={fetchRosterDetails}
                    onHistoryClick={fetchLeagueHistory}
                    onLeagueInfoClick={fetchLeagueInfo}
                  />
                ))}
              </div>
            </div>
          ))}
        </motion.div>
      )}



      <LeagueInfoModal
        showLeagueInfo={showLeagueInfo}
        leagueInfoData={leagueInfoData}
        loadingLeagueInfo={loadingLeagueInfo}
        leagueInfoTab={leagueInfoTab}
        setLeagueInfoTab={setLeagueInfoTab}
        tradeFilter={tradeFilter}
        setTradeFilter={setTradeFilter}
        waiverFilter={waiverFilter}
        setWaiverFilter={setWaiverFilter}
        expandedTeams={expandedTeams}
        setExpandedTeams={setExpandedTeams}
        sortConfig={sortConfig}
        onClose={closeLeagueInfo}
        onPlayerModalClick={fetchPlayerModalData}
        onPlayerStatsClick={fetchPlayerStats}
        onSort={handleSort}
        getSortedStandings={getSortedStandings}
        userData={userData}
      />

      {/* League History Modal */}
      {showLeagueHistory && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={closeLeagueHistory}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl max-w-3xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold flex items-center gap-2">
                  📅 {leagueHistoryData?.leagueName} - League History
                </h3>
                <button
                  onClick={closeLeagueHistory}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>
              
              {loadingHistory ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : leagueHistoryData && (
                <div>
                  {leagueHistoryData.history.length > 0 ? (
                    <div className="space-y-4">
                      {leagueHistoryData.history.map((yearData) => (
                        <div 
                          key={yearData.year} 
                          className={`p-6 rounded-xl border-l-4 cursor-pointer hover:shadow-lg transition-all duration-200 ${
                            yearData.champion 
                              ? 'bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-500 hover:from-yellow-100 hover:to-orange-100'
                              : yearData.status === 'in_season' 
                              ? 'bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-500 hover:from-blue-100 hover:to-cyan-100'
                              : 'bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 border-gray-400 hover:from-gray-100 hover:to-gray-200'
                          }`}
                          onClick={() => {
                            // Close history modal and open league info for this year
                            closeLeagueHistory();
                            fetchLeagueInfo(yearData.league);
                          }}
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h4 className="text-xl font-bold flex items-center gap-2">
                                {yearData.year} Season
                                {yearData.status === 'in_season' && <span className="text-sm bg-blue-500 text-white px-2 py-1 rounded-full">ACTIVE</span>}
                                {yearData.status === 'complete' && <span className="text-sm bg-green-500 text-white px-2 py-1 rounded-full">COMPLETE</span>}
                                {!yearData.userParticipated && <span className="text-sm bg-gray-500 text-white px-2 py-1 rounded-full">NOT MEMBER</span>}
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                                Status: {yearData.status.replace('_', ' ')}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-gray-500">{yearData.league.total_rosters} Teams</div>
                              <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">Click for details →</div>
                            </div>
                          </div>
                          
                          {yearData.champion ? (
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="text-3xl">🏆</div>
                                  <div>
                                    <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                                      {yearData.champion.username}
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                      League Champion
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-semibold">{yearData.champion.record}</div>
                                  <div className="text-sm text-gray-500">{yearData.champion.points.toFixed(1)} PF</div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg text-center">
                              <div className="text-gray-500 dark:text-gray-400">
                                {yearData.status === 'in_season' 
                                  ? '📅 Season in progress' 
                                  : '❓ Champion data not available'
                                }
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                      
                      {/* Summary Stats */}
                      <div className="mt-8 p-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl">
                        <h4 className="text-lg font-bold mb-4 text-center">League Summary</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center p-3 bg-white dark:bg-gray-800 rounded">
                            <div className="text-2xl font-bold text-blue-600">{leagueHistoryData.history.length}</div>
                            <div className="text-sm text-gray-500">Total Seasons</div>
                          </div>
                          <div className="text-center p-3 bg-white dark:bg-gray-800 rounded">
                            <div className="text-2xl font-bold text-green-600">
                              {leagueHistoryData.history.filter(h => h.status === 'complete').length}
                            </div>
                            <div className="text-sm text-gray-500">Completed</div>
                          </div>
                          <div className="text-center p-3 bg-white dark:bg-gray-800 rounded">
                            <div className="text-2xl font-bold text-yellow-600">
                              {leagueHistoryData.history.filter(h => h.champion).length}
                            </div>
                            <div className="text-sm text-gray-500">Champions Found</div>
                          </div>
                          <div className="text-center p-3 bg-white dark:bg-gray-800 rounded">
                            <div className="text-2xl font-bold text-purple-600">
                              {leagueHistoryData.history.filter(h => h.champion?.username === userData?.display_name || h.champion?.username === userData?.username).length}
                            </div>
                            <div className="text-sm text-gray-500">Your Titles</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="text-4xl mb-4">📅</div>
                      <p className="text-gray-500">No historical data found for this league</p>
                      <p className="text-sm text-gray-400 mt-2">This may be a new league or data may not be available for previous years</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}

      <PlayerStatsModal
        showPlayerStats={showPlayerStats}
        playerStatsData={playerStatsData}
        loadingPlayerStats={loadingPlayerStats}
        playerStatsTab={playerStatsTab}
        setPlayerStatsTab={setPlayerStatsTab}
        allYearStats={allYearStats}
        onClose={closePlayerStats}
        onSwitchToYear={switchToYear}
      />


      
      {/* Profile Modal */}
      {showProfile && (
        <UserProfile onClose={() => setShowProfile(false)} />
      )}
      
      {/* Championships Modal */}
      {showChampionships && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4"
          onClick={() => setShowChampionships(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] sm:max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold flex items-center gap-2">
                  🏆 Your Championships ({championshipData.length})
                </h3>
                <button
                  onClick={() => setShowChampionships(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>
              
              {championshipData.length > 0 ? (
                <div className="space-y-6">
                  {championshipData.map((championship, index) => (
                    <div key={`${championship.league_id}-${championship.year}`} className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 p-6 rounded-xl border border-yellow-200 dark:border-yellow-800">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="text-xl font-bold text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
                            🥇 {championship.year} Champion
                          </h4>
                          <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">{championship.name}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">{championship.status} • {championship.total_rosters} teams</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                            #{championship.placement || 1}
                          </div>
                          <div className="text-sm text-gray-500">Final Rank</div>
                        </div>
                      </div>
                      
                      {championship.regularSeasonRecord && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg text-center">
                            <div className="text-lg font-bold text-green-600">
                              {championship.regularSeasonRecord.wins}-{championship.regularSeasonRecord.losses}
                              {championship.regularSeasonRecord.ties > 0 && `-${championship.regularSeasonRecord.ties}`}
                            </div>
                            <div className="text-sm text-gray-500">Regular Season</div>
                          </div>
                          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg text-center">
                            <div className="text-lg font-bold text-blue-600">
                              {championship.regularSeasonRecord.points_for.toFixed(1)}
                            </div>
                            <div className="text-sm text-gray-500">Points For</div>
                          </div>
                          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg text-center">
                            <div className="text-lg font-bold text-red-600">
                              {championship.regularSeasonRecord.points_against.toFixed(1)}
                            </div>
                            <div className="text-sm text-gray-500">Points Against</div>
                          </div>
                          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg text-center">
                            <div className={`text-lg font-bold ${
                              championship.regularSeasonRecord.points_for - championship.regularSeasonRecord.points_against > 0 
                                ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {championship.regularSeasonRecord.points_for - championship.regularSeasonRecord.points_against > 0 ? '+' : ''}
                              {(championship.regularSeasonRecord.points_for - championship.regularSeasonRecord.points_against).toFixed(1)}
                            </div>
                            <div className="text-sm text-gray-500">Point Diff</div>
                          </div>
                        </div>
                      )}
                      
                      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                        <h5 className="font-semibold mb-3 text-gray-800 dark:text-gray-200">Championship Details</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">League:</span>
                            <p className="font-medium">{championship.name}</p>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Season:</span>
                            <p className="font-medium">{championship.year}</p>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Scoring:</span>
                            <p className="font-medium capitalize">{championship.scoring_settings?.rec || 'Standard'}</p>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Teams:</span>
                            <p className="font-medium">{championship.total_rosters}</p>
                          </div>
                        </div>
                        
                        {championship.userRoster && (
                          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                            <button
                              onClick={() => {
                                setShowChampionships(false);
                                fetchRosterDetails(championship);
                              }}
                              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                            >
                              View Championship Roster & Stats
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">🏆</div>
                  <p className="text-gray-500">No championships yet</p>
                  <p className="text-sm text-gray-400 mt-2">Keep grinding - your first title is coming!</p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
      

      
      <PlayerModal
        showPlayerModal={showPlayerModal}
        selectedPlayerData={selectedPlayerData}
        loadingPlayerModal={loadingPlayerModal}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedPlayer1={selectedPlayer1}
        setSelectedPlayer1={setSelectedPlayer1}
        selectedPlayer2={selectedPlayer2}
        setSelectedPlayer2={setSelectedPlayer2}
        onClose={closePlayerModal}
        onPlayerStatsClick={fetchPlayerStats}
        leagueInfoData={leagueInfoData}
        allLeagueRosters={allLeagueRosters}
      />
      
      {/* Player Stats Page - Full Screen Overlay */}
      {showPlayerStatsPage && (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          <React.Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          }>
            <LazyPlayerStatsPage 
              onBack={() => setShowPlayerStatsPage(false)} 
              onShowAuth={() => setShowAuth(true)}
              onShowProfile={() => {
                setShowPlayerStatsPage(false);
                setShowProfile(true);
              }}
            />
          </React.Suspense>
        </div>
      )}
      
      {/* Trade Finder - Full Screen Overlay */}
      {showTradeFinder && (
        <div className="fixed inset-0 z-[100] bg-white dark:bg-gray-900 overflow-y-auto">
          <React.Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          }>
            <LazyTradeFinder 
              onBack={() => setShowTradeFinder(false)}
              onShowPlayerStats={(playerId, playerName, season) => {
                fetchPlayerStats(playerId, playerName, season);
              }}
              onShowTeamModal={fetchPlayerModalData}
              onShowAuth={() => setShowAuth(true)}
              onShowProfile={() => {
                setShowTradeFinder(false);
                setShowProfile(true);
              }}
            />
          </React.Suspense>
        </div>
      )}
      
      {/* League Scouter - Full Screen Overlay */}
      {showLeagueScouter && (
        <div className="fixed inset-0 z-[100] bg-white dark:bg-gray-900 overflow-y-auto">
          <React.Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          }>
            <LazyLeagueScouter 
              onBack={() => setShowLeagueScouter(false)}
              onShowAuth={() => setShowAuth(true)}
              onLeagueInfoClick={fetchLeagueInfo}
              onShowProfile={() => {
                setShowLeagueScouter(false);
                setShowProfile(true);
              }}
            />
          </React.Suspense>
        </div>
      )}
      
      {/* Trade Crafter - Full Screen Overlay */}
      {showTradeCrafter && (
        <div className="fixed inset-0 z-[100] bg-white dark:bg-gray-900 overflow-y-auto">
          <React.Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          }>
            <LazyTradeCrafter 
              onBack={() => setShowTradeCrafter(false)}
              onShowAuth={() => setShowAuth(true)}
              onShowProfile={() => {
                setShowTradeCrafter(false);
                setShowProfile(true);
              }}
            />
          </React.Suspense>
        </div>
      )}
      
      {/* Auth Modal - Outside PlayerStatsPage */}
      {showAuth && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mobile-modal bg-black bg-opacity-50 z-[200]"
          onClick={() => setShowAuth(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mobile-modal-content max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowAuth(false)}
              className="absolute top-2 right-2 z-10 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 bg-white dark:bg-gray-800 rounded-full p-2 text-xl leading-none"
            >
              ✕
            </button>
            <Auth />
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

export default LeagueManager;
