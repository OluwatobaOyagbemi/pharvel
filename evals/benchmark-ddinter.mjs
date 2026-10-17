// External benchmark against DDInter 2.0 (ddinter.scbdd.com; Xiong et al., Nucleic Acids Research 2022).
// DDInter is CC BY-NC-SA 4.0. It is used here ONLY for non-commercial evaluation: the CSVs are downloaded into the
// git-ignored eval cache, are never deployed, and no DDInter content is shown to users. If Pharvel becomes commercial,
// this benchmark needs the authors' permission or must be replaced by a licensed reference.
//   node evals/benchmark-ddinter.mjs     -> writes evals/BENCHMARK.md and evals/results/benchmark-<date>.json
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { analyze, setEvalMode } from '../lib/engine.js';

const ROOT = new URL('..', import.meta.url).pathname, CACHE = ROOT + 'evals/.cache/', DD = CACHE + 'ddinter/';
if (!existsSync(DD) || !readdirSync(DD).some(f => f.endsWith('.csv'))) { console.error('Download the DDInter CSVs into evals/.cache/ddinter/ first (see https://ddinter.scbdd.com/download/).'); process.exit(1); }

// ---------- DDInter lookup ----------
const LV = { Major: 3, Moderate: 2, Minor: 1, Unknown: 0 };
const dd = new Map();
const parse = line => { const out = []; let cur = '', q = false; for (const c of line) { if (c === '"') q = !q; else if (c === ',' && !q) { out.push(cur); cur = ''; } else cur += c; } out.push(cur); return out; };
const key = (a, b) => [a, b].sort().join('|');
for (const f of readdirSync(DD).filter(f => f.endsWith('.csv'))) for (const line of readFileSync(DD + f, 'utf8').split(/\r?\n/).slice(1)) {
  const [, a, , b, level] = parse(line); if (!a || !b || !(level in LV)) continue;
  const k = key(a.trim().toLowerCase(), b.trim().toLowerCase()); dd.set(k, Math.max(dd.get(k) ?? -1, LV[level]));
}
const ddNames = new Set([...dd.keys()].flatMap(k => k.split('|')));

