// Security utilities for input validation and sanitization

export const validateUsername = (username) => {
  if (!username || typeof username !== 'string') return false;
  const sanitized = username.trim().replace(/[^a-zA-Z0-9_-]/g, '');
  return sanitized.length >= 2 && sanitized.length <= 50;
};

export const validateYear = (year) => {
  if (!year) return false;
  if (year === 'all') return true;
  const numYear = parseInt(year);
  return !isNaN(numYear) && numYear >= 2020 && numYear <= new Date().getFullYear();
};

export const sanitizeInput = (input) => {
  if (!input || typeof input !== 'string') return '';
  return input.trim().replace(/[<>\"'&]/g, '');
};

export const validateLeagueId = (leagueId) => {
  if (!leagueId || typeof leagueId !== 'string') return false;
  return /^[a-zA-Z0-9]+$/.test(leagueId) && leagueId.length <= 20;
};

export const validatePlayerId = (playerId) => {
  if (!playerId || typeof playerId !== 'string') return false;
  return /^[a-zA-Z0-9_]+$/.test(playerId) && playerId.length <= 20;
};

export const rateLimiter = (() => {
  const requests = new Map();
  const WINDOW_MS = 60000; // 1 minute
  const MAX_REQUESTS = 100;

  return (key = 'default') => {
    const now = Date.now();
    const windowStart = now - WINDOW_MS;
    
    if (!requests.has(key)) {
      requests.set(key, []);
    }
    
    const userRequests = requests.get(key);
    const validRequests = userRequests.filter(time => time > windowStart);
    
    if (validRequests.length >= MAX_REQUESTS) {
      return false;
    }
    
    validRequests.push(now);
    requests.set(key, validRequests);
    return true;
  };
})();

export const secureApiCall = async (url, options = {}) => {
  if (!rateLimiter()) {
    throw new Error('Rate limit exceeded');
  }
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};