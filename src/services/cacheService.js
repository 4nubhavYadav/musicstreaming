/**
 * Cache and Quota Management Service
 * 
 * Provides:
 * 1. Fast in-memory caching combined with persistent localStorage caching.
 * 2. Dedicated namespace caching for MusicBrainz queries and YouTube search/video calls.
 * 3. Daily quota usage tracker for the YouTube Data API v3 (10,000 units/day budget).
 */

const memoryCache = new Map();

// LocalStorage key prefixes
const PREFIX_MB = 'sora_mb_';
const PREFIX_YT_SEARCH = 'sora_yt_search_';
const PREFIX_YT_VIDEO = 'sora_yt_video_';
const KEY_QUOTA = 'sora_yt_quota_tracker';

/**
 * Normalizes query string for uniform cache indexing.
 * e.g., "  Blinding Lights - The Weeknd  " -> "blinding lights the weeknd"
 */
export function normalizeKey(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Safe localStorage getItem wrapper
 */
function safeGetItem(key) {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return null;
  }
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Check expiration if ttl was set
    if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

/**
 * Safe localStorage setItem wrapper
 */
function safeSetItem(key, data, ttlMs = null) {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return;
  }
  try {
    const payload = {
      data,
      savedAt: Date.now(),
      expiresAt: ttlMs ? Date.now() + ttlMs : null
    };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch (err) {
    // If localStorage quota is exceeded, warn and continue using in-memory cache
    console.warn('[CacheService] Storage quota exceeded or unavailable:', err);
  }
}

// ============================================================================
// MusicBrainz Metadata Cache
// ============================================================================

/**
 * Retrieve cached MusicBrainz recording metadata
 */
export function getCachedMusicBrainz(query) {
  const norm = normalizeKey(query);
  const cacheKey = PREFIX_MB + norm;

  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey);
  }

  const persisted = safeGetItem(cacheKey);
  if (persisted) {
    memoryCache.set(cacheKey, persisted);
    return persisted;
  }

  return null;
}

/**
 * Store MusicBrainz recording metadata
 * Music metadata rarely changes, so we cache it permanently or with a 30-day TTL.
 */
export function setCachedMusicBrainz(query, metadata) {
  const norm = normalizeKey(query);
  const cacheKey = PREFIX_MB + norm;
  const TTL_30_DAYS = 30 * 24 * 60 * 60 * 1000;

  memoryCache.set(cacheKey, metadata);
  safeSetItem(cacheKey, metadata, TTL_30_DAYS);
}

// ============================================================================
// YouTube Search & Video Details Cache
// ============================================================================

/**
 * Retrieve cached YouTube search results for a query
 */
export function getCachedYouTubeSearch(query) {
  const norm = normalizeKey(query);
  const cacheKey = PREFIX_YT_SEARCH + norm;

  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey);
  }

  const persisted = safeGetItem(cacheKey);
  if (persisted) {
    memoryCache.set(cacheKey, persisted);
    return persisted;
  }

  return null;
}

/**
 * Store YouTube search results
 * Cache search.list queries for 7 days to conserve the 100 quota unit cost per call.
 */
export function setCachedYouTubeSearch(query, results) {
  const norm = normalizeKey(query);
  const cacheKey = PREFIX_YT_SEARCH + norm;
  const TTL_7_DAYS = 7 * 24 * 60 * 60 * 1000;

  memoryCache.set(cacheKey, results);
  safeSetItem(cacheKey, results, TTL_7_DAYS);
}

/**
 * Retrieve cached video details (from videos.list)
 */
export function getCachedYouTubeVideo(videoId) {
  if (!videoId) return null;
  const cacheKey = PREFIX_YT_VIDEO + videoId;

  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey);
  }

  const persisted = safeGetItem(cacheKey);
  if (persisted) {
    memoryCache.set(cacheKey, persisted);
    return persisted;
  }

  return null;
}

/**
 * Store video details (from videos.list)
 */
export function setCachedYouTubeVideo(videoId, videoDetails) {
  if (!videoId) return;
  const cacheKey = PREFIX_YT_VIDEO + videoId;
  const TTL_30_DAYS = 30 * 24 * 60 * 60 * 1000;

  memoryCache.set(cacheKey, videoDetails);
  safeSetItem(cacheKey, videoDetails, TTL_30_DAYS);
}

// ============================================================================
// YouTube Quota Awareness & Tracker
// ============================================================================

const DAILY_QUOTA_LIMIT = 10000;

/**
 * Returns the current date in YYYY-MM-DD UTC for quota tracking
 */
function getTodayDateString() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(
    now.getUTCDate()
  ).padStart(2, '0')}`;
}

/**
 * Get current YouTube Data API quota stats for today
 */
export function getYouTubeQuotaUsage() {
  const today = getTodayDateString();
  const raw = safeGetItem(KEY_QUOTA);

  let current = raw;
  if (!current || current.date !== today) {
    current = {
      date: today,
      usedToday: 0,
      searchCalls: 0,
      videoDetailsCalls: 0
    };
    safeSetItem(KEY_QUOTA, current);
  }

  const remaining = Math.max(0, DAILY_QUOTA_LIMIT - current.usedToday);
  const percentUsed = Math.min(100, (current.usedToday / DAILY_QUOTA_LIMIT) * 100);

  return {
    date: current.date,
    usedToday: current.usedToday,
    dailyLimit: DAILY_QUOTA_LIMIT,
    remaining,
    percentUsed: Math.round(percentUsed * 10) / 10,
    searchCalls: current.searchCalls || 0,
    videoDetailsCalls: current.videoDetailsCalls || 0,
    remainingSearches: Math.floor(remaining / 100)
  };
}

/**
 * Track consumed quota units
 * @param {'search' | 'videos'} callType 
 * @param {number} customCost (optional override, 100 for search, 1 for videos)
 */
export function recordQuotaConsumption(callType, customCost = null) {
  const cost = customCost !== null ? customCost : (callType === 'search' ? 100 : 1);
  const today = getTodayDateString();
  const raw = safeGetItem(KEY_QUOTA);

  let record = raw;
  if (!record || record.date !== today) {
    record = {
      date: today,
      usedToday: 0,
      searchCalls: 0,
      videoDetailsCalls: 0
    };
  }

  record.usedToday += cost;
  if (callType === 'search') {
    record.searchCalls = (record.searchCalls || 0) + 1;
  } else if (callType === 'videos') {
    record.videoDetailsCalls = (record.videoDetailsCalls || 0) + 1;
  }

  safeSetItem(KEY_QUOTA, record);
  return record;
}
