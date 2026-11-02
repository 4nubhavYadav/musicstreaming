/**
 * Audio Stream Resolution Service
 *
 * Resolves raw playable audio stream URLs & expiry timestamps for native ExoPlayer playback.
 */

const streamCache = new Map();
const STREAM_CACHE_STORAGE_KEY = 'sora_stream_cache_';

export async function resolveAudioStream(videoId) {
  if (!videoId) return null;

  // 1. Check in-memory cache
  if (streamCache.has(videoId)) {
    const cached = streamCache.get(videoId);
    // Ensure URL is not expiring within 90 seconds
    if (cached.expiry - Date.now() > 90_000) {
      return cached;
    }
    streamCache.delete(videoId);
  }

  // 2. Check localStorage
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const saved = localStorage.getItem(STREAM_CACHE_STORAGE_KEY + videoId);
      if (saved) {
        const item = JSON.parse(saved);
        if (item.expiry - Date.now() > 90_000) {
          streamCache.set(videoId, item);
          return item;
        }
        localStorage.removeItem(STREAM_CACHE_STORAGE_KEY + videoId);
      }
    } catch {
      // ignore
    }
  }

  // 3. Fetch from Cloudflare stream resolver endpoint
  try {
    const res = await fetch(`/api/ytm/stream?videoId=${encodeURIComponent(videoId)}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.url) {
        const streamData = {
          videoId,
          url: data.url,
          expiry: data.expiry || Date.now() + 4 * 3600 * 1000
        };

        streamCache.set(videoId, streamData);
        if (typeof window !== 'undefined' && window.localStorage) {
          try {
            localStorage.setItem(
              STREAM_CACHE_STORAGE_KEY + videoId,
              JSON.stringify(streamData)
            );
          } catch {
            // ignore
          }
        }

        return streamData;
      }
    }
  } catch (err) {
    console.warn('[StreamResolver] Resolution notice:', err.message);
  }

  return null;
}
