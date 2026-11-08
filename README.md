# Google OSS

A static search frontend for Surge and a serverless search API for Vercel.

## Structure
- `public/` — deploy this folder to Surge as `google.oss`
- `api/search.js` — deploy from the repository root to Vercel
- `public/200.html` — Surge SPA fallback for `/search?q=...`

## Setup
1. Create a Serper account and obtain an API key.
2. Import this repository into Vercel.
3. In Vercel Project Settings → Environment Variables, add:
   - Name: `SERPER_API_KEY`
   - Value: your Serper API key
4. Redeploy.
5. Add `gle.qzz.io` to Vercel Project Settings → Domains. Configure the exact DNS records Vercel displays. If domain verification fails, use the project's `vercel.app` hostname instead.
6. Edit `public/script.js` and set `API_BASE` to the verified API hostname.
7. Deploy the `public` directory to Surge:
   `surge ./public google.oss`

## Notes
- The browser address bar stays on `google.oss/search?q=...`. The API request runs in the background.
- `gl: "in"` and `hl: "en"` configure Indian English search. Change them in `api/search.js` if desired.
- Keep the Serper key in Vercel Environment Variables. Never place it in frontend files or commit it to Git.
- The API is publicly callable. Add rate limiting / abuse protection before sharing it widely.
- Search quota depends on the Serper plan. This project does not provide unlimited search.
- `.oss` is an OpenNIC namespace. Visitors need a resolver that can resolve it; public DNS users may not be able to open it.
- Publicly trusted HTTPS for an OpenNIC-only name may not be available from ordinary certificate authorities. Verify HTTPS on your actual domain before relying on browser `fetch()`.
