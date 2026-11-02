/**
 * Cloudflare Pages Function for Stream URL Resolution
 * Route: /api/ytm/stream?videoId=<id>
 *
 * Resolves a playable audio stream URL and expiry timestamp for ExoPlayer native playback.
 * Uses Invidious audio stream proxy with itag 140 (128kbps AAC audio/mp4) and local=true,
 * bypassing YouTube's client IP restrictions.
 */

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

  // Active public Invidious proxies with local=true audio streaming
  const streamUrl = `https://yt.chocolatemoo53.com/latest_version?id=${encodeURIComponent(videoId)}&itag=140&local=true`;
  const expiry = Date.now() + 6 * 3600 * 1000; // 6 hours

  return new Response(
    JSON.stringify({
      videoId,
      url: streamUrl,
      expiry,
      source: 'invidious_proxy'
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
