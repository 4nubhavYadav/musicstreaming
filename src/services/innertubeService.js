/**
 * InnerTube Service (YouTube Music Engine)
 *
 * Inspired by and modeled after InnerTune (z-huang/InnerTune).
 * Uses YouTube Music's InnerTube API (WEB_REMIX client) directly.
 *
 * Advantages over YouTube Data API v3:
 * 1. Zero API keys required (no Google Cloud setup, no API key expiration).
 * 2. Zero quota limits (no 10,000 units/day bottleneck or 100 units/search cost).
 * 3. Pure official music catalogue (studio recordings, album covers, exact artists & durations).
 * 4. Real-time search suggestions (autocomplete queries).
 * 5. Instant and resilient playback.
 */

export const INNERTUBE_CLIENT = {
  clientName: 'WEB_REMIX',
  clientVersion: '1.20231204.01.00',
  hl: 'en',
  gl: 'US'
};

const STORAGE_VISITOR_DATA_KEY = 'sora_innertube_visitor_data';
let cachedVisitorData = null;

export function getVisitorData() {
  if (cachedVisitorData) return cachedVisitorData;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      cachedVisitorData = localStorage.getItem(STORAGE_VISITOR_DATA_KEY) || null;
    } catch {
      // ignore
    }
  }
  return cachedVisitorData;
}

export function setVisitorData(visitorData) {
  if (!visitorData || typeof visitorData !== 'string') return;
  cachedVisitorData = visitorData;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(STORAGE_VISITOR_DATA_KEY, visitorData);
    } catch {
      // ignore
    }
  }
}

export function createClientContext() {
  const visitorData = getVisitorData();
  return {
    client: {
      ...INNERTUBE_CLIENT,
      ...(visitorData ? { visitorData } : {})
    }
  };
}

// Filter constant for Songs in YouTube Music search
export const SONGS_FILTER_PARAMS = 'Eg-KAQwIARAAGAAgACgAMABqChAGEAMQBBAJEAo%3D';

const STORAGE_CACHE_PREFIX = 'sora_innertube_cache_';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const memoryCache = new Map();

/**
 * Format run text array
 */
export function parseRuns(runs) {
  if (!runs || !Array.isArray(runs)) return '';
  return runs.map((r) => r.text || '').join('');
}

/**
 * Format seconds into mm:ss or hh:mm:ss
 */
