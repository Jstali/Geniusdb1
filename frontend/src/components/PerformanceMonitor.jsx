/**
 * Performance Monitor Component
 * Tracks and displays application performance metrics
 */

import React, { useState, useEffect, useCallback } from 'react';
import useApiCache from '../hooks/useApiCache';

const PerformanceMonitor = ({ isVisible = false, onToggle }) => {
  const [metrics, setMetrics] = useState({
  });

  const { getCacheStats } = useApiCache();

  // Measure page load time
  useEffect(() => {
    const loadTime = performance.now();
    setMetrics(prev => ({ ...prev, loadTime }));
  }, []);

  // Monitor memory usage
  const updateMemoryUsage = useCallback(() => {
    if (performance.memory) {
      const memoryUsage = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
      setMetrics(prev => ({ ...prev, memoryUsage }));
    }
  }, []);

  // Monitor cache statistics
  const updateCacheStats = useCallback(() => {
    const stats = getCacheStats();
    setMetrics(prev => ({
      ...prev,
    }));
  }, [getCacheStats]);

  // Update metrics periodically
  useEffect(() => {
    const interval = setInterval(() => {
      updateMemoryUsage();
      updateCacheStats();
    }, 5000);

    return () => clearInterval(interval);
  }, [updateMemoryUsage, updateCacheStats]);

  // Track API calls
  useEffect(() => {
    const originalFetch = window.fetch;
    let apiCallCount = 0;

    window.fetch = function(...args) {
      apiCallCount++;
      setMetrics(prev => ({ ...prev, apiCalls: apiCallCount }));
      return originalFetch.apply(this, args);
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  if (!isVisible) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-4 right-4 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 z-50"
        title="Show Performance Monitor"
      >
        📊
      </button>
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 w-80 z-50">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold text-gray-800">Performance Monitor</h3>
        <button
          onClick={onToggle}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Load Time:</span>
          <span className="font-mono">{metrics.loadTime.toFixed(0)}ms</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600">Memory Usage:</span>
          <span className="font-mono">{metrics.memoryUsage}MB</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600">API Calls:</span>
          <span className="font-mono">{metrics.apiCalls}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600">Cache Hits:</span>
          <span className="font-mono text-green-600">{metrics.cacheHits}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600">Cache Misses:</span>
          <span className="font-mono text-red-600">{metrics.cacheMisses}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600">Cache Hit Rate:</span>
          <span className="font-mono">
            {metrics.cacheHits + metrics.cacheMisses > 0
              ? ((metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)) * 100).toFixed(1)
              : 0}%
          </span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          <div>Bundle Size: ~4.5MB (optimized)</div>
          <div>Last Updated: {new Date().toLocaleTimeString()}</div>
        </div>
      </div>
    </div>
};

export default PerformanceMonitor;
