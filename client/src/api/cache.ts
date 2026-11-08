/**
 * WisudaAttend Client-Side In-Memory Cache Manager
 *
 * Implements:
 * - TTL-based staleness for stable & semi-stable data
 * - Automatic tag-based cache invalidation on mutations (create/update/delete)
 * - In-flight Promise deduplication (prevents redundant parallel requests)
 * - Complete cache purging on logout
 * - Zero caching for live/real-time attendance and scanning data
 */

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  expiresAt: number;
  tags: string[];
}

class ApiCacheManager {
  private cache = new Map<string, CacheEntry>();
  private inFlight = new Map<string, Promise<any>>();

  /**
   * Generates a deterministic cache key from endpoint and normalized params
   */
  generateKey(endpoint: string, params?: Record<string, any>): string {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    if (!params || Object.keys(params).length === 0) {
      return cleanEndpoint;
    }
    const sortedKeys = Object.keys(params).sort();
    const query = sortedKeys
      .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== '')
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(String(params[k]).trim().toLowerCase())}`)
      .join('&');
    return query ? `${cleanEndpoint}?${query}` : cleanEndpoint;
  }

  /**
   * Retrieves data from cache if not expired
   */
  get<T = any>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  /**
   * Stores data in cache with TTL and association tags
   */
  set<T = any>(key: string, data: T, ttlMs: number, tags: string[] = []): void {
    if (ttlMs <= 0) return;
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttlMs,
      tags,
    });
  }

  /**
   * In-flight promise sharing (deduplication)
   */
  getInFlight<T>(key: string): Promise<T> | undefined {
    return this.inFlight.get(key);
  }

  setInFlight<T>(key: string, promise: Promise<T>): void {
    this.inFlight.set(key, promise);
    promise.finally(() => {
      this.inFlight.delete(key);
    });
  }

  /**
   * Invalidates all cache entries matching given tags or key prefixes
   * Example: invalidateTags(['events', 'sesi', 'dashboard'])
   */
  invalidateTags(tags: string[]): void {
    const tagSet = new Set(tags);
    for (const [key, entry] of this.cache.entries()) {
      const matchTag = entry.tags.some((t) => tagSet.has(t));
      const matchPrefix = tags.some((t) => key.includes(`/${t}`));
      if (matchTag || matchPrefix) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clears entire cache (e.g. on logout or user switch)
   */
  clear(): void {
    this.cache.clear();
    this.inFlight.clear();
  }
}

export const apiCache = new ApiCacheManager();

// Cache Policy Presets
export const CACHE_TTL = {
  STABLE: 5 * 60 * 1000,      // 5 minutes (prodi, metadata, system config)
  SEMI_STABLE: 30 * 1000,     // 30 seconds (students list, events, sessions)
  DASHBOARD: 15 * 1000,       // 15 seconds (dashboard stats)
  NONE: 0,                    // Live stream, scanner, mutations
} as const;
