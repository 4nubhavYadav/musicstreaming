/**
 * MusicBrainz Metadata Service
 * 
 * Free, open music encyclopedia API (No API key required).
 * Provides canonical track title, artist name, and album.
 * 
 * Strictly complies with MusicBrainz API requirements:
 * 1. Custom User-Agent header (format: AppName/Version (contact@domain))
 * 2. Rate-limited to at most 1 request per second via a serialized promise queue.
 * 3. Local persistent caching so the same song is never looked up twice.
 */

import { getCachedMusicBrainz, setCachedMusicBrainz } from './cacheService.js';

// Default User-Agent compliant with MusicBrainz etiquette
const DEFAULT_USER_AGENT = 'SoraMusicApp/1.0 (contact@soramusic.app)';

// Rate limiting state: at least 1050ms spacing between outbound requests
const MIN_REQUEST_INTERVAL_MS = 1050;
let lastRequestTimestamp = 0;
let rateLimitQueue = Promise.resolve();

/**
 * Enqueues an async network task to ensure that no two outbound
 * requests occur closer than 1050ms apart.
 */
function scheduleRateLimitedRequest(taskFn) {
  const queuedTask = rateLimitQueue.then(async () => {
    const now = Date.now();
    const elapsed = now - lastRequestTimestamp;
    const waitTime = Math.max(0, MIN_REQUEST_INTERVAL_MS - elapsed);

    if (waitTime > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    lastRequestTimestamp = Date.now();
    return taskFn();
  });

  // Keep the queue chain alive even if a previous request threw an error
  rateLimitQueue = queuedTask.catch(() => {});
  return queuedTask;
}

/**
 * Formats canonical artist name from MusicBrainz artist-credit array
 * Handles multi-artist collaborations with join phrases, e.g.:
 * [{ name: "The Weeknd", joinphrase: " feat. " }, { name: "Daft Punk" }] -> "The Weeknd feat. Daft Punk"
 */
export function formatArtistCredit(artistCreditArray) {
  if (!Array.isArray(artistCreditArray) || artistCreditArray.length === 0) {
    return 'Unknown Artist';
  }

  return artistCreditArray
    .map((ac) => {
      const name = ac.name || ac.artist?.name || '';
      const joinphrase = ac.joinphrase || '';
      return name + joinphrase;
    })
    .join('')
    .trim();
}

/**
 * Extracts canonical album name from MusicBrainz release list.
 * Prefers official studio albums over compilations or bootlegs.
 */
export function extractCanonicalAlbum(releasesArray) {
  if (!Array.isArray(releasesArray) || releasesArray.length === 0) {
    return 'Single';
  }

  // 1. Try to find an Official Album release
  const officialAlbum = releasesArray.find(
    (rel) => rel.status === 'Official' && rel['release-group']?.['primary-type'] === 'Album'
  );
  if (officialAlbum) return officialAlbum.title;

  // 2. Try to find any Official release
  const officialRelease = releasesArray.find((rel) => rel.status === 'Official');
  if (officialRelease) return officialRelease.title;

  // 3. Fall back to the first release
  return releasesArray[0].title || 'Single';
}

/**
 * Constructs an effective MusicBrainz query string.
 * Formats structured query if separators like "by" or "-" exist,
 * or wraps search terms into phrase queries to prioritize canonical tracks over fan covers.
 */
export function buildMusicBrainzQuery(rawQuery) {
  const clean = (rawQuery || '').trim();
  if (!clean) return '';

  // Check for "Song by Artist"
  const byMatch = clean.match(/^(.+?)\s+(?:by|ft\.?|feat\.?)\s+(.+)$/i);
  if (byMatch) {
    const song = byMatch[1].replace(/["']/g, '').trim();
    const artist = byMatch[2].replace(/["']/g, '').trim();
    return `recording:"${song}" AND artist:"${artist}"`;
  }

  // Check for "Artist - Song" or "Song - Artist"
  const dashMatch = clean.match(/^(.+?)\s*[-–—]\s*(.+)$/);
  if (dashMatch) {
    const part1 = dashMatch[1].replace(/["']/g, '').trim();
    const part2 = dashMatch[2].replace(/["']/g, '').trim();
    return `(recording:"${part2}" AND artist:"${part1}") OR (recording:"${part1}" AND artist:"${part2}")`;
  }

  // If multi-word, query both exact phrase and term search to maximize Solr match
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `"${clean.replace(/["']/g, '')}" OR (${clean.replace(/["']/g, '')})`;
  }

  return clean;
}

/**
 * Score and pick the best canonical recording from MusicBrainz results.
 * Heavily demotes covers, karaoke, tributes, and bootleg parodies,
 * while boosting multi-release official album tracks.
 */
function pickBestRecording(recordings, originalQuery = '') {
  if (!recordings || recordings.length === 0) return null;

  const negativeClues = /(?:\b)(cover|karaoke|tribute|parody|instrumental|remix|mashup|vs\.?|slowed|sped\s*up|8d|in the style of)(?:\b)/i;
  const lowerQuery = (originalQuery || '').toLowerCase();
  const queryTokens = lowerQuery.split(/\s+/).filter((t) => t.length > 2);

  const scored = recordings.map((rec) => {
    let score = rec.score || 0;
    const title = rec.title || '';
    const artistName = formatArtistCredit(rec['artist-credit']).toLowerCase();

    // Heavy penalty for cover / karaoke / parody clues in title or disambiguation
    if (negativeClues.test(title)) {
      score -= 85;
    }
    if (rec.disambiguation && negativeClues.test(rec.disambiguation)) {
      score -= 60;
    }

    // Heavy penalty if title has parenthetical artist mention like "(The Weeknd cover)" or "(Radiohead)"
    if (/\([^)]*(?:cover|tribute|version|remix)[^)]*\)/i.test(title)) {
      score -= 80;
    }

    // Official release boost: canonical tracks typically have multiple releases worldwide
    const officialReleases = rec.releases?.filter((r) => r.status === 'Official') || [];
    score += Math.min(50, officialReleases.length * 10);

    // Boost if the artist name matches the searched tokens
    const artistMatchesQuery = queryTokens.some((token) => artistName.includes(token));
    if (artistMatchesQuery) {
      score += 50;
    }

    return { rec, calculatedScore: score };
  });

  scored.sort((a, b) => b.calculatedScore - a.calculatedScore);
  return scored[0]?.rec || recordings[0];
}

/**
 * Look up canonical metadata (title, artist, album) from MusicBrainz.
 * 
 * @param {string} songAndArtist - Search query, e.g. "Blinding Lights The Weeknd"
 * @param {string} [customUserAgent] - Optional custom User-Agent
 * @returns {Promise<{ title: string, artist: string, album: string, mbid: string, score: number } | null>}
 */
export async function lookupMusicBrainz(songAndArtist, customUserAgent = null) {
  if (!songAndArtist || !songAndArtist.trim()) {
    return null;
  }

  const query = songAndArtist.trim();

  // 1. Check local cache first (Zero network call, Instant response)
  const cached = getCachedMusicBrainz(query);
  if (cached) {
    return cached;
  }

  // 2. Schedule network call through the 1 request/second rate-limited queue
  return scheduleRateLimitedRequest(async () => {
    // Double check cache in case a concurrent request resolved it while queued
    const doubleCheck = getCachedMusicBrainz(query);
    if (doubleCheck) return doubleCheck;

    try {
      const userAgent =
        customUserAgent ||
        (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MUSICBRAINZ_USER_AGENT) ||
        DEFAULT_USER_AGENT;

      const formattedQuery = buildMusicBrainzQuery(query);
      const url = `https://musicbrainz.org/ws/2/recording/?query=${encodeURIComponent(
        formattedQuery
      )}&fmt=json`;

      let response = null;
      let attempts = 0;
      const MAX_RETRIES = 2;

      while (attempts <= MAX_RETRIES) {
        response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': userAgent
          }
        });

        // If rate-limited or temporarily unavailable (503), back off and retry
        if (response.status === 503 && attempts < MAX_RETRIES) {
          attempts++;
          await new Promise((resolve) => setTimeout(resolve, 1200 * attempts));
          continue;
        }
        break;
      }

      if (!response.ok) {
        console.warn(`[MusicBrainz] Request failed with HTTP ${response.status}: ${response.statusText}`);
        return null;
      }

      const data = await response.json();
      const best = pickBestRecording(data.recordings, query);

      if (!best) {
        // Cache negative result with short TTL or empty to prevent hammering
        setCachedMusicBrainz(query, null);
        return null;
      }

      const metadata = {
        title: best.title || query,
        artist: formatArtistCredit(best['artist-credit']),
        album: extractCanonicalAlbum(best.releases),
        mbid: best.id,
        score: best.score || 0
      };

      // 3. Cache result locally for future lookups
      setCachedMusicBrainz(query, metadata);
      return metadata;
    } catch (err) {
      console.error('[MusicBrainz] Network or parsing error:', err);
      return null;
    }
  });
}
