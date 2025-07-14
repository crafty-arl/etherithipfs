import { Memory, MemoryStats } from '../types/memory';

// Local storage keys
const STORAGE_KEYS = {
  MEMORIES: 'memory-weaver-memories',
  STATS: 'memory-weaver-stats',
  LAST_FETCH: 'memory-weaver-last-fetch',
  CACHE_VERSION: 'memory-weaver-cache-version',
} as const;

// Cache configuration
const CACHE_CONFIG = {
  VERSION: '1.0.0',
  TTL: 5 * 60 * 1000, // 5 minutes in milliseconds
  MAX_SIZE: 50, // Maximum number of memories to cache
} as const;

export interface CachedData<T> {
  data: T;
  timestamp: number;
  version: string;
}

export interface MemoryCache {
  my: Memory[];
  our: Memory[];
  stats: MemoryStats | null;
  lastFetch: number;
}

class LocalStorageManager {
  private isAvailable: boolean;

  constructor() {
    this.isAvailable = this.checkAvailability();
  }

  private checkAvailability(): boolean {
    try {
      const test = '__localStorage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  // Generic storage methods
  private setItem<T>(key: string, value: T): boolean {
    if (!this.isAvailable) return false;
    
    try {
      const cachedData: CachedData<T> = {
        data: value,
        timestamp: Date.now(),
        version: CACHE_CONFIG.VERSION,
      };
      localStorage.setItem(key, JSON.stringify(cachedData));
      return true;
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
      return false;
    }
  }

  private getItem<T>(key: string): T | null {
    if (!this.isAvailable) return null;
    
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;
      
      const cachedData: CachedData<T> = JSON.parse(item);
      
      // Check if cache is still valid
      if (this.isCacheValid(cachedData)) {
        return cachedData.data;
      } else {
        // Remove expired cache
        localStorage.removeItem(key);
        return null;
      }
    } catch (error) {
      console.warn('Failed to read from localStorage:', error);
      return null;
    }
  }

  private isCacheValid<T>(cachedData: CachedData<T>): boolean {
    const now = Date.now();
    const isExpired = now - cachedData.timestamp > CACHE_CONFIG.TTL;
    const isVersionValid = cachedData.version === CACHE_CONFIG.VERSION;
    
    return !isExpired && isVersionValid;
  }

  // Memory-specific methods
  cacheMemories(userId: string, viewMode: 'my' | 'our', memories: Memory[]): boolean {
    const key = `${STORAGE_KEYS.MEMORIES}_${userId}_${viewMode}`;
    return this.setItem(key, memories);
  }

  getCachedMemories(userId: string, viewMode: 'my' | 'our'): Memory[] | null {
    const key = `${STORAGE_KEYS.MEMORIES}_${userId}_${viewMode}`;
    return this.getItem<Memory[]>(key);
  }

  cacheStats(userId: string, guildId: string | undefined, stats: MemoryStats): boolean {
    const key = `${STORAGE_KEYS.STATS}_${userId}_${guildId || 'personal'}`;
    return this.setItem(key, stats);
  }

  getCachedStats(userId: string, guildId: string | undefined): MemoryStats | null {
    const key = `${STORAGE_KEYS.STATS}_${userId}_${guildId || 'personal'}`;
    return this.getItem<MemoryStats>(key);
  }

  // Cache management
  clearCache(): void {
    if (!this.isAvailable) return;
    
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        // Clear all memory-weaver related items
        const keys = Object.keys(localStorage);
        keys.forEach(storageKey => {
          if (storageKey.startsWith('memory-weaver-')) {
            localStorage.removeItem(storageKey);
          }
        });
      });
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }

  getCacheInfo(): { size: number; keys: string[] } {
    if (!this.isAvailable) return { size: 0, keys: [] };
    
    try {
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith('memory-weaver-')
      );
      const size = keys.reduce((total, key) => {
        const item = localStorage.getItem(key);
        return total + (item ? new Blob([item]).size : 0);
      }, 0);
      
      return { size, keys };
    } catch {
      return { size: 0, keys: [] };
    }
  }

  // Utility methods
  isStorageAvailable(): boolean {
    return this.isAvailable;
  }

  getStorageQuota(): Promise<{ used: number; total: number } | null> {
    if (!this.isAvailable || !('storage' in navigator)) {
      return Promise.resolve(null);
    }

    return navigator.storage.estimate().then(estimate => ({
      used: estimate.usage || 0,
      total: estimate.quota || 0,
    }));
  }
}

// Export singleton instance
export const localStorageManager = new LocalStorageManager();

// Export convenience functions
export const cacheMemories = (userId: string, viewMode: 'my' | 'our', memories: Memory[]) => 
  localStorageManager.cacheMemories(userId, viewMode, memories);

export const getCachedMemories = (userId: string, viewMode: 'my' | 'our') => 
  localStorageManager.getCachedMemories(userId, viewMode);

export const cacheStats = (userId: string, guildId: string | undefined, stats: MemoryStats) => 
  localStorageManager.cacheStats(userId, guildId, stats);

export const getCachedStats = (userId: string, guildId: string | undefined) => 
  localStorageManager.getCachedStats(userId, guildId);

export const clearCache = () => localStorageManager.clearCache();
export const getCacheInfo = () => localStorageManager.getCacheInfo();
export const isStorageAvailable = () => localStorageManager.isStorageAvailable();
export const getStorageQuota = () => localStorageManager.getStorageQuota(); 