/**
 * YouTube Audio Filtering & Artist Name Extraction Service
 * 
 * Implements:
 * 1. Filtering for official YouTube " - Topic" auto-generated artist channels.
 * 2. Intelligent fallback filtering removing covers, remixes, live versions, lyrics,
 *    reuploads, slowed/sped up, and 8D audio.
 * 3. Inspection of descriptions via videos.list preferring "Provided to YouTube by".
 * 4. Extraction of clean artist names by stripping the " - Topic" suffix.
 */

// Forbidden keywords for fallback video titles
export const NEGATIVE_KEYWORDS = [
  'cover',
  'remix',
  'live',
  'lyrics',
  'reupload',
  'slowed',
  'sped up',
  '8d'
];

// Regex matching negative keywords as whole words or boundaries
const NEGATIVE_REGEX = /(?:\b|_)(cover|remix|live|lyrics?|re-?upload|slowed|sped\s*up|speed\s*up|8d(?:\s*audio)?)(?:\b|_)/i;

/**
 * Checks whether a channel title belongs to an official YouTube Music Topic channel.
 * YouTube auto-generates these channels with the suffix " - Topic".
 * e.g., "The Weeknd - Topic", "Daft Punk - Topic"
 */
export function isTopicChannel(channelTitle) {
  if (!channelTitle || typeof channelTitle !== 'string') return false;
  return channelTitle.trim().toLowerCase().endsWith(' - topic');
}

/**
 * Checks whether a video title contains any negative words
 * (covers, remixes, live performances, lyrics, slowed, sped up, 8D, reuploads).
 */
export function hasNegativeKeywords(title) {
  if (!title || typeof title !== 'string') return false;
  return NEGATIVE_REGEX.test(title);
}

/**
 * Checks whether a video description starts with "Provided to YouTube by".
 * This is YouTube's standard distributor imprint for official album tracks.
 */
export function isProvidedToYouTube(description) {
  if (!description || typeof description !== 'string') return false;
  return description.trim().toLowerCase().startsWith('provided to youtube by');
}

/**
 * Extracts clean artist name for Topic channels by removing the " - Topic" suffix.
 * e.g. "The Weeknd - Topic" -> "The Weeknd"
 */
export function extractArtistName(channelTitle) {
  if (!channelTitle || typeof channelTitle !== 'string') return 'Unknown Artist';
  const clean = channelTitle.trim();
  if (isTopicChannel(clean)) {
    return clean.replace(/\s*-\s*topic$/i, '').trim();
  }
  return clean;
}

/**
 * Cleans video title for non-topic fallback tracks (removing [Official Audio], (Lyrics), etc.)
 */
export function cleanVideoTitle(rawTitle) {
  if (!rawTitle || typeof rawTitle !== 'string') return '';
  return rawTitle
    .replace(/\[\s*(official\s*(audio|music\s*video|video)?)\s*\]/gi, '')
    .replace(/\(\s*(official\s*(audio|music\s*video|video)?)\s*\)/gi, '')
    .replace(/\[\s*(audio|hq|hd)\s*\]/gi, '')
    .replace(/\(\s*(audio|hq|hd)\s*\)/gi, '')
    .trim();
}

/**
 * Filter and prioritize YouTube search results based on Topic channels,
 * negative word filtering, and "Provided to YouTube by" descriptions.
 * 
 * @param {Array} searchItems - Items returned from YouTube search.list
 * @param {Record<string, object>} [videoDetailsMap={}] - Map of videoId -> videos.list details
 * @returns {Array<object>} Filtered and sorted candidate objects
 */
export function filterAndRankCandidates(searchItems, videoDetailsMap = {}) {
  if (!Array.isArray(searchItems) || searchItems.length === 0) {
    return [];
  }

  // 1. Separate Topic channel videos from non-topic videos
  const topicItems = [];
  const nonTopicItems = [];

  for (const item of searchItems) {
    const channelTitle = item.snippet?.channelTitle || '';
    if (isTopicChannel(channelTitle)) {
      topicItems.push(item);
    } else {
      nonTopicItems.push(item);
    }
  }

  // 2. Determine initial candidate pool
  let candidates = [];

  if (topicItems.length > 0) {
    // Priority 1: Keep only Topic channel results
    candidates = topicItems;
  } else {
    // Priority 2: Fall back to non-topic results that don't contain negative words
    const cleanFallbacks = nonTopicItems.filter(
      (item) => !hasNegativeKeywords(item.snippet?.title || '')
    );

    if (cleanFallbacks.length > 0) {
      candidates = cleanFallbacks;
    } else {
      // If every fallback had negative keywords, take the top results as best-effort
      candidates = nonTopicItems.slice(0, 5);
    }
  }

  // 3. Map candidates with full metadata (merging videoDetailsMap if available)
  const mappedCandidates = candidates.map((item) => {
    const vid = item.id?.videoId || item.id;
    const snippet = item.snippet || {};
    const details = videoDetailsMap[vid] || {};

    const rawDescription = details.description || snippet.description || '';
    const rawTitle = snippet.title || details.title || 'Untitled';
    const channelTitle = snippet.channelTitle || details.channelTitle || '';

    const providedByYouTube = isProvidedToYouTube(rawDescription);
    const isTopic = isTopicChannel(channelTitle);

    return {
      videoId: vid,
      rawTitle,
      cleanTitle: isTopic ? rawTitle.trim() : cleanVideoTitle(rawTitle),
      channelTitle,
      extractedArtist: isTopic ? extractArtistName(channelTitle) : channelTitle,
      description: rawDescription,
      duration: details.duration || '3:30',
      artwork:
        details.artwork ||
        snippet.thumbnails?.high?.url ||
        `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
      isTopic,
      isProvidedToYouTube: providedByYouTube
    };
  });

  // 4. Prefer candidates whose description starts with "Provided to YouTube by"
  // Partition: "Provided to YouTube by" videos first, then others
  mappedCandidates.sort((a, b) => {
    if (a.isProvidedToYouTube && !b.isProvidedToYouTube) return -1;
    if (!a.isProvidedToYouTube && b.isProvidedToYouTube) return 1;
    return 0;
  });

  return mappedCandidates;
}
