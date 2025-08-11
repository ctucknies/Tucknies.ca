// Security utilities for input validation and sanitization

// Memoized validation functions for better performance
const validationCache = new Map();

export const validateUsername = (username) => {
  if (!username || typeof username !== 'string') return false;
  
  const cacheKey = `username:${username}`;
  if (validationCache.has(cacheKey)) {
    return validationCache.get(cacheKey);
  }
  
  const sanitized = username.trim().replace(/[^a-zA-Z0-9_-]/g, '');
  const isValid = sanitized.length >= 2 && sanitized.length <= 50;
  
  validationCache.set(cacheKey, isValid);
  return isValid;
};

export const validateYear = (year) => {
  if (!year) return false;
  if (year === 'all') return true;
  
  const cacheKey = `year:${year}`;
  if (validationCache.has(cacheKey)) {
    return validationCache.get(cacheKey);
  }
  
  const numYear = parseInt(year);
  const isValid = !isNaN(numYear) && numYear >= 2020 && numYear <= new Date().getFullYear();
  
  validationCache.set(cacheKey, isValid);
  return isValid;
};

export const sanitizeInput = (input) => {
  if (!input || typeof input !== 'string') return '';
  
  const cacheKey = `sanitize:${input}`;
  if (validationCache.has(cacheKey)) {
    return validationCache.get(cacheKey);
  }
  
  const sanitized = input.trim().replace(/[<>\"'&]/g, '');
  validationCache.set(cacheKey, sanitized);
  return sanitized;
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
  
  // Clean up old entries periodically
  setInterval(() => {
    const now = Date.now();
    const windowStart = now - WINDOW_MS;
    
    for (const [key, times] of requests.entries()) {
      const validTimes = times.filter(time => time > windowStart);
      if (validTimes.length === 0) {
        requests.delete(key);
      } else {
        requests.set(key, validTimes);
      }
    }
  }, WINDOW_MS);

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
  const rateLimitKey = new URL(url).hostname;
  if (!rateLimiter(rateLimitKey)) {
    throw new Error('Rate limit exceeded');
  }
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout for better reliability
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'FantasyHub/1.0',
        ...options.headers
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
};

// Clean up validation cache periodically
setInterval(() => {
  if (validationCache.size > 1000) {
    validationCache.clear();
  }
}, 300000); // 5 minutes