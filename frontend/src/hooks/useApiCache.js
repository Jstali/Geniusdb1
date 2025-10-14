/**
 * Custom hook for API caching
 * Provides cached API calls with automatic cache management
 */

import { useState, useEffect, useCallback } from 'react';
import dataCache from '../utils/cache';

const useApiCache = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetch data with caching
   */
  const fetchWithCache = useCallback(async (url, options = {}, cacheTTL = 5 * 60 * 1000) => {
    const cacheKey = dataCache.generateKey(url, options.params || {});
    
    // Check cache first
    const cachedData = dataCache.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    // Fetch from API
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Cache the response
      dataCache.set(cacheKey, data, cacheTTL);
      
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Invalidate cache for specific URL pattern
   */
  const invalidateCache = useCallback((urlPattern) => {
    const keys = Array.from(dataCache.cache.keys());
    keys.forEach(key => {
      if (key.includes(urlPattern)) {
        dataCache.delete(key);
      }
    });
  }, []);

  /**
   * Clear all cache
   */
  const clearCache = useCallback(() => {
    dataCache.clear();
  }, []);

  /**
   * Get cache statistics
   */
  const getCacheStats = useCallback(() => {
    return dataCache.getStats();
  }, []);

  return {
    fetchWithCache,
    invalidateCache,
    clearCache,
    getCacheStats,
    loading,
    error,
  };
};

export default useApiCache;