export function formatSecondsToDuration(seconds) {
  const sec = parseInt(seconds, 10);
  if (isNaN(sec) || sec <= 0) return '3:30';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Parse a YouTube Music item renderer (musicResponsiveListItemRenderer) into our song model
 */
export function parseMusicItem(renderer) {
  if (!renderer) return null;

  const col0Runs =
    renderer.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs;
  const title = parseRuns(col0Runs).trim();

  // Extract videoId from either play button overlay or first column endpoint
  const videoId =
    renderer.overlay?.musicItemThumbnailOverlayRenderer?.content
      ?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint?.videoId ||
    col0Runs?.[0]?.navigationEndpoint?.watchEndpoint?.videoId;

  if (!videoId) return null;

  const col1Runs =
    renderer.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text
      ?.runs || [];

  let artist = '';
  let album = '';
  let duration = '';

  // 1. Look for artist by browseEndpoint MUSIC_PAGE_TYPE_ARTIST
  const artistRun = col1Runs.find(
    (r) =>
      r.navigationEndpoint?.browseEndpoint
        ?.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig
        ?.pageType === 'MUSIC_PAGE_TYPE_ARTIST'
  );
  if (artistRun && artistRun.text) {
    artist = artistRun.text.trim();
  }

  // 2. Look for album by browseEndpoint MUSIC_PAGE_TYPE_ALBUM
  const albumRun = col1Runs.find(
    (r) =>
      r.navigationEndpoint?.browseEndpoint
        ?.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig
        ?.pageType === 'MUSIC_PAGE_TYPE_ALBUM'
  );
  if (albumRun && albumRun.text) {
    album = albumRun.text.trim();
  }

  // 3. Look for duration (mm:ss or hh:mm:ss)
  const durationRun = col1Runs.find((r) =>
    /^\d+:\d+(?::\d+)?$/.test((r.text || '').trim())
  );
  if (durationRun && durationRun.text) {
    duration = durationRun.text.trim();
  }

  // 4. Fallback for artist / album from text runs if browseEndpoint not present
  if (!artist && col1Runs.length > 0) {
    const validRuns = col1Runs.filter((r) => {
      const txt = (r.text || '').trim();
      return (
        txt &&
        txt !== '•' &&
        txt.toLowerCase() !== 'song' &&
        txt.toLowerCase() !== 'video' &&
        !/^\d+:\d+$/.test(txt) &&
        !txt.includes('plays') &&
        !txt.includes('views')
      );
    });
    if (validRuns.length > 0) {
      artist = validRuns[0].text.trim();
      if (!album && validRuns.length > 1) {
        album = validRuns[1].text.trim();
      }
    }
  }

  // 5. Artwork: grab highest resolution thumbnail and resize to 544x544
  const thumbs =
    renderer.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
  let artwork = '';
  if (thumbs.length > 0) {
    const rawUrl = thumbs[thumbs.length - 1].url;
    // Replace lower resolution dimension params with high-res 544x544
    artwork = rawUrl.replace(/=w\d+-h\d+.*$/, '=w544-h544-l90-rj');
  }
  if (!artwork) {
    artwork = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  }

  return {
    id: videoId,
    idYoutube: videoId,
    title: title || 'Unknown Title',
    artist: artist || 'Unknown Artist',
    album: album || 'Official Release',
    duration: duration || '3:30',
    artwork,
    isOfficial: true,
    source: 'innertube'
  };
}

/**
 * Cache getters and setters
 */
function getCached(key) {
  if (memoryCache.has(key)) {
    const item = memoryCache.get(key);
    if (Date.now() - item.time < CACHE_TTL_MS) {
      return item.data;
    }
    memoryCache.delete(key);
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const saved = localStorage.getItem(STORAGE_CACHE_PREFIX + key);
      if (saved) {
        const item = JSON.parse(saved);
        if (Date.now() - item.time < CACHE_TTL_MS) {
          memoryCache.set(key, item);
          return item.data;
        }
        localStorage.removeItem(STORAGE_CACHE_PREFIX + key);
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
      localStorage.setItem(STORAGE_CACHE_PREFIX + key, JSON.stringify(item));
    } catch {
      // Storage full or unavailable
    }
  }
}

/**
 * Call InnerTube API endpoint
 */
export async function callInnerTube(endpoint, payload) {
  const proxyUrl = `/api/ytm/${endpoint.replace(/^\//, '')}`;

  const response = await fetch(proxyUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      context: createClientContext(),
      ...payload
    })
  });

  if (!response.ok) {
    let msg = `HTTP ${response.status}`;
    try {
      const err = await response.json();
      msg = err.message || msg;
    } catch {
      // ignore
    }
    throw new Error(`InnerTube request failed: ${msg}`);
  }

  const headerVisitorId = response.headers.get('x-goog-visitor-id');
  if (headerVisitorId) {
    setVisitorData(headerVisitorId);
  }

  const data = await response.json();
  if (data?.responseContext?.visitorData) {
    setVisitorData(data.responseContext.visitorData);
  }

  return data;
}

/**
 * Search Songs using InnerTune's engine
 *
 * @param {string} query - Track or artist name
 * @returns {Promise<Array<object>>} List of resolved song tracks
 */
