interface CacheEntry {
  data: {
    success: boolean;
    meta: any;
    sections: any[];
    loadedFromFile: boolean;
    fileHtmlContent: string;
  };
  timestamp: number;
}

// Глобальный in-memory кэш уроков для среды Node.js
const globalCache = (global as any).__educationLessonCache || new Map<string, CacheEntry>();
if (process.env.NODE_ENV !== 'production') {
  (global as any).__educationLessonCache = globalCache;
}

export const serverLessonCache: Map<string, CacheEntry> = globalCache;
export const CACHE_TTL_MS = 60 * 60 * 1000; // 1 час