/**
 * Cloudflare Pages Function for InnerTune Proxy
 * Route: /api/ytm/*
 */
export async function onRequest(context) {
  const { request, params } = context;
  const path = Array.isArray(params.path)
    ? params.path.join('/')
    : params.path || '';
  const url = new URL(request.url);
  const targetUrl = `https://music.youtube.com/youtubei/v1/${path}${url.search}`;

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }

  const reqHeaders = new Headers(request.headers);
  reqHeaders.set('Origin', 'https://music.youtube.com');
  reqHeaders.set('Referer', 'https://music.youtube.com/');
  reqHeaders.set(
    'User-Agent',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  const body =
    request.method !== 'GET' && request.method !== 'HEAD'
      ? await request.arrayBuffer()
      : undefined;

  const res = await fetch(targetUrl, {
    method: request.method,
    headers: reqHeaders,
    body
  });

  const responseHeaders = new Headers(res.headers);
  responseHeaders.set('Access-Control-Allow-Origin', '*');
  responseHeaders.set(
    'Access-Control-Expose-Headers',
    'Content-Type, X-Goog-Visitor-Id'
  );

  return new Response(res.body, {
    status: res.status,
    headers: responseHeaders
  });
}
