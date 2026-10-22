// Small key-value store used for the answer cache, daily rate limits and usage counters.
// Uses Upstash / Vercel KV over its REST API when the project has one connected (KV_REST_API_URL);
// otherwise falls back to process memory, which is fine locally but resets on every cold start in production.

const URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(...cmd) {
  const r = await fetch(URL, { method: 'POST', headers: { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' }, body: JSON.stringify(cmd), signal: AbortSignal.timeout(4000) });
  if (!r.ok) throw new Error(`store responded ${r.status}`);
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}

// ---- memory fallback ----
const mem = new Map(); // key -> { v, exp }
const now = () => Date.now();
function live(k) { const e = mem.get(k); if (e && e.exp && e.exp < now()) { mem.delete(k); return null; } return e || null; }
function keep(k, v, ttl) { mem.set(k, { v, exp: ttl ? now() + ttl * 1000 : 0 }); return v; }

const memory = {
  kind: 'memory',
  async get(k) { return live(k)?.v ?? null; },
  async set(k, v, ttl) { keep(k, v, ttl); },
  async incr(k, ttl, by = 1) { const e = live(k); const v = (e?.v || 0) + by; mem.set(k, { v, exp: e ? e.exp : ttl ? now() + ttl * 1000 : 0 }); return v; },
  async zincr(k, member) { const z = live(k)?.v || keep(k, new Map(), 0); z.set(member, (z.get(member) || 0) + 1); },
  async ztop(k, n) { return [...(live(k)?.v || new Map())].sort((a, b) => b[1] - a[1]).slice(0, n); },
  async addUnique(k, member, ttl) { const s = live(k)?.v || keep(k, new Set(), ttl); s.add(member); },
  async countUnique(k) { return live(k)?.v?.size || 0; },
  async mget(keys) { return Promise.all(keys.map(k => this.get(k))); },
  async lpush(k, v, max) { const l = live(k)?.v || keep(k, [], 0); l.unshift(v); l.length = Math.min(l.length, max); },
  async lrange(k, n) { return (live(k)?.v || []).slice(0, n); },
};

const remote = {
  kind: 'redis',
  async get(k) { const v = await redis('GET', k); try { return v == null ? null : JSON.parse(v); } catch { return v; } },
  async set(k, v, ttl) { await (ttl ? redis('SET', k, JSON.stringify(v), 'EX', ttl) : redis('SET', k, JSON.stringify(v))); },
  async incr(k, ttl, by = 1) { const v = await redis('INCRBY', k, by); if (v === by && ttl) await redis('EXPIRE', k, ttl); return v; },
  async zincr(k, member) { await redis('ZINCRBY', k, 1, member); },
  async ztop(k, n) { const flat = await redis('ZREVRANGE', k, 0, n - 1, 'WITHSCORES'); const out = []; for (let i = 0; i < flat.length; i += 2) out.push([flat[i], Number(flat[i + 1])]); return out; },
  async addUnique(k, member, ttl) { const added = await redis('PFADD', k, member); if (added && ttl) await redis('EXPIRE', k, ttl); },
  async countUnique(k) { return Number(await redis('PFCOUNT', k)) || 0; },
  async mget(keys) { if (!keys.length) return []; const vs = await redis('MGET', ...keys); return vs.map(v => { try { return v == null ? null : JSON.parse(v); } catch { return v; } }); },
  async lpush(k, v, max) { await redis('LPUSH', k, JSON.stringify(v)); await redis('LTRIM', k, 0, max - 1); },
  async lrange(k, n) { return (await redis('LRANGE', k, 0, n - 1)).map(v => JSON.parse(v)); },
};

export const store = URL && TOKEN ? remote : memory;

export const day = (d = new Date()) => d.toISOString().slice(0, 10);
export const secondsToMidnightUTC = () => { const d = new Date(); return Math.ceil((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1) - d.getTime()) / 1000); };

// Visitor id for daily limits: HMAC-SHA-256 of the day and the IP with a secret key (HASH_SECRET in the
// environment). Without the secret the hash cannot be reversed by trying every IP address, and because the day is
// part of the input, ids cannot be linked across days. Falls back to an unkeyed hash only in local development.
export async function anon(ip, d = day()) {
  const secret = process.env.HASH_SECRET || 'local-development-only';
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(d + '|' + ip));
  return [...new Uint8Array(sig)].slice(0, 12).map(b => b.toString(16).padStart(2, '0')).join('');
}
