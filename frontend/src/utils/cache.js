/**
 * Data Caching Utility for GeniusDB
 * Provides in-memory caching with TTL support for API responses
 */

class DataCache {
  constructor() {
    this.cache = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes default TTL
  }

  /**
   * Generate cache key from URL and parameters
   */
  generateKey(url, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    return `${url}${sortedParams ? `?${sortedParams}` : ''}`;
  }

  /**
   * Get cached data if valid
   */
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    // Check if expired
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  /**
   * Set data in cache with TTL
   */
  set(key, data, ttl = this.defaultTTL) {
    const expiresAt = Date.now() + ttl;
    this.cache.set(key, { data, expiresAt });
  }

  /**
   * Clear specific cache entry
   */
  delete(key) {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Clear expired entries
   */
  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const item of this.cache.values()) {
      if (now > item.expiresAt) {
        expiredEntries++;
      } else {
        validEntries++;
      }
    }

    return {
      expired: expiredEntries
    };
  }
}

// Create singleton instance
const dataCache = new DataCache();

// Cleanup expired entries every 5 minutes
setInterval(() => {
  dataCache.cleanup();
}, 5 * 60 * 1000);

export default dataCache;
