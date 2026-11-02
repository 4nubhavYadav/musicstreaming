/**
 * Listening History Store (Local IndexedDB)
 *
 * Persists user playback interactions:
 * - videoId, title, artist, artistId, album, artwork, duration
 * - playCount, lastPlayed timestamp
 * - completion percentage
 * - skipped status (skipped = true if < 30% listened before advancing)
 * - liked status
 *
 * Exposes:
 * - recordTrackStart(track)
 * - recordTrackProgress(track, completionPercent, isSkipped)
 * - recordTrackLike(trackId, isLiked, trackMeta)
 * - getRecent(limit)
 * - getTopTracks(limit)
 * - getTopArtists(limit)
 */

const DB_NAME = 'sora_music_history_db';
const DB_VERSION = 1;
const STORE_TRACKS = 'tracks';

let dbPromise = null;

function getDB() {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }

  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_TRACKS)) {
        const store = db.createObjectStore(STORE_TRACKS, { keyPath: 'videoId' });
        store.createIndex('lastPlayed', 'lastPlayed', { unique: false });
        store.createIndex('playCount', 'playCount', { unique: false });
        store.createIndex('artist', 'artist', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      console.warn('[HistoryStore] IndexedDB open error:', request.error);
      resolve(null);
    };
  });

  return dbPromise;
}

/**
 * Record initial track play start
 */
export async function recordTrackStart(track) {
  if (!track) return;
  const videoId = track.id || track.idYoutube;
  if (!videoId) return;

  const db = await getDB();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_TRACKS, 'readwrite');
      const store = tx.objectStore(STORE_TRACKS);
      const getReq = store.get(videoId);

      getReq.onsuccess = () => {
        const existing = getReq.result || {};
        const record = {
          videoId,
          title: track.title || existing.title || 'Unknown Title',
          artist: track.artist || existing.artist || 'Unknown Artist',
          artistId: track.artistId || existing.artistId || null,
          album: track.album || existing.album || null,
          artwork: track.artwork || existing.artwork || null,
          duration: track.duration || existing.duration || null,
          playCount: (existing.playCount || 0) + 1,
          lastPlayed: Date.now(),
          completion: existing.completion || 0,
          skipped: false,
          skipCount: existing.skipCount || 0,
          liked: existing.liked || false
        };

        store.put(record);
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * Record playback outcome (called on song end or manual user skip)
 * @param {object} track
 * @param {number} completionPercent - 0 to 100
 * @param {boolean} wasSkipped - true if skipped before completion
 */
export async function recordTrackProgress(track, completionPercent, wasSkipped) {
  if (!track) return;
  const videoId = track.id || track.idYoutube;
  if (!videoId) return;

  const db = await getDB();
  if (!db) return;

  const isEarlySkip = wasSkipped && completionPercent < 30;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_TRACKS, 'readwrite');
      const store = tx.objectStore(STORE_TRACKS);
      const getReq = store.get(videoId);

      getReq.onsuccess = () => {
        const existing = getReq.result;
        if (!existing) {
          resolve();
          return;
        }

        existing.completion = Math.max(0, Math.min(100, Math.round(completionPercent)));
        existing.skipped = isEarlySkip;
        if (isEarlySkip) {
          existing.skipCount = (existing.skipCount || 0) + 1;
        }

        store.put(existing);
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * Update liked status in history store
 */
export async function recordTrackLike(trackId, isLiked, trackMeta = null) {
  if (!trackId) return;
  const db = await getDB();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_TRACKS, 'readwrite');
      const store = tx.objectStore(STORE_TRACKS);
      const getReq = store.get(trackId);

      getReq.onsuccess = () => {
        const existing = getReq.result;
        if (existing) {
          existing.liked = Boolean(isLiked);
          store.put(existing);
        } else if (trackMeta) {
          const record = {
            videoId: trackId,
            title: trackMeta.title || 'Unknown Title',
            artist: trackMeta.artist || 'Unknown Artist',
            artistId: trackMeta.artistId || null,
            album: trackMeta.album || null,
            artwork: trackMeta.artwork || null,
            duration: trackMeta.duration || null,
            playCount: 1,
            lastPlayed: Date.now(),
            completion: 100,
            skipped: false,
            skipCount: 0,
            liked: Boolean(isLiked)
          };
          store.put(record);
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * Get recent tracks sorted by lastPlayed descending
 */
export async function getRecent(limit = 50) {
  const db = await getDB();
  if (!db) return [];

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_TRACKS, 'readonly');
      const store = tx.objectStore(STORE_TRACKS);
      const index = store.index('lastPlayed');
      const req = index.openCursor(null, 'prev');
      const results = [];

      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor && results.length < limit) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

/**
 * Get top tracks weighted by playCount, completion, and liked status
 */
export async function getTopTracks(limit = 20) {
  const db = await getDB();
  if (!db) return [];

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_TRACKS, 'readonly');
      const store = tx.objectStore(STORE_TRACKS);
      const req = store.getAll();

      req.onsuccess = () => {
        const all = req.result || [];
        // Weight calculation: playCount * (completion / 100) + (liked ? 5 : 0) - (skipCount * 2)
        const scored = all.map((item) => {
          const compFactor = (item.completion || 50) / 100;
          const likeBonus = item.liked ? 5 : 0;
          const skipPenalty = (item.skipCount || 0) * 2;
          const score = (item.playCount || 1) * compFactor + likeBonus - skipPenalty;
          return { ...item, score };
        });

        scored.sort((a, b) => b.score - a.score);
        resolve(scored.slice(0, limit));
      };

      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

/**
 * Get top artists aggregated from listening history
 */
export async function getTopArtists(limit = 10) {
  const db = await getDB();
  if (!db) return [];

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_TRACKS, 'readonly');
      const store = tx.objectStore(STORE_TRACKS);
      const req = store.getAll();

      req.onsuccess = () => {
        const all = req.result || [];
        const artistMap = new Map();

        for (const item of all) {
          const artist = (item.artist || '').trim();
          if (!artist || artist === 'Unknown Artist') continue;

          const current = artistMap.get(artist) || {
            artist,
            artistId: item.artistId || null,
            playCount: 0,
            skipCount: 0,
            likedCount: 0,
            sampleArtwork: item.artwork || null,
            sampleVideoId: item.videoId
          };

          current.playCount += item.playCount || 1;
          current.skipCount += item.skipCount || 0;
          if (item.liked) current.likedCount += 1;
          if (!current.sampleArtwork && item.artwork) {
            current.sampleArtwork = item.artwork;
          }

          artistMap.set(artist, current);
        }

        const list = Array.from(artistMap.values()).map((a) => {
          const score = a.playCount * 1.5 + a.likedCount * 4 - a.skipCount * 2;
          return { ...a, score };
        });

        list.sort((a, b) => b.score - a.score);
        resolve(list.slice(0, limit));
      };

      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}