// Commonly used medicines (Pharvel name -> DDInter name where they differ).
const DRUGS = ['warfarin', 'apixaban', 'rivaroxaban', 'clopidogrel', 'aspirin', 'ibuprofen', 'naproxen', 'celecoxib', 'acetaminophen', 'sertraline', 'fluoxetine', 'citalopram', 'escitalopram', 'paroxetine', 'venlafaxine', 'duloxetine', 'bupropion', 'trazodone', 'tramadol', 'oxycodone', 'hydrocodone', 'morphine', 'alprazolam', 'lorazepam', 'diazepam', 'zolpidem', 'simvastatin', 'atorvastatin', 'rosuvastatin', 'amlodipine', 'lisinopril', 'losartan', 'metoprolol', 'carvedilol', 'furosemide', 'hydrochlorothiazide', 'spironolactone', 'digoxin', 'amiodarone', 'metformin', 'glipizide', 'levothyroxine', 'omeprazole', 'pantoprazole', 'ciprofloxacin', 'clarithromycin', 'azithromycin', 'fluconazole', 'metronidazole', 'prednisone', 'allopurinol', 'gabapentin', 'quetiapine', 'lithium'];
// A second, non-overlapping pool for re-measurement after fixes (--pool 2).
const DRUGS2 = ['clonazepam', 'buspirone', 'mirtazapine', 'amitriptyline', 'nortriptyline', 'haloperidol', 'risperidone', 'olanzapine', 'aripiprazole', 'lamotrigine', 'levetiracetam', 'carbamazepine', 'phenytoin', 'valproic acid', 'topiramate', 'sumatriptan', 'methadone', 'fentanyl', 'codeine', 'buprenorphine', 'cyclobenzaprine', 'baclofen', 'tizanidine', 'meloxicam', 'diclofenac', 'ketorolac', 'enalapril', 'ramipril', 'valsartan', 'diltiazem', 'verapamil', 'propranolol', 'atenolol', 'clonidine', 'hydralazine', 'torsemide', 'chlorthalidone', 'pravastatin', 'ezetimibe', 'glyburide', 'pioglitazone', 'sitagliptin', 'tamsulosin', 'sildenafil', 'tadalafil', 'montelukast', 'cetirizine', 'loratadine', 'famotidine', 'ondansetron', 'metoclopramide', 'doxycycline', 'amoxicillin', 'cephalexin', 'trimethoprim', 'nitrofurantoin', 'levofloxacin', 'erythromycin', 'ketoconazole', 'itraconazole', 'acyclovir', 'hydroxychloroquine', 'methotrexate', 'tacrolimus', 'cyclosporine', 'dexamethasone', 'theophylline', 'colchicine'];
// A third pool, disjoint from the first two, for re-measurement after the v2-prompted fixes (--pool 3).
const DRUGS3 = ['fluvoxamine', 'desvenlafaxine', 'vortioxetine', 'imipramine', 'doxepin', 'clomipramine', 'lurasidone', 'ziprasidone', 'paliperidone', 'clozapine', 'oxcarbazepine', 'phenobarbital', 'primidone', 'pregabalin', 'zonisamide', 'rizatriptan', 'zolmitriptan', 'eletriptan', 'hydromorphone', 'oxymorphone', 'tapentadol', 'meperidine', 'naltrexone', 'temazepam', 'triazolam', 'eszopiclone', 'modafinil', 'methylphenidate', 'atomoxetine', 'dabigatran', 'edoxaban', 'prasugrel', 'ticagrelor', 'cilostazol', 'dronedarone', 'sotalol', 'flecainide', 'propafenone', 'ranolazine', 'nifedipine', 'felodipine', 'candesartan', 'olmesartan', 'benazepril', 'bumetanide', 'eplerenone', 'triamterene', 'lovastatin', 'fenofibrate', 'gemfibrozil', 'canagliflozin', 'empagliflozin', 'repaglinide', 'glimepiride', 'esomeprazole', 'lansoprazole', 'cimetidine', 'sucralfate', 'fexofenadine', 'posaconazole', 'voriconazole', 'rifampin', 'rifabutin', 'isoniazid', 'linezolid', 'clindamycin', 'minocycline', 'moxifloxacin', 'sulfasalazine', 'azathioprine', 'mycophenolate mofetil', 'sirolimus', 'everolimus', 'methylprednisolone', 'alendronate', 'granisetron', 'mirabegron', 'oxybutynin'];
const poolArg = process.argv.includes('--pool') ? process.argv[process.argv.indexOf('--pool') + 1] : '1';
const POOL = poolArg === '3' ? DRUGS3 : poolArg === '2' ? DRUGS2 : DRUGS;
const DDNAME = { aspirin: 'acetylsalicylic acid', lithium: 'lithium carbonate' };
const ddn = d => DDNAME[d] || d;
const usable = POOL.filter(d => ddNames.has(ddn(d)));

// ---------- stratified sample with a fixed seed ----------
// --seed N picks a different sample; --exclude-seen drops every pair used in earlier benchmark runs or in the
// development and held-out sets, so a new run measures pairs nothing was tuned on.
const argSeed = process.argv.indexOf('--seed'), vi = process.argv.indexOf('--version'), VERSION = vi > 0 ? process.argv[vi + 1] : process.argv.includes('--exclude-seen') ? 'v2' : 'v1';
const seen = new Set();
// (benchmark-vN.json files from earlier runs are excluded below, except the file this run will overwrite)
if (VERSION !== 'v1') {
  for (const f of readdirSync(ROOT + 'evals/results').filter(f => f.startsWith('benchmark-v') && f !== `benchmark-${VERSION}.json`)) for (const r of JSON.parse(readFileSync(ROOT + 'evals/results/' + f, 'utf8')).rows) seen.add(key(r.a, r.b));
  for (const f of ['pairs.json', 'heldout.json']) for (const c of JSON.parse(readFileSync(ROOT + 'evals/' + f, 'utf8')).cases) if (c.drugs.length >= 2) seen.add(key(c.drugs[0], c.drugs[1]));
}
let seed = argSeed > 0 ? Number(process.argv[argSeed + 1]) : 20261017; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const strata = { Major: [], Moderate: [], Minor: [], none: [] };
for (let i = 0; i < usable.length; i++) for (let j = i + 1; j < usable.length; j++) {
  const l = dd.get(key(ddn(usable[i]), ddn(usable[j])));
  const s = l === 3 ? 'Major' : l === 2 ? 'Moderate' : l === 1 ? 'Minor' : l == null ? 'none' : null;
  if (s && !seen.has(key(usable[i], usable[j]))) strata[s].push([usable[i], usable[j]]);
}
const TAKE = { Major: 80, Moderate: 80, Minor: 30, none: 60 };
const sample = Object.entries(strata).flatMap(([s, xs]) => xs.map(x => [rnd(), x]).sort((a, b) => a[0] - b[0]).slice(0, TAKE[s]).map(([, x]) => ({ a: x[0], b: x[1], dd: s })));

// ---------- run Pharvel ----------
async function cachedFetch(url, opts) {
  const file = CACHE + createHash('sha1').update(String(url)).digest('hex') + '.json';
  if (existsSync(file)) { const c = JSON.parse(readFileSync(file, 'utf8')); return new Response(c.body, { status: c.status }); }
  const r = await fetch(url, opts), body = await r.text();
  if (r.status < 500 && r.status !== 429) writeFileSync(file, JSON.stringify({ status: r.status, body }));
  return new Response(body, { status: r.status });
}
const FLAG = ['contraindicated', 'major', 'moderate', 'class'], SER = ['contraindicated', 'major'];
setEvalMode(false);
const rows = [];
let i = 0;
await Promise.all(Array.from({ length: 3 }, async () => {
  while (i < sample.length) {
    const c = sample[i++];
    let r; try { r = await analyze({ message: `${c.a} and ${c.b}` }, cachedFetch, { SKIP_FAERS: 1 }); } catch (e) { r = { pairs: [], drugs: [], error: e.message }; }
    const p = r.pairs.find(p => { const n = [p.a, p.b].map(x => r.drugs.find(d => d.display === x)?.name); return n.includes(c.a) && n.includes(c.b); }) || r.pairs[0];
    const level = p?.level || 'not-run', mech = (p?.mechanism || []);
    const flagged = FLAG.includes(level) || mech.some(m => m.strength !== 'weak');
    const serious = SER.includes(level) || mech.some(m => m.strength === 'strong' && m.role === 'inhibitor' && m.substrate === 'sensitive');
    rows.push({ ...c, level, mech: mech[0] ? `${mech[0].enzyme}-${mech[0].strength}` : '', flagged, serious, pharvel: serious ? 'serious' : flagged ? 'flagged' : level === 'unknown' ? 'unchecked' : 'none' });
  }
}));

// ---------- metrics ----------
function wilson(k, n, z = 1.96) { if (!n) return [0, 0]; const p = k / n, d = 1 + z * z / n, c = p + z * z / (2 * n), m = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)); return [Math.max(0, (c - m) / d), Math.min(1, (c + m) / d)]; }
const rate = (k, n) => { const [lo, hi] = wilson(k, n); return `${n ? (100 * k / n).toFixed(1) : 0}% (${k}/${n}; 95% CI ${(100 * lo).toFixed(1)}–${(100 * hi).toFixed(1)}%)`; };
const by = s => rows.filter(r => r.dd === s), cnt = (xs, f) => xs.filter(f).length;
const M = by('Major'), Mo = by('Moderate'), Mi = by('Minor'), N = by('none');
// Agreement on three levels: serious / interaction / none. DDInter Major -> serious, Moderate -> interaction, Minor or absent -> none.
const lvlDD = r => r.dd === 'Major' ? 2 : r.dd === 'Moderate' ? 1 : 0, lvlPh = r => r.serious ? 2 : r.flagged ? 1 : 0;
const tab = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]; rows.forEach(r => tab[lvlDD(r)][lvlPh(r)]++);
const n = rows.length, po = (tab[0][0] + tab[1][1] + tab[2][2]) / n;
const pe = [0, 1, 2].reduce((s, k) => s + (tab[k].reduce((a, b) => a + b, 0) / n) * ((tab[0][k] + tab[1][k] + tab[2][k]) / n), 0);
const kappa = (po - pe) / (1 - pe);
const date = new Date().toISOString().slice(0, 10);
writeFileSync(ROOT + `evals/results/benchmark-${VERSION}.json`, JSON.stringify({ date, version: VERSION, seed: argSeed > 0 ? Number(process.argv[argSeed + 1]) : 20261017, excluded: seen.size, reference: 'DDInter 2.0', drugs: usable, rows, tab, kappa }, null, 2));

