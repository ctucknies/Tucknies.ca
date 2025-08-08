import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  MagnifyingGlassIcon, 
  TrophyIcon, 
  UserGroupIcon,
  HomeIcon,
  ChartBarIcon,
  UserIcon,
  ClipboardDocumentListIcon,
  ArrowsRightLeftIcon,
  StarIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import Auth from './Auth';
import UserProfile from './UserProfile';
import { supabase } from '../lib/supabase';

const calculatePlacement = (playoffs, userRosterId) => {
  if (!playoffs || !userRosterId) return null;
  const userInChampionship = playoffs.some(match => 
    match.r === playoffs.length && (match.t1 === userRosterId || match.t2 === userRosterId)
  );
  if (userInChampionship) {
    const championshipMatch = playoffs.find(match => 
      match.r === playoffs.length && (match.t1 === userRosterId || match.t2 === userRosterId)
    );
    return championshipMatch?.w === userRosterId ? 1 : 2;
  }
  return null;
};

const calculateWinStreak = (matchups) => {
  let currentStreak = 0;
  let maxStreak = 0;
  for (let i = matchups.length - 1; i >= 0; i--) {
    if (matchups[i].won) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }
  return maxStreak;
};

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
  const [showChampionships, setShowChampionships] = useState(false);
  const [championshipData, setChampionshipData] = useState([]);

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
    if (!formData.username || !formData.year) return;
    
    setIsLoading(true);
    setError(null);
    setLeaguesData(null);
    setAllYearsData(null);
    setShowingAllYears(formData.year === 'all');
    
    try {
      console.log('Fetching user:', formData.username);
      const userResponse = await fetch(`https://api.sleeper.app/v1/user/${formData.username}`);
      
      if (!userResponse.ok) {
        throw new Error('User not found');
      }
      
      const userData = await userResponse.json();
      console.log('User data:', userData);
      
      if (!userData.user_id) {
        throw new Error('Invalid user data');
      }
      
      if (formData.year === 'all') {
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
        const leaguesResponse = await fetch(`https://api.sleeper.app/v1/user/${userData.user_id}/leagues/nfl/${formData.year}`);
        
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
      setError(err.message);
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
      
      // Fetch roster data
      const rosterWithNames = league.userRoster.players?.map(playerId => ({
        id: playerId,
        name: allPlayers[playerId]?.full_name || 'Unknown Player',
        position: allPlayers[playerId]?.position || 'N/A',
        team: allPlayers[playerId]?.team || 'FA'
      })) || [];
      
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
      const userAchievements = [];
      
      // Championship awards
      if (league.placement === 1 || (league.champion && (league.champion.username === userData?.display_name || league.champion.username === userData?.username))) {
        userAchievements.push({ type: 'champion', text: '🏆 League Champion' });
      }
      if (league.placement === 2) userAchievements.push({ type: 'runner-up', text: '🥈 Runner-up' });
      if (league.placement === 3) userAchievements.push({ type: 'bronze', text: '🥉 Third Place' });
      
      // Scoring achievements
      const highestWeek = validMatchups.length > 0 ? Math.max(...validMatchups.map(m => m.userPoints)) : 0;
      const lowestWeek = validMatchups.length > 0 ? Math.min(...validMatchups.map(m => m.userPoints)) : 0;
      
      if (highestWeek >= 200) userAchievements.push({ type: 'explosive', text: '💥 200+ Point Explosion' });
      else if (highestWeek >= 150) userAchievements.push({ type: 'high-score', text: '🔥 150+ Point Game' });
      
      if (lowestWeek > 0 && lowestWeek < 50) userAchievements.push({ type: 'dud', text: '💀 Sub-50 Point Dud' });
      
      // Win streak achievements
      if (analytics.winStreak >= 8) userAchievements.push({ type: 'domination', text: `🔥 ${analytics.winStreak} Game Domination` });
      else if (analytics.winStreak >= 5) userAchievements.push({ type: 'streak', text: `⚡ ${analytics.winStreak} Game Win Streak` });
      
      // Perfect season
      if (wins === validMatchups.length && validMatchups.length >= 10) userAchievements.push({ type: 'perfect', text: '💯 Perfect Season' });
      
      // Close game achievements
      const closeWins = validMatchups.filter(m => m.won && (m.userPoints - m.opponentPoints) <= 5).length;
      const closeLosses = validMatchups.filter(m => !m.won && (m.opponentPoints - m.userPoints) <= 5).length;
      
      if (closeWins >= 3) userAchievements.push({ type: 'clutch', text: `🎯 Clutch Player (${closeWins} wins by ≤5)` });
      if (closeLosses >= 3) userAchievements.push({ type: 'heartbreak', text: `💔 Heartbreaker (${closeLosses} losses by ≤5)` });
      
      // Blowout achievements
      const blowoutWins = validMatchups.filter(m => m.won && (m.userPoints - m.opponentPoints) >= 50).length;
      const blowoutLosses = validMatchups.filter(m => !m.won && (m.opponentPoints - m.userPoints) >= 50).length;
      
      if (blowoutWins >= 3) userAchievements.push({ type: 'crusher', text: `🔨 Crusher (${blowoutWins} wins by 50+)` });
      if (blowoutLosses >= 3) userAchievements.push({ type: 'punching-bag', text: `🥊 Punching Bag (${blowoutLosses} losses by 50+)` });
      
      // Consistency achievements
      if (validMatchups.length >= 10) {
        const avgPoints = totalPoints / validMatchups.length;
        const variance = validMatchups.reduce((sum, m) => sum + Math.pow(m.userPoints - avgPoints, 2), 0) / validMatchups.length;
        const standardDev = Math.sqrt(variance);
        
        if (standardDev < 15) userAchievements.push({ type: 'consistent', text: '📊 Mr. Consistent (Low variance)' });
        if (standardDev > 40) userAchievements.push({ type: 'volatile', text: '🎢 Roller Coaster (High variance)' });
      }
      
      // Record-based achievements
      const winPct = validMatchups.length > 0 ? (wins / validMatchups.length) : 0;
      if (winPct >= 0.8 && validMatchups.length >= 10) userAchievements.push({ type: 'elite', text: '👑 Elite (80%+ win rate)' });
      if (winPct <= 0.2 && validMatchups.length >= 10) userAchievements.push({ type: 'rebuilding', text: '🔧 Rebuilding Year' });
      
      // Scoring title
      const avgPoints = validMatchups.length > 0 ? (totalPoints / validMatchups.length) : 0;
      if (validMatchups.length >= 10 && avgPoints >= 130) userAchievements.push({ type: 'scoring-champ', text: '🎯 Scoring Machine (130+ avg)' });
      
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

  const fetchPlayerStats = async (playerId, playerName, year) => {
    setLoadingPlayerStats(true);
    setShowPlayerStats(true);
    
    try {
      // Get player info
      const playersResponse = await fetch('https://api.sleeper.app/v1/players/nfl');
      const allPlayers = await playersResponse.json();
      const playerInfo = allPlayers[playerId];
      
      // Get player stats for the year
      const statsResponse = await fetch(`https://api.sleeper.app/v1/stats/nfl/regular/${year}`);
      const allStats = statsResponse.ok ? await statsResponse.json() : {};
      const playerStats = allStats[playerId] || {};
      
      // Calculate rankings
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
      
      // Calculate derived stats
      const derivedStats = {};
      
      // Passing efficiency
      if (playerStats.pass_att && playerStats.pass_att > 0) {
        derivedStats.completion_pct = ((playerStats.pass_cmp || 0) / playerStats.pass_att * 100).toFixed(1);
        derivedStats.yards_per_attempt = ((playerStats.pass_yd || 0) / playerStats.pass_att).toFixed(1);
        derivedStats.td_int_ratio = playerStats.pass_int > 0 ? ((playerStats.pass_td || 0) / playerStats.pass_int).toFixed(2) : 'N/A';
      }
      
      // Rushing efficiency
      if (playerStats.rush_att && playerStats.rush_att > 0) {
        derivedStats.yards_per_carry = ((playerStats.rush_yd || 0) / playerStats.rush_att).toFixed(1);
      }
      
      // Receiving efficiency
      if (playerStats.rec_tgt && playerStats.rec_tgt > 0) {
        derivedStats.catch_pct = ((playerStats.rec || 0) / playerStats.rec_tgt * 100).toFixed(1);
        derivedStats.yards_per_target = ((playerStats.rec_yd || 0) / playerStats.rec_tgt).toFixed(1);
      }
      if (playerStats.rec && playerStats.rec > 0) {
        derivedStats.yards_per_reception = ((playerStats.rec_yd || 0) / playerStats.rec).toFixed(1);
      }
      
      // Total touchdowns
      derivedStats.total_td = (playerStats.pass_td || 0) + (playerStats.rush_td || 0) + (playerStats.rec_td || 0);
      
      // Fantasy points per game (if games played available)
      if (playerStats.gp && playerStats.gp > 0) {
        const fantasyPoints = playerStats.pts_ppr || playerStats.pts_std || playerStats.pts_half_ppr || 0;
        derivedStats.fantasy_ppg = (fantasyPoints / playerStats.gp).toFixed(1);
      }
      
      setPlayerStatsData({
        playerInfo,
        stats: playerStats,
        derivedStats,
        year,
        playerName,
        overallRank: overallRank > 0 ? overallRank : 'N/A',
        positionRank: positionRank > 0 ? positionRank : 'N/A'
      });
    } catch (err) {
      console.error('Error fetching player stats:', err);
    } finally {
      setLoadingPlayerStats(false);
    }
  };

  const closePlayerStats = () => {
    setShowPlayerStats(false);
    setPlayerStatsData(null);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8 pt-8"
      >
        <TrophyIcon className="w-16 h-16 mx-auto mb-4 text-primary-600" />
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Fantasy Football Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          View all your leagues in one centralized dashboard
        </p>
        
        {/* Auth Status */}
        <div className="mt-4 flex items-center justify-center gap-4">
          {user ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-green-600 dark:text-green-400">✓ Signed in as {user.email}</span>
              <button
                onClick={() => setShowProfile(true)}
                className="text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800"
              >
                Profile
              </button>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-2">Want to save your settings?</p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => setShowAuth(true)}
                  className="text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => setShowAuth(true)}
                  className="text-sm bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-3 py-1 rounded-full hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
                >
                  Sign Up
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card p-6 mb-8"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium mb-2">
                Sleeper Username
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="input-field"
                placeholder="Enter your username"
                required
              />
            </div>
            <div>
              <label htmlFor="year" className="block text-sm font-medium mb-2">
                Season Year
              </label>
              <select
                id="year"
                name="year"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                className="input-field"
                required
              >
                <option value="all">All Years</option>
                {Array.from({ length: new Date().getFullYear() - 2019 }, (_, i) => {
                  const year = new Date().getFullYear() - i;
                  return <option key={year} value={year.toString()}>{year}</option>;
                })}
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <MagnifyingGlassIcon className="w-5 h-5" />
            )}
            {isLoading ? 'Loading...' : 'Search Leagues'}
          </button>
        </form>
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6"
        >
          <p className="text-red-800 dark:text-red-200">{error}</p>
          <button
            onClick={resetSearch}
            className="mt-2 text-sm text-red-600 dark:text-red-400 underline"
          >
            Try again
          </button>
        </motion.div>
      )}

      {/* Single Year Display */}
      {leaguesData && !showingAllYears && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Season Summary */}
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
                <div className="text-xl font-bold text-green-600">
                  {leaguesData.filter(l => l.placement === 1 || (l.champion && l.champion.username === userData?.display_name) || (l.champion && l.champion.username === userData?.username)).length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Championships</div>
              </div>
              <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded">
                <div className="text-xl font-bold text-purple-600">
                  {leaguesData.filter(l => l.regularSeasonRecord).reduce((sum, l) => sum + l.regularSeasonRecord.wins, 0)}-{leaguesData.filter(l => l.regularSeasonRecord).reduce((sum, l) => sum + l.regularSeasonRecord.losses, 0)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Combined Record</div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 mb-6">
            <UserGroupIcon className="w-8 h-8 text-primary-600" />
            <div>
              <h2 className="text-2xl font-bold">Your Leagues ({leaguesData[0]?.season || formData.year})</h2>
              <p className="text-gray-600 dark:text-gray-300">
                Found {leaguesData.length} league{leaguesData.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            {leaguesData.map((league) => (
              <motion.div
                key={league.league_id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="card p-6 hover:shadow-xl transition-shadow duration-200 cursor-pointer"
                onClick={() => league.userRoster && fetchRosterDetails(league)}
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
                      {(league.placement || (league.champion && (league.champion.username === userData?.display_name || league.champion.username === userData?.username))) && (
                        <div>
                          <p className="font-medium flex items-center gap-1">
                            <span className="text-lg">
                              {(league.placement === 1 || (league.champion && (league.champion.username === userData?.display_name || league.champion.username === userData?.username))) && '🏆'}
                              {league.placement === 2 && '🥈'}
                              {league.placement === 3 && '🥉'}
                            </span>
                            {(league.placement === 1 || (league.champion && (league.champion.username === userData?.display_name || league.champion.username === userData?.username))) 
                              ? 'Champion' 
                              : `${league.placement}${league.placement === 2 ? 'nd' : league.placement === 3 ? 'rd' : 'th'}`}
                          </p>
                        </div>
                      )}
                      {league.userRoster && !league.placement && !(league.champion && (league.champion.username === userData?.display_name || league.champion.username === userData?.username)) && (
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
                        fetchLeagueHistory(league);
                      }}
                      className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded hover:bg-purple-200 dark:hover:bg-purple-800"
                    >
                      History
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        fetchLeagueInfo(league);
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
          {/* All Years Summary */}
          <div className="card p-6 mb-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold">Career Summary</h3>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                <div className="text-xl font-bold text-blue-600">
                  {Object.values(allYearsData).flat().length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Leagues</div>
              </div>
              <button
                onClick={() => {
                  const championships = Object.entries(allYearsData).flatMap(([year, leagues]) => 
                    leagues.filter(l => 
                      l.placement === 1 || 
                      (l.champion && (l.champion.username === userData?.display_name || l.champion.username === userData?.username))
                    ).map(league => ({ ...league, year }))
                  );
                  setChampionshipData(championships);
                  setShowChampionships(true);
                }}
                className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded hover:bg-green-100 dark:hover:bg-green-800/30 transition-colors cursor-pointer w-full"
              >
                <div className="text-xl font-bold text-green-600">
                  {Object.values(allYearsData).flat().filter(l => 
                    l.placement === 1 || 
                    (l.champion && (l.champion.username === userData?.display_name || l.champion.username === userData?.username))
                  ).length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Championships</div>
              </button>
              <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                <div className="text-xl font-bold text-yellow-600">
                  {Object.keys(allYearsData).length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Years Played</div>
              </div>
              <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded">
                <div className="text-xl font-bold text-purple-600">
                  {(() => {
                    const allLeagues = Object.values(allYearsData).flat();
                    const totalWins = allLeagues.filter(l => l.regularSeasonRecord).reduce((sum, l) => sum + l.regularSeasonRecord.wins, 0);
                    const totalLosses = allLeagues.filter(l => l.regularSeasonRecord).reduce((sum, l) => sum + l.regularSeasonRecord.losses, 0);
                    return `${totalWins}-${totalLosses}`;
                  })()
                  }
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Career Record</div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 mb-6">
            <UserGroupIcon className="w-8 h-8 text-primary-600" />
            <div>
              <h2 className="text-2xl font-bold">All Your Leagues</h2>
              <p className="text-gray-600 dark:text-gray-300">
                Complete history across all years
              </p>
            </div>
          </div>

          {Object.entries(allYearsData)
            .sort(([a], [b]) => parseInt(b) - parseInt(a))
            .map(([year, leagues]) => (
            <div key={year} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="text-2xl font-bold text-primary-600">{year}</div>
                <div className="text-sm text-gray-500">
                  {leagues.length} league{leagues.length !== 1 ? 's' : ''}
                </div>
              </div>
              
              <div className="grid gap-4">
                {leagues.map((league) => (
                  <motion.div
                    key={league.league_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="card p-6 hover:shadow-xl transition-shadow duration-200 cursor-pointer"
                    onClick={() => league.userRoster && fetchRosterDetails(league)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold mb-2">{league.name}</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-sm">
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
                          {(league.placement || (league.champion && (league.champion.username === userData?.display_name || league.champion.username === userData?.username))) && (
                            <div>
                              <p className="font-medium flex items-center gap-1">
                                <span className="text-lg">
                                  {(league.placement === 1 || (league.champion && (league.champion.username === userData?.display_name || league.champion.username === userData?.username))) && '🏆'}
                                  {league.placement === 2 && '🥈'}
                                  {league.placement === 3 && '🥉'}
                                </span>
                                {(league.placement === 1 || (league.champion && (league.champion.username === userData?.display_name || league.champion.username === userData?.username))) 
                                  ? 'Champion' 
                                  : `${league.placement}${league.placement === 2 ? 'nd' : league.placement === 3 ? 'rd' : 'th'}`}
                              </p>
                            </div>
                          )}
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Scoring:</span>
                            <p className="font-medium capitalize">{league.scoring_settings?.rec || 'Standard'}</p>
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
                            fetchLeagueHistory(league);
                          }}
                          className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded hover:bg-purple-200 dark:hover:bg-purple-800"
                        >
                          History
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            fetchLeagueInfo(league);
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
                        <h4 className="text-lg font-semibold mb-4">Weekly Matchup Results</h4>
                        {matchupData && matchupData.length > 0 ? (
                          <div className="space-y-3">
                            {matchupData.map(matchup => (
                              <div key={matchup.week} className={`p-3 rounded border-l-4 ${
                                matchup.won 
                                  ? 'bg-green-50 dark:bg-green-900/20 border-green-500' 
                                  : 'bg-red-50 dark:bg-red-900/20 border-red-500'
                              }`}>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-4">
                                    <span className="font-semibold w-16">Week {matchup.week}</span>
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                      matchup.won 
                                        ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                                        : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                                    }`}>
                                      {matchup.won ? 'W' : 'L'}
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-semibold">{matchup.userPoints.toFixed(1)} - {matchup.opponentPoints.toFixed(1)}</div>
                                    <div className="text-sm text-gray-500">
                                      {matchup.won ? '+' : ''}{(matchup.userPoints - matchup.opponentPoints).toFixed(1)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
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
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-4 rounded-lg text-white text-center">
                          <div className="text-2xl font-bold">{transactions ? Math.round((transactions.filter(t => t.type === 'trade').length / Math.max(transactions.filter(t => t.type === 'trade').length, 1)) * 100) : 0}%</div>
                          <div className="text-sm opacity-90">Success Rate</div>
                        </div>
                        <div className="bg-gradient-to-r from-blue-500 to-cyan-600 p-4 rounded-lg text-white text-center">
                          <div className="text-2xl font-bold">B+</div>
                          <div className="text-sm opacity-90">Trade Grade</div>
                        </div>
                        <div className="bg-gradient-to-r from-purple-500 to-violet-600 p-4 rounded-lg text-white text-center">
                          <div className="text-2xl font-bold">N/A</div>
                          <div className="text-sm opacity-90">Points Impact</div>
                        </div>
                        <div className="bg-gradient-to-r from-orange-500 to-red-600 p-4 rounded-lg text-white text-center">
                          <div className="text-2xl font-bold">{transactions ? transactions.filter(t => t.type === 'trade').length : 0}</div>
                          <div className="text-sm opacity-90">Total Trades</div>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
                        <h4 className="text-lg font-semibold mb-4">Trade History</h4>
                        <div className="space-y-4">
                          {transactions && transactions.filter(t => t.type === 'trade').length > 0 ? (
                            transactions.filter(t => t.type === 'trade').map((trade, index) => (
                              <div key={index} className="p-4 bg-white dark:bg-gray-800 rounded-lg border-l-4 border-l-blue-500">
                                <div className="flex items-center justify-between mb-3">
                                  <span className="text-sm text-gray-500">Week {trade.leg} - {selectedLeague.season}</span>
                                  <div className="flex items-center space-x-2">
                                    <span className="px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                      Trade
                                    </span>
                                  </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <div className="font-semibold mb-1 text-green-600">Acquired:</div>
                                    <div className="space-y-1">
                                      {trade.adds.map(player => (
                                        <div key={player.id} className="text-gray-600 dark:text-gray-300">
                                          {player.name} ({player.position})
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="font-semibold mb-1 text-red-600">Traded Away:</div>
                                    <div className="space-y-1">
                                      {trade.drops.map(player => (
                                        <div key={player.id} className="text-gray-600 dark:text-gray-300">
                                          {player.name} ({player.position})
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-center text-gray-500 py-8">No trades found for this season</p>
                          )}
                        </div>
                      </div>
                    </div>
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
                          <div className="flex items-center gap-1">👤 Team</div>
                          <div className="flex items-center gap-1">📊 Record</div>
                          <div className="flex items-center gap-1">⚡ Points For</div>
                          <div className="flex items-center gap-1">🛡️ Points Against</div>
                          <div className="flex items-center gap-1">📈 Diff</div>
                        </div>
                        {leagueInfoData.standings.map((team, index) => (
                          <div key={team.roster_id} className={`grid grid-cols-6 gap-4 p-4 border-t border-gray-200 dark:border-gray-600 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                            index < 4 ? 'bg-green-50/50 dark:bg-green-900/10' : index >= leagueInfoData.standings.length - 2 ? 'bg-red-50/50 dark:bg-red-900/10' : ''
                          }`}>
                            <div className="font-bold flex items-center gap-2">
                              {index === 0 && '🥇'}
                              {index === 1 && '🥈'}
                              {index === 2 && '🥉'}
                              {index + 1}
                            </div>
                            <div className="font-medium">{team.username}</div>
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
                                <span className="font-semibold">{waiver.username}</span>
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

      {/* Player Stats Modal */}
      {showPlayerStats && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={closePlayerStats}
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
                  🏈 {playerStatsData?.playerName} - {playerStatsData?.year} Stats
                </h3>
                <button
                  onClick={closePlayerStats}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>
              
              {loadingPlayerStats ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : playerStatsData && (
                <div className="space-y-6">
                  {/* Player Info */}
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-4 rounded-lg">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Position:</span>
                        <p className="font-bold">{playerStatsData.playerInfo?.position || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Team:</span>
                        <p className="font-bold">{playerStatsData.playerInfo?.team || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Age:</span>
                        <p className="font-bold">{playerStatsData.playerInfo?.age || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Games:</span>
                        <p className="font-bold">{playerStatsData.stats.gp || 0}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Overall Rank:</span>
                        <p className="font-bold text-blue-600 dark:text-blue-400">#{playerStatsData.overallRank}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Position Rank:</span>
                        <p className="font-bold text-green-600 dark:text-green-400">#{playerStatsData.positionRank}</p>
                      </div>
                    </div>
                  </div>

                  {/* Fantasy Points */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-green-600">{(playerStatsData.stats.pts_ppr || 0).toFixed(1)}</div>
                      <div className="text-sm text-gray-500">PPR Points</div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-blue-600">{(playerStatsData.stats.pts_std || 0).toFixed(1)}</div>
                      <div className="text-sm text-gray-500">Standard Points</div>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-purple-600">{playerStatsData.derivedStats.fantasy_ppg || 'N/A'}</div>
                      <div className="text-sm text-gray-500">PPR Per Game</div>
                    </div>
                  </div>

                  {/* Passing Stats */}
                  {(playerStatsData.stats.pass_att || 0) > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold mb-3">Passing Stats</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                          <div className="font-bold">{playerStatsData.stats.pass_yd || 0}</div>
                          <div className="text-sm text-gray-500">Pass Yards</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                          <div className="font-bold">{playerStatsData.stats.pass_td || 0}</div>
                          <div className="text-sm text-gray-500">Pass TDs</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                          <div className="font-bold">{playerStatsData.stats.pass_int || 0}</div>
                          <div className="text-sm text-gray-500">Interceptions</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                          <div className="font-bold">{playerStatsData.derivedStats.completion_pct || 'N/A'}%</div>
                          <div className="text-sm text-gray-500">Completion %</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Rushing Stats */}
                  {(playerStatsData.stats.rush_att || 0) > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold mb-3">Rushing Stats</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                          <div className="font-bold">{playerStatsData.stats.rush_yd || 0}</div>
                          <div className="text-sm text-gray-500">Rush Yards</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                          <div className="font-bold">{playerStatsData.stats.rush_td || 0}</div>
                          <div className="text-sm text-gray-500">Rush TDs</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                          <div className="font-bold">{playerStatsData.stats.rush_att || 0}</div>
                          <div className="text-sm text-gray-500">Attempts</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                          <div className="font-bold">{playerStatsData.derivedStats.yards_per_carry || 'N/A'}</div>
                          <div className="text-sm text-gray-500">Yards/Carry</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Receiving Stats */}
                  {(playerStatsData.stats.rec || 0) > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold mb-3">Receiving Stats</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                          <div className="font-bold">{playerStatsData.stats.rec_yd || 0}</div>
                          <div className="text-sm text-gray-500">Rec Yards</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                          <div className="font-bold">{playerStatsData.stats.rec_td || 0}</div>
                          <div className="text-sm text-gray-500">Rec TDs</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                          <div className="font-bold">{playerStatsData.stats.rec || 0}</div>
                          <div className="text-sm text-gray-500">Receptions</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                          <div className="font-bold">{playerStatsData.derivedStats.yards_per_reception || 'N/A'}</div>
                          <div className="text-sm text-gray-500">Yards/Rec</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Additional Stats */}
                  <div>
                    <h4 className="text-lg font-semibold mb-3">Additional Stats</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded">
                        <div className="font-bold">{playerStatsData.derivedStats.total_td || 0}</div>
                        <div className="text-sm text-gray-500">Total TDs</div>
                      </div>
                      {playerStatsData.stats.fum && (
                        <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded">
                          <div className="font-bold">{playerStatsData.stats.fum}</div>
                          <div className="text-sm text-gray-500">Fumbles</div>
                        </div>
                      )}
                      {playerStatsData.stats.fum_lost && (
                        <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded">
                          <div className="font-bold">{playerStatsData.stats.fum_lost}</div>
                          <div className="text-sm text-gray-500">Fumbles Lost</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
      
      {/* Auth Modal */}
      {showAuth && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4"
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
    </div>
  );
}

export default LeagueManager;
