/**
 * Home Recommendation Engine for Sora
 *
 * Implements:
 * 1. Quick picks: Top weighted seeds (playCount, completion %, likes, skips, time decay).
 *    Radio per seed merged, deduped against recently played, lightly shuffled, capped at 20.
 * 2. "Because you listened to <Artist>": One shelf per top 2-3 artists with their radio/related tracks.
 * 3. "Discover": Tracks from related artists the user has never played.
 * 4. Cold start: FEmusic_home generic shelves + one-time artist selector prompt.
 * 5. Robustness & Performance:
 *    - In-memory & localStorage caching (8 minutes TTL).
 *    - Concurrency cap of 3-4 using native promise pool.
 *    - Failure of a single seed never breaks the whole shelf.
 */

import { getTopTracks, getTopArtists, getRecent, recordTrackStart } from './historyStore.js';
import { getRadioQueue, callInnerTube, parseMusicItem, searchSongs } from './innertubeService.js';

const RECS_CACHE_PREFIX = 'sora_home_recs_cache_';
const RECS_CACHE_TTL_MS = 8 * 60 * 1000; // 8 minutes
const memoryCache = new Map();

/**
 * Native concurrency-limited mapper (3-4 concurrent requests)
 */
async function pMap(items, fn, concurrency = 3) {
  const results = [];
  const executing = new Set();
  for (const item of items) {
    const p = Promise.resolve()
      .then(() => fn(item))
      .then(
        (res) => {
          executing.delete(p);
          return res;
        },
        (err) => {
          executing.delete(p);
          console.warn('[RecEngine] Task failed:', err);
          return null;
        }
      );
    results.push(p);
    executing.add(p);
    if (executing.size >= concurrency) {
      await Promise.race(executing);
    }
  }
  return Promise.all(results);
}

/**
 * Light shuffle helper with seed interleaving
 */
function lightShuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Cache getters & setters
 */
function getCached(key) {
  if (memoryCache.has(key)) {
    const item = memoryCache.get(key);
    if (Date.now() - item.time < RECS_CACHE_TTL_MS) {
      return item.data;
    }
    memoryCache.delete(key);
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const saved = localStorage.getItem(RECS_CACHE_PREFIX + key);
      if (saved) {
        const item = JSON.parse(saved);
        if (Date.now() - item.time < RECS_CACHE_TTL_MS) {
          memoryCache.set(key, item);
          return item.data;
        }
        localStorage.removeItem(RECS_CACHE_PREFIX + key);
      }
    } catch {
      // ignore
    }
  }
  return null;
}

function setCached(key, data) {
  const item = { time: Date.now(), data };
  memoryCache.set(key, item);
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(RECS_CACHE_PREFIX + key, JSON.stringify(item));
    } catch {
      // Storage full
    }
  }
}

/**
 * Calculate personalized seed score with time decay, completion weight, like bonus, and skip penalty
 */
export function calculateSeedScore(track, now = Date.now()) {
  if (!track) return 0;
  const ageDays = (now - (track.lastPlayed || now)) / (1000 * 60 * 60 * 24);
  const timeDecay = Math.exp(-ageDays / 14); // 14-day half-life decay
  const compFactor = (track.completion || 60) / 100;
  const likeBonus = track.liked ? 6 : 0;
  const skipPenalty = (track.skipCount || 0) * 2.5;

  const baseScore =
    (track.playCount || 1) * compFactor + likeBonus - skipPenalty;
  return baseScore * timeDecay;
}

/**
 * Fallback shelves from FEmusic_home for cold-start users
 */
