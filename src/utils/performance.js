// Performance optimization utilities

// Enhanced debounce with immediate execution option
export const debounce = (func, delay, immediate = false) => {
  let timeoutId;
  let lastCallTime = 0;
  
  return function executedFunction(...args) {
    const callNow = immediate && !timeoutId;
    const now = Date.now();
    
    clearTimeout(timeoutId);
    
    timeoutId = setTimeout(() => {
      timeoutId = null;
      if (!immediate) {
        lastCallTime = Date.now();
        func.apply(this, args);
      }
    }, delay);
    
    if (callNow) {
      lastCallTime = now;
      func.apply(this, args);
    }
  };
};

// Memory-efficient LRU cache
export class LRUCache {
  constructor(maxSize = 100) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }
  
  get(key) {
    if (this.cache.has(key)) {
      const value = this.cache.get(key);
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }
    return null;
  }
  
  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }
  
  clear() {
    this.cache.clear();
  }
  
  size() {
    return this.cache.size;
  }
}

// Global cache instances
export const apiCache = new LRUCache(200);
export const playerCache = new LRUCache(500);

// Batch API requests to reduce network calls
export class BatchRequestManager {
  constructor(batchSize = 5, delay = 100) {
    this.batchSize = batchSize;
    this.delay = delay;
    this.queue = [];
    this.processing = false;
  }
  
  add(request) {
    return new Promise((resolve, reject) => {
      this.queue.push({ request, resolve, reject });
      this.processBatch();
    });
  }
  
  async processBatch() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.batchSize);
      
      try {
        const results = await Promise.allSettled(
          batch.map(({ request }) => request())
        );
        
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            batch[index].resolve(result.value);
          } else {
            batch[index].reject(result.reason);
          }
        });
      } catch (error) {
        batch.forEach(({ reject }) => reject(error));
      }
      
      // Small delay between batches
      if (this.queue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, this.delay));
      }
    }
    
    this.processing = false;
  }
}

// Throttle function for high-frequency events
export const throttle = (func, limit) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Memory usage monitor
export const memoryMonitor = {
  check() {
    if (performance.memory) {
      const { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit } = performance.memory;
      const usage = (usedJSHeapSize / jsHeapSizeLimit) * 100;
      
      if (usage > 80) {
        console.warn('High memory usage detected:', usage.toFixed(2) + '%');
        this.cleanup();
      }
      
      return { usage, usedJSHeapSize, totalJSHeapSize };
    }
    return null;
  },
  
  cleanup() {
    // Clear caches when memory is high
    apiCache.clear();
    playerCache.clear();
    
    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }
  }
};

// Performance timing utility
export const performanceTimer = {
  timers: new Map(),
  
  start(label) {
    this.timers.set(label, performance.now());
  },
  
  end(label) {
    const startTime = this.timers.get(label);
    if (startTime) {
      const duration = performance.now() - startTime;
      this.timers.delete(label);
      console.log(`${label}: ${duration.toFixed(2)}ms`);
      return duration;
    }
    return null;
  }
};

// Cleanup interval for memory management
setInterval(() => {
  memoryMonitor.check();
}, 30000); // Check every 30 seconds