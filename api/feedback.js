// "Report a problem" from users. Stores what was shown and why it was reported, with no identity and at most 300
// characters of comment. Reviewed with `npm run feedback`; triage rules are in docs/INCIDENT_RESPONSE.md.
import { store, day } from '../lib/store.js';

const REASONS = ['wrong-severity', 'missed-interaction', 'wrong-medicine', 'unclear', 'quote-wrong', 'other'];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const reason = REASONS.includes(b.reason) ? b.reason : 'other';
  const item = {
    t: new Date().toISOString(), reason,
    pair: String(b.pair || '').slice(0, 120), level: String(b.level || '').slice(0, 40), engine: String(b.engine || '').slice(0, 20),
    comment: String(b.comment || '').replace(/\s+/g, ' ').slice(0, 300),
  };
  try {
    await store.lpush('fb:items', item, 500);
    await store.incr('st:feedback');
    await store.incr(`st:feedback:${reason}`);
  } catch {
    return res.status(502).json({ error: 'Could not save the report. Please try again.' });
  }
  res.status(200).json({ ok: true });
}
