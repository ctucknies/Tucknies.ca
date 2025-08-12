import { useEffect, useRef, useCallback, useState } from 'react';
import { performanceTimer, memoryMonitor } from '../utils/performance';

export const usePerformance = (componentName) => {
  const renderCount = useRef(0);
  const mountTime = useRef(null);

  useEffect(() => {
    mountTime.current = performance.now();
    performanceTimer.start(`${componentName}-mount`);
    
    return () => {
      performanceTimer.end(`${componentName}-mount`);
    };
  }, [componentName]);

  useEffect(() => {
    renderCount.current += 1;
  });

  const measureOperation = useCallback((operationName, operation) => {
    return async (...args) => {
      const label = `${componentName}-${operationName}`;
      performanceTimer.start(label);
      
      try {
        const result = await operation(...args);
        performanceTimer.end(label);
        return result;
      } catch (error) {
        performanceTimer.end(label);
        throw error;
      }
    };
  }, [componentName]);

  const getMetrics = useCallback(() => {
    const memory = memoryMonitor.check();
    return {
      renderCount: renderCount.current,
      mountTime: mountTime.current,
      memory
    };
  }, []);

  return { measureOperation, getMetrics };
};

export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export const useThrottle = (callback, delay) => {
  const lastRun = useRef(Date.now());

  return useCallback((...args) => {
    if (Date.now() - lastRun.current >= delay) {
      callback(...args);
      lastRun.current = Date.now();
    }
  }, [callback, delay]);
};