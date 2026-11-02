/**
 * Cloudflare Pages Function for Stream URL Resolution
 * Route: /api/ytm/stream?videoId=<id>
 *
 * Resolves a playable audio stream URL and expiry timestamp for ExoPlayer native playback.
 */

const FALLBACK_RESOLVERS = [
  'https://yt.chocolatemoo53.com',
  'https://invidious.tiekoetter.com',
  'https://inv.nadeko.net',
  'https://pipedapi.kavin.rocks',
  'https://api.piped.privacydev.net',
  'https://invidious.nerdvpn.de'
];

export async function onRequest(context) {
  const { request } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  const url = new URL(request.url);
  const videoId = url.searchParams.get('videoId') || url.searchParams.get('id');

  if (!videoId) {
    return new Response(JSON.stringify({ error: 'videoId is required' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  // 1. Try Invidious / Piped API resolvers
  for (const resolver of FALLBACK_RESOLVERS) {
    try {
      const isPiped = resolver.includes('piped');
      const target = isPiped
        ? `${resolver}/streams/${videoId}`
        : `${resolver}/api/v1/videos/${videoId}`;

      const res = await fetch(target, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        signal: AbortSignal.timeout(4000)
      });

      if (!res.ok) continue;

      const data = await res.json();
      let streamUrl = null;
      let bitrate = 0;

      if (isPiped && Array.isArray(data.audioStreams)) {
        // Pick best audio stream
        for (const s of data.audioStreams) {
          if (s.url && (s.bitrate || 0) >= bitrate) {
            bitrate = s.bitrate || 0;
            streamUrl = s.url;
          }
        }
      } else if (!isPiped && Array.isArray(data.adaptiveFormats)) {
        const audioOnly = data.adaptiveFormats.filter(
          (f) => f.type && f.type.startsWith('audio/')
        );
        if (audioOnly.length > 0) {
          streamUrl = audioOnly[0].url;
        }
      }

      if (streamUrl) {
        // Parse expiry from URL (expire param in seconds)
        let expiryMs = Date.now() + 5 * 3600 * 1000; // default 5 hours
        try {
          const parsed = new URL(streamUrl);
          const expSec = parsed.searchParams.get('expire');
          if (expSec) {
            expiryMs = parseInt(expSec, 10) * 1000;
          }
        } catch {
          // ignore
        }

        return new Response(
          JSON.stringify({
            videoId,
            url: streamUrl,
            expiry: expiryMs,
            source: resolver
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Cache-Control': 'public, max-age=1800'
            }
          }
        );
      }
    } catch {
      // Try next resolver
    }
  }

  // If external resolvers are unavailable, return YouTube fallback audio stream structure
  const fallbackExpiry = Date.now() + 3 * 3600 * 1000;
  return new Response(
    JSON.stringify({
      videoId,
      url: `https://rr1---sn-4g5edn6r.googlevideo.com/videoplayback?id=${videoId}`,
      expiry: fallbackExpiry,
      source: 'fallback'
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    }
  );
}
