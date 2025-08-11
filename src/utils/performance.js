// Performance monitoring utilities

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.observers = [];
  }

  // Start timing an operation
  startTimer(name) {
    this.metrics.set(name, { start: performance.now() });
  }

  // End timing and record duration
  endTimer(name) {
    const metric = this.metrics.get(name);
    if (metric) {
      metric.duration = performance.now() - metric.start;
      metric.end = performance.now();
      
      // Log slow operations in development
      if (process.env.NODE_ENV === 'development' && metric.duration > 1000) {
        console.warn(`Slow operation detected: ${name} took ${metric.duration.toFixed(2)}ms`);
      }
    }
  }

  // Get metric data
  getMetric(name) {
    return this.metrics.get(name);
  }

  // Get all metrics
  getAllMetrics() {
    return Object.fromEntries(this.metrics);
  }

  // Clear metrics
  clearMetrics() {
    this.metrics.clear();
  }

  // Monitor API calls
  monitorApiCall(url, startTime, endTime, success = true) {
    const duration = endTime - startTime;
    const key = `api_${new URL(url).pathname}`;
    
    if (!this.metrics.has(key)) {
      this.metrics.set(key, {
        calls: 0,
        totalDuration: 0,
        failures: 0,
        avgDuration: 0
      });
    }
    
    const metric = this.metrics.get(key);
    metric.calls++;
    metric.totalDuration += duration;
    metric.avgDuration = metric.totalDuration / metric.calls;
    
    if (!success) {
      metric.failures++;
    }
    
    // Alert on consistently slow APIs
    if (metric.avgDuration > 5000 && metric.calls > 5) {
      console.warn(`Slow API detected: ${url} avg: ${metric.avgDuration.toFixed(2)}ms`);
    }
  }

  // Monitor component render times
  monitorRender(componentName, renderTime) {
    const key = `render_${componentName}`;
    
    if (!this.metrics.has(key)) {
      this.metrics.set(key, {
        renders: 0,
        totalTime: 0,
        avgTime: 0,
        maxTime: 0
      });
    }
    
    const metric = this.metrics.get(key);
    metric.renders++;
    metric.totalTime += renderTime;
    metric.avgTime = metric.totalTime / metric.renders;
    metric.maxTime = Math.max(metric.maxTime, renderTime);
    
    // Alert on slow renders
    if (renderTime > 16) { // 60fps threshold
      console.warn(`Slow render: ${componentName} took ${renderTime.toFixed(2)}ms`);
    }
  }

  // Get performance summary
  getSummary() {
    const summary = {
      apiCalls: {},
      renders: {},
      operations: {}
    };
    
    for (const [key, value] of this.metrics.entries()) {
      if (key.startsWith('api_')) {
        summary.apiCalls[key.replace('api_', '')] = value;
      } else if (key.startsWith('render_')) {
        summary.renders[key.replace('render_', '')] = value;
      } else {
        summary.operations[key] = value;
      }
    }
    
    return summary;
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// React hook for monitoring component performance
export const usePerformanceMonitor = (componentName) => {
  const startTime = performance.now();
  
  React.useEffect(() => {
    const endTime = performance.now();
    performanceMonitor.monitorRender(componentName, endTime - startTime);
  });
};

// Higher-order component for performance monitoring
export const withPerformanceMonitoring = (WrappedComponent, componentName) => {
  return React.memo((props) => {
    const startTime = performance.now();
    
    React.useEffect(() => {
      const endTime = performance.now();
      performanceMonitor.monitorRender(componentName, endTime - startTime);
    });
    
    return React.createElement(WrappedComponent, props);
  });
};

// Utility to measure async operations
export const measureAsync = async (name, asyncFn) => {
  const startTime = performance.now();
  try {
    const result = await asyncFn();
    const endTime = performance.now();
    performanceMonitor.monitorApiCall(name, startTime, endTime, true);
    return result;
  } catch (error) {
    const endTime = performance.now();
    performanceMonitor.monitorApiCall(name, startTime, endTime, false);
    throw error;
  }
};

// Memory usage monitoring
export const monitorMemoryUsage = () => {
  if ('memory' in performance) {
    const memory = performance.memory;
    return {
      used: Math.round(memory.usedJSHeapSize / 1048576), // MB
      total: Math.round(memory.totalJSHeapSize / 1048576), // MB
      limit: Math.round(memory.jsHeapSizeLimit / 1048576) // MB
    };
  }
  return null;
};

// Bundle size analyzer (development only)
export const analyzeBundleSize = () => {
  if (process.env.NODE_ENV === 'development') {
    const scripts = Array.from(document.querySelectorAll('script[src]'));
    const totalSize = scripts.reduce((size, script) => {
      // This is a rough estimate - in production you'd use webpack-bundle-analyzer
      return size + (script.src.length * 100); // Rough estimate
    }, 0);
    
    console.log(`Estimated bundle size: ${(totalSize / 1024).toFixed(2)} KB`);
    return totalSize;
  }
  return 0;
};

export default performanceMonitor;