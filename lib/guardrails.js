// Deterministic guardrails around the pipeline. None of these call a model, so they behave the same on every request
// and can be tested exactly. They run in this order:
//   1. emergency(message)   - before any lookup: show emergency guidance first
//   2. dosing(message)      - the interaction check still runs, but dose questions get a fixed "ask a pharmacist" reply
//   3. injection(message)   - flagged and logged; label text and user text are only ever passed to a model as data
//   4. faithfulness(text, result) - after an optional LLM rewrite: reject output that is not supported by the evidence

// ---------- 1. Emergencies ----------
// Patterns are written for first-person, present-tense situations. Questions *about* a symptom ("can it cause
// seizures?") are deliberately not matched, so the checker still answers them.
const EMERGENCY = [
  ['self-harm', /\b(kill(ing)? (my ?self|myself)|suicid|end(ing)? (my life|it all)|want to die|don'?t want to (live|be alive)|hurt(ing)? (my ?self|myself)|self[- ]harm)/i],
  ['overdose', /\b(i|i'?ve|i have|we|he|she|they|my \w+) (just |may have |might have |think i |accidentally )*(overdosed|od'?d)\b|\b(i|i'?m|he'?s|she'?s|they'?re) overdosing\b|\b(i|we|he|she|they|my \w+) (just |accidentally )?(took|swallowed|had) (way )?(too many|too much|an? (whole|entire) (bottle|pack|box)|a handful)|\btook \d{2,} (pills|tablets|capsules)/i],
  ['poisoning', /\b(child|kid|baby|toddler|son|daughter|dog|cat)\b.{0,40}\b(swallowed|ate|took|got into)\b/i],
  ['breathing', /\b(can'?t|cannot|can not|struggling to|hard to|trouble) (breathe|breathing)\b|\b(not|stopped) breathing\b|\bthroat (is )?(closing|swelling|swollen)\b/i],
  ['collapse', /\b(unconscious|unresponsive|passed out|won'?t wake|can'?t wake|not waking|fainted and)\b/i],
  ['chest pain', /\b(having|have|got) (severe |bad |crushing )?chest pain\b|\bchest pain (now|right now)\b/i],
  ['seizure', /\b(having|is having|just had) a (seizure|fit)\b|\bseizing\b/i],
];
const EMERGENCY_TEXT = {
  base: 'If someone is in danger right now, call your local emergency number (911 in the US, 112 in the EU and Nigeria, 999 in the UK) or go to the nearest emergency department. For a suspected poisoning or overdose in the US you can also call Poison Control at 1-800-222-1222.',
  'self-harm': 'If you are thinking about harming yourself, please reach out now: in the US call or text 988 (Suicide & Crisis Lifeline); elsewhere call your local emergency number or a local crisis line. You do not have to go through this alone.',
};

// Symptom words inside a question about effects ("can X cause trouble breathing?") are not an emergency.
// Overdose, poisoning and self-harm are never discounted this way.
const SYMPTOM_TYPES = ['breathing', 'collapse', 'chest pain', 'seizure'];
const ASKING = /^\s*(can|could|does|do|will|would|is|are|what|which|how|why|should)\b|\b(cause|causes|side effects?|risk of|signs of|symptoms? of|as an allergy|allergic reaction to)\b/i;
const NOW = /\b(right now|now|currently|after (taking|my|i took)|i('?m| am) having|is having|just)\b/i;
export function emergency(message) {
  const asking = ASKING.test(message) && !NOW.test(message);
  const hits = EMERGENCY.filter(([type, re]) => re.test(message) && !(asking && SYMPTOM_TYPES.includes(type))).map(([type]) => type);
  if (!hits.length) return null;
  const lines = [hits.includes('self-harm') ? EMERGENCY_TEXT['self-harm'] : null, EMERGENCY_TEXT.base].filter(Boolean);
  return { types: hits, answer: lines.join('\n') + '\nThis tool cannot help in an emergency. Please get help first; you can come back to check medicines afterwards.' };
}

// ---------- 1b. Calls for help and feeling unwell ----------
// Not an emergency phrase, but a person asking for help or describing symptoms should never get a cold
// "no medicine found". They get urgent-help routes first, then what Pharvel can do.
const DISTRESS = /\b(help( me)?|please help|i need help|feel(ing)? (sick|unwell|ill|bad|awful|terrible|dizzy|faint|weird|strange)|i('?m| am) (sick|unwell|scared|worried|dizzy)|scared|frightened|bad reaction|allergic reaction|throwing up|vomiting|rash|swelling)\b/i;
export const HELP_TEXT = {
  urgent: 'If you feel very unwell, have trouble breathing, chest pain, swelling of the face or throat, or think someone took too much of a medicine, call your local emergency number now (911 in the US) or Poison Control at 1-800-222-1222 (US). For anything else that worries you, a pharmacist can help today — most pharmacies will answer questions in person or by phone, free.',
  how: 'What I can do: tell you what FDA drug labels say about taking medicines together. Type the names of the medicines, for example "warfarin and ibuprofen" or "Zoloft with tramadol".',
  note: 'If you have symptoms that worry you, contact a pharmacist or doctor; if they are severe, call your local emergency number (911 in the US). The label check below does not assess symptoms.',
};
export const distress = message => DISTRESS.test(message);

// ---------- 2. Dosing questions ----------
const DOSING = /\b(how (much|many)\b.{0,30}\b(take|have|give|mg|pills?|tablets?|capsules?|dose)|what (dose|dosage)|which dose|maximum dose|max(imum)? (daily )?(dose|amount)|(double|increase|decrease|lower|raise|split) (my |the |a )?dose|how often (can|should) i take|dosing|\d+\s?(mg|mcg|ml)\b.{0,20}\b(ok|okay|safe|fine|too much)\b)/i;
export const DOSING_TEXT = 'Pharvel does not give dosing advice. How much of a medicine is right depends on your weight, age, kidney and liver function and your other medicines, so please ask a pharmacist or your prescriber. The interaction check below still applies.';
export const dosing = message => DOSING.test(message);

// ---------- 2b. Out-of-scope populations ----------
// Labels give special warnings for these groups that a pair-by-pair check does not cover. The check still runs,
// with a notice saying so.
const SCOPE = [
  ['pregnancy', /\b(pregnan\w*|trying to conceive|expecting a baby|breast-?feeding|nursing (my|a) baby|lactating)\b/i],
  ['child', /\b(my|for (a|my)) (baby|infant|toddler|child|kid|son|daughter|newborn)\b|\b(\d{1,2})[- ](year|month)[- ]old\b|\bchildren\b/i],
  ['kidney', /\b(kidney|renal) (disease|failure|problems?|impairment|function)|\bon dialysis\b|\bckd\b/i],
  ['liver', /\b(liver|hepatic) (disease|failure|problems?|impairment|cirrhosis)|\bcirrhosis\b|\bhepatitis\b/i],
  ['elderly', /\b(elderly|my (grand)?(mother|father|mum|mom|dad|grandma|grandpa)|(7|8|9)\d[- ]year[- ]old)\b/i],
];
const SCOPE_TEXT = { pregnancy: 'pregnancy or breastfeeding', child: 'children', kidney: 'kidney disease', liver: 'liver disease', elderly: 'older adults' };
export function scope(message) {
  const hits = SCOPE.filter(([, re]) => re.test(message)).map(([k]) => k);
  if (!hits.length) return null;
  return { groups: hits, notice: `You mentioned ${hits.map(k => SCOPE_TEXT[k]).join(' and ')}. Labels often have separate warnings and dose limits for this, which this pair-by-pair check does not cover. Please ask a pharmacist or prescriber before relying on the result below.` };
}

// ---------- 3. Prompt-injection attempts ----------
const INJECTION = /\b(ignore|disregard|forget) (all |any |the |your )?(previous|prior|above|earlier|system)? ?(instructions|rules|prompt)|\byou are now\b|\bsystem prompt\b|\bact as (a|an|my)\b|\bjailbreak\b|<\/?(system|evidence|instructions)>/i;
export const injection = message => INJECTION.test(message);

// ---------- 4. Faithfulness of model output ----------
// Rules (each failure is reported; any failure means the extractive answer is used instead):
//   - never-safe:   the text must not call any pair safe or risk-free
//   - unsupported-number: every number in the text must appear in the evidence (doses, folds, percentages, counts)
//   - unknown-drug: no medicine name may appear that is not one of the checked medicines or present in the evidence
//   - missing-pair: every pair with a label finding must be mentioned by both names
//   - instruction:  no direct treatment instructions ("stop taking", "double the dose") unless the label says so
const NEVER_SAFE = /\b(is|are|it'?s|they'?re) (completely |totally |perfectly |generally )?safe\b|\bsafe to (take|combine|use|mix)\b|\bno (risk|danger)\b|\bnothing to worry about\b|\bharmless\b/i;
const INSTRUCTION = /\b(stop taking|double (the|your) dose|skip (a|your) dose|increase (the|your) dose|reduce (the|your) dose to)\b/i;

let VOCAB = null; // lower-case medicine names, loaded lazily from the autocomplete list
async function vocab() {
  if (VOCAB) return VOCAB;
  try {
    const { default: names } = await import('../public/names.json', { with: { type: 'json' } });
    VOCAB = new Set(names.filter(n => /^[a-z][a-z-]{5,}$/.test(n)));
  } catch { VOCAB = new Set(); }
  return VOCAB;
}
// Ordinary English words that also exist as RxNorm display names.
const COMMON = new Set(['alcohol', 'aspirin', 'calcium', 'charcoal', 'coffee', 'oxygen', 'sodium', 'potassium', 'magnesium', 'vitamin', 'protein', 'glucose', 'sugar', 'water', 'saline', 'insulin', 'nicotine', 'caffeine', 'iron', 'zinc', 'medicine', 'medicines', 'tablet', 'tablets', 'label', 'labels', 'bleeding', 'pharmacist', 'prescriber']);

function corpusOf(result) {
  const parts = [];
  for (const p of result.pairs || []) {
    parts.push(p.a, p.b);
    for (const e of p.evidence || []) parts.push(e.text, e.quote, e.ctx, e.match);
    for (const m of p.mechanism || []) parts.push(m.text);
    if (p.faers?.reports) parts.push(String(p.faers.reports), p.faers.reports.toLocaleString('en-US'), ...p.faers.top.map(t => `${t.term} ${t.count}`));
  }
  for (const d of result.drugs || []) parts.push(d.name, d.display, ...(d.brands || []), ...(d.classes || []));
  for (const f of result.findings || []) parts.push(f.quote, ...(f.plain || []), f.summary);
  return parts.filter(Boolean).join(' \n ').toLowerCase();
}

export async function faithfulness(text, result) {
  const problems = [], t = String(text || ''), lower = t.toLowerCase(), corpus = corpusOf(result);
  if (!t.trim()) return { ok: false, problems: ['empty'] };

  const safe = t.match(NEVER_SAFE);
  if (safe) problems.push(`never-safe: "${safe[0]}"`);

  for (const n of new Set(t.match(/\d+(?:[.,]\d+)*/g) || [])) {
    const bare = n.replace(/,/g, '');
    if (!corpus.includes(n.toLowerCase()) && !corpus.includes(bare)) problems.push(`unsupported-number: ${n}`);
  }

  const known = await vocab();
  const allowed = new Set((result.drugs || []).flatMap(d => [d.name, d.display, ...(d.brands || [])]).map(x => x.toLowerCase()));
  for (const w of new Set(lower.match(/[a-z][a-z-]{5,}/g) || [])) {
    if (known.has(w) && !COMMON.has(w) && !allowed.has(w) && !corpus.includes(w)) problems.push(`unknown-drug: ${w}`);
  }

  for (const p of result.pairs || []) {
    if (['contraindicated', 'major', 'moderate', 'class'].includes(p.level) && !(lower.includes(p.a.toLowerCase()) && lower.includes(p.b.toLowerCase())))
      problems.push(`missing-pair: ${p.a} + ${p.b}`);
  }

  const ins = t.match(INSTRUCTION);
  if (ins && !corpus.includes(ins[0].toLowerCase())) problems.push(`instruction: "${ins[0]}"`);

  return { ok: problems.length === 0, problems };
}
