/**
 * Cloudflare Pages Function for Last.fm API proxy
 * Route: /api/lastfm
 * Keeps the LASTFM_API_KEY secure on the server side
 */
export async function onRequest(context) {
  const { request, env } = context;
  const apiKey = env.LASTFM_API_KEY || (typeof process !== 'undefined' ? process.env?.LASTFM_API_KEY : '');

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

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'LASTFM_API_KEY not configured on server' }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }

  const url = new URL(request.url);
  const method = url.searchParams.get('method') || 'track.getSimilar';
  const artist = url.searchParams.get('artist') || '';
  const track = url.searchParams.get('track') || '';
  const limit = url.searchParams.get('limit') || '10';

  const targetUrl = new URL('https://ws.audioscrobbler.com/2.0/');
  targetUrl.searchParams.set('api_key', apiKey);
  targetUrl.searchParams.set('format', 'json');
  targetUrl.searchParams.set('method', method);
  targetUrl.searchParams.set('limit', limit);
  targetUrl.searchParams.set('autocorrect', '1');
  if (artist) targetUrl.searchParams.set('artist', artist);
  if (track) targetUrl.searchParams.set('track', track);

  try {
    const res = await fetch(targetUrl.toString());
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || 'Last.fm request failed' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
}