export async function getColdStartShelves() {
  const cacheKey = 'cold_start_fe_home';
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const data = await callInnerTube('browse', {
      browseId: 'FEmusic_home'
    });

    const sections =
      data.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer
        ?.content?.sectionListRenderer?.contents || [];

    const shelves = [];

    for (const s of sections) {
      const shelf = s.musicCarouselShelfRenderer;
      if (!shelf) continue;

      const title =
        shelf.header?.musicCarouselShelfBasicHeaderRenderer?.title?.runs
          ?.map((r) => r.text)
          .join('') || 'Featured';

      const items = [];
      for (const c of shelf.contents || []) {
        if (c.musicResponsiveListItemRenderer) {
          const parsed = parseMusicItem(c.musicResponsiveListItemRenderer);
          if (parsed) items.push(parsed);
        } else if (c.musicTwoRowItemRenderer) {
          const r = c.musicTwoRowItemRenderer;
          const vid =
            r.navigationEndpoint?.watchEndpoint?.videoId ||
            r.onTap?.watchEndpoint?.videoId;
          const titleText = (r.title?.runs || []).map((x) => x.text).join('');
          const subText = (r.subtitle?.runs || []).map((x) => x.text).join('');
          const thumbs =
            r.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail
              ?.thumbnails || [];
          const artwork =
            thumbs.length > 0 ? thumbs[thumbs.length - 1].url : '';

          if (titleText && vid) {
            items.push({
              id: vid,
              idYoutube: vid,
              title: titleText,
              artist: subText || 'Featured',
              album: 'Featured',
              duration: '3:30',
              artwork,
              isOfficial: true,
              source: 'fe_home'
            });
          }
        }
      }

      if (items.length > 0) {
        shelves.push({
          id: `cold_${shelves.length}`,
          title,
          type: 'tracks',
          items: items.slice(0, 15)
        });
      }
    }

    if (shelves.length > 0) {
      setCached(cacheKey, shelves);
      return shelves;
    }
  } catch (err) {
    console.warn('[RecEngine] Cold start FEmusic_home fetch error:', err);
  }

  return [];
}

/**
 * Generate personalized home recommendations
 */
