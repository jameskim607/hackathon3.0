export default async function handler(req, res) {
  try {
    const backendBaseUrl = process.env.BACKEND_URL || 'https://web-production-02449.up.railway.app';

    // Build target URL by removing the leading /api from the current path
    const incomingPath = req.url.replace(/^\/api\/?/, '/');
    const targetUrl = backendBaseUrl.replace(/\/$/, '') + incomingPath;

    // Prepare headers: forward most headers but avoid hop-by-hop headers
    const forwardHeaders = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (!value) continue;
      const lower = key.toLowerCase();
      if ([
        'host', 'connection', 'content-length', 'accept-encoding'
      ].includes(lower)) continue;
      if (Array.isArray(value)) {
        forwardHeaders.set(key, value.join(','));
      } else {
        forwardHeaders.set(key, value);
      }
    }

    // Handle preflight locally to avoid unnecessary upstream call
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    // Build fetch init
    const method = req.method || 'GET';
    let body;
    if (method !== 'GET' && method !== 'HEAD') {
      // Vercel provides the raw body in req; pass it through
      body = req;
    }

    const upstream = await fetch(targetUrl, {
      method,
      headers: forwardHeaders,
      body
    });

    // Copy status and headers
    res.status(upstream.status);
    upstream.headers.forEach((v, k) => {
      // Avoid setting prohibited headers in Node response
      if (!['content-encoding', 'content-length', 'transfer-encoding', 'connection'].includes(k.toLowerCase())) {
        res.setHeader(k, v);
      }
    });

    const buf = Buffer.from(await upstream.arrayBuffer());
    res.send(buf);
  } catch (err) {
    res.status(502).json({
      error: 'Bad Gateway',
      detail: err instanceof Error ? err.message : 'Unknown error'
    });
  }
}


