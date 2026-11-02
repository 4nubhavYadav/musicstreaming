/**
 * YouTube Data API v3 Service
 * 
 * Provides:
 * 1. search.list endpoint wrapper with required filters:
 *    - type=video
 *    - videoCategoryId=10 (Music)
 *    - videoEmbeddable=true
 * 2. videos.list batch details endpoint wrapper (for descriptions and ISO duration)
 * 3. Local persistent caching to protect against 100 quota units / search.list
 * 4. API key resolution and quota tracking
 */

import {
  getCachedYouTubeSearch,
  setCachedYouTubeSearch,
  getCachedYouTubeVideo,
  setCachedYouTubeVideo,
  recordQuotaConsumption
} from './cacheService.js';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const STORAGE_KEY_API_KEY = 'sora_youtube_api_key';

/**
 * Resolves the YouTube Data API key from environment variable or localStorage
 */
export function getYouTubeApiKey() {
  if (typeof window !== 'undefined') {
    const userKey = localStorage.getItem(STORAGE_KEY_API_KEY);
    if (userKey && userKey.trim()) return userKey.trim();
  }
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_YOUTUBE_API_KEY) {
    return import.meta.env.VITE_YOUTUBE_API_KEY.trim();
  }
  return '';
}

/**
 * Allows user to store or update their YouTube Data API key in localStorage
 */
export function setYouTubeApiKey(key) {
  if (typeof window !== 'undefined') {
    if (key && key.trim()) {
      localStorage.setItem(STORAGE_KEY_API_KEY, key.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY_API_KEY);
    }
  }
}

/**
 * Checks whether a valid-looking YouTube API key is available
 */
export function hasYouTubeApiKey() {
  const key = getYouTubeApiKey();
  return Boolean(key && key.length > 10);
}

/**
 * Parses ISO 8601 duration string (e.g., 'PT3M45S', 'PT1H2M30S') into 'M:SS' or 'H:MM:SS'
 */
export function parseISODuration(isoDuration) {
  if (!isoDuration) return '3:30';
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '3:30';

  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Execute YouTube search.list query with strict music filters
 * 
 * Quota cost: 100 units per call.
 * Fully cached in localStorage to prevent repeat calls.
 * 
 * @param {string} query - YouTube search query (e.g. "The Weeknd Starboy")
 * @param {object} [options]
 * @param {number} [options.maxResults=25]
 * @returns {Promise<Array>} List of raw search result items
 */
export async function searchYouTubeVideos(query, options = {}) {
  if (!query || !query.trim()) return [];

  const cleanQuery = query.trim();

  // 1. Check local cache (Costs 0 Quota Units)
  const cached = getCachedYouTubeSearch(cleanQuery);
  if (cached && Array.isArray(cached)) {
    return cached;
  }

  const apiKey = getYouTubeApiKey();
  if (!apiKey) {
    throw new Error(
      'YouTube Data API key is missing. Please configure VITE_YOUTUBE_API_KEY or enter your key.'
    );
  }

  const maxResults = options.maxResults || 25;

  // Build search.list URL with mandatory requirements:
  // - type=video
  // - videoCategoryId=10 (Music)
  // - videoEmbeddable=true
  const params = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    videoCategoryId: '10',
    videoEmbeddable: 'true',
    maxResults: String(maxResults),
    q: cleanQuery,
    key: apiKey
  });

  const url = `${YOUTUBE_API_BASE}/search?${params.toString()}`;

  const response = await fetch(url);
  if (!response.ok) {
    let errorDetails = `HTTP ${response.status}`;
    try {
      const errorJson = await response.json();
      errorDetails = errorJson.error?.message || errorDetails;
    } catch {
      // ignore json parse error
    }

    if (response.status === 403) {
      throw new Error(`YouTube API Quota exceeded or invalid key: ${errorDetails}`);
    }
    throw new Error(`YouTube Search failed (${errorDetails})`);
  }

  const data = await response.json();
  const items = data.items || [];

  // Record quota usage (100 units)
  recordQuotaConsumption('search', 100);

  // Cache search results for 7 days
  setCachedYouTubeSearch(cleanQuery, items);

  return items;
}

/**
 * Batch-fetch detailed metadata for video IDs using videos.list
 * 
 * Quota cost: 1 unit per call for up to 50 videos.
 * Retrieves full description (for "Provided to YouTube by" verification) and contentDetails (duration).
 * 
 * @param {string[]} videoIds - Array of 11-char YouTube video IDs
 * @returns {Promise<Record<string, { description: string, duration: string, title: string, channelTitle: string }>>}
 */
export async function fetchVideosDetails(videoIds) {
  if (!Array.isArray(videoIds) || videoIds.length === 0) return {};

  const cleanIds = Array.from(new Set(videoIds.filter(Boolean)));
  const detailsMap = {};
  const missingIds = [];

  // 1. Check cache for each video ID
  for (const id of cleanIds) {
    const cached = getCachedYouTubeVideo(id);
    if (cached) {
      detailsMap[id] = cached;
    } else {
      missingIds.push(id);
    }
  }

  if (missingIds.length === 0) {
    return detailsMap;
  }

  const apiKey = getYouTubeApiKey();
  if (!apiKey) {
    // If no API key, return what we have
    return detailsMap;
  }

  // videos.list can accept up to 50 IDs in one call (cost: 1 quota unit)
  const chunk = missingIds.slice(0, 50);
  const params = new URLSearchParams({
    part: 'snippet,contentDetails',
    id: chunk.join(','),
    key: apiKey
  });

  const url = `${YOUTUBE_API_BASE}/videos?${params.toString()}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`[YouTube API] videos.list failed with HTTP ${response.status}`);
      return detailsMap;
    }

    const data = await response.json();
    const items = data.items || [];

    // Record quota usage (1 unit for videos.list)
    recordQuotaConsumption('videos', 1);

    for (const item of items) {
      const vid = item.id;
      const snippet = item.snippet || {};
      const contentDetails = item.contentDetails || {};

      const detailObj = {
        id: vid,
        title: snippet.title || '',
        channelTitle: snippet.channelTitle || '',
        description: snippet.description || '',
        durationIso: contentDetails.duration || '',
        duration: parseISODuration(contentDetails.duration),
        artwork:
          snippet.thumbnails?.high?.url ||
          snippet.thumbnails?.medium?.url ||
          `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`
      };

      detailsMap[vid] = detailObj;
      setCachedYouTubeVideo(vid, detailObj);
    }
  } catch (err) {
    console.warn('[YouTube API] Error fetching video details:', err);
  }

  return detailsMap;
}
