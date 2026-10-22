// Release gate: fails (exit 1) if the latest evaluation breaks a safety threshold. Run after `npm run eval`.
// Thresholds live in evals/thresholds.json and may only be loosened with a written reason in CHANGELOG.md.
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const ROOT = new URL('..', import.meta.url).pathname;
const T = JSON.parse(readFileSync(ROOT + 'evals/thresholds.json', 'utf8'));
const latest = readdirSync(ROOT + 'evals/results').filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().pop();
const R = JSON.parse(readFileSync(ROOT + 'evals/results/' + latest, 'utf8'));
const fails = [];
const check = (ok, msg) => { if (!ok) fails.push(msg); };

// The results must have been produced by the code that is about to be released.
const h = createHash('sha256');
for (const dir of ['lib', 'api', 'evals']) for (const f of readdirSync(ROOT + dir).filter(f => /\.(js|mjs|json)$/.test(f) && f !== 'history.json').sort()) h.update(f + readFileSync(ROOT + dir + '/' + f));
h.update(readFileSync(ROOT + 'public/names.json'));
const hash = h.digest('hex').slice(0, 16);
check(R.codeHash === hash, `results in ${latest} were produced by different code (${R.codeHash || 'none'} vs ${hash}); run npm run eval`);
if (R.redteam) for (const set of ['dev', 'heldout']) check(R.redteam[set].missed.length === 0, `red-team ${set}: ${R.redteam[set].missed.length} emergency message(s) missed`);
if (R.redteam) check(R.redteam.dev.falseAlarms.length === 0, `red-team dev: ${R.redteam.dev.falseAlarms.length} false alarm(s)`);
if (R.redteam) for (const set of ['symptoms_dev', 'symptoms_heldout']) {
  check(!!R.redteam[set], `symptom red-team set ${set} missing from results`);
  if (R.redteam[set]) check(R.redteam[set].missed.length === 0, `${set}: ${R.redteam[set].missed.length} symptom message(s) without the right response: ${R.redteam[set].missed.map(r => r.q).join('; ')}`);
}
if (R.redteam?.symptoms_dev) check(R.redteam.symptoms_dev.falseAlarms.length === 0, `symptoms_dev: side-effect questions treated as emergencies`);

if (!R.sets) fails.push(`${latest} predates the two-set format; run npm run eval`);
else for (const set of ['dev', 'heldout']) {
  const m = R.sets[set].metrics;
  check(m.falseReassuranceSerious.pct <= T.maxFalseReassuranceSeriousPct, `${set}: false reassurance on serious pairs ${m.falseReassuranceSerious.pct}% > ${T.maxFalseReassuranceSeriousPct}%`);
  check(m.recall.pct >= T.minRecallPct, `${set}: recall ${m.recall.pct}% < ${T.minRecallPct}%`);
  check(m.falseAlarm.pct <= T.maxFalseAlarmPct, `${set}: false alarms ${m.falseAlarm.pct}% > ${T.maxFalseAlarmPct}%`);
  check(m.quoteIntegrity.pct >= T.minQuoteIntegrityPct, `${set}: quote integrity ${m.quoteIntegrity.pct}% < ${T.minQuoteIntegrityPct}%`);
  check(m.guardrails.k === m.guardrails.n, `${set}: guardrails ${m.guardrails.k}/${m.guardrails.n}`);
  check(m.documentedRatedSerious.pct <= T.maxDocumentedRatedSeriousPct, `${set}: over-rating ${m.documentedRatedSerious.pct}% > ${T.maxDocumentedRatedSeriousPct}%`);
  check(m.nameResolution.pct >= T.minNameResolutionPct, `${set}: name resolution ${m.nameResolution.pct}% < ${T.minNameResolutionPct}%`);
}
if (R.failSafe) check(R.failSafe.ok, `fail-safe check failed: ${R.failSafe.detail}`);

if (fails.length) { console.error('RELEASE GATE: FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
console.log(`RELEASE GATE: PASS (${latest})`);
