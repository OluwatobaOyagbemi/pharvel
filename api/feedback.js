// "Report a problem" from users. Stores what was shown and why it was reported, with no identity and at most 300
// characters of comment. Reviewed with `npm run feedback`; triage rules are in docs/INCIDENT_RESPONSE.md.
import { store, day, anon, secondsToMidnightUTC } from '../lib/store.js';

const REASONS = ['wrong-severity', 'missed-interaction', 'wrong-medicine', 'unclear', 'quote-wrong', 'other'];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  let b;
  try { b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body && typeof req.body === 'object' ? req.body : {}); }
  catch { return res.status(400).json({ error: 'The request was not valid JSON.' }); }
  if (typeof b !== 'object' || b === null || Array.isArray(b)) return res.status(400).json({ error: 'Send a JSON object.' });
  // At most 10 reports per visitor per day and 3 per minute, so flooding cannot push genuine reports out.
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim() || 'unknown';
  const who = await anon(ip);
  try {
    const perDay = await store.incr(`fbrl:${day()}:${who}`, secondsToMidnightUTC() + 60);
    const perMin = await store.incr(`fbrl:m:${Math.floor(Date.now() / 60000)}:${who}`, 120);
    if (perDay > 10 || perMin > 3) return res.status(429).json({ error: 'Thank you — you have sent the maximum number of reports for now.' });
  } catch {}
  const reason = REASONS.includes(b.reason) ? b.reason : 'other';
  const item = {
    t: new Date().toISOString(), reason,
    pair: String(typeof b.pair === 'string' ? b.pair : '').slice(0, 120), level: String(typeof b.level === 'string' ? b.level : '').slice(0, 40),
    engine: String(typeof b.engine === 'string' ? b.engine : '').slice(0, 20), engineVersion: Number.isFinite(+b.engineVersion) ? +b.engineVersion : null,
    sources: Array.isArray(b.sources) ? b.sources.filter(x => typeof x === 'string').slice(0, 6).map(x => x.slice(0, 160)) : [],
    comment: String(typeof b.comment === 'string' ? b.comment : '').replace(/\s+/g, ' ').slice(0, 300),
  };
  try {
    await store.lpush('fb:items', item, 5000);
    await store.incr('st:feedback');
    await store.incr(`st:feedback:${reason}`);
  } catch {
    return res.status(502).json({ error: 'Could not save the report. Please try again.' });
  }
  res.status(200).json({ ok: true });
}
