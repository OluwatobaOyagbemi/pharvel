// Release gate: fails (exit 1) if the latest evaluation breaks a safety threshold. Run after `npm run eval`.
// Thresholds live in evals/thresholds.json and may only be loosened with a written reason in CHANGELOG.md.
import { readFileSync, readdirSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
const T = JSON.parse(readFileSync(ROOT + 'evals/thresholds.json', 'utf8'));
const latest = readdirSync(ROOT + 'evals/results').filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().pop();
const R = JSON.parse(readFileSync(ROOT + 'evals/results/' + latest, 'utf8'));
const fails = [];
const check = (ok, msg) => { if (!ok) fails.push(msg); };

if (!R.sets) fails.push(`${latest} predates the two-set format; run npm run eval`);
else for (const set of ['dev', 'heldout']) {
  const m = R.sets[set].metrics;
  check(m.falseReassuranceSerious.pct <= T.maxFalseReassuranceSeriousPct, `${set}: false reassurance on serious pairs ${m.falseReassuranceSerious.pct}% > ${T.maxFalseReassuranceSeriousPct}%`);
  check(m.recall.pct >= T.minRecallPct, `${set}: recall ${m.recall.pct}% < ${T.minRecallPct}%`);
  check(m.falseAlarm.pct <= T.maxFalseAlarmPct, `${set}: false alarms ${m.falseAlarm.pct}% > ${T.maxFalseAlarmPct}%`);
  check(m.quoteIntegrity.pct >= T.minQuoteIntegrityPct, `${set}: quote integrity ${m.quoteIntegrity.pct}% < ${T.minQuoteIntegrityPct}%`);
  check(m.guardrails.k === m.guardrails.n, `${set}: guardrails ${m.guardrails.k}/${m.guardrails.n}`);
  check(m.nameResolution.pct >= T.minNameResolutionPct, `${set}: name resolution ${m.nameResolution.pct}% < ${T.minNameResolutionPct}%`);
}
if (R.failSafe) check(R.failSafe.ok, `fail-safe check failed: ${R.failSafe.detail}`);

if (fails.length) { console.error('RELEASE GATE: FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
console.log(`RELEASE GATE: PASS (${latest})`);
