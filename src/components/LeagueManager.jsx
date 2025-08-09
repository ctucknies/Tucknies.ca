import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { validateUsername, validateYear, sanitizeInput, secureApiCall } from '../utils/security';
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
  QuestionMarkCircleIcon
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
import { calculatePlacement, calculateWinStreak, calculateAchievements } from './league/utils';

function LeagueManager() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({ username: '', year: new Date().getFullYear().toString() });
  const [showAuth, setShowAuth] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [prevUser, setPrevUser] = useState(null);
  const [allYearsData, setAllYearsData] = useState(null);
  const [showingAllYears, setShowingAllYears] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [leaguesData, setLeaguesData] = useState(null);
  const [userData, setUserData] = useState(null);
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



  const loadUserProfile = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('sleeper_username, favorite_year')
        .eq('id', user.id)
        .single();
      
      if (data) {
        setFormData({
          username: data.sleeper_username || '',
          year: data.favorite_year || new Date().getFullYear().toString()
        });
      }
    } catch (error) {
      console.log('No saved profile found');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const sanitizedUsername = sanitizeInput(formData.username);
    const sanitizedYear = sanitizeInput(formData.year);
    
    if (!validateUsername(sanitizedUsername)) {
      setError('Username must be 2-50 characters and contain only letters, numbers, underscores, and hyphens');
      return;
    }
    
    if (!validateYear(sanitizedYear)) {
      setError('Invalid year selected');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setLeaguesData(null);
    setAllYearsData(null);
    setShowingAllYears(sanitizedYear === 'all');
    
    try {
      console.log('Fetching user:', sanitizedUsername);
      const userResponse = await secureApiCall(`https://api.sleeper.app/v1/user/${encodeURIComponent(sanitizedUsername)}`);
      
      if (!userResponse.ok) {
        throw new Error('User not found');
      }
      
      const userData = await userResponse.json();
      console.log('User data:', userData);
      
      if (!userData.user_id) {
        throw new Error('Invalid user data');
      }
      
      if (sanitizedYear === 'all') {
        // Fetch all years
        const currentYear = new Date().getFullYear();
        const startYear = 2020;
        const allYearsLeagues = {};
        
        for (let year = startYear; year <= currentYear; year++) {
          try {
            console.log(`Fetching leagues for ${year}`);
            const leaguesResponse = await fetch(`https://api.sleeper.app/v1/user/${userData.user_id}/leagues/nfl/${year}`);
            
            if (leaguesResponse.ok) {
              const leagues = await leaguesResponse.json();
              if (leagues.length > 0) {
                allYearsLeagues[year] = await Promise.all(
                  leagues.map(async (league) => {
                    try {
                      const rostersResponse = await fetch(`https://api.sleeper.app/v1/league/${league.league_id}/rosters`);
                      const rosters = rostersResponse.ok ? await rostersResponse.json() : [];
                      const userRoster = rosters.find(roster => roster.owner_id === userData.user_id);
                      
                      let champion = null;
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
                                const championRoster = rosters.find(r => r.roster_id === finalMatch.w);
                                if (championRoster) {
                                  const usersResponse = await fetch(`https://api.sleeper.app/v1/league/${league.league_id}/users`);
                                  if (usersResponse.ok) {
                                    const users = await usersResponse.json();
                                    const championUser = users.find(u => u.user_id === championRoster.owner_id);
                                    champion = {
                                      username: championUser?.display_name || championUser?.username || 'Unknown',
                                      roster_id: championRoster.roster_id
                                    };
                                  }
                                }
                              }
                            }
                          }
                        } catch (err) {
                          console.log('Could not fetch playoff data');
                        }
                      }
                      
                      let placement = null;
                      if (userRoster) {
                        placement = userRoster.metadata?.rank || userRoster.settings?.rank || null;
                      }
                      
                      return {
                        ...league,
                        userRoster,
                        placement,
                        champion,
                        regularSeasonRecord: userRoster ? {
                          wins: userRoster.settings?.wins || 0,
                          losses: userRoster.settings?.losses || 0,
                          ties: userRoster.settings?.ties || 0,
                          points_for: userRoster.settings?.fpts || 0,
                          points_against: userRoster.settings?.fpts_against || 0
                        } : null
                      };
                    } catch (err) {
                      console.error(`Error processing league ${league.league_id}:`, err);
                      return league;
                    }
                  })
                );
              }
            }
          } catch (err) {
            console.log(`No leagues found for ${year}`);
          }
        }
        
        setAllYearsData(allYearsLeagues);
        setUserData(userData);
      } else {
        // Single year logic (existing)
        console.log('Fetching leagues for user:', userData.user_id);
        const leaguesResponse = await secureApiCall(`https://api.sleeper.app/v1/user/${encodeURIComponent(userData.user_id)}/leagues/nfl/${encodeURIComponent(sanitizedYear)}`);
        
        if (!leaguesResponse.ok) {
          throw new Error('Failed to fetch leagues');
        }
        
        const leagues = await leaguesResponse.json();
        console.log('Leagues data:', leagues);
        
        // Fetch additional data for each league
        const enrichedLeagues = await Promise.all(
          leagues.map(async (league) => {
            try {
              // Get rosters to find user's roster and record
              const rostersResponse = await fetch(`https://api.sleeper.app/v1/league/${league.league_id}/rosters`);
              const rosters = rostersResponse.ok ? await rostersResponse.json() : [];
              
              const userRoster = rosters.find(roster => roster.owner_id === userData.user_id);
              
              let placement = null;
              if (userRoster) {
                // Get final rank from roster metadata
                placement = userRoster.metadata?.rank || userRoster.settings?.rank || null;
              }
              
              // Get playoff bracket to find champion
              let champion = null;
              if (league.status === 'complete') {
                try {
                  const playoffResponse = await fetch(`https://api.sleeper.app/v1/league/${league.league_id}/winners_bracket`);
                  if (playoffResponse.ok) {
                    const playoffs = await playoffResponse.json();
                    if (playoffs && playoffs.length > 0) {
                      // Find the final match (highest round number)
                      const finalMatch = playoffs.reduce((max, match) => 
                        match.r > max.r ? match : max, playoffs[0]
                      );
                      if (finalMatch && finalMatch.w) {
                        const championRoster = rosters.find(r => r.roster_id === finalMatch.w);
                        if (championRoster) {
                          const usersResponse = await fetch(`https://api.sleeper.app/v1/league/${league.league_id}/users`);
                          if (usersResponse.ok) {
                            const users = await usersResponse.json();
                            const championUser = users.find(u => u.user_id === championRoster.owner_id);
                            champion = {
                              username: championUser?.display_name || championUser?.username || 'Unknown',
                              roster_id: championRoster.roster_id
                            };
                          }
                        }
                      }
                    }
                  }
                } catch (err) {
                  console.log('Could not fetch playoff data for', league.name);
                }
              }
              
              return {
                ...league,
                userRoster,
                placement,
                champion,
                regularSeasonRecord: userRoster ? {
                  wins: userRoster.settings?.wins || 0,
                  losses: userRoster.settings?.losses || 0,
                  ties: userRoster.settings?.ties || 0,
                  points_for: userRoster.settings?.fpts || 0,
                  points_against: userRoster.settings?.fpts_against || 0
                } : null
              };
            } catch (err) {
              console.error(`Error fetching data for league ${league.league_id}:`, err);
              return league;
            }
          })
        );
        
        setLeaguesData(enrichedLeagues);
        setUserData(userData);
      }
      
    } catch (err) {
      console.error('Error:', err);
      setError(err.message === 'Rate limit exceeded' ? 'Too many requests. Please wait a moment.' : 'Failed to fetch data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetSearch = () => {
    setError(null);
    setLeaguesData(null);
    setUserData(null);
    setSelectedLeague(null);
    setRosterData(null);
    setFormData({ username: '', year: new Date().getFullYear().toString() });
  };

  const fetchRosterDetails = async (league) => {
    setLoadingRoster(true);
    setSelectedLeague(league);
    setActiveTab('overview');
    
    try {
      // Get all players data
      const playersResponse = await fetch('https://api.sleeper.app/v1/players/nfl');
      const allPlayers = await playersResponse.json();
      
      // Get player stats for the season
      const playerStatsResponse = await fetch(`https://api.sleeper.app/v1/stats/nfl/regular/${league.season}`);
      const playerStats = playerStatsResponse.ok ? await playerStatsResponse.json() : {};
      
      // Store season stats globally for trade calculations
      window.seasonStats = playerStats;
      
      // Fetch roster data with stats
      const rosterWithNames = league.userRoster.players?.map(playerId => {
        const stats = playerStats[playerId] || {};
        const fantasyPoints = stats.pts_ppr || stats.pts_std || stats.pts_half_ppr || 0;
        
        return {
          id: playerId,
          name: allPlayers[playerId]?.full_name || 'Unknown Player',
          position: allPlayers[playerId]?.position || 'N/A',
          team: allPlayers[playerId]?.team || 'FA',
          fantasyPoints: fantasyPoints
        };
      }) || [];
      
      // Sort roster by fantasy points (highest to lowest)
      rosterWithNames.sort((a, b) => b.fantasyPoints - a.fantasyPoints);
      
      // Fetch transactions
      const transactionsResponse = await fetch(`https://api.sleeper.app/v1/league/${league.league_id}/transactions/1`);
      let allTransactions = [];
      if (transactionsResponse.ok) {
        const weekTransactions = await transactionsResponse.json();
        // Fetch all weeks (1-18)
        const transactionPromises = [];
        for (let week = 1; week <= 18; week++) {
          transactionPromises.push(
            fetch(`https://api.sleeper.app/v1/league/${league.league_id}/transactions/${week}`)
              .then(res => res.ok ? res.json() : [])
              .catch(() => [])
          );
        }
        const weeklyTransactions = await Promise.all(transactionPromises);
        allTransactions = weeklyTransactions.flat().filter(t => 
          t.roster_ids?.includes(league.userRoster.roster_id) ||
          (t.adds && Object.values(t.adds).includes(league.userRoster.roster_id)) ||
          (t.drops && Object.values(t.drops).includes(league.userRoster.roster_id))
        );
      }
      
      // Fetch draft data
      const draftResponse = await fetch(`https://api.sleeper.app/v1/league/${league.league_id}/drafts`);
      let userDraftPicks = [];
      if (draftResponse.ok) {
        const drafts = await draftResponse.json();
        if (drafts.length > 0) {
          const draftPicksResponse = await fetch(`https://api.sleeper.app/v1/draft/${drafts[0].draft_id}/picks`);
          if (draftPicksResponse.ok) {
            const allPicks = await draftPicksResponse.json();
            userDraftPicks = allPicks.filter(pick => pick.roster_id === league.userRoster.roster_id);
          }
        }
      }
      
      // Process transactions with player names
      const processedTransactions = allTransactions.map(transaction => {
        // For trades, we need to check which players the user actually received vs gave up
        const userRosterId = league.userRoster.roster_id;
        const userAdds = [];
        const userDrops = [];
        
        if (transaction.adds) {
          Object.entries(transaction.adds).forEach(([playerId, rosterId]) => {
            if (rosterId === userRosterId) {
              userAdds.push({
                id: playerId,
                name: allPlayers[playerId]?.full_name || 'Unknown Player',
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
                name: allPlayers[playerId]?.full_name || 'Unknown Player',
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
      
      const processedDraft = userDraftPicks.map(pick => ({
        ...pick,
        player: {
          name: allPlayers[pick.player_id]?.full_name || 'Unknown Player',
          position: allPlayers[pick.player_id]?.position || 'N/A',
          team: allPlayers[pick.player_id]?.team || 'FA'
        }
      }));
      
      // Fetch matchup data
      const matchupPromises = [];
      for (let week = 1; week <= 18; week++) {
        matchupPromises.push(
          fetch(`https://api.sleeper.app/v1/league/${league.league_id}/matchups/${week}`)
            .then(res => res.ok ? res.json() : [])
            .catch(() => [])
        );
      }
      const weeklyMatchups = await Promise.all(matchupPromises);
      const userMatchups = weeklyMatchups.map((week, index) => {
        const userMatchup = week.find(m => m.roster_id === league.userRoster.roster_id);
        if (!userMatchup) return null;
        const opponent = week.find(m => m.matchup_id === userMatchup.matchup_id && m.roster_id !== league.userRoster.roster_id);
        return {
          week: index + 1,
          userPoints: userMatchup.points || 0,
          opponentPoints: opponent?.points || 0,
          won: (userMatchup.points || 0) > (opponent?.points || 0),
          opponentRosterId: opponent?.roster_id
        };
      }).filter(Boolean);
      
      // Calculate analytics
      const validMatchups = userMatchups.filter(m => m.userPoints > 0);
      const wins = validMatchups.filter(m => m.won).length;
      const totalPoints = validMatchups.reduce((sum, m) => sum + m.userPoints, 0);
      const analytics = {
        record: `${wins}-${validMatchups.length - wins}`,
        totalPoints: totalPoints.toFixed(1),
        avgPoints: validMatchups.length > 0 ? (totalPoints / validMatchups.length).toFixed(1) : '0',
        highestScore: validMatchups.length > 0 ? Math.max(...validMatchups.map(m => m.userPoints)).toFixed(1) : '0',
        lowestScore: validMatchups.length > 0 ? Math.min(...validMatchups.map(m => m.userPoints)).toFixed(1) : '0',
        winStreak: calculateWinStreak(validMatchups),
        pointsAgainst: validMatchups.reduce((sum, m) => sum + m.opponentPoints, 0).toFixed(1)
      };
      
      // Calculate achievements
      const userAchievements = calculateAchievements(analytics, userMatchups, userData, league);
      
      // Get all league rosters for comparison
      const rostersResponse = await fetch(`https://api.sleeper.app/v1/league/${league.league_id}/rosters`);
      const allRosters = rostersResponse.ok ? await rostersResponse.json() : [];
      const usersResponse = await fetch(`https://api.sleeper.app/v1/league/${league.league_id}/users`);
      const allUsers = usersResponse.ok ? await usersResponse.json() : [];
      
      const rostersWithUsers = allRosters.map(roster => {
        const user = allUsers.find(u => u.user_id === roster.owner_id);
        return {
          ...roster,
          username: user?.display_name || user?.username || 'Unknown',
          wins: roster.settings?.wins || 0,
          losses: roster.settings?.losses || 0,
          points_for: roster.settings?.fpts || 0
        };
      });
      
      setRosterData(rosterWithNames);
      setTransactions(processedTransactions);
      setDraftData(processedDraft);
      setMatchupData(userMatchups);
      setAnalyticsData(analytics);
      setAchievements(userAchievements);
      
      // Use the existing matchup data for head-to-head comparisons
      const allWeeklyMatchups = weeklyMatchups;
      
      // Add matchup data to rosters
      const rostersWithMatchups = rostersWithUsers.map(roster => ({
        ...roster,
        weeklyMatchups: allWeeklyMatchups
      }));
      
      setAllLeagueRosters(rostersWithMatchups);
    } catch (err) {
      console.error('Error fetching league details:', err);
      setRosterData([]);
      setTransactions([]);
      setDraftData([]);
    } finally {
      setLoadingRoster(false);
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
          points_against: roster.settings?.fpts_against || 0
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
            name: player?.full_name || 'Unknown Player',
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
                name: allPlayers[playerId]?.full_name || 'Unknown Player',
                position: allPlayers[playerId]?.position || 'N/A'
              });
            });
          }
          
          if (transaction.drops) {
            Object.entries(transaction.drops).forEach(([playerId, rosterId]) => {
              if (!allDrops[rosterId]) allDrops[rosterId] = [];
              allDrops[rosterId].push({
                id: playerId,
                name: allPlayers[playerId]?.full_name || 'Unknown Player',
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
              name: allPlayers[playerId]?.full_name || 'Unknown Player',
              position: allPlayers[playerId]?.position || 'N/A'
            })) : [],
            drops: transaction.drops ? Object.keys(transaction.drops).map(playerId => ({
              id: playerId,
              name: allPlayers[playerId]?.full_name || 'Unknown Player',
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

  const fetchPlayerModalData = async (username, leagueId, season) => {
    setLoadingPlayerModal(true);
    setShowPlayerModal(true);
    setActiveTab('roster');
    
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
          name: player?.full_name || 'Unknown Player',
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
                name: allPlayers[playerId]?.full_name || 'Unknown Player',
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
                name: allPlayers[playerId]?.full_name || 'Unknown Player',
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
      
      setSelectedPlayerData({
        user,
        roster: userRoster,
        rosterWithStats,
        transactions: processedTransactions,
        trades: processedTransactions.filter(t => t.type === 'trade'),
        waivers: processedTransactions.filter(t => t.type === 'waiver' || t.type === 'free_agent'),
        matchups: userMatchups,
        seasonStats,
        season
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



  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-blue-900/20">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-700/50 transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <TrophyIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900 dark:text-white">Fantasy Hub</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Your dashboard</p>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <span className="text-gray-500 dark:text-gray-400 text-lg">×</span>
              </button>
            </div>
          </div>
          
          {/* Navigation */}
          <div className="flex-1 p-4 space-y-2">
            <button className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
              <HomeIcon className="w-5 h-5" />
              <span className="font-medium">Dashboard</span>
            </button>
            <button 
              onClick={() => {
                console.log('Player Stats clicked');
                setShowPlayerStatsPage(true);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
            >
              <UserIcon className="w-5 h-5" />
              <span className="font-medium">Player Stats</span>
            </button>
            <button 
              onClick={() => setShowTradeFinder(true)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
            >
              <ArrowsRightLeftIcon className="w-5 h-5" />
              <span className="font-medium">Trade Finder</span>
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
              <ChartBarIcon className="w-5 h-5" />
              <span className="font-medium">Analytics</span>
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
              <BellIcon className="w-5 h-5" />
              <span className="font-medium">Notifications</span>
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
              <Cog6ToothIcon className="w-5 h-5" />
              <span className="font-medium">Settings</span>
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
              <QuestionMarkCircleIcon className="w-5 h-5" />
              <span className="font-medium">Help</span>
            </button>
          </div>
          
          {/* Auth Section */}
          <div className="p-4 border-t border-gray-200/50 dark:border-gray-700/50">
            {user ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.email}</p>
                    <p className="text-xs text-green-600 dark:text-green-400">Signed in</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowProfile(true)}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2.5 rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 font-medium"
                >
                  Profile Settings
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">Sign in to unlock features</p>
                <button
                  onClick={() => setShowAuth(true)}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2.5 rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 font-medium"
                >
                  Sign In
                </button>
                <button
                  onClick={() => setShowAuth(true)}
                  className="w-full bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-4 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium border border-gray-200 dark:border-gray-700"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className={`max-w-7xl mx-auto p-6 sm:p-8 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-0'} ${showPlayerStatsPage ? 'hidden' : ''}`}>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12 pt-12"
      >
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="fixed top-6 left-6 z-[60] w-12 h-12 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-xl border border-gray-200/50 dark:border-gray-700/50 flex items-center justify-center hover:bg-white dark:hover:bg-gray-800 transition-all duration-200 shadow-lg"
          >
            <Bars3Icon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
        )}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 blur-3xl rounded-full" />
          <TrophyIcon className="w-20 h-20 mx-auto relative z-10 text-transparent bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 bg-clip-text" style={{filter: 'drop-shadow(0 0 20px rgba(251, 191, 36, 0.3))'}} />
        </div>
        <h1 className="text-5xl font-black bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-white dark:via-gray-100 dark:to-white bg-clip-text text-transparent mb-4 tracking-tight">
          Fantasy Football
        </h1>
        <p className="text-xl text-gray-500 dark:text-gray-400 font-medium max-w-2xl mx-auto leading-relaxed">
          Your complete fantasy experience, reimagined
        </p>
        

      </motion.div>

      <LeagueSearch 
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />

      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-red-50/80 dark:bg-red-900/20 backdrop-blur-xl border border-red-200/50 dark:border-red-800/50 rounded-2xl p-6 mb-8 shadow-lg"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center">
              <span className="text-red-600 dark:text-red-400 text-sm">⚠️</span>
            </div>
            <div>
              <p className="text-red-800 dark:text-red-200 font-medium">{error}</p>
              <button
                onClick={resetSearch}
                className="mt-1 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium transition-colors"
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

      {/* Roster Modal */}
      {selectedLeague && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={closeModal}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg sm:text-xl font-bold">{selectedLeague.name}</h3>
                <button
                  onClick={closeModal}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>
              
              {/* Tabs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1 mb-6 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                {[
                  { id: 'overview', label: 'Overview', icon: HomeIcon },
                  { id: 'players', label: 'My Roster', icon: UserIcon },
                  { id: 'compare', label: 'Compare', icon: ChartBarIcon },
                  { id: 'lineups', label: 'Matchups', icon: ClipboardDocumentListIcon },
                  { id: 'trades', label: 'Trades', icon: ArrowsRightLeftIcon },
                  { id: 'waivers', label: 'Waivers', icon: UserIcon },
                  { id: 'awards', label: 'Awards', icon: TrophyIcon }
                ].map(tab => {
                  const IconComponent = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`py-2 px-2 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                        activeTab === tab.id
                          ? 'bg-white dark:bg-gray-800 text-primary-600 shadow-sm'
                          : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <IconComponent className="w-3 h-3" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
              
              {loadingRoster ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div>
                  {/* Overview Tab */}
                  {activeTab === 'overview' && analyticsData && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">{analyticsData.record}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Record</div>
                        </div>
                        <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">{analyticsData.totalPoints}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Total Points</div>
                        </div>
                        <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg">
                          <div className="text-2xl font-bold text-purple-600">{analyticsData.avgPoints}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Avg/Game</div>
                        </div>
                        <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg">
                          <div className="text-2xl font-bold text-orange-600">{analyticsData.winStreak}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Best Streak</div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <h4 className="font-semibold text-lg">Season Highs & Lows</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded">
                              <span>Highest Score</span>
                              <span className="font-bold text-green-600">{analyticsData.highestScore}</span>
                            </div>
                            <div className="flex justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded">
                              <span>Lowest Score</span>
                              <span className="font-bold text-red-600">{analyticsData.lowestScore}</span>
                            </div>
                            <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
                              <span>Points Against</span>
                              <span className="font-bold">{analyticsData.pointsAgainst}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <h4 className="font-semibold text-lg">Performance Metrics</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                              <span>Win Percentage</span>
                              <span className="font-bold text-blue-600">
                                {matchupData ? ((matchupData.filter(m => m.won).length / matchupData.filter(m => m.userPoints > 0).length) * 100).toFixed(1) : 0}%
                              </span>
                            </div>
                            <div className="flex justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded">
                              <span>Avg Margin</span>
                              <span className="font-bold text-purple-600">
                                {matchupData ? (matchupData.filter(m => m.userPoints > 0).reduce((sum, m) => sum + (m.userPoints - m.opponentPoints), 0) / matchupData.filter(m => m.userPoints > 0).length).toFixed(1) : 0}
                              </span>
                            </div>
                            <div className="flex justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                              <span>Games Played</span>
                              <span className="font-bold text-yellow-600">{matchupData ? matchupData.filter(m => m.userPoints > 0).length : 0}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  

                  
                  {/* Player Lab Tab */}
                  {activeTab === 'players' && (
                    <div className="space-y-6">
                      <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
                        <h4 className="text-lg font-semibold mb-4">My Roster</h4>
                        {rosterData && rosterData.length > 0 ? (
                          <div className="space-y-1">
                            {rosterData.map((player, index) => (
                              <div key={index} className="flex justify-between items-center p-2 rounded text-sm transition-colors bg-gray-100 dark:bg-gray-600">
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
                                      fetchPlayerStats(player.id, player.name, selectedLeague.season);
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
                                  <div className="text-xs text-gray-500">{player.team}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-center text-gray-500 py-8">No roster data available</p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* League Member Comparison Tab */}
                  {activeTab === 'compare' && (
                    <div className="space-y-6">
                      <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
                        <h4 className="text-lg font-semibold mb-4">League Member Comparison</h4>
                        {allLeagueRosters && allLeagueRosters.length > 0 ? (
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
                                  {allLeagueRosters.map(roster => (
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
                                  {allLeagueRosters.filter(r => r.roster_id.toString() !== selectedPlayer1).map(roster => (
                                    <option key={roster.roster_id} value={roster.roster_id.toString()}>
                                      {roster.username}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            
                            {/* Comparison Results */}
                            {selectedPlayer1 && selectedPlayer2 && (() => {
                              const player1 = allLeagueRosters.find(r => r.roster_id.toString() === selectedPlayer1);
                              const player2 = allLeagueRosters.find(r => r.roster_id.toString() === selectedPlayer2);
                              
                              if (!player1 || !player2) return null;
                              
                              return (
                                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg">
                                  <h5 className="text-lg font-semibold mb-4 text-center">
                                    {player1.username} vs {player2.username}
                                  </h5>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Player 1 Stats */}
                                    <div className="text-center">
                                      <h6 className="font-semibold text-blue-600 mb-3">{player1.username}</h6>
                                      <div className="space-y-2">
                                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                                          <div className="text-2xl font-bold text-blue-600">{player1.wins}-{player1.losses}</div>
                                          <div className="text-sm text-gray-500">Record</div>
                                        </div>
                                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                                          <div className="text-2xl font-bold text-blue-600">{player1.points_for.toFixed(1)}</div>
                                          <div className="text-sm text-gray-500">Points For</div>
                                        </div>
                                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                                          <div className="text-2xl font-bold text-blue-600">{(player1.points_for / (player1.wins + player1.losses) || 0).toFixed(1)}</div>
                                          <div className="text-sm text-gray-500">Avg/Game</div>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Comparison */}
                                    <div className="text-center">
                                      <h6 className="font-semibold text-gray-600 mb-3">Head-to-Head</h6>
                                      <div className="space-y-2">
                                        <div className="p-3 bg-gray-100 dark:bg-gray-600 rounded">
                                          <div className="text-sm text-gray-500 mb-1">Better Record</div>
                                          <div className="font-bold">
                                            {player1.wins > player2.wins ? player1.username : 
                                             player2.wins > player1.wins ? player2.username : 'Tie'}
                                          </div>
                                        </div>
                                        <div className="p-3 bg-gray-100 dark:bg-gray-600 rounded">
                                          <div className="text-sm text-gray-500 mb-1">More Points</div>
                                          <div className="font-bold">
                                            {player1.points_for > player2.points_for ? player1.username : player2.username}
                                          </div>
                                        </div>
                                        <div className="p-3 bg-gray-100 dark:bg-gray-600 rounded">
                                          <div className="text-sm text-gray-500 mb-1">Point Difference</div>
                                          <div className="font-bold">
                                            {Math.abs(player1.points_for - player2.points_for).toFixed(1)}
                                          </div>
                                        </div>
                                        
                                        {/* Head-to-Head Record */}
                                        {(() => {
                                          const h2hGames = [];
                                          player1.weeklyMatchups?.forEach((week, weekIndex) => {
                                            const player1Matchup = week.find(m => m.roster_id === player1.roster_id);
                                            const player2Matchup = week.find(m => m.roster_id === player2.roster_id);
                                            
                                            if (player1Matchup && player2Matchup && player1Matchup.matchup_id === player2Matchup.matchup_id) {
                                              h2hGames.push({
                                                week: weekIndex + 1,
                                                player1Score: player1Matchup.points || 0,
                                                player2Score: player2Matchup.points || 0,
                                                winner: (player1Matchup.points || 0) > (player2Matchup.points || 0) ? player1.username : player2.username
                                              });
                                            }
                                          });
                                          
                                          const player1Wins = h2hGames.filter(g => g.winner === player1.username).length;
                                          const player2Wins = h2hGames.filter(g => g.winner === player2.username).length;
                                          
                                          return (
                                            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded">
                                              <div className="text-sm text-gray-500 mb-1">Head-to-Head</div>
                                              <div className="font-bold">
                                                {player1Wins}-{player2Wins}
                                              </div>
                                              <div className="text-xs text-gray-400 mt-1">
                                                {h2hGames.length} game{h2hGames.length !== 1 ? 's' : ''}
                                              </div>
                                            </div>
                                          );
                                        })()}
                                      </div>
                                    </div>
                                    
                                    {/* Player 2 Stats */}
                                    <div className="text-center">
                                      <h6 className="font-semibold text-red-600 mb-3">{player2.username}</h6>
                                      <div className="space-y-2">
                                        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded">
                                          <div className="text-2xl font-bold text-red-600">{player2.wins}-{player2.losses}</div>
                                          <div className="text-sm text-gray-500">Record</div>
                                        </div>
                                        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded">
                                          <div className="text-2xl font-bold text-red-600">{player2.points_for.toFixed(1)}</div>
                                          <div className="text-sm text-gray-500">Points For</div>
                                        </div>
                                        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded">
                                          <div className="text-2xl font-bold text-red-600">{(player2.points_for / (player2.wins + player2.losses) || 0).toFixed(1)}</div>
                                          <div className="text-sm text-gray-500">Avg/Game</div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Head-to-Head Game Results */}
                                  {(() => {
                                    const h2hGames = [];
                                    player1.weeklyMatchups?.forEach((week, weekIndex) => {
                                      const player1Matchup = week.find(m => m.roster_id === player1.roster_id);
                                      const player2Matchup = week.find(m => m.roster_id === player2.roster_id);
                                      
                                      if (player1Matchup && player2Matchup && player1Matchup.matchup_id === player2Matchup.matchup_id) {
                                        h2hGames.push({
                                          week: weekIndex + 1,
                                          player1Score: player1Matchup.points || 0,
                                          player2Score: player2Matchup.points || 0,
                                          winner: (player1Matchup.points || 0) > (player2Matchup.points || 0) ? player1.username : player2.username
                                        });
                                      }
                                    });
                                    
                                    if (h2hGames.length > 0) {
                                      return (
                                        <div className="mt-6">
                                          <h6 className="font-semibold mb-3 text-center">Head-to-Head Games</h6>
                                          <div className="space-y-2">
                                            {h2hGames.map((game, index) => (
                                              <div key={index} className={`p-3 rounded border-l-4 ${
                                                game.winner === player1.username 
                                                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500' 
                                                  : 'bg-red-50 dark:bg-red-900/20 border-red-500'
                                              }`}>
                                                <div className="flex justify-between items-center">
                                                  <span className="text-sm font-medium">Week {game.week}</span>
                                                  <span className="font-bold">
                                                    {game.player1Score.toFixed(1)} - {game.player2Score.toFixed(1)}
                                                  </span>
                                                  <span className={`text-xs px-2 py-1 rounded ${
                                                    game.winner === player1.username 
                                                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100'
                                                      : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                                                  }`}>
                                                    {game.winner === player1.username ? 'W' : 'L'}
                                                  </span>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      );
                                    }
                                    return null;
                                  })()}
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
                  
                  {/* Lineup Analyzer Tab */}
                  {activeTab === 'lineups' && (
                    <div className="space-y-6">
                      <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
                        {matchupData && matchupData.length > 0 ? (
                          <MatchupSection 
                            matchups={matchupData.map(m => ({ ...m, userRosterId: selectedLeague.userRoster.roster_id }))}
                            leagueId={selectedLeague.league_id}
                            season={selectedLeague.season}
                            onPlayerClick={fetchPlayerStats}
                          />
                        ) : (
                          <p className="text-center text-gray-500 py-8">No matchup data available</p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Roster Tab (now hidden, content moved to overview) */}
                  {activeTab === 'roster' && rosterData && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {['QB', 'RB', 'WR', 'TE', 'K', 'DEF'].map(position => {
                          const positionPlayers = rosterData.filter(player => player.position === position);
                          if (positionPlayers.length === 0) return null;
                          
                          return (
                            <div key={position} className="space-y-2">
                              <h4 className="font-semibold text-primary-600">{position}</h4>
                              {positionPlayers.map(player => (
                                <div key={player.id} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                                  <span className="font-medium">{player.name}</span>
                                  <span className="text-sm text-gray-500">{player.team}</span>
                                </div>
                              ))}
                            </div>
                          );
                        })}
                        
                        {rosterData.filter(p => !['QB', 'RB', 'WR', 'TE', 'K', 'DEF'].includes(p.position)).length > 0 && (
                          <div className="md:col-span-2 space-y-2">
                            <h4 className="font-semibold text-primary-600">Bench</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {rosterData.filter(p => !['QB', 'RB', 'WR', 'TE', 'K', 'DEF'].includes(p.position)).map(player => (
                                <div key={player.id} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                                  <span>{player.name}</span>
                                  <span className="text-sm text-gray-500">{player.position} - {player.team}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Draft Tab */}
                  {activeTab === 'draft' && (
                    <div className="space-y-3">
                      {draftData && draftData.length > 0 ? (
                        draftData.map(pick => (
                          <div key={pick.pick_no} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                            <div>
                              <span className="font-medium">{pick.player.name}</span>
                              <span className="text-sm text-gray-500 ml-2">{pick.player.position} - {pick.player.team}</span>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium">Round {pick.round}</div>
                              <div className="text-xs text-gray-500">Pick {pick.pick_no}</div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-center text-gray-500 py-8">No draft data available</p>
                      )}
                    </div>
                  )}
                  
                  {/* Trade Analyzer Tab */}
                  {activeTab === 'trades' && (
                    <TradeHistorySection 
                      trades={transactions ? transactions.filter(t => t.type === 'trade') : []}
                      selectedLeague={selectedLeague}
                      allLeagueRosters={allLeagueRosters}
                      rosterData={rosterData}
                      leagueInfoData={leagueInfoData}
                      showAnalytics={true}
                    />
                  )}
                  
                  {/* Original Trades Tab (now hidden) */}
                  {activeTab === 'original-trades' && (
                    <div className="space-y-3">
                      {transactions && transactions.filter(t => t.type === 'trade').length > 0 ? (
                        transactions.filter(t => t.type === 'trade').map((trade, index) => (
                          <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
                            <div className="text-sm text-gray-500 mb-2">Week {trade.leg}</div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <h5 className="font-medium text-green-600 mb-1">Acquired</h5>
                                {trade.adds.map(player => (
                                  <div key={player.id} className="text-sm">{player.name} ({player.position})</div>
                                ))}
                              </div>
                              <div>
                                <h5 className="font-medium text-red-600 mb-1">Traded Away</h5>
                                {trade.drops.map(player => (
                                  <div key={player.id} className="text-sm">{player.name} ({player.position})</div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-center text-gray-500 py-8">No trades found</p>
                      )}
                    </div>
                  )}
                  
                  {/* Waivers Tab */}
                  {activeTab === 'waivers' && (
                    <div className="space-y-3">
                      {transactions && transactions.filter(t => t.type === 'waiver' || t.type === 'free_agent').length > 0 ? (
                        transactions.filter(t => t.type === 'waiver' || t.type === 'free_agent').map((transaction, index) => (
                          <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium capitalize">{transaction.type.replace('_', ' ')}</span>
                              <span className="text-sm text-gray-500">Week {transaction.leg}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <h5 className="font-medium text-green-600 mb-1">Added</h5>
                                {transaction.adds.map(player => (
                                  <div key={player.id} className="text-sm">{player.name} ({player.position})</div>
                                ))}
                              </div>
                              <div>
                                <h5 className="font-medium text-red-600 mb-1">Dropped</h5>
                                {transaction.drops.map(player => (
                                  <div key={player.id} className="text-sm">{player.name} ({player.position})</div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-center text-gray-500 py-8">No waiver/free agent activity found</p>
                      )}
                    </div>
                  )}
                  
                  {/* Matchups Tab (now hidden) */}
                  {activeTab === 'matchups' && (
                    <div className="space-y-3">
                      {matchupData && matchupData.length > 0 ? (
                        matchupData.map(matchup => (
                          <div key={matchup.week} className={`p-4 rounded-lg border-l-4 ${
                            matchup.won 
                              ? 'bg-green-50 dark:bg-green-900/20 border-green-500' 
                              : 'bg-red-50 dark:bg-red-900/20 border-red-500'
                          }`}>
                            <div className="flex justify-between items-center">
                              <div>
                                <span className="font-medium">Week {matchup.week}</span>
                                <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                                  matchup.won 
                                    ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                                    : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                                }`}>
                                  {matchup.won ? 'W' : 'L'}
                                </span>
                              </div>
                              <div className="text-right">
                                <div className="font-bold">
                                  {matchup.userPoints.toFixed(1)} - {matchup.opponentPoints.toFixed(1)}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {matchup.won ? '+' : ''}{(matchup.userPoints - matchup.opponentPoints).toFixed(1)}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-center text-gray-500 py-8">No matchup data available</p>
                      )}
                    </div>
                  )}
                  
                  {/* Awards Tab */}
                  {activeTab === 'awards' && (
                    <div className="space-y-4">
                      {achievements && achievements.length > 0 ? (
                        <div className="space-y-6">
                          {/* Championship Awards */}
                          {achievements.filter(a => ['champion', 'runner-up', 'bronze'].includes(a.type)).length > 0 && (
                            <div>
                              <h4 className="text-lg font-semibold mb-3 text-yellow-600 dark:text-yellow-400">🏆 Championship Awards</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {achievements.filter(a => ['champion', 'runner-up', 'bronze'].includes(a.type)).map((achievement, index) => (
                                  <div key={index} className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                                    <div className="text-lg font-medium text-center">{achievement.text}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Performance Awards */}
                          {achievements.filter(a => ['explosive', 'high-score', 'scoring-champ', 'elite', 'perfect', 'consistent'].includes(a.type)).length > 0 && (
                            <div>
                              <h4 className="text-lg font-semibold mb-3 text-green-600 dark:text-green-400">⭐ Performance Awards</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {achievements.filter(a => ['explosive', 'high-score', 'scoring-champ', 'elite', 'perfect', 'consistent'].includes(a.type)).map((achievement, index) => (
                                  <div key={index} className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                    <div className="text-lg font-medium text-center">{achievement.text}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Streak & Style Awards */}
                          {achievements.filter(a => ['domination', 'streak', 'clutch', 'crusher'].includes(a.type)).length > 0 && (
                            <div>
                              <h4 className="text-lg font-semibold mb-3 text-blue-600 dark:text-blue-400">🔥 Streak & Style Awards</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {achievements.filter(a => ['domination', 'streak', 'clutch', 'crusher'].includes(a.type)).map((achievement, index) => (
                                  <div key={index} className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                    <div className="text-lg font-medium text-center">{achievement.text}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Dubious Honors */}
                          {achievements.filter(a => ['dud', 'heartbreak', 'punching-bag', 'volatile', 'rebuilding'].includes(a.type)).length > 0 && (
                            <div>
                              <h4 className="text-lg font-semibold mb-3 text-red-600 dark:text-red-400">😅 Dubious Honors</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {achievements.filter(a => ['dud', 'heartbreak', 'punching-bag', 'volatile', 'rebuilding'].includes(a.type)).map((achievement, index) => (
                                  <div key={index} className="p-4 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 rounded-lg border border-red-200 dark:border-red-800">
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
                  
                  {/* Timeline Tab */}
                  {activeTab === 'timeline' && (
                    <div className="space-y-4">
                      <div className="relative">
                        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-300 dark:bg-gray-600"></div>
                        
                        {draftData && draftData.length > 0 && (
                          <div className="relative flex items-start mb-6">
                            <div className="absolute left-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-sm font-bold">D</span>
                            </div>
                            <div className="ml-12">
                              <h4 className="font-semibold text-blue-600">Draft Day</h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400">Selected {draftData.length} players</p>
                            </div>
                          </div>
                        )}
                        
                        <div className="relative flex items-start">
                          <div className="absolute left-0 w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-bold">🏁</span>
                          </div>
                          <div className="ml-12">
                            <h4 className="font-semibold text-yellow-600">Season End</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {analyticsData ? `Finished ${analyticsData.record} with ${analyticsData.totalPoints} points` : 'Season completed'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* League Info Modal */}
      {showLeagueInfo && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={closeLeagueInfo}
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
                  onClick={closeLeagueInfo}
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
                            onClick={() => handleSort('username')}
                            className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left"
                          >
                            👤 Team {sortConfig.key === 'username' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                          </button>
                          <button 
                            onClick={() => handleSort('record')}
                            className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left"
                          >
                            📊 Record {sortConfig.key === 'record' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                          </button>
                          <button 
                            onClick={() => handleSort('points_for')}
                            className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left"
                          >
                            ⚡ Points For {sortConfig.key === 'points_for' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                          </button>
                          <button 
                            onClick={() => handleSort('points_against')}
                            className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left"
                          >
                            🛡️ Points Against {sortConfig.key === 'points_against' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                          </button>
                          <button 
                            onClick={() => handleSort('diff')}
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
                            <button 
                              onClick={() => fetchPlayerModalData(team.username, leagueInfoData.league.league_id, leagueInfoData.league.season)}
                              className="font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left"
                            >
                              {team.username}
                            </button>
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
                                            fetchPlayerStats(player.id, player.name, leagueInfoData.league.season);
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
                                                <span className="font-medium">{player.name}</span>
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
                                                <span className="font-medium">{player.name}</span>
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
                                          <span className="font-medium">{player.name}</span>
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
                                          <span className="font-medium">{player.name}</span>
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
                        </div>
                      </div>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {leagueInfoData.waivers
                          .filter(waiver => waiverFilter === 'all' || waiver.type === waiverFilter)
                          .length > 0 ? (
                          leagueInfoData.waivers
                            .filter(waiver => waiverFilter === 'all' || waiver.type === waiverFilter)
                            .map((waiver, index) => (
                            <div key={index} className={`p-4 rounded-lg border-l-4 ${
                              waiver.type === 'waiver' 
                                ? 'bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-500'
                                : 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-500'
                            }`}>
                              <div className="flex justify-between items-center mb-3">
                                <button 
                                  onClick={() => fetchPlayerModalData(waiver.username, leagueInfoData.league.league_id, leagueInfoData.league.season)}
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
                                        <span className="font-medium">{player.name}</span>
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
                                        <span className="font-medium">{player.name}</span>
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
      )}

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
      

      
      {/* Player Modal */}
      {showPlayerModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[150] p-4"
          onClick={closePlayerModal}
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
                  onClick={closePlayerModal}
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
                      <div className="text-2xl font-bold text-orange-600">#{selectedPlayerData.roster.settings?.rank || 'N/A'}</div>
                      <div className="text-sm text-gray-500">Final Rank</div>
                    </div>
                  </div>
                  
                  {/* Tabs */}
                  <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                    {[
                      { id: 'roster', label: 'Roster', icon: '👥' },
                      { id: 'trades', label: 'Trades', icon: '🔄' },
                      { id: 'waivers', label: 'Waivers', icon: '📋' },
                      { id: 'matchups', label: 'Matchups', icon: '⚔️' }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                          activeTab === tab.id
                            ? 'bg-white dark:bg-gray-800 text-primary-600 shadow-sm'
                            : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        <span>{tab.icon}</span>
                        {tab.label}
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
                                    closePlayerModal();
                                    fetchPlayerStats(player.id, player.name, selectedPlayerData.season);
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
                    
                    {/* Matchups Tab */}
                    {activeTab === 'matchups' && (
                      <MatchupSection 
                        matchups={selectedPlayerData.matchups.map(m => ({ ...m, userRosterId: selectedPlayerData.roster.roster_id }))}
                        leagueId={leagueInfoData?.league?.league_id}
                        season={selectedPlayerData.season}
                        onPlayerClick={fetchPlayerStats}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
      </div>
      
      {/* Player Stats Page - Full Screen Overlay */}
      {showPlayerStatsPage && (
        <div className="fixed inset-0 z-[100] bg-white dark:bg-gray-900 overflow-y-auto">
          <PlayerStatsPage 
            onBack={() => setShowPlayerStatsPage(false)} 
            onShowAuth={() => setShowAuth(true)}
          />
        </div>
      )}
      
      {/* Trade Finder - Full Screen Overlay */}
      {showTradeFinder && (
        <div className="fixed inset-0 z-[100] bg-white dark:bg-gray-900 overflow-y-auto">
          <TradeFinder 
            onBack={() => setShowTradeFinder(false)}
            onShowPlayerStats={(playerId, playerName, season) => {
              fetchPlayerStats(playerId, playerName, season);
            }}
            onShowTeamModal={fetchPlayerModalData}
          />
        </div>
      )}
      
      {/* Auth Modal - Outside PlayerStatsPage */}
      {showAuth && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200] p-2 sm:p-4"
          onClick={() => setShowAuth(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowAuth(false)}
              className="absolute top-4 right-4 z-10 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 bg-white dark:bg-gray-800 rounded-full p-2"
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
