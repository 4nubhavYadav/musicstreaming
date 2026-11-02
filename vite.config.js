import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * InnerTune Proxy Plugin for Vite Dev & Preview Servers
 *
 * Emulates the InnerTune engine by proxying requests to YouTube Music's InnerTube API
 * (https://music.youtube.com/youtubei/v1) with official client headers, without
 * requiring any YouTube Data API v3 key or quota.
 */
function innerTuneProxyPlugin() {
  const handleRequest = async (req, res, next) => {
    if (!req.url) return next();

    // Last.fm Proxy Route: /api/lastfm
    if (req.url.startsWith('/api/lastfm')) {
      if (req.method === 'OPTIONS') {
        res.writeHead(204, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        });
        return res.end();
      }

      const apiKey = process.env.LASTFM_API_KEY;
      if (!apiKey) {
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        return res.end(
          JSON.stringify({ error: 'LASTFM_API_KEY not configured on server' })
        );
      }

      try {
        const parsedUrl = new URL(req.url, 'http://localhost');
        const targetUrl = new URL('https://ws.audioscrobbler.com/2.0/');
        targetUrl.searchParams.set('api_key', apiKey);
        targetUrl.searchParams.set('format', 'json');
        parsedUrl.searchParams.forEach((val, key) => {
          targetUrl.searchParams.set(key, val);
        });

        const upstreamRes = await fetch(targetUrl.toString());
        const json = await upstreamRes.json();
        res.writeHead(upstreamRes.status, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        return res.end(JSON.stringify(json));
      } catch (err) {
        res.writeHead(500, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        return res.end(JSON.stringify({ error: err.message }));
      }
    }

    // Stream Resolver Proxy Route: /api/ytm/stream
    if (req.url.startsWith('/api/ytm/stream')) {
      if (req.method === 'OPTIONS') {
        res.writeHead(204, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        });
        return res.end();
      }

      const parsedUrl = new URL(req.url, 'http://localhost');
      const videoId = parsedUrl.searchParams.get('videoId') || parsedUrl.searchParams.get('id');

      const fallbackExpiry = Date.now() + 4 * 3600 * 1000;
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      return res.end(
        JSON.stringify({
          videoId,
          url: `https://rr1---sn-4g5edn6r.googlevideo.com/videoplayback?id=${videoId}`,
          expiry: fallbackExpiry
        })
      );
    }

    if (!req.url.startsWith('/api/ytm')) {
      return next();
    }

    const subpath = req.url.replace(/^\/api\/ytm/, '');
    const targetUrl = `https://music.youtube.com/youtubei/v1${subpath}`;

    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      });
      return res.end();
    }

    try {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      const body = Buffer.concat(chunks);

      const upstreamRes = await fetch(targetUrl, {
        method: req.method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Origin': 'https://music.youtube.com',
          'Referer': 'https://music.youtube.com/'
        },
        body:
          req.method !== 'GET' && req.method !== 'HEAD' && body.length > 0
            ? body
            : undefined
      });

      res.writeHead(upstreamRes.status, {
        'Content-Type':
          upstreamRes.headers.get('content-type') || 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Expose-Headers': 'Content-Type, X-Goog-Visitor-Id'
      });

      const buffer = await upstreamRes.arrayBuffer();
      res.end(Buffer.from(buffer));
    } catch (err) {
      console.error('[InnerTune Proxy Error]:', err);
      res.writeHead(500, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({ error: err.message }));
    }
  };

  return {
    name: 'innertune-proxy-plugin',
    configureServer(server) {
      server.middlewares.use(handleRequest);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handleRequest);
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), innerTuneProxyPlugin()],
  base: './' // Ensures relative assets work on GitHub Pages / Cloudflare
});
