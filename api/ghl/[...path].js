/**
 * Vercel Serverless Function — GHL API Proxy
 *
 * Route: /api/ghl/* (catch-all, configured in vercel.json)
 *
 * Forwards requests from the browser to the GHL REST API server-side.
 * The GHL_API_KEY environment variable must be set in your Vercel project settings,
 * OR the frontend can pass it via the X-GHL-Api-Key header.
 */

const GHL_BASE = 'https://rest.gohighlevel.com/v1';

export default async function handler(req, res) {
  // ── CORS headers ─────────────────────────────────────────────────────────
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-GHL-Api-Key');

  // Preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ── Resolve the GHL path ──────────────────────────────────────────────────
  // req.url on Vercel looks like: /api/ghl/contacts/  or  /api/ghl/pipelines/
  // We strip everything up to and including /api/ghl
  const ghlPath = req.url.replace(/^\/api\/ghl/, '') || '/';

  // ── API Key ───────────────────────────────────────────────────────────────
  const apiKey = process.env.GHL_API_KEY || req.headers['x-ghl-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      error: 'Missing GHL API key. Set GHL_API_KEY in Vercel environment variables.'
    });
  }

  // ── Build upstream request ────────────────────────────────────────────────
  const targetUrl = `${GHL_BASE}${ghlPath}`;

  const fetchOptions = {
    method: req.method,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  };

  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
    fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  }

  // ── Proxy to GHL ──────────────────────────────────────────────────────────
  try {
    const upstream = await fetch(targetUrl, fetchOptions);
    const text = await upstream.text();

    res
      .status(upstream.status)
      .setHeader('Content-Type', 'application/json')
      .send(text);
  } catch (err) {
    console.error('[GHL Proxy]', err);
    res.status(502).json({ error: 'Proxy could not reach GHL', details: err.message });
  }
}