export async function getHomeRecommendations() {
  const [topTracks, topArtists, recentPlays] = await Promise.all([
    getTopTracks(15),
    getTopArtists(5),
    getRecent(50)
  ]);

  const recentVideoIds = new Set(
    recentPlays.map((t) => t.videoId || t.id || t.idYoutube).filter(Boolean)
  );

  const playedArtistsSet = new Set(
    recentPlays
      .map((t) => (t.artist || '').toLowerCase().trim())
      .filter(Boolean)
  );
  topArtists.forEach((a) => playedArtistsSet.add((a.artist || '').toLowerCase().trim()));

  // 1. Identify weighted seeds
  const now = Date.now();
  const scoredSeeds = topTracks
    .map((track) => ({
      ...track,
      finalScore: calculateSeedScore(track, now)
    }))
    .filter((s) => s.finalScore > 0 && (s.videoId || s.id));

  scoredSeeds.sort((a, b) => b.finalScore - a.finalScore);
  const topSeeds = scoredSeeds.slice(0, 5);

  // Cold Start Detection: No weighted seeds and no recent plays
  if (topSeeds.length === 0 && topArtists.length === 0) {
    const coldShelves = await getColdStartShelves();
    return {
      isColdStart: true,
      shelves: coldShelves
    };
  }

  // Cache key based on top seeds
  const seedKey = topSeeds.map((s) => s.videoId || s.id).join('_');
  const cachedHome = getCached(`home_${seedKey}`);
  if (cachedHome) {
    return cachedHome;
  }

  const shelves = [];

  // 2. Shelf 1: Quick Picks (Radio per top seed, merged, deduped, lightly shuffled, capped at 20)
  try {
    const radioResults = await pMap(
      topSeeds,
      async (seed) => {
        const vid = seed.videoId || seed.id;
        const res = await getRadioQueue(vid);
        return res.tracks || [];
      },
      3
    );

    const mergedPicks = [];
    const seenPicks = new Set();

    // Interleave tracks from seeds
    const maxLen = Math.max(...radioResults.map((r) => r.length), 0);
    for (let i = 0; i < maxLen; i++) {
      for (const list of radioResults) {
        if (i < list.length) {
          const t = list[i];
          const id = t.id || t.idYoutube;
          if (id && !seenPicks.has(id) && !recentVideoIds.has(id)) {
            seenPicks.add(id);
            mergedPicks.push(t);
          }
        }
      }
    }

    const quickPicks = lightShuffle(mergedPicks.slice(0, 30)).slice(0, 20);

    if (quickPicks.length > 0) {
      shelves.push({
        id: 'quick_picks',
        title: 'Quick Picks',
        subtitle: 'Listen again & fresh radio picks',
        type: 'tracks',
        items: quickPicks
      });
    }
  } catch (err) {
    console.warn('[RecEngine] Quick picks generation notice:', err);
  }

  // 3. Shelf 2 & 3: "Because you listened to <Artist>"
  const primaryArtists = topArtists.slice(0, 2);
  for (const a of primaryArtists) {
    if (!a.artist) continue;
    try {
      let artistTracks = [];
      if (a.sampleVideoId) {
        const rad = await getRadioQueue(a.sampleVideoId);
        artistTracks = (rad.tracks || []).filter(
          (t) => (t.artist || '').toLowerCase().includes(a.artist.toLowerCase())
        );
      }

      if (artistTracks.length < 5) {
        const searchRes = await searchSongs(a.artist);
        artistTracks = searchRes.slice(0, 10);
      }

      // Dedupe against recently played
      const filtered = artistTracks.filter(
        (t) => !recentVideoIds.has(t.id || t.idYoutube)
      );

      if (filtered.length >= 3) {
        shelves.push({
          id: `artist_${a.artist.replace(/\s+/g, '_').toLowerCase()}`,
          title: `Because you listened to ${a.artist}`,
          subtitle: `Popular & related tracks by ${a.artist}`,
          type: 'tracks',
          items: filtered.slice(0, 12)
        });
      }
    } catch (err) {
      console.warn(`[RecEngine] Shelf failed for artist ${a.artist}:`, err);
    }
  }

  // 4. Shelf 4: Discover (Tracks from related artists the user has never played)
  try {
    const discoverCandidates = [];
    const seenDiscover = new Set();

    if (topSeeds.length > 0) {
      const seedTrack = topSeeds[0];
      const rad = await getRadioQueue(seedTrack.videoId || seedTrack.id);
      for (const t of rad.tracks || []) {
        const artistName = (t.artist || '').toLowerCase().trim();
        const id = t.id || t.idYoutube;
        if (
          id &&
          artistName &&
          !playedArtistsSet.has(artistName) &&
          !seenDiscover.has(id) &&
          !recentVideoIds.has(id)
        ) {
          seenDiscover.add(id);
          discoverCandidates.push(t);
        }
      }
    }

    if (discoverCandidates.length >= 4) {
      shelves.push({
        id: 'discover_shelf',
        title: 'Discover',
        subtitle: 'New artists based on your taste',
        type: 'tracks',
        items: discoverCandidates.slice(0, 15)
      });
    }
  } catch (err) {
    console.warn('[RecEngine] Discover shelf notice:', err);
  }

  const result = {
    isColdStart: false,
    shelves
  };

  if (shelves.length > 0) {
    setCached(`home_${seedKey}`, result);
  }

  return result;
}

/**
 * Seed an artist directly into history for cold start prompt
 */
export async function seedColdStartArtist(artistName) {
  if (!artistName) return;
  try {
    const tracks = await searchSongs(artistName);
    if (tracks && tracks.length > 0) {
      const top = tracks[0];
      await recordTrackStart(top);
      // Invalidate cache
      memoryCache.clear();
      return top;
    }
  } catch (err) {
    console.warn('[RecEngine] Failed to seed artist:', err);
  }
  return null;
}
