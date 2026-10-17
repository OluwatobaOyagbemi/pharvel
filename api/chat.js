import { analyze } from '../lib/engine.js';
import { emergency, dosing, injection, scope, distress, DOSING_TEXT, HELP_TEXT } from '../lib/guardrails.js';
import { store, day, secondsToMidnightUTC, anon } from '../lib/store.js';

const FREE = (process.env.FREE_CHECKS_PER_DAY != null && process.env.FREE_CHECKS_PER_DAY !== '' ? Number(process.env.FREE_CHECKS_PER_DAY) : 20); // per visitor per UTC day
const CACHE_TTL = 7 * 24 * 3600; // same medicines -> same labels; reuse the finished result for a week

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST a JSON body: { "message": "warfarin and ibuprofen" }' });
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const message = String(body.message || '').slice(0, 500);
  const keep = Array.isArray(body.keep) ? body.keep.slice(0, 6).map(k => String(k).slice(0, 60)) : [];
  if (!message.trim() && !keep.length) return res.status(400).json({ error: 'Type the medicines you want checked.' });
  res.setHeader('Cache-Control', 'no-store');

  // Guardrail 1: emergencies are answered first, before any lookup, and never count against the free allowance.
  const sos = emergency(message);
  if (sos) {
    store.incr('st:guard:emergency').catch(() => {});
    return res.status(200).json({ mode: 'emergency', emergency: sos.types, answer: sos.answer, drugs: [], pairs: [], findings: [], guardrails: ['emergency'] });
  }

  // Daily free allowance per visitor. The address is hashed before it touches the store; if the store is down, nobody is blocked.
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim() || 'unknown';
  const who = await anon(ip), today = day(), resetsIn = secondsToMidnightUTC();
  let used = 0;
  try { used = await store.incr(`rl:${today}:${who}`, resetsIn + 60); } catch {}
  const free = { limit: FREE, remaining: Math.max(0, FREE - used), resetsIn };
  if (FREE === 0) return res.status(503).json({ error: 'Checks are paused while a problem is being fixed. Please try again later, and ask a pharmacist if you need an answer now.', free });
  if (used > FREE) {
    const h = Math.ceil(resetsIn / 3600);
    return res.status(429).json({ error: `You have used today's ${FREE} free checks. They reset in about ${h} hour${h === 1 ? '' : 's'}.`, free });
  }

  const t0 = Date.now();
  const cache = { get: k => store.get('ans:' + k), set: (k, v) => store.set('ans:' + k, v, CACHE_TTL) };
  try {
    const result = await analyze({ message, keep }, fetch, process.env, cache);
    result.free = free;
    // Guardrails 2 and 3: dose questions get a fixed reply on top of the check; injection attempts are only flagged,
    // because user text never reaches anything that follows instructions except as tagged data.
    result.guardrails = [];
    if (dosing(message)) { result.guardrails.push('dosing'); result.dosingNotice = DOSING_TEXT; result.answer = DOSING_TEXT + '\n' + result.answer; }
    if (injection(message)) result.guardrails.push('injection');
    if (distress(message)) {
      result.guardrails.push('help');
      if (!result.drugs.length) { result.mode = 'help'; result.answer = HELP_TEXT.urgent + '\n' + HELP_TEXT.how; result.helpText = HELP_TEXT; }
      else { result.helpNotice = HELP_TEXT.note; result.answer = HELP_TEXT.note + '\n' + result.answer; }
    }
    const sc = scope(message);
    if (sc) { result.guardrails.push('scope'); result.scopeNotice = sc.notice; result.answer = sc.notice + '\n' + result.answer; }
    for (const g of result.guardrails) store.incr('st:guard:' + g).catch(() => {});
    if (result.mode) store.incr('st:mode:' + result.mode).catch(() => {});
    record(result, who, today).catch(() => {});
    console.log(JSON.stringify({ t: new Date().toISOString(), drugs: result.drugs.map(d => d.name), pairs: result.pairs.length, mode: result.mode, guardrails: result.guardrails, rejected: result.rejected, cached: !!result.cached, ms: Date.now() - t0 }));
    res.status(200).json(result);
  } catch (e) {
    res.status(502).json({ error: `A data source did not answer (${e.message}). Try again in a moment.` });
  }
}

// Aggregate counters for /api/stats: totals, per-day, distinct visitors (hashed), and which pairs people ask about.
async function record(result, who, today) {
  if (!result.drugs.length) return;
  await Promise.all([
    store.incr('st:total'),
    store.incr(`st:day:${today}`, 40 * 86400),
    store.addUnique(`st:v:${today}`, who, 2 * 86400),
    result.cached ? store.incr('st:cached') : null,
    result.mode === 'llm' ? store.incr('st:llm') : null,
    ...result.pairs.map(p => store.zincr('st:pairs', [p.a, p.b].sort().join(' + '))),
  ].filter(Boolean));
}
