/**
 * Lead Pipeline CRM — Local Dev Proxy Server
 *
 * Forwards all /api/ghl/* requests to the GHL REST API server-side,
 * so the browser never touches GHL directly (no CORS issues).
 *
 * Usage:
 *   npm install
 *   npm start          (or npm run dev for auto-restart on file changes)
 *
 * Then open: http://localhost:3001
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const GHL_BASE = 'https://services.leadconnectorhq.com';

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json());

// Serve the frontend from the parent directory (or a /public subfolder)
app.use(express.static(path.join(__dirname, 'public')));

// ─── GHL Proxy ───────────────────────────────────────────────────────────────
//
// The frontend sends requests to /api/ghl/<path> with the GHL API key
// in the X-GHL-Api-Key header. This handler strips that header, re-adds it
// as a proper Bearer token, and forwards the request to GHL.
//
// Alternatively, set GHL_API_KEY in your .env to skip the header entirely.

app.all('/api/ghl/*', async (req, res) => {
  // Strip the /api/ghl prefix to get the real GHL path
  const ghlPath = req.path.replace(/^\/api\/ghl/, '') || '/';

  // API key: prefer env var, fall back to header sent by the frontend
  const apiKey = process.env.GHL_API_KEY || req.headers['x-ghl-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      error: 'No GHL API key. Set GHL_API_KEY in .env or pass X-GHL-Api-Key header.'
    });
  }

  // Rebuild query string if present
  const qs = req.url.includes('?') ? '?' + req.url.split('?').slice(1).join('?') : '';
  const targetUrl = `${GHL_BASE}${ghlPath}${qs}`;

  // Build upstream request options
  const fetchOptions = {
    method: req.method,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Version': '2021-07-28',
    },
  };

  // Attach body for mutating methods
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body && Object.keys(req.body).length > 0) {
    fetchOptions.body = JSON.stringify(req.body);
  }

  try {
    const upstream = await fetch(targetUrl, fetchOptions);
    const text = await upstream.text();

    // Mirror the status code and return the raw GHL response
    res
      .status(upstream.status)
      .set('Content-Type', 'application/json')
      .send(text);
  } catch (err) {
    console.error('[GHL Proxy Error]', err.message);
    res.status(502).json({ error: 'Proxy failed to reach GHL API', details: err.message });
  }
});

// ─── Fallback: serve the CRM for any non-API route ───────────────────────────

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n  Lead Pipeline CRM backend running`);
  console.log(`  Local:  http://localhost:${PORT}`);
  console.log(`  Proxy:  http://localhost:${PORT}/api/ghl/*  →  ${GHL_BASE}/* (v2)\n`);
});
