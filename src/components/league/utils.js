// Utility functions for league calculations

export const calculatePlacement = (playoffs, userRosterId) => {
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

export const calculateWinStreak = (matchups) => {
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

export const calculateAchievements = (analyticsData, matchupData, userData, league) => {
  const userAchievements = [];
  
  // Championship awards
  if (league.placement === 1 || (league.champion && (league.champion.username === userData?.display_name || league.champion.username === userData?.username))) {
    userAchievements.push({ type: 'champion', text: '🏆 League Champion' });
  }
  if (league.placement === 2) userAchievements.push({ type: 'runner-up', text: '🥈 Runner-up' });
  if (league.placement === 3) userAchievements.push({ type: 'bronze', text: '🥉 Third Place' });
  
  if (!matchupData || !analyticsData) return userAchievements;
  
  const validMatchups = matchupData.filter(m => m.userPoints > 0);
  const wins = validMatchups.filter(m => m.won).length;
  
  // Scoring achievements
  const highestWeek = validMatchups.length > 0 ? Math.max(...validMatchups.map(m => m.userPoints)) : 0;
  const lowestWeek = validMatchups.length > 0 ? Math.min(...validMatchups.map(m => m.userPoints)) : 0;
  
  if (highestWeek >= 200) userAchievements.push({ type: 'explosive', text: '💥 200+ Point Explosion' });
  else if (highestWeek >= 150) userAchievements.push({ type: 'high-score', text: '🔥 150+ Point Game' });
  
  if (lowestWeek > 0 && lowestWeek < 50) userAchievements.push({ type: 'dud', text: '💀 Sub-50 Point Dud' });
  
  // Win streak achievements
  if (analyticsData.winStreak >= 8) userAchievements.push({ type: 'domination', text: `🔥 ${analyticsData.winStreak} Game Domination` });
  else if (analyticsData.winStreak >= 5) userAchievements.push({ type: 'streak', text: `⚡ ${analyticsData.winStreak} Game Win Streak` });
  
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
    const totalPoints = validMatchups.reduce((sum, m) => sum + m.userPoints, 0);
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
  const totalPoints = validMatchups.reduce((sum, m) => sum + m.userPoints, 0);
  const avgPoints = validMatchups.length > 0 ? (totalPoints / validMatchups.length) : 0;
  if (validMatchups.length >= 10 && avgPoints >= 130) userAchievements.push({ type: 'scoring-champ', text: '🎯 Scoring Machine (130+ avg)' });
  
  return userAchievements;
};