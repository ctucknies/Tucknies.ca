import { useState, useCallback } from 'react';
import { validateUsername, validateYear, sanitizeInput, secureApiCall } from '../utils/security';

export function useLeagueData() {
  const [formData, setFormData] = useState({ 
    username: '', 
    year: new Date().getFullYear().toString() 
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [leaguesData, setLeaguesData] = useState(null);
  const [userData, setUserData] = useState(null);
  const [allYearsData, setAllYearsData] = useState(null);
  const [showingAllYears, setShowingAllYears] = useState(false);

  const fetchLeagueData = useCallback(async (username, year) => {
    const sanitizedUsername = sanitizeInput(username);
    const sanitizedYear = sanitizeInput(year);
    
    if (!validateUsername(sanitizedUsername)) {
      throw new Error('Username must be 2-50 characters and contain only letters, numbers, underscores, and hyphens');
    }
    
    if (!validateYear(sanitizedYear)) {
      throw new Error('Invalid year selected');
    }

    const userResponse = await secureApiCall(`https://api.sleeper.app/v1/user/${encodeURIComponent(sanitizedUsername)}`);
    
    if (!userResponse.ok) {
      throw new Error('User not found');
    }
    
    const userData = await userResponse.json();
    
    if (!userData.user_id) {
      throw new Error('Invalid user data');
    }

    return { userData, sanitizedYear };
  }, []);

  const fetchSingleYearData = useCallback(async (userData, year) => {
    const leaguesResponse = await secureApiCall(`https://api.sleeper.app/v1/user/${encodeURIComponent(userData.user_id)}/leagues/nfl/${encodeURIComponent(year)}`);
    
    if (!leaguesResponse.ok) {
      throw new Error('Failed to fetch leagues');
    }
    
    const leagues = await leaguesResponse.json();
    
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
              // Playoff data not available
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
    
    return enrichedLeagues;
  }, []);

  const fetchAllYearsData = useCallback(async (userData) => {
    const currentYear = new Date().getFullYear();
    const startYear = 2020;
    const allYearsLeagues = {};
    
    for (let year = startYear; year <= currentYear; year++) {
      try {
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
                      // Playoff data not available
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
        // No leagues found for this year
      }
    }
    
    return allYearsLeagues;
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    setIsLoading(true);
    setError(null);
    setLeaguesData(null);
    setAllYearsData(null);
    setShowingAllYears(formData.year === 'all');
    
    try {
      const { userData, sanitizedYear } = await fetchLeagueData(formData.username, formData.year);
      
      if (sanitizedYear === 'all') {
        const allYearsLeagues = await fetchAllYearsData(userData);
        setAllYearsData(allYearsLeagues);
        setUserData(userData);
      } else {
        const enrichedLeagues = await fetchSingleYearData(userData, sanitizedYear);
        setLeaguesData(enrichedLeagues);
        setUserData(userData);
      }
      
    } catch (err) {
      setError(err.message === 'Rate limit exceeded' ? 'Too many requests. Please wait a moment.' : 'Failed to fetch data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [formData, fetchLeagueData, fetchAllYearsData, fetchSingleYearData]);

  const resetSearch = useCallback(() => {
    setError(null);
    setLeaguesData(null);
    setUserData(null);
    setAllYearsData(null);
    setFormData({ username: '', year: new Date().getFullYear().toString() });
  }, []);

  return {
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
  };
}