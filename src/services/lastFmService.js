/**
 * Last.fm Similarity Service
 *
 * Calls the server-side proxy `/api/lastfm` keeping the API key secret.
 * Exposes:
 * - getSimilarTracks(track, artist, limit)
 * - getSimilarArtists(artist, limit)
 * - getSimilarYouTubeTracks(track, artist, limit) -> maps similar items to YouTube Music tracks
 */

import { searchSongs } from './innertubeService.js';

export async function getSimilarTracks(track, artist, limit = 6) {
  if (!track || !artist) return [];

  try {
    const params = new URLSearchParams({
      method: 'track.getSimilar',
      track,
      artist,
      limit: String(limit)
    });

    const res = await fetch(`/api/lastfm?${params.toString()}`);
    if (!res.ok) return [];

    const data = await res.json();
    if (data.error || !data.similartracks?.track) {
      return [];
    }

    const tracks = Array.isArray(data.similartracks.track)
      ? data.similartracks.track
      : [data.similartracks.track];

    return tracks
      .filter((t) => t && t.name && t.artist?.name)
      .map((t) => ({
        name: t.name,
        artist: t.artist.name,
        match: parseFloat(t.match || 0)
      }));
  } catch (err) {
    console.warn('[LastFmService] getSimilarTracks notice:', err.message);
    return [];
  }
}

export async function getSimilarArtists(artist, limit = 6) {
  if (!artist) return [];

  try {
    const params = new URLSearchParams({
      method: 'artist.getSimilar',
      artist,
      limit: String(limit)
    });

    const res = await fetch(`/api/lastfm?${params.toString()}`);
    if (!res.ok) return [];

    const data = await res.json();
    if (data.error || !data.similarartists?.artist) {
      return [];
    }

    const artists = Array.isArray(data.similarartists.artist)
      ? data.similarartists.artist
      : [data.similarartists.artist];

    return artists
      .filter((a) => a && a.name)
      .map((a) => ({
        name: a.name,
        match: parseFloat(a.match || 0)
      }));
  } catch (err) {
    console.warn('[LastFmService] getSimilarArtists notice:', err.message);
    return [];
  }
}

/**
 * Fetch similar songs and resolve them to playable YouTube Music tracks
 */
export async function getSimilarYouTubeTracks(track, artist, limit = 5) {
  const similars = await getSimilarTracks(track, artist, limit);
  if (!similars || similars.length === 0) return [];

  const matchedTracks = [];
  for (const item of similars.slice(0, limit)) {
    try {
      const results = await searchSongs(`${item.name} ${item.artist}`);
      if (results && results.length > 0) {
        matchedTracks.push(results[0]);
      }
    } catch {
      // Continue to next item
    }
  }

  return matchedTracks;
}
