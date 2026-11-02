/**
 * Unified Music Service powered by the InnerTune Engine
 *
 * Direct YouTube Music InnerTube integration:
 * - No YouTube Data API key required
 * - No quota exhaustion
 * - Pure official music metadata (artist, album, high-res artwork, duration)
 * - Autocomplete suggestions
 * - Up-Next queue discovery
 */

import {
  searchSongs,
  getSearchSuggestions,
  resolveDirectTrack,
  getUpNextTracks,
  getRadioQueue,
  getNextContinuation,
  getRelated,
  parseMusicItem,
  resolveAlternatePlayableId,
  INNERTUBE_CLIENT
} from './innertubeService.js';

/**
 * Checks whether text is a direct YouTube link or 11-char ID
 */
export function isDirectYoutubeQuery(text) {
  if (!text) return false;
  const clean = text.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) return true;
  return /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/.test(
    clean
  );
}

/**
 * Executes song search using InnerTune's InnerTube engine.
 *
 * @param {string} rawUserQuery - Song title, artist, or direct YouTube URL
 * @returns {Promise<{
 *   tracks: Array<object>,
 *   primaryTrack: object | null,
 *   searchQueryUsed: string
 * }>}
 */
export async function searchAndResolveSong(rawUserQuery) {
  const query = (rawUserQuery || '').trim();
  if (!query) {
    return {
      tracks: [],
      primaryTrack: null,
      searchQueryUsed: ''
    };
  }

  // 1. Direct link or video ID detection
  if (isDirectYoutubeQuery(query)) {
    const directTrack = await resolveDirectTrack(query);
    if (directTrack) {
      return {
        tracks: [directTrack],
        primaryTrack: directTrack,
        searchQueryUsed: query
      };
    }
  }

  // 2. Official YouTube Music Song search via InnerTune engine
  const tracks = await searchSongs(query);

  return {
    tracks,
    primaryTrack: tracks[0] || null,
    searchQueryUsed: query
  };
}

export {
  searchSongs,
  getSearchSuggestions,
  resolveDirectTrack,
  getUpNextTracks,
  getRadioQueue,
  getNextContinuation,
  getRelated,
  parseMusicItem,
  resolveAlternatePlayableId,
  INNERTUBE_CLIENT
};
