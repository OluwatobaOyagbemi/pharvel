// Evaluation harness. Runs the production pipeline on two sets and scores them separately:
//   evals/pairs.json    development set: used to find and fix bugs (results are optimistic by construction)
//   evals/heldout.json  held-out set: frozen before any run, never used for tuning (the honest number)
// Usage:
//   npm run eval                      replay recorded API responses where present (reproducible)
//   npm run eval -- --fresh           re-record from the live APIs
//   npm run eval -- --label "change"  add a dated row per set to evals/history.json
// Outputs: EVALS.md, evals/results/<date>.json, evals/review/review-<date>.csv (sheet for clinical review).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { analyze, setEvalMode } from '../lib/engine.js';
import { emergency, dosing, injection, distress } from '../lib/guardrails.js';

const ROOT = new URL('..', import.meta.url).pathname;
const CACHE = ROOT + 'evals/.cache/';
const FRESH = process.argv.includes('--fresh');
const li = process.argv.indexOf('--label'), LABEL = li > 0 ? process.argv[li + 1] : null;
for (const d of ['evals/.cache', 'evals/results', 'evals/review']) mkdirSync(ROOT + d, { recursive: true });

// ---------- record / replay ----------
let live = 0, replayed = 0;
async function cachedFetch(url, opts) {
  const file = CACHE + createHash('sha1').update(String(url)).digest('hex') + '.json';
  if (!FRESH && existsSync(file)) { replayed++; const c = JSON.parse(readFileSync(file, 'utf8')); return new Response(c.body, { status: c.status, headers: { 'content-type': 'application/json' } }); }
  live++;
  const r = await fetch(url, opts);
  const body = await r.text();
  if (r.status < 500 && r.status !== 429) writeFileSync(file, JSON.stringify({ status: r.status, body }));
  return new Response(body, { status: r.status, headers: { 'content-type': 'application/json' } });
}

// ---------- statistics ----------
// Wilson score interval: well-behaved for small samples and for 0% or 100%.
function wilson(k, n, z = 1.96) {
  if (!n) return [0, 0];
  const p = k / n, d = 1 + z * z / n, c = p + z * z / (2 * n), m = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n));
  return [Math.max(0, (c - m) / d), Math.min(1, (c + m) / d)];
}
const rate = (k, n) => { const [lo, hi] = wilson(k, n); return { k, n, pct: n ? +(100 * k / n).toFixed(1) : 0, lo: +(100 * lo).toFixed(1), hi: +(100 * hi).toFixed(1) }; };
const fmt = r => `${r.pct}% (${r.k}/${r.n}; 95% CI ${r.lo}–${r.hi}%)`;

// Flesch reading ease (higher = easier; 60–70 is plain English). Syllables estimated by vowel groups.
const syllables = w => { w = w.toLowerCase().replace(/[^a-z]/g, ''); if (w.length <= 3) return 1; w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, ''); return Math.max(1, (w.match(/[aeiouy]{1,2}/g) || []).length); };
function flesch(text) {
  const sents = Math.max(1, (text.match(/[.!?]+(\s|$)/g) || []).length), words = text.match(/[A-Za-z][A-Za-z'-]*/g) || [];
  if (!words.length) return null;
  const syl = words.reduce((s, w) => s + syllables(w), 0);
  return 206.835 - 1.015 * (words.length / sents) - 84.6 * (syl / words.length);
}

// ---------- scoring rules ----------
const FLAG_LEVELS = ['contraindicated', 'major', 'moderate', 'class'];
const SERIOUS_LEVELS = ['contraindicated', 'major'];
const norm = s => String(s || '').replace(/\s+/g, ' ').toLowerCase();
// Flagged: a label warning, or FDA's CYP/transporter table predicts a strong or moderate effect. Adverse-event report
// counts never count as a flag (co-reporting is not evidence of an interaction).
const flagged = p => FLAG_LEVELS.includes(p.level) || (p.mechanism || []).some(m => m.strength !== 'weak');
const ratedSerious = p => SERIOUS_LEVELS.includes(p.level) || (p.mechanism || []).some(m => m.strength === 'strong' && m.role === 'inhibitor' && m.substrate === 'sensitive');

function verifyQuotes(result) {
  let checked = 0, verified = 0; const bad = [];
  for (const p of result.pairs) for (const e of p.evidence) {
    if (!e.quote || !e.sectionText) continue;
    checked++;
    const src = norm(e.sectionText);
    const ok = e.quote.split('…').map(x => norm(x).trim()).filter(x => x.length > 3).every(frag => src.includes(frag));
    if (ok) verified++; else bad.push(`${p.a} + ${p.b}: ${e.quote.slice(0, 80)}…`);
  }
  return { checked, verified, bad };
}

async function pool(items, n, fn) {
  const out = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); } }));
  return out;
}

