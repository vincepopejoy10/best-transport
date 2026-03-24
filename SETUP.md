# Lead Pipeline CRM — Backend Setup

The CRM calls GHL's API. Browsers block those calls directly (CORS). This backend sits in the middle: the browser talks to this server, this server talks to GHL.

---

## Option A — Run Locally (Recommended for Testing)

**Requirements:** Node.js 18+

```bash
cd crm-backend
npm install
cp .env.example .env   # optionally add your GHL_API_KEY
npm start
```

Then open **http://localhost:3001** in your browser. The CRM loads from the server, and all GHL calls go through the proxy automatically.

> **Note:** If you open `lead_pipeline_crm.html` directly as a file (not through the server), change `GHL_BASE` in the HTML to `http://localhost:3001/api/ghl`.

---

## Option B — Deploy to Vercel (Recommended for Production)

**Requirements:** [Vercel CLI](https://vercel.com/docs/cli) or a Vercel account connected to GitHub.

1. Push the `crm-backend/` folder to a GitHub repo.
2. Import the repo in [vercel.com](https://vercel.com).
3. In **Settings → Environment Variables**, add:
   - `GHL_API_KEY` → your GHL API key (optional — if omitted, the key entered in the UI is used)
4. Deploy. Vercel gives you a URL like `https://your-project.vercel.app`.
5. Put `index.html` (the CRM frontend) in the `public/` folder — it's already there.

Or deploy from the CLI:

```bash
cd crm-backend
npx vercel
```

---

## How the Proxy Works

| Frontend sends | Proxy receives | Proxy forwards to GHL |
|---|---|---|
| `GET /api/ghl/pipelines/` | Path + X-GHL-Api-Key header | `GET https://rest.gohighlevel.com/v1/pipelines/` with `Authorization: Bearer <key>` |
| `POST /api/ghl/contacts/` | Path + body + key | `POST https://rest.gohighlevel.com/v1/contacts/` with body + auth |
| `PUT /api/ghl/opportunities/:id/status` | Path + body + key | `PUT https://...` with body + auth |

Every GHL endpoint the CRM uses is covered — no endpoint-specific config needed.

---

## GHL Endpoints Used by the CRM

- `GET /pipelines/` — load pipelines on connect
- `POST /contacts/` — create contact when a lead is pushed
- `POST /opportunities/` — create opportunity for each lead
- `PUT /opportunities/:id/status` — update stage when lead moves
- `GET /contacts/:id/notes/` — fetch existing notes
- `GET /opportunities/:id` — refresh opportunity data
- `POST /notes/` — log activity notes

---

## File Structure

```
crm-backend/
├── server.js              ← Express proxy (local dev)
├── package.json
├── .env.example           ← copy to .env
├── vercel.json            ← Vercel routing config
├── api/
│   └── ghl/
│       └── [...path].js   ← Vercel serverless function (production)
└── public/
    └── index.html         ← The CRM frontend (copy of lead_pipeline_crm.html)
```
