// Local dev server: `npm run dev` (live APIs) or `npm run dev:mock` (offline test data).
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import chat from '../api/chat.js';
import stats from '../api/stats.js';
import feedback from '../api/feedback.js';
if (process.env.MOCK) globalThis.fetch = (await import('./mock.mjs')).mockFetch;
// Minimal Vercel-style response helpers so the real handlers run unchanged.
const shim = res => { res.status = c => { res.statusCode = c; return res; }; res.json = o => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(o)); }; return res; };
http.createServer(async (req, res) => {
  if (req.url.startsWith('/api/chat')) {
    let b = ''; for await (const c of req) b += c;
    try { req.body = JSON.parse(b || '{}'); } catch { req.body = {}; }
    return chat(req, shim(res));
  }
  if (req.url.startsWith('/api/stats')) return stats(req, shim(res));
  if (req.url.startsWith('/api/feedback')) { let b = ''; for await (const c of req) b += c; try { req.body = JSON.parse(b || '{}'); } catch { req.body = {}; } return feedback(req, shim(res)); }
  const path = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const types = { html: 'text/html', js: 'text/javascript', svg: 'image/svg+xml', json: 'application/json' };
  let body; try { body = await readFile(new URL('../public' + path, import.meta.url)); } catch { return res.writeHead(404).end('not found'); }
  res.writeHead(200, { 'content-type': types[path.split('.').pop()] || 'text/plain' }).end(body);
}).listen(3000, () => console.log('http://localhost:3000'));