export async function searchSongs(query) {
  if (!query || !query.trim()) return [];

  const cleanQuery = query.trim();
  const cacheKey = `search_${cleanQuery.toLowerCase()}`;
  const cached = getCached(cacheKey);
  if (cached && Array.isArray(cached) && cached.length > 0) {
    return cached;
  }

  try {
    // 1. Primary: InnerTube Search with Songs filter
    const data = await callInnerTube('search', {
      query: cleanQuery,
      params: SONGS_FILTER_PARAMS
    });

    const contents =
      data.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer
        ?.content?.sectionListRenderer?.contents || [];

    const tracks = [];

    // Parse musicShelfRenderer
    for (const section of contents) {
      const shelf = section.musicShelfRenderer;
      if (shelf && Array.isArray(shelf.contents)) {
        for (const item of shelf.contents) {
          const parsed = parseMusicItem(item.musicResponsiveListItemRenderer);
          if (parsed) {
            tracks.push(parsed);
          }
        }
      }
    }

    // 2. Fallback: If Songs filter returned 0 items, try general search
    if (tracks.length === 0) {
      const fallbackData = await callInnerTube('search', {
        query: cleanQuery
      });

      const fallbackContents =
        fallbackData.contents?.tabbedSearchResultsRenderer?.tabs?.[0]
          ?.tabRenderer?.content?.sectionListRenderer?.contents || [];

      for (const section of fallbackContents) {
        // Top card if present
        if (section.musicCardShelfRenderer) {
          const card = section.musicCardShelfRenderer;
          const vid =
            card.onTap?.watchEndpoint?.videoId ||
            card.buttons?.[0]?.musicPlayButtonRenderer?.playNavigationEndpoint
              ?.watchEndpoint?.videoId;

          if (vid) {
            const title = parseRuns(card.title?.runs) || cleanQuery;
            const subRuns = card.subtitle?.runs || [];
            const artist =
              subRuns.find(
                (r) =>
                  r.text &&
                  r.text.trim() !== '•' &&
                  r.text.toLowerCase() !== 'video' &&
                  r.text.toLowerCase() !== 'song'
              )?.text || 'Artist';

            tracks.push({
              id: vid,
              idYoutube: vid,
              title,
              artist,
              album: 'Official Release',
              duration: '3:30',
              artwork:
                card.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails
                  ?.slice(-1)[0]?.url ||
                `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
              isOfficial: true,
              source: 'innertube'
            });
          }
        }

        // Shelf items
        if (section.musicShelfRenderer?.contents) {
          for (const item of section.musicShelfRenderer.contents) {
            const parsed = parseMusicItem(item.musicResponsiveListItemRenderer);
            if (parsed) tracks.push(parsed);
          }
        }

        // itemSectionRenderer
        if (section.itemSectionRenderer?.contents) {
          for (const item of section.itemSectionRenderer.contents) {
            const parsed = parseMusicItem(item.musicResponsiveListItemRenderer);
            if (parsed) tracks.push(parsed);
          }
        }
      }
    }

    // Deduplicate by videoId
    const seen = new Set();
    const uniqueTracks = tracks.filter((t) => {
      const id = t.id || t.idYoutube;
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    if (uniqueTracks.length > 0) {
      setCached(cacheKey, uniqueTracks);
    }

    return uniqueTracks;
  } catch (err) {
    console.error('[InnerTune] Search failed:', err);
    throw err;
  }
}

/**
 * Get real-time search suggestions (autocomplete queries)
 *
 * @param {string} input - What user has typed so far
 * @returns {Promise<Array<string>>}
 */
export async function getSearchSuggestions(input) {
  if (!input || !input.trim() || input.trim().length < 2) {
    return [];
  }

  const cleanInput = input.trim();
  const cacheKey = `suggest_${cleanInput.toLowerCase()}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  // 1. Try YouTube Music InnerTube suggestions endpoint
  try {
    const data = await callInnerTube('music/get_search_suggestions', {
      input: cleanInput
    });

    const suggestions = [];
    const contents =
      data.contents?.[0]?.searchSuggestionsSectionRenderer?.contents || [];

    for (const item of contents) {
      const runs = item.searchSuggestionRenderer?.suggestion?.runs || [];
      const text = runs.map((r) => r.text).join('').trim();
      if (text && !suggestions.includes(text)) {
        suggestions.push(text);
      }
    }

    if (suggestions.length > 0) {
      setCached(cacheKey, suggestions.slice(0, 8));
      return suggestions.slice(0, 8);
    }
  } catch (err) {
    console.warn('[InnerTune] InnerTube suggestions failed, trying fallback:', err);
  }

  // 2. Fallback: Google SuggestQueries
  try {
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(cleanInput)}`;
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json?.[1])) {
        const list = json[1].slice(0, 8);
        setCached(cacheKey, list);
        return list;
      }
    }
  } catch {
    // ignore
  }

  return [];
}

/**
 * Resolve direct YouTube URL or 11-char ID into complete track metadata using InnerTube player
 *
 * @param {string} input - YouTube link or ID
 * @returns {Promise<object | null>}
 */
export async function resolveDirectTrack(input) {
  if (!input) return null;
  const clean = input.trim();

  let videoId = null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) {
    videoId = clean;
  } else {
    const match = clean.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
    );
    if (match) videoId = match[1];
  }

  if (!videoId) return null;

  try {
    const data = await callInnerTube('player', { videoId });
    const vd = data.videoDetails || {};

    const thumbs = vd.thumbnail?.thumbnails || [];
    let artwork = '';
    if (thumbs.length > 0) {
      artwork = thumbs[thumbs.length - 1].url.replace(/=w\d+-h\d+.*$/, '=w544-h544-l90-rj');
    }
    if (!artwork) {
      artwork = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    }

    return {
      id: videoId,
      idYoutube: videoId,
      title: vd.title || 'Direct Stream',
      artist: vd.author || 'YouTube Audio',
      album: 'Official Release',
      duration: formatSecondsToDuration(vd.lengthSeconds),
      artwork,
      isOfficial: true,
      source: 'innertube'
    };
  } catch (err) {
    console.warn('[InnerTune] resolveDirectTrack error:', err);
    // Minimal fallback track
    return {
      id: videoId,
      idYoutube: videoId,
      title: 'YouTube Audio',
      artist: 'Official Audio',
      album: 'Direct Stream',
      duration: '3:30',
      artwork: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      isOfficial: true,
      source: 'innertube'
    };
  }
}

/**
 * Parse a playlistPanelVideoRenderer item from YouTube Music radio / watch next
 */
export function parsePlaylistPanelItem(p) {
  if (!p || !p.videoId) return null;
  const title = parseRuns(p.title?.runs).trim();
  if (!title) return null;

  const bylineRuns = p.longBylineText?.runs || [];
  let artist = '';
  let album = '';

  const artistRun = bylineRuns.find(
    (r) =>
      r.navigationEndpoint?.browseEndpoint
        ?.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig
        ?.pageType === 'MUSIC_PAGE_TYPE_ARTIST'
  );
  if (artistRun && artistRun.text) {
    artist = artistRun.text.trim();
  }

  const albumRun = bylineRuns.find(
    (r) =>
      r.navigationEndpoint?.browseEndpoint
        ?.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig
        ?.pageType === 'MUSIC_PAGE_TYPE_ALBUM'
  );
  if (albumRun && albumRun.text) {
    album = albumRun.text.trim();
  }

  if (!artist && bylineRuns.length > 0) {
    const valid = bylineRuns.filter(
      (r) =>
        r.text &&
        r.text.trim() !== '•' &&
        !/^\d{4}$/.test(r.text.trim()) &&
        !/^\d+:\d+$/.test(r.text.trim())
    );
    if (valid.length > 0) {
      artist = valid[0].text.trim();
      if (!album && valid.length > 1) {
        album = valid[1].text.trim();
      }
    }
  }

  const duration = parseRuns(p.lengthText?.runs).trim() || '3:30';

  const thumbs = p.thumbnail?.thumbnails || [];
  let artwork = '';
  if (thumbs.length > 0) {
    artwork = thumbs[thumbs.length - 1].url.replace(
      /=w\d+-h\d+.*$/,
      '=w544-h544-l90-rj'
    );
  }
  if (!artwork) {
    artwork = `https://i.ytimg.com/vi/${p.videoId}/hqdefault.jpg`;
  }

  return {
    id: p.videoId,
    idYoutube: p.videoId,
    title,
    artist: artist || 'Unknown Artist',
    album: album || 'Official Release',
    duration,
    artwork,
    isOfficial: true,
    source: 'innertube_radio'
  };
}

/**
 * Get algorithmic radio queue with continuation token & related browseId
 * Calls 'next' with videoId and playlistId: 'RDAMVM' + videoId
 */
export async function getRadioQueue(videoId) {
  if (!videoId) return { tracks: [], continuation: null, relatedBrowseId: null };

  try {
    const data = await callInnerTube('next', {
      videoId,
      playlistId: 'RDAMVM' + videoId
    });

    const tabs =
      data.contents?.singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer
        ?.watchNextTabbedResultsRenderer?.tabs || [];

    const playlist =
      tabs[0]?.tabRenderer?.content?.musicQueueRenderer?.content
        ?.playlistPanelRenderer;

    const rawContents = playlist?.contents || [];
    const tracks = [];

    for (const item of rawContents) {
      if (item.playlistPanelVideoRenderer) {
        const parsed = parsePlaylistPanelItem(item.playlistPanelVideoRenderer);
        if (parsed && parsed.id !== videoId) {
          tracks.push(parsed);
        }
      }
    }

    const continuation =
      playlist?.continuations?.[0]?.nextRadioContinuationData?.continuation ||
      playlist?.continuations?.[0]?.nextContinuationData?.continuation ||
      rawContents.slice(-1)[0]?.continuationItemRenderer?.continuationEndpoint
        ?.continuationCommand?.token ||
      null;

    const relatedTab = tabs.find((t) =>
      t.tabRenderer?.endpoint?.browseEndpoint?.browseId?.startsWith('MPTRt_')
    );
    const relatedBrowseId =
      relatedTab?.tabRenderer?.endpoint?.browseEndpoint?.browseId || null;

    return {
      tracks,
      continuation,
      relatedBrowseId
    };
  } catch (err) {
    console.warn('[InnerTune] getRadioQueue error:', err);
    return { tracks: [], continuation: null, relatedBrowseId: null };
  }
}

/**
 * Fetch continuation items for radio queue when fewer than 3 tracks remain
 */
export async function getNextContinuation(continuationToken) {
  if (!continuationToken) return { tracks: [], continuation: null };

  try {
    const data = await callInnerTube('next', {
      continuation: continuationToken
    });

    const continuationContents =
      data.continuationContents?.playlistPanelContinuation;
    const rawContents = continuationContents?.contents || [];
    const tracks = [];

    for (const item of rawContents) {
      if (item.playlistPanelVideoRenderer) {
        const parsed = parsePlaylistPanelItem(item.playlistPanelVideoRenderer);
        if (parsed) tracks.push(parsed);
      }
    }

    const nextToken =
      continuationContents?.continuations?.[0]?.nextRadioContinuationData
        ?.continuation ||
      continuationContents?.continuations?.[0]?.nextContinuationData
        ?.continuation ||
      rawContents.slice(-1)[0]?.continuationItemRenderer?.continuationEndpoint
        ?.continuationCommand?.token ||
      null;

    return {
      tracks,
      continuation: nextToken
    };
  } catch (err) {
    console.warn('[InnerTune] getNextContinuation error:', err);
    return { tracks: [], continuation: null };
  }
}

/**
 * Fetch and parse related tab content (browseId starting with MPTRt_)
 */
export async function getRelated(relatedBrowseId) {
  if (!relatedBrowseId) return { sections: [] };

  try {
    const data = await callInnerTube('browse', {
      browseId: relatedBrowseId
    });

    const sections = [];
    const rawSections = data.contents?.sectionListRenderer?.contents || [];

    for (const s of rawSections) {
      const shelf = s.musicCarouselShelfRenderer;
      if (!shelf) continue;

      const title =
        shelf.header?.musicCarouselShelfBasicHeaderRenderer?.title?.runs
          ?.map((r) => r.text)
          .join('') || '';

      const items = [];
      const contents = shelf.contents || [];

      for (const item of contents) {
        if (item.musicResponsiveListItemRenderer) {
          const parsed = parseMusicItem(item.musicResponsiveListItemRenderer);
          if (parsed) items.push(parsed);
        } else if (item.musicTwoRowItemRenderer) {
          const r = item.musicTwoRowItemRenderer;
          const itemTitle = parseRuns(r.title?.runs);
          const itemSubtitle = parseRuns(r.subtitle?.runs);
          const vid =
            r.navigationEndpoint?.watchEndpoint?.videoId ||
            r.onTap?.watchEndpoint?.videoId;

          const thumbs =
            r.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
            [];
          const artwork =
            thumbs.length > 0 ? thumbs[thumbs.length - 1].url : '';

          if (itemTitle) {
            items.push({
              id: vid || null,
              idYoutube: vid || null,
              title: itemTitle,
              artist: itemSubtitle || '',
              artwork,
              isPlayable: Boolean(vid),
              type: vid ? 'song' : 'collection'
            });
          }
        }
      }

      if (title && items.length > 0) {
        sections.push({
          title,
          items
        });
      }
    }

    return { sections };
  } catch (err) {
    console.warn('[InnerTune] getRelated error:', err);
    return { sections: [] };
  }
}

/**
 * Backward-compatible helper for getting up-next tracks
 */
export async function getUpNextTracks(videoId) {
  const result = await getRadioQueue(videoId);
  return result.tracks;
}

/**
 * Resolves an alternate playable YouTube video ID for tracks with embed restrictions (Error 150/101)
 * Searches general catalog without the strict Songs filter to find official music video / lyric video alternatives.
 */
export async function resolveAlternatePlayableId(track) {
  if (!track || !track.title) return null;

  const currentId = track.idYoutube || track.id;
  const cacheKey = `alt_${currentId}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const cleanTitle = (track.title || '').replace(/\(.*?\)|\/.*$/g, '').trim();
  const cleanArtist = (track.artist || '').replace(/\(.*?\)|\/.*$/g, '').trim();
  const query = `${cleanTitle} ${cleanArtist}`.trim();

  try {
    const data = await callInnerTube('search', { query });
    const contents =
      data.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer
        ?.content?.sectionListRenderer?.contents || [];

    for (const section of contents) {
      // 1. Check card shelf
      if (section.musicCardShelfRenderer) {
        const card = section.musicCardShelfRenderer;
        const vid =
          card.onTap?.watchEndpoint?.videoId ||
          card.buttons?.[0]?.musicPlayButtonRenderer?.playNavigationEndpoint
            ?.watchEndpoint?.videoId;
        if (vid && vid !== currentId) {
          setCached(cacheKey, vid);
          return vid;
        }
      }

      // 2. Check general music shelf
      if (section.musicShelfRenderer?.contents) {
        for (const item of section.musicShelfRenderer.contents) {
          const r = item.musicResponsiveListItemRenderer;
          const vid =
            r?.overlay?.musicItemThumbnailOverlayRenderer?.content
              ?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint
              ?.videoId ||
            r?.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text
              ?.runs?.[0]?.navigationEndpoint?.watchEndpoint?.videoId;

          if (vid && vid !== currentId) {
            setCached(cacheKey, vid);
            return vid;
          }
        }
      }
    }
  } catch (err) {
    console.warn('[InnerTune] resolveAlternatePlayableId notice:', err.message);
  }

  return null;
}