async function runCase(c) {
  const s = Date.now();
  let r, error = null;
  try { r = await analyze({ message: c.q }, cachedFetch, { SKIP_FAERS: process.env.SKIP_FAERS }); } catch (e) { error = e.message; r = { drugs: [], pairs: [], findings: [] }; }
  const names = r.drugs.map(d => d.name);
  const resolved = c.drugs.every(d => names.includes(d));
  const nameOf = disp => r.drugs.find(d => d.display === disp)?.name;
  const target = r.pairs.filter(p => { const a = nameOf(p.a), b = nameOf(p.b); return (c.drugs.includes(a) && c.drugs.includes(b)) || (c.drugs.length === 1 && (c.drugs.includes(a) || c.drugs.includes(b))); });
  const any = target.length ? target : r.pairs;
  const tf = r.findings.filter(f => any.some(p => p.a === f.a && p.b === f.b));
  return {
    id: c.id, q: c.q, expect: c.expect, edge: c.edge || null, basis: c.basis, resolved, names, error, ms: Date.now() - s,
    levels: any.map(p => `${p.a}+${p.b}:${p.level}${(p.mechanism || []).length ? `/${p.mechanism[0].enzyme}-${p.mechanism[0].strength}` : ''}`),
    flagged: any.some(flagged), serious: any.some(ratedSerious),
    bySource: { label: any.some(p => FLAG_LEVELS.includes(p.level)), mechanism: any.some(p => (p.mechanism || []).some(m => m.strength !== 'weak')) },
    quotes: verifyQuotes(r),
    summaries: tf.filter(f => FLAG_LEVELS.includes(f.level)).map(f => f.summary || ''),
    output: tf.map(f => ({ pair: `${f.a} + ${f.b}`, label: f.label, summary: f.summary || '', quote: f.quote || '', source: f.from ? `${f.from} label, ${f.section}` : '' })),
  };
}

function score(rows, guardCases) {
  const pos = rows.filter(r => r.expect !== 'none'), ser = rows.filter(r => r.expect === 'serious'), doc = rows.filter(r => r.expect === 'documented'), neg = rows.filter(r => r.expect === 'none');
  const n = (xs, f) => xs.filter(f).length;
  const qc = rows.reduce((s, r) => s + r.quotes.checked, 0), qv = rows.reduce((s, r) => s + r.quotes.verified, 0);
  const fre = rows.flatMap(r => r.summaries).map(flesch).filter(x => x != null);
  const guard = guardCases.map(g => {
    const got = emergency(g.q) ? 'emergency' : dosing(g.q) ? 'dosing' : injection(g.q) ? 'injection' : distress(g.q) ? 'help' : 'none';
    return { ...g, got, ok: got === g.expect };
  });
  return {
    counts: { cases: rows.length, serious: ser.length, documented: doc.length, negatives: neg.length },
    falseReassuranceSerious: rate(n(ser, r => !r.flagged), ser.length),
    falseReassuranceAll: rate(n(pos, r => !r.flagged), pos.length),
    recall: rate(n(pos, r => r.flagged), pos.length),
    seriousRatedSerious: rate(n(ser, r => r.serious), ser.length),
    documentedRatedSerious: rate(n(doc, r => r.serious), doc.length),
    falseAlarm: rate(n(neg, r => r.flagged), neg.length),
    nameResolution: rate(n(rows, r => r.resolved), rows.length),
    quoteIntegrity: rate(qv, qc),
    bySource: { label: rate(n(pos, r => r.bySource.label), pos.length), mechanism: rate(n(pos, r => r.bySource.mechanism), pos.length) },
    readability: fre.length ? { mean: +(fre.reduce((a, b) => a + b, 0) / fre.length).toFixed(1), n: fre.length } : null,
    guardrails: rate(n(guard, g => g.ok), guard.length), guard,
    medianLatencyMs: rows.map(r => r.ms).sort((a, b) => a - b)[Math.floor(rows.length / 2)] || 0,
  };
}

