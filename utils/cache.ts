/**
 * Cache utility for storing and retrieving data from localStorage
 * with automatic expiration
 */

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    version: string;
}

// Cache duration: 1 hour (in milliseconds)
const DEFAULT_CACHE_DURATION = 60 * 60 * 1000;

// Version for cache invalidation when data structure changes
const CACHE_VERSION = '1.0.0';

/**
 * Get cached data or fetch new data if cache is expired or missing
 */
export async function getCachedOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    duration: number = DEFAULT_CACHE_DURATION
): Promise<T> {
    try {
        const cached = localStorage.getItem(key);

        if (cached) {
            const entry: CacheEntry<T> = JSON.parse(cached);

            // Check version compatibility
            if (entry.version !== CACHE_VERSION) {
                console.log(`Cache version mismatch for ${key}, invalidating...`);
                localStorage.removeItem(key);
            } else {
                // Check if cache is still valid
                const age = Date.now() - entry.timestamp;
                if (age < duration) {
                    console.log(`Using cached data for ${key} (age: ${Math.round(age / 1000)}s)`);
                    return entry.data;
                } else {
                    console.log(`Cache expired for ${key} (age: ${Math.round(age / 1000)}s)`);
                }
            }
        }
    } catch (error) {
        console.warn(`Error reading cache for ${key}:`, error);
        // Continue to fetch fresh data
    }

    // Fetch fresh data
    console.log(`Fetching fresh data for ${key}...`);
    const data = await fetchFn();

    // Store in cache
    try {
        const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
            version: CACHE_VERSION,
        };
        localStorage.setItem(key, JSON.stringify(entry));
        console.log(`Cached data for ${key}`);
    } catch (error) {
        console.warn(`Error caching data for ${key}:`, error);
        // Continue even if caching fails
    }

    return data;
}

/**
 * Invalidate cache for a specific key
 */
export function invalidateCache(key: string): void {
    try {
        localStorage.removeItem(key);
        console.log(`Invalidated cache for ${key}`);
    } catch (error) {
        console.warn(`Error invalidating cache for ${key}:`, error);
    }
}

/**
 * Invalidate all cache entries with a specific prefix
 */
export function invalidateCacheByPrefix(prefix: string): void {
    try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith(prefix)) {
                localStorage.removeItem(key);
            }
        });
        console.log(`Invalidated all cache entries with prefix: ${prefix}`);
    } catch (error) {
        console.warn(`Error invalidating cache by prefix ${prefix}:`, error);
    }
}

/**
 * Clear all cache entries
 */
export function clearAllCache(): void {
    try {
        // Only clear cache entries, not other localStorage data
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith('cache_')) {
                localStorage.removeItem(key);
            }
        });
        console.log('Cleared all cache entries');
    } catch (error) {
        console.warn('Error clearing cache:', error);
    }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
    totalEntries: number;
    totalSize: number;
    entries: Array<{ key: string; age: number; size: number }>;
} {
    const stats = {
        totalEntries: 0,
        totalSize: 0,
        entries: [] as Array<{ key: string; age: number; size: number }>,
    };

    try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith('cache_')) {
                const value = localStorage.getItem(key);
                if (value) {
                    const size = new Blob([value]).size;
                    stats.totalEntries++;
                    stats.totalSize += size;

                    try {
                        const entry = JSON.parse(value);
                        const age = Date.now() - entry.timestamp;
                        stats.entries.push({ key, age, size });
                    } catch {
                        // Invalid entry, skip
                    }
                }
            }
        });
    } catch (error) {
        console.warn('Error getting cache stats:', error);
    }

    return stats;
}

// Cache key constants
export const CACHE_KEYS = {
    PLAN_COSTS: 'cache_plan_costs',
    WORKING_DAYS: 'cache_working_days',
    SCHEDULE_CONFIG: 'cache_schedule_config',
    NON_WORKING_DAYS: 'cache_non_working_days',
} as const;
