// Public usage counters: aggregate numbers only, never queries tied to a person.
import { store, day } from '../lib/store.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const days = [...Array(7)].map((_, i) => day(new Date(Date.now() - i * 864e5))).reverse();
    const [total, llm, cached, ...perDay] = await store.mget(['st:total', 'st:llm', 'st:cached', ...days.map(d => `st:day:${d}`)]);
    const [visitorsToday, topPairs] = await Promise.all([store.countUnique(`st:v:${day()}`), store.ztop('st:pairs', 10)]);
    const G = ['emergency', 'dosing', 'scope', 'injection'], M = ['extractive', 'llm', 'llm-rejected'], F = ['wrong-severity', 'missed-interaction', 'wrong-medicine', 'quote-wrong', 'unclear', 'other'];
    const vals = await store.mget([...G.map(g => 'st:guard:' + g), ...M.map(m => 'st:mode:' + m), 'st:feedback', ...F.map(f => 'st:feedback:' + f)]);
    const guardrails = Object.fromEntries(G.map((g, i) => [g, +vals[i] || 0])), modes = Object.fromEntries(M.map((m, i) => [m, +vals[G.length + i] || 0]));
    const feedback = { total: +vals[G.length + M.length] || 0, byReason: Object.fromEntries(F.map((f, i) => [f, +vals[G.length + M.length + 1 + i] || 0])) };
    res.status(200).json({
      store: store.kind,
      note: store.kind === 'memory' ? 'No database connected: counters reset whenever the function restarts.' : undefined,
      checks: { total: +total || 0, today: +perDay.at(-1) || 0, last7: days.map((d, i) => ({ day: d, checks: +perDay[i] || 0 })) },
      visitorsToday, answeredFromCache: +cached || 0, aiExplanations: +llm || 0,
      topPairs: topPairs.map(([pair, checks]) => ({ pair, checks })), guardrails, modes, feedback,
      freeChecksPerDay: (process.env.FREE_CHECKS_PER_DAY != null && process.env.FREE_CHECKS_PER_DAY !== '' ? Number(process.env.FREE_CHECKS_PER_DAY) : 20),
    });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
}