// ---------- fail-safe check: a data source outage must never produce "nothing found" ----------
async function failSafe() {
  const down = async url => { if (String(url).includes('api.fda.gov/drug/label')) return new Response('{}', { status: 503 }); return cachedFetch(url); };
  const r = await analyze({ message: 'warfarin and ibuprofen' }, down, {}).catch(e => ({ error: e.message, pairs: [] }));
  const levels = (r.pairs || []).map(p => p.level);
  return { levels, ok: !!r.error || (levels.length > 0 && levels.every(l => l === 'unknown')), detail: r.error ? `request failed visibly: ${r.error}` : `pair levels with labels unavailable: ${levels.join(', ') || 'none'}` };
}

// ---------- run ----------
setEvalMode(true);
const t0 = Date.now();
const SETS = [['dev', 'pairs.json', 'Development set'], ['heldout', 'heldout.json', 'Held-out set']];
const out = {};
for (const [key, file, title] of SETS) {
  const set = JSON.parse(readFileSync(ROOT + 'evals/' + file, 'utf8'));
  const rows = await pool(set.cases, 3, runCase);
  out[key] = { title, file, rows, m: score(rows, set.guardrail_cases || []) };
}
const fs = await failSafe();
const date = new Date().toISOString().slice(0, 10);

// ---------- history ----------
const HIST = ROOT + 'evals/history.json';
let history = existsSync(HIST) ? JSON.parse(readFileSync(HIST, 'utf8')) : [];
history = history.map(h => h.set ? h : { ...h, set: 'dev' });
if (LABEL) {
  for (const [key] of SETS) {
    const m = out[key].m;
    history.push({ date, set: key, label: LABEL, falseReassuranceSerious: m.falseReassuranceSerious.pct, recall: m.recall.pct, seriousRatedSerious: m.seriousRatedSerious.pct,
      documentedRatedSerious: m.documentedRatedSerious.pct, falseAlarm: m.falseAlarm.pct, nameResolution: m.nameResolution.pct, quoteIntegrity: m.quoteIntegrity.pct, guardrails: `${m.guardrails.k}/${m.guardrails.n}` });
  }
  writeFileSync(HIST, JSON.stringify(history, null, 2));
}
writeFileSync(ROOT + `evals/results/${date}.json`, JSON.stringify({ date, engine: 'extractive', failSafe: fs, sets: Object.fromEntries(Object.entries(out).map(([k, v]) => [k, { metrics: v.m, rows: v.rows }])) }, null, 2));

// ---------- clinical review sheet ----------
const csv = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
const lines = [['set', 'id', 'query', 'expected', 'basis', 'pair', 'pharvel_label', 'pharvel_summary', 'quote', 'source', 'reviewer_severity_correct (Y/N)', 'reviewer_summary_accurate (Y/N)', 'reviewer_notes'].map(csv).join(',')];
for (const [key] of SETS) for (const r of out[key].rows) for (const o of (r.output.length ? r.output : [{ pair: '', label: 'no pair', summary: '', quote: '', source: '' }]))
  lines.push([key, r.id, r.q, r.expect, r.basis, o.pair, o.label, o.summary, o.quote, o.source, '', '', ''].map(csv).join(','));
