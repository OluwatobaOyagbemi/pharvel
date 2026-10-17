# Model card: Pharvel interaction engine

Version: engine 20 (`ENGINE_VERSION` in `lib/engine.js`) · 2026-10-17, after the external audit

## What it is
A deterministic retrieval and rule system, not a trained model. Optional language-model rewriting exists but is **off** in production (no API key configured); when on, it may only rephrase retrieved evidence and is checked by `faithfulness()`.

## Pipeline
1. Names → RxNorm ingredients (spelling suggestions, brand → ingredient, precise ingredients kept).
2. Labels → openFDA (primary label chosen by score, up to three alternates); drug classes from all labels, then NIH RxClass.
3. For each pair: search contraindications, boxed warning, drug interactions, warnings, precautions for the other medicine's names, aliases and class terms. Extract the governing sentence verbatim.
4. Names: condition, food and body-part words are never treated as medicines; allergenic extracts rejected; up to six medicines ranked by match confidence, dropped ones named; duplicates and combination products explained.
5. Severity from section and wording: contraindication section → contraindicated; boxed warning, serious wording, or class named in a boxed warning/contraindication → serious; other direct mention → documented; class mention only → class-level.
6. Mechanism from FDA's CYP/transporter table; when no label mentions the pair but the table predicts a strong or moderate effect, the pair is shown as "Predicted from FDA enzyme table". FAERS co-report counts are context only.
7. Fixed plain-language parts, taken only from the quoted sentence and checked for direction (decrease vs increase; prodrugs): what can happen, what the label advises, why, real-world reports.

## Performance
See `EVALS.md` (development and held-out sets, 95% Wilson intervals, dated history). Headline metric: false reassurance on serious pairs.

## Known limitations
- Quote relevance is not measured automatically (external audit finding 19).
- Severity reflects label wording, which is not a clinical severity scale.
- Small, developer-written reference sets; no pharmacist review yet.
- US labeling only; supplements and foods covered only where FDA sources name them.
- No patient-specific factors.

## Versioning and change control
Any change to matching or wording bumps `ENGINE_VERSION` (invalidates cached answers), must pass `npm test`, `npm run eval` and `npm run gate`, and is recorded in `CHANGELOG.md` and `evals/history.json`. A language model, if enabled, is pinned by `ANTHROPIC_MODEL`; changing it requires a faithfulness evaluation before release.