const list = xs => xs.length ? `| Pair | DDInter | Pharvel |\n|---|---|---|\n${xs.map(r => `| ${r.a} + ${r.b} | ${r.dd} | ${r.level}${r.mech ? ' / ' + r.mech : ''} |`).join('\n')}` : '_None._';
const md = `# External benchmark: Pharvel vs DDInter 2.0

Run ${date}. Reference: DDInter 2.0 (Xiong G. et al., *Nucleic Acids Research* 2022), an independently curated drug–drug interaction database with Major / Moderate / Minor ratings. **Used for non-commercial evaluation only (CC BY-NC-SA 4.0); DDInter data is not deployed or shown to users.**

## Design
- Run ${VERSION}${VERSION !== 'v1' ? `: fresh sample (seed ${process.argv[argSeed + 1]}) excluding ${seen.size} pairs already used in benchmark v1 or in Pharvel's own test sets, measured after fixes developed on separate development cases.` : ': first run, before any change prompted by this benchmark.'}
- ${usable.length} commonly used medicines; all pairs between them looked up in DDInter and grouped by DDInter rating.
- Stratified random sample with a fixed seed: up to ${TAKE.Major} Major, ${TAKE.Moderate} Moderate, ${TAKE.Minor} Minor and ${TAKE.none} pairs with no DDInter record (${n} pairs in total).
- Each pair run through the production pipeline (adverse-event lookups skipped; they never affect flags).
- Neither source is ground truth. DDInter rates clinical significance from the literature; Pharvel reports what FDA labels and FDA's CYP/transporter table say. Disagreements are where a pharmacist should look.

## Results
| Measure | Result |
|---|---|
| **DDInter Major pairs flagged by Pharvel** | **${rate(cnt(M, r => r.flagged), M.length)}** |
| DDInter Major pairs rated serious by Pharvel | ${rate(cnt(M, r => r.serious), M.length)} |
| DDInter Moderate pairs flagged by Pharvel | ${rate(cnt(Mo, r => r.flagged), Mo.length)} |
| DDInter Minor pairs flagged by Pharvel | ${rate(cnt(Mi, r => r.flagged), Mi.length)} |
| Pairs with no DDInter record flagged by Pharvel | ${rate(cnt(N, r => r.flagged), N.length)} |
| Pairs Pharvel could not check (label unavailable) | ${cnt(rows, r => r.pharvel === 'unchecked')} |
| Agreement on serious / interaction / none (Cohen's κ) | ${kappa.toFixed(2)} (observed agreement ${(100 * po).toFixed(1)}%) |

Agreement table (rows DDInter, columns Pharvel):

| DDInter \\ Pharvel | none | interaction | serious |
|---|---|---|---|
| Minor or no record | ${tab[0].join(' | ')} |
| Moderate | ${tab[1].join(' | ')} |
| Major | ${tab[2].join(' | ')} |

## DDInter Major pairs Pharvel did not flag
These are the most important disagreements: candidates for false reassurance, to be adjudicated by a pharmacist.

${list(M.filter(r => !r.flagged))}

## Pairs Pharvel rated serious that DDInter rates Minor or has no record
${list([...Mi, ...N].filter(r => r.serious))}

## Notes
- A pair absent from DDInter is not proof of no interaction, and a label mention is not proof of clinical significance.
- The sample is drawn from ${usable.length} common medicines; results may not generalise to rarer drugs.
- Re-run: \`node evals/benchmark-ddinter.mjs\` (DDInter CSVs must be in \`evals/.cache/ddinter/\`).
`;
writeFileSync(ROOT + `evals/BENCHMARK-${VERSION}.md`, md);
console.log(md.split('## DDInter Major pairs')[0].split('## Results')[1]);
console.log('Major misses:', M.filter(r => !r.flagged).length, '| report: evals/BENCHMARK.md');
