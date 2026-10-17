# Model card: Pharvel interaction engine

Version: engine 16 (`ENGINE_VERSION` in `lib/engine.js`) · 2026-10-17

## What it is
A deterministic retrieval and rule system, not a trained model. Optional language-model rewriting exists but is **off** in production (no API key configured); when on, it may only rephrase retrieved evidence and is checked by `faithfulness()`.

## Pipeline
1. Names → RxNorm ingredients (spelling suggestions, brand → ingredient, precise ingredients kept).
2. Labels → openFDA (primary label chosen by score, up to three alternates); drug classes from all labels, then NIH RxClass.
3. For each pair: search contraindications, boxed warning, drug interactions, warnings, precautions for the other medicine's names, aliases and class terms. Extract the governing sentence verbatim.
4. Severity from section and wording: contraindication section → contraindicated; boxed warning, serious wording, or class named in a boxed warning/contraindication → serious; other direct mention → documented; class mention only → class-level.
5. Mechanism from FDA's CYP/transporter table; FAERS co-report counts as context only.
6. Fixed plain-language parts: what can happen, what the label advises, why, real-world reports.

## Performance
See `EVALS.md` (development and held-out sets, 95% Wilson intervals, dated history). Headline metric: false reassurance on serious pairs.

## Known limitations
- Severity reflects label wording, which is not a clinical severity scale.
- Small, developer-written reference sets; no pharmacist review yet.
- US labeling only; supplements and foods covered only where FDA sources name them.
- No patient-specific factors.

## Versioning and change control
Any change to matching or wording bumps `ENGINE_VERSION` (invalidates cached answers), must pass `npm test`, `npm run eval` and `npm run gate`, and is recorded in `CHANGELOG.md` and `evals/history.json`. A language model, if enabled, is pinned by `ANTHROPIC_MODEL`; changing it requires a faithfulness evaluation before release.
