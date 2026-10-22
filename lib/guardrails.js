import NAMES from '../public/names.json' with { type: 'json' };
const NAMES_ALL = NAMES;
// Deterministic guardrails around the pipeline. None of these call a model, so they behave the same on every request
// and can be tested exactly. They run in this order:
//   1. emergency(message)   - before any lookup: show emergency guidance first
//   2. dosing(message)      - the interaction check still runs, but dose questions get a fixed "ask a pharmacist" reply
//   3. injection(message)   - flagged and logged; label text and user text are only ever passed to a model as data
//   4. faithfulness(text, result) - after an optional LLM rewrite: reject output that is not supported by the evidence

// ---------- 1. Emergencies ----------
// Matched on a normalised copy of the message (lower case, accents removed, apostrophes dropped, repeated letters
// squeezed) so misspellings and slang are caught. Questions *about* a symptom ("can it cause seizures?") are not
// treated as emergencies; overdose, poisoning and self-harm are never discounted that way.
const fold = m => String(m || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[‘’'`]/g, '').replace(/(.)\1{2,}/g, '$1$1').replace(/\s+/g, ' ');
const NUM = '(\\d{1,3}|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty|sixty|a hundred|hundred|dozens of|lots of|a lot of|a bunch of|a handful of|loads of)';
const MED = '(pills?|tablets?|tabs|capsules?|caps|doses?|medicines?|medications?|meds|patch(es)?|syrup|gummies|bottle|pack)';
const KID = '(child|kid|baby|infant|toddler|son|daughter|grandson|granddaughter|grandchild|nephew|niece|\\d{1,2}[- ]?(year|yr|month)[- ]?old|dog|cat|puppy|pet)';
const NOT_A_DRUG = '(coffee|tea|food|water|sugar|caffeine|sleep|fun|work|stress|wine|beer|alcohol|to drink|soda|chocolate|candy)';
const EMERGENCY = [
  ['self-harm', new RegExp([
    '\\b(kms|kys)\\b', 'kil+(ing)? ?(my ?self|me)\\b', '\\b(suicid|sucid|suicd|suisid)', 'end(ing)? (my life|it all|it\\b(?! with))',
    '(want|wanna|going|gonna|ready|planning) (to|too|2) (die|dye|be dead)\\b(?! (of|from) (laugh|embarrass|bored))',
    'wish (i|id) (was|were|could be) dead', 'better off dead', 'dont want to (live|be alive|be here|exist|wake up)',
    'life (isnt|is not|aint) worth (living|it)', 'take all (of )?my (pills|meds|medicine|medication|tablets)',
    'hurt(ing)? (my ?self|myself)', 'self[- ]?harm', 'cut(ting)? myself',
    '(lethal|fatal|deadly|killing) (dose|amount)', '(how (much|many)|what amount|how many \\w+).{0,40}\\b(to die|to kill (me|myself|someone)|kill me|to overdose|would kill|to end it|be fatal|be lethal)',
    // Spanish, French, German, Portuguese
    'quiero morir|me quiero matar|matarme|suicidarme', 'je veux mourir|me suicider|me tuer', 'ich will sterben|mich umbringen|selbstmord', 'quero morrer|me matar',
  ].join('|'))],
  ['overdose', new RegExp([
    '\\b(i|im|i am|ive|he|hes|she|shes|they|theyre|we|my \\w+|friend|someone|somebody|husband|wife|mom|mum|dad|son|daughter|brother|sister|partner) (just |may have |might have |think (i|he|she|they) |accidentally |is |are |was )*(overdos(ed|ing)|o\\.?ded|odd|od)\\b',
    `\\b(took|taken|swallowed|had|ate|downed|popped) (like |about |around |maybe |almost |over |up to )?${NUM} (of )?(my |the |his |her |their |these )?(\\w+ ){0,2}${MED}`,
    `\\b(took|taken|swallowed|ate|downed|popped) (like |about |around |maybe |almost |over )?\\d{2,}\\b`,
    `\\b(took|taken|swallowed|downed|popped) (like |about )?(fifteen|twenty|thirty|forty|fifty|sixty|a hundred)\\b`,
    `\\b(took|taken|swallowed|had|ate|downed) (way |far )?too (many|much) (of )?(?!${NOT_A_DRUG})`,
    `\\b(the|a|an) (whole|entire|full) (bottle|pack|box|strip|blister)`, `\\b(swallowed|took|ate) (a|the) handful`,
    `\\b(all|half) (of )?(my|the|his|her) ${MED}`,
    `\\b(took|taken|given|gave|had)\\b.{0,30}\\b(by mistake|by accident|accidentally|twice|double (the )?dose|\\d+ times (his|her|my|the) dose|three times|extra dose)`,
    `\\b(double|extra) dosed?\\b`,
    // Spanish, French, German, Portuguese
    'sobredosis|me tome (todas|muchas)|tome (todas|muchas) las', 'surdose|jai pris (toutes|beaucoup)', 'uberdosis|zu viele tabletten', 'tomei (todos|muitos)',
  ].join('|'))],
  ['poisoning', new RegExp([
    `\\b${KID}\\b.{0,40}\\b(got into|got hold of|swallowed|drank|chewed|bit into|licked|sucked on)\\b`,
    `\\b${KID}\\b.{0,40}\\b(ate|took|found)\\b (some |a |one |two |three |a few |part )?(of )?(my|mom|moms|mums|dads|grand\\w*|someones|the|her grand\\w*|his grand\\w*|a|an)\\b(?! (dinner|lunch|breakfast|nap|bath|walk|meal|snack))`,
  ].join('|'))],
  ['breathing', /\b(cant|cannot|can not|struggling to|hard to|trouble|difficulty|unable to) (breathe?|breath(ing)?|get (any )?air)\b|\b(not|isnt|is not|stopped|barely|hardly|no longer) breath(e|ing)?\b|\bturning (blue|purple|grey|gray)\b|\b(throat|tongue) (is |feels )?(closing|swelling|swollen|tight|tightening)\b|\b(lips|face|mouth) (are |is )?(swelling|swollen|turning blue)\b|no puedo respirar|je ne peux pas respirer|ich kann nicht atmen|nao consigo respirar/],
  ['collapse', /\b(unconscious|unresponsive|passed out|wont wake|cant wake|not waking|wont respond|not responding|collapsed|fainted and)\b/],
  ['heart or stroke', /\b(having|i think im having|think i am having|i am having|im having) (a )?(heart attack|stroke)\b|\b(chest pains?|crushing chest)\b(?!.{0,30}\b(side effect|cause|risk)\b)|\bheart\b.{0,20}\b(racing|pounding)\b.{0,50}\b(pass out|faint|chest|cant breathe)/],
  ['bleeding', /\b(severe|heavy|uncontrolled) bleeding\b|\bbleeding (that )?(wont|will not|doesnt|does not) stop\b|\b(vomiting|throwing up|coughing up) blood\b/],
  ['seizure', /\b(having|is having|just had|had) a (seizure|fit)\b(?!.{0,30}\b(last|ago|years|history|in the past)\b)|\bseizing\b/],
  // Stroke signs (FAST): face drooping, one-sided weakness or numbness, speech problems, sudden confusion.
  ['stroke signs', /\b(face|mouth|smile)\b.{0,15}\b(droop\w*|lopsided|uneven)|\b(one|left|right) side of (my|his|her|their|the) (face|body|mouth)\b|\bhalf (of )?(my|his|her|their) (face|body)\b|\bsudden(ly)?\b.{0,40}\b(weak|weakness|numb|numbness|cant (move|talk|speak|see|walk)|confus\w*|slurr\w*|paraly\w*)|\b(weak(ness)?|numb(ness)?|paraly\w*) (in|of|on) (my|his|her|their) (left|right) |\b(cant|cannot|can not|unable to) (move|lift|feel) (my|his|her|their) (left |right )?(arm|leg|hand|foot|side|face)\b|\bslurr(ed|ing)\b|\bspeech is (slurred|garbled|weird|strange)|\bwords (are )?(coming out )?(wrong|jumbled|garbled|mixed up)|\bcant (talk|speak) (properly|right|clearly|normally)|\bdoesnt know where (she|he|they|i) (is|are|am)\b|\bsuddenly (confused|disoriented)|\bdisoriented\b/],
  // Severe allergic reaction.
  ['allergic reaction', /\b(tongue|lips?|eyes|eyelids|face|throat|mouth)\b.{0,25}\b(swell\w*|swollen|puff\w*|closing)\b|\bhives\b.{0,50}\b(chest|throat|breath\w*|wheez\w*|swell\w*|tight)\b|\banaphyla\w*/],
  ['fainting', /\b(fainted|passed out|blacked out|lost consciousness|collapsed)\b|\b(going to|gonna|about to) (pass out|faint|black out)\b/],
  ['severe headache', /\bworst headache\b|\bthunderclap\b|\b(sudden|terrible|severe|excruciating)\b.{0,20}\bheadache\b.{0,50}\b(stiff|neck|vomit\w*|confus\w*|vision)|\bheadache\b.{0,40}\bstiff neck\b|\bneck is stiff\b/],
  ['internal bleeding', /\b(black|tarry|bloody) (stool|stools|poop|poo|bowel movement)s?\b|\b(stool|stools|poop|poo) (is|are|looks?) (black|tarry|bloody)\b|\b(pooping|peeing|pissing|vomiting|throwing up|coughing up|spitting up) blood\b|\bblood in (my |his |her )?(stool|poop|urine|vomit|pee)\b/],
  ['over-sedation', /\b(cant|cannot|can not|unable to) (stay awake|keep (my |his |her |their )?eyes open)\b|\b(wont|cant) wake (up|him|her|them)\b/],
];
const EMERGENCY_TEXT = {
  base: 'If someone is in danger right now, call your local emergency number (911 in the US, 112 in the EU and Nigeria, 999 in the UK) or go to the nearest emergency department. For a suspected poisoning or overdose in the US, call Poison Control at 1-800-222-1222 — it is free and open 24 hours, even if the person seems fine.',
  'self-harm': 'If you are thinking about ending your life or harming yourself, please reach out right now: in the US call or text 988 (Suicide & Crisis Lifeline), available 24 hours. Elsewhere, call your local emergency number or a local crisis line. You do not have to go through this alone.',
  other: 'Si está en peligro, llame a su número local de emergencias. · En danger ? Appelez le numéro d’urgence local. · In Gefahr? Rufen Sie den Notruf an.',
};

const SYMPTOM_TYPES = ['breathing', 'collapse', 'heart or stroke', 'seizure', 'bleeding', 'stroke signs', 'allergic reaction', 'fainting', 'severe headache', 'internal bleeding', 'over-sedation'];
const ASKING = /^\s*(can|could|does|do|will|would|is|are|what|which|how|why|should)\b|\b(cause|causes|side effects?|risk of|signs of|symptoms? of|as an allergy|allergic reaction to|make you)\b/;
const NOW = /\b(right now|now|currently|after (taking|my|i took|the|his|her)|im having|i am having|is having|just)\b/;
export function emergency(message) {
  const m = fold(message);
  const asking = ASKING.test(m) && !NOW.test(m);
  const hits = EMERGENCY.filter(([type, re]) => re.test(m) && !(asking && SYMPTOM_TYPES.includes(type))).map(([type]) => type);
  // The bare word "overdose" counts when it is not part of a question ("what happens in an overdose?").
  if (!hits.includes('overdose') && !asking && /\boverdos(e|ed|ing)\b|\bo\.?d\.?ed\b/.test(m)) hits.push('overdose');
  if (!hits.length) return null;
  const lines = [hits.includes('self-harm') ? EMERGENCY_TEXT['self-harm'] : null, EMERGENCY_TEXT.base, EMERGENCY_TEXT.other].filter(Boolean);
  return { types: hits, answer: lines.join('\n') + '\nThis tool cannot help in an emergency. Please get help first; you can come back to check medicines afterwards.' };
}

// ---------- 1b. Calls for help and feeling unwell ----------
// Not an emergency phrase, but a person asking for help or describing symptoms should never get a cold
// "no medicine found". They get urgent-help routes first, then what Pharvel can do.
// Symptoms, matched on the normalised text. A person describing how they feel gets urgent-help routes first.
// Questions about side effects ("can metformin make you tired?") are not reports of symptoms and do not trigger it.
const SYMPTOM = new RegExp('\\b(' + [
  'help( me)?', 'please help', 'i need help', 'scared', 'frightened', 'worried', 'panick?ing',
  'weak(ness)?', 'tired', 'fatigued?', 'exhausted', 'worn out', 'no energy', 'drained',
  'dizzy', 'dizziness', 'light ?headed', 'faint', 'woozy', 'unsteady', 'barely stand',
  'nause\\w*', 'queasy', 'sick to my stomach', 'throwing up', 'vomit\\w*', 'diarrh\\w*', 'constipat\\w*',
  'stomach (hurts|aches?|pain|cramps?)', 'belly (hurts|ache|pain)', 'tummy (hurts|ache)', 'cramps?',
  'headaches?', 'migraines?', 'rash', 'itch\\w*', 'hives', 'swollen', 'swelling', 'puffy', 'peeling', 'blisters?',
  'fever(ish)?', 'chills', 'shak(y|ing|es)', 'trembl\\w*', 'tremors?', 'jitter\\w*', 'palpitations?',
  'heart (is |feels )?(pounding|racing|fluttering|skipping|irregular)', 'skipping beats', 'chest (feels )?(tight|heavy)',
  'confused', 'confusion', 'foggy', 'blurr\\w*', 'seeing double', 'aches?', 'achy', 'aching', 'sore',
  'pain(ful)?(?! (pills?|medicine|medication|relievers?|killers?|meds))', 'hurts?', 'urine is dark', 'dark urine',
  'yellow (skin|eyes)', 'eyes (look |are |turned )?yellow', 'jaundice', 'bruis\\w*', 'bleed\\w*', 'nosebleeds?',
  'numb(ness)?', 'tingl\\w*', 'pins and needles', 'drowsy', 'sleepy', 'groggy', 'cant sleep', 'insomnia',
  'anxious', 'anxiety', 'agitated', 'restless', 'sweat\\w*', 'cough(ing)?', 'short of breath', 'wheez\\w*',
  'not feeling (well|good|right|myself)', 'feel(ing|s)? (off|unwell|ill|sick|bad|awful|terrible|weird|strange|wrong|funny|horrible)',
  'something (feels|is) (wrong|off|not right)', 'having (a |some )?(side effects?|reaction)', 'side effects? (from|after)',
  'bad reaction', 'allergic reaction', 'reaction to',
].join('|') + ')\\b');
const PERSONAL = /\b(i|im|ive|id|me|my|mine|feel|feeling|he|hes|she|shes|his|her|they|theyre|their|husband|wife|son|daughter|mom|mum|dad|baby|child|kid|grandma|grandpa)\b/;
const QUESTION = /^\s*(can|could|does|do|will|would|is|are|what|which|how|why|should)\b|\b(cause|causes|side effects? of|make you|common side|risk of)\b/;
export const HELP_TEXT = {
  urgent: 'If you feel very unwell, have trouble breathing, chest pain, swelling of the face or throat, or think someone took too much of a medicine, call your local emergency number now (911 in the US) or Poison Control at 1-800-222-1222 (US). For anything else that worries you, a pharmacist can help today — most pharmacies will answer questions in person or by phone, free.',
  how: 'What I can do: tell you what FDA drug labels say about taking medicines together. Type the names of the medicines, for example "warfarin and ibuprofen" or "Zoloft with tramadol".',
  note: 'If you have symptoms that worry you, contact a pharmacist or doctor; if they are severe, call your local emergency number (911 in the US). The label check below does not assess symptoms.',
};
export function distress(message) {
  const m = fold(message);
  if (!SYMPTOM.test(m)) return false;
  // 1. A statement mentioning a symptom ("I feel weak", "my ankles are swollen") is a report: help.
  if (!QUESTION.test(m)) return true;
  // 2. A question about whether a medicine causes something is a side-effect question, unless the person also
  //    says they are experiencing it ("I feel dizzy, does lisinopril cause that?").
  const EXPERIENCING = /\b(i feel|im feeling|i am feeling|i have been feeling|im having|i am having|i have|ive had|i got|i keep|i cant|my \w+ (is|are|feels?|hurts?|look)|feels? (like|so))\b/;
  if (/\b(can|could|does|do|will|would|is|are|make|makes|cause|causes|give|gives|side effects?)\b/.test(m)) return EXPERIENCING.test(m);
  return PERSONAL.test(m);
}

// ---------- 1c. Topic: only medicine questions ----------
// Runs after the emergency and help checks (those are never blocked) and before any lookup.
//   misuse:   using medicines to get high, making or extracting drugs, obtaining them without a prescription
//   offtopic: requests that are not about medicines (creative writing, code, homework, chit-chat, general knowledge)
// A message that names a medicine, or talks about taking medicines, is never treated as off-topic here; if nothing
// in it turns out to be a medicine after lookup, the API answers with the same off-topic reply.
const MED_WORDS = new Set(NAMES_ALL.filter(n => /^[a-z][a-z-]{3,}$/.test(n)));
['alcohol', 'coffee', 'caffeine', 'insulin', 'grapefruit', 'vitamin', 'vitamins', 'supplement', 'supplements', 'tylenol', 'ibuprofin', 'paracetamol', 'wort', 'antibiotic', 'antibiotics', 'painkiller', 'painkillers', 'statin', 'statins', 'antidepressant', 'antidepressants', 'nsaid', 'nsaids', 'opioid', 'opioids', 'benzo', 'benzos', 'blood thinner', 'thinner'].forEach(w => MED_WORDS.add(w));
const NOT_MED_ENGLISH = new Set(['help', 'please', 'good', 'morning', 'night', 'water', 'time', 'game', 'love', 'what', 'when', 'where', 'tell', 'joke', 'poem', 'song', 'code', 'list', 'sort', 'math', 'essay', 'movie', 'music', 'weather', 'news', 'girlfriend', 'boyfriend', 'president', 'capital', 'france', 'spanish', 'english', 'rice', 'recipe', 'history', 'story', 'quantum', 'physics', 'percent', 'lagos', 'baltimore', 'ocean', 'election', 'cover', 'letter', 'pharmacy', 'job', 'dog', 'night']);
const DRUG_CONTEXT = /\b(take|takes|taking|took|taken|pills?|tablets?|capsules?|medicines?|medications?|meds|prescri\w*|drugs?|doses?|dosage|interact\w*|mix(ing)?|combin\w*|together|with|label|labels|safe|side effects?|supplements?|vitamins?|antibiotics?|painkillers?|pharmacist|doctor said)\b/;
const MISUSE = new RegExp([
  '\\b(get|getting|got|feel|feeling|be|stay) (high|stoned|buzzed|lit|wasted|fucked up)\\b', '\\bhigh (from|off|on) (my |the |a |his |her )?\\w+', '\\b(most|best|stronger|longer) high\\b',
  '\\beuphori\\w*', '\\brecreational\\w*', '\\bfor fun\\b', '\\bto party\\b',
  '\\bhow (to|do (i|you)|can (i|you)|would (i|you))\\b.{0,20}\\b(make|cook|synthesi[sz]e|extract|brew|grow|isolate)\\b', '\\b(make|cook|synthesi[sz]e)\\b.{0,15}\\b(meth|heroin|fentanyl|lsd|mdma|crack|cocaine|ghb|dmt)\\b',
  '\\bwithout (a |seeing a |going to a |any )?(prescription|doctor|script|rx)\\b', '\\bbuy\\b.{0,40}\\b(online|without|on the street|off the street|from (a |someone|a friend|the dark ?web)|dark ?web)\\b',
  '\\bstreet (price|value|name|cost)s?\\b', '\\b(snort\\w*|sniff\\w*|boof\\w*|shoot(ing)? up|freebas\\w*|parachut\\w*)\\b',
  '\\b(smoke|smoking|inject|injecting|iv)\\b.{0,15}\\b(heroin|meth|fentanyl|crack|cocaine|oxy\\w*|tramadol|xanax|adderall|percocet|ketamine|codeine|morphine|hydrocodone|norco|vicodin|suboxone|lean)\\b',
  '\\b(lean|purple drank|sizzurp)\\b',
].join('|'));
const OFFTOPIC_INTENT = new RegExp([
  '\\b(write|compose|draft|generate|create|make)\\b.{0,30}\\b(poem|poetry|song|lyrics|rap|story|stories|essay|cover letter|resume|cv|email|tweet|caption|speech|code|script|program|function|app|website)\\b',
  '\\b(python|javascript|java|html|css|sql|c\\+\\+|coding|programming)\\b', '\\b(pretend|roleplay|role play|act as|you are now|be my)\\b', '\\btranslate\\b',
  '\\b(homework|essay|assignment|quiz|exam)\\b', '\\bsolve\\b', '\\brecipes?\\b', '\\bjokes?\\b',
].join('|'));
const GREETING = /^\W*(hi+|hello+|hey+|yo|sup|whats up|good (morning|afternoon|evening|night)|how are you( doing)?|thanks?( you)?|thank you|ok(ay)?|cool|nice|bye|test(ing)?)\W*$/;
export const MISUSE_TEXT = 'Pharvel can’t help with using medicines in ways they weren’t prescribed, making or extracting drugs, or getting them without a prescription. If you or someone you know is struggling with substance use, SAMHSA’s National Helpline is free, confidential and open 24/7: 1-800-662-4357 (US). If someone has taken too much, call 911 or Poison Control at 1-800-222-1222.';
export const OFFTOPIC_TEXT = 'Pharvel only answers questions about medicines: what FDA drug labels say about taking two or more medicines together. Type the names of the medicines, for example "warfarin and ibuprofen" or "Can I take Zoloft with tramadol?". For anything else, please use another service.';
const hasMed = m => (m.match(/[a-z][a-z-]{3,}/g) || []).some(w => MED_WORDS.has(w) && !NOT_MED_ENGLISH.has(w));
// Order in the API: emergency() -> topic(m, 'hard') -> distress() -> topic(m, 'soft').
//   hard: misuse requests and clear non-medicine tasks (essays, code, homework) — checked before the help response,
//         so "help me with my essay" is not mistaken for a call for help.
//   soft: greetings and messages with no medicine and no talk of taking medicines — checked after the help
//         response, so "I feel awful" still gets help.
export function topic(message, stage = 'all') {
  const m = fold(message);
  if (stage !== 'soft') {
    if (MISUSE.test(m)) return { type: 'misuse', answer: MISUSE_TEXT };
    if (OFFTOPIC_INTENT.test(m) && !hasMed(m)) return { type: 'offtopic', answer: OFFTOPIC_TEXT };
    if (OFFTOPIC_INTENT.test(m) && /\b(poem|poetry|song|lyrics|rap|story|essay|cover letter|resume|code|script|program|pretend|roleplay|role play|act as|joke)\b/.test(m)) return { type: 'offtopic', answer: OFFTOPIC_TEXT };
  }
  if (stage === 'greeting') return GREETING.test(m) ? { type: 'offtopic', answer: OFFTOPIC_TEXT } : null;
  if (stage !== 'hard') {
    if (GREETING.test(m)) return { type: 'offtopic', answer: OFFTOPIC_TEXT };
    if (!hasMed(m) && !DRUG_CONTEXT.test(m)) return { type: 'offtopic', answer: OFFTOPIC_TEXT };
  }
  return null;
}

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
// Rules (each failure is reported; any failure means the extractive answer is used instead). The checker fails
// closed: if the medicine vocabulary cannot be loaded, every model answer is rejected.
//   - reassurance:  never calls any pair safe, fine, okay, low-risk, not dangerous, nothing to worry about…
//   - unsupported-number: every number, including spelled-out numbers and "twice", must appear as a whole token in
//     the evidence
//   - unknown-drug: no medicine name that is not one of the checked medicines or present in the evidence
//   - missing-pair: every pair with a label finding must be mentioned by both names
//   - severity: wording must not be stronger or weaker than the severity Pharvel assigned
//   - instruction:  no treatment instructions (stop, discontinue, halve, double, skip, take up to…) unless the label
//     text itself contains them

const REASSURE = /\b(is|are|its|it is|theyre|they are|should be|generally|usually|completely|totally|perfectly|quite|very)? ?(safe|fine|okay|ok|alright|harmless|no problem)\b(?! (to )?(ask|check|confirm|discuss))|\bnot (dangerous|unsafe|harmful|risky|a (big )?(problem|concern|issue)|serious|a worry)\b|\b(low|minimal|little|small|negligible|no real|no) (risk|danger|concern)\b|\bnothing to worry|\bno need to (worry|be concerned)|\bwont (hurt|harm)\b|\bshould be fine\b/i;
const INSTRUCTION = /\b(stop|discontinue|halve|double|skip|increase|decrease|reduce|cut|lower|raise|split|switch|swap|replace) (taking |using |your |the |a |one of )*(\w+)|\btake (up to|no more than|at most|only)\b|\b(wait|separate them by|space them) \w+ hours?\b/i;
const NUMBER_WORDS = /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|half|twice|thrice|double|triple|quarter)\b/gi;
const SEVERE_WORDS = /\bcontraindicat|\bshould not be (taken|used|combined)|\bnever (take|combine|use)|\bcan (cause|lead to) death|\bwill (cause|kill)|\bfatal\b|\bdeadly\b/i;
const WARN_WORDS = /\b(serious|warn|risk|contraindicat|should not|avoid|danger|caution|bleed|toxic|interact)/i;

const VOCAB = new Set(NAMES.filter(n => /^[a-z][a-z-]{5,}$/.test(n)));
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
const tokens = str => new Set((str.match(/\d+(?:[.,]\d+)*|[a-z]+/g) || []).map(x => x.replace(/,/g, '')));

export async function faithfulness(text, result) {
  const problems = [], t = String(text || ''), lower = t.toLowerCase(), corpus = corpusOf(result), ctoks = tokens(corpus);
  if (!t.trim()) return { ok: false, problems: ['empty'] };
  if (VOCAB.size < 1000) return { ok: false, problems: ['vocabulary-unavailable'] };

  const r = lower.replace(/[‘’']/g, '').match(REASSURE);
  if (r) problems.push(`reassurance: "${r[0].trim()}"`);

  for (const n of new Set(lower.match(/\d+(?:[.,]\d+)*/g) || [])) if (!ctoks.has(n.replace(/,/g, ''))) problems.push(`unsupported-number: ${n}`);
  for (const w of new Set(lower.match(NUMBER_WORDS) || [])) if (!ctoks.has(w)) problems.push(`unsupported-number: ${w}`);

  const allowed = new Set((result.drugs || []).flatMap(d => [d.name, d.display, ...(d.brands || [])]).map(x => x.toLowerCase()));
  for (const w of new Set(lower.match(/[a-z][a-z-]{5,}/g) || [])) {
    if (VOCAB.has(w) && !COMMON.has(w) && !allowed.has(w) && !ctoks.has(w)) problems.push(`unknown-drug: ${w}`);
  }

  const flagged = (result.pairs || []).filter(p => ['contraindicated', 'major', 'moderate', 'class'].includes(p.level));
  for (const p of flagged) if (!(lower.includes(p.a.toLowerCase()) && lower.includes(p.b.toLowerCase()))) problems.push(`missing-pair: ${p.a} + ${p.b}`);
  const levels = new Set((result.pairs || []).map(p => p.level));
  if (SEVERE_WORDS.test(lower) && !levels.has('contraindicated') && !SEVERE_WORDS.test(corpus)) problems.push('severity: wording stronger than the assigned severity');
  if (flagged.length && !WARN_WORDS.test(lower)) problems.push('severity: a flagged pair is described without any warning wording');

  const ins = lower.match(INSTRUCTION);
  if (ins && !corpus.includes(ins[0])) problems.push(`instruction: "${ins[0]}"`);

  return { ok: problems.length === 0, problems };
}