writeFileSync(ROOT + `evals/review/review-${date}.csv`, lines.join('\n'));

// ---------- report ----------
const fail = (title, xs) => xs.length ? `\n**${title}**\n\n| Case | Query | Expected | Got |\n|---|---|---|---|\n${xs.map(r => `| ${r.id} | ${r.q} | ${r.expect} | ${r.error ? 'error: ' + r.error : (r.levels.join('<br>') || 'no pairs')}${r.resolved ? '' : ' · resolved: ' + (r.names.join(', ') || 'nothing')} |`).join('\n')}\n` : '';
function section(key) {
  const { title, file, rows, m } = out[key];
  const pos = rows.filter(r => r.expect !== 'none'), ser = rows.filter(r => r.expect === 'serious'), doc = rows.filter(r => r.expect === 'documented'), neg = rows.filter(r => r.expect === 'none');
  return `## ${title} (\`evals/${file}\`)

${m.counts.cases} cases: ${m.counts.serious} serious, ${m.counts.documented} documented, ${m.counts.negatives} negative controls.${key === 'heldout' ? ' **Frozen before any run and never used for tuning.**' : ' Used to find and fix bugs, so results here are optimistic.'}

| Metric | Result | Meaning |
|---|---|---|
| **False reassurance, serious pairs** | **${fmt(m.falseReassuranceSerious)}** | Serious interactions shown as "nothing found". |
| False reassurance, all real interactions | ${fmt(m.falseReassuranceAll)} | Including documented interactions. |
| Recall | ${fmt(m.recall)} | Real interactions flagged by at least one source. |
| Serious pairs rated serious | ${fmt(m.seriousRatedSerious)} | Flagged at the right severity. |
| Documented pairs rated serious | ${fmt(m.documentedRatedSerious)} | Over-rating. |
| False alarms on negative controls | ${fmt(m.falseAlarm)} | Controls flagged anyway. |
| Name resolution | ${fmt(m.nameResolution)} | Every expected medicine recognised. |
| Quote integrity | ${fmt(m.quoteIntegrity)} | Quotes found verbatim in the cited label section. |
| Guardrail detection | ${fmt(m.guardrails)} | Emergency, dosing, injection; includes must-not-trigger cases. |
| Readability of summaries | ${m.readability ? `Flesch ${m.readability.mean} (${m.readability.n} summaries)` : '–'} | 60–70 is plain English; 50–60 fairly difficult. |

Caught by: FDA label text ${m.bySource.label.pct}% · FDA CYP/transporter table ${m.bySource.mechanism.pct}% of real interactions.
${fail('Missed real interactions', pos.filter(r => !r.flagged))}${fail('Serious pairs rated below serious', ser.filter(r => r.flagged && !r.serious))}${fail('Documented pairs rated serious', doc.filter(r => r.serious))}${fail('False alarms on negative controls', neg.filter(r => r.flagged))}${fail('Name resolution failures', rows.filter(r => !r.resolved))}${rows.some(r => r.quotes.bad.length) ? `\n**Quotes not found verbatim**\n\n${rows.flatMap(r => r.quotes.bad).map(b => '- ' + b).join('\n')}\n` : ''}${m.guard.some(g => !g.ok) ? `\n**Guardrail errors**\n\n${m.guard.filter(g => !g.ok).map(g => `- "${g.q}": expected ${g.expect}, got ${g.got}`).join('\n')}\n` : ''}`;
}
const hrow = h => `| ${h.date} | ${h.set} | ${h.label} | ${h.falseReassuranceSerious}% | ${h.recall}% | ${h.seriousRatedSerious}% | ${h.documentedRatedSerious == null ? '–' : h.documentedRatedSerious + '%'} | ${h.falseAlarm}% | ${h.nameResolution}% | ${h.quoteIntegrity}% | ${h.guardrails} |`;
const md = `# Pharvel evaluation

Run ${date} · extractive engine (no LLM) · cost $0 · ${live} live API calls, ${replayed} replayed from the recorded cache · ${Math.round((Date.now() - t0) / 1000)} s.

Expectations come from FDA labeling and FDA's CYP/transporter guidance (field \`basis\` in each case), not from Pharvel's output. **The reference sets have not yet been reviewed by a pharmacist**; a review sheet is generated at \`evals/review/review-${date}.csv\`.

Percentages carry 95% Wilson confidence intervals. With sets this small the intervals are wide: ${out.heldout.m.falseReassuranceSerious.k} misses out of ${out.heldout.m.counts.serious} serious held-out pairs is still compatible with a true miss rate of up to ${out.heldout.m.falseReassuranceSerious.hi}%.

**Fail-safe check (label service down):** ${fs.ok ? 'PASS' : 'FAIL'}. ${fs.detail}.

${section('heldout')}
${section('dev')}
## History

| Date | Set | Change | False reassurance (serious) | Recall | Serious rated serious | Documented over-rated | False alarms | Names | Quotes verbatim | Guardrails |
|---|---|---|---|---|---|---|---|---|---|---|
${history.map(hrow).join('\n')}

## Method

- Each case runs the production \`analyze()\` pipeline: RxNorm name resolution, openFDA label retrieval, the FDA CYP/transporter table and FAERS lookups. Responses are recorded under \`evals/.cache/\` and replayed so numbers change only when code changes; \`--fresh\` re-records.
- *Flagged* = a label warning (contraindicated, major, documented or class-level) or a strong/moderate effect predicted from FDA's CYP/transporter table. Adverse-event counts are shown to users but never count as a flag.
- *Rated serious* = contraindicated or serious label warning, or a strong inhibitor acting on a sensitive substrate.
- Quote integrity re-checks every quoted fragment against the full label section it came from.
- The development set was used to find bugs; the held-out set was written and frozen before its first run. Rules are not changed in response to held-out results; failures there are fixed only after adding new development cases that reproduce them, and are then measured on a new held-out set.
- Known limits: small hand-written sets; US labeling only; negative controls mean "no clinically significant interaction expected", not proven safe; remaining severity errors largely reflect label wording (e.g. the warfarin label lists aspirin and SSRIs in the same bleeding-risk table).
`;
writeFileSync(ROOT + 'EVALS.md', md);
const s = k => out[k].m;
console.log(`held-out: false reassurance (serious) ${fmt(s('heldout').falseReassuranceSerious)} · recall ${s('heldout').recall.pct}% · serious rated serious ${s('heldout').seriousRatedSerious.pct}% · over-rated ${s('heldout').documentedRatedSerious.pct}% · false alarms ${s('heldout').falseAlarm.pct}% · names ${s('heldout').nameResolution.pct}% · quotes ${s('heldout').quoteIntegrity.pct}% · guardrails ${s('heldout').guardrails.k}/${s('heldout').guardrails.n}`);
console.log(`dev:      false reassurance (serious) ${fmt(s('dev').falseReassuranceSerious)} · recall ${s('dev').recall.pct}% · serious rated serious ${s('dev').seriousRatedSerious.pct}% · over-rated ${s('dev').documentedRatedSerious.pct}% · false alarms ${s('dev').falseAlarm.pct}% · names ${s('dev').nameResolution.pct}% · quotes ${s('dev').quoteIntegrity.pct}% · guardrails ${s('dev').guardrails.k}/${s('dev').guardrails.n}`);
console.log(`fail-safe: ${fs.ok ? 'PASS' : 'FAIL'} (${fs.detail}) · live ${live}, replayed ${replayed}`);
