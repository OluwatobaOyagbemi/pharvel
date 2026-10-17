# Pharvel — AI-engineering roadmap

Goal: turn Pharvel into a portfolio project for an **AI engineer role at a healthcare company**.
Core principle (keep it): the model never decides severity. Evidence comes from retrieved sources; the LLM only explains it and must cite it.

## Where it stands (2026-10-11)
- Live: https://drugfacts.vercel.app (landing) · /app.html (checker) · /stats.html (usage)
- Evidence layers, all public domain: FDA labels (openFDA/DailyMed), FDA CYP/transporter table (`lib/mechanism.js`), FAERS adverse-event reports
- Plain-language lines (23 fixed patterns), printable report, autocomplete, mobile layout, saved medicine list
- Upstash Redis connected: 7-day answer cache (versioned key, `ENGINE_VERSION`), 20 free checks/visitor/day, usage counters
- 3D molecules + 2D structures + plain-English property notes (PubChem)
- DDInter was tried and removed (CC BY-NC-SA, non-commercial)
- LLM layer coded (`rewrite()` in `lib/engine.js`, Claude Haiku 4.5) but **off**: no `ANTHROPIC_API_KEY` set

## Waiting on the owner
- [ ] Anthropic API key: `npx vercel env add ANTHROPIC_API_KEY production` (add $5 credit, set a monthly spend limit)
- [ ] Choose the eval judge model: Claude Opus 5.5 (~$1–2 per full run, more credible) or Claude Haiku 4.5 (a few cents)
- [ ] Optional: enable Vercel Web Analytics (project → Analytics → Enable)
- [ ] Optional: custom domain once the name is cleared

## Phases
### 1. Grounded LLM (needs the key)
- Rewrite `rewrite()` with the official `@anthropic-ai/sdk`; timeout, typed error handling, per-pair cache
- Structured JSON output: `{pair, explanation, cited_quote_ids[]}`
- Label text passed as marked data; prompt-injection defence

### 2. Guardrails (no key needed) — DONE 2026-10-17
- Faithfulness check in code: cited quotes exist; no drug names, doses or numbers absent from the evidence; else fall back to extractive answer and log
- Emergency detection (overdose, can't breathe, took too many) → emergency guidance before any model call
- Dosing questions → fixed "ask a pharmacist" reply
- Log answer mode (grounded / fallback / refused), no personal data

### 3. Evaluation harness — DONE 2026-10-17 (see EVALS.md: 0% false reassurance on 37 serious pairs, 100% verbatim quotes, 14/14 guardrails)
- `evals/pairs.json`: 80–100 pairs with expected answers (30 contraindicated/major, 30 moderate, 20 no-interaction controls, edge cases: brands, typos, supplements, combination products)
- `npm run eval` scores: detection recall, severity-band accuracy, **false-reassurance rate** (headline), citation faithfulness, cost per answer, latency
- LLM-as-judge for readability with a rubric; hand-check a sample
- Write results to `EVALS.md` and the README each run

### 4. Improve against the eval
- List failures, fix biggest causes, re-run; keep a dated before/after table

### 5. Production hygiene
- GitHub Action: tests + eval subset on every push; fail if false reassurance worsens
- `/stats.html`: LLM vs fallback rate, guardrail triggers, average cost
- Privacy statement (no personal health data; hashed IPs; aggregates only)

### 6. Package for recruiters
- README case study (problem, architecture diagram, decisions, eval results, limitations)
- 2-minute demo video (check, guardrail trigger, eval output)
- LinkedIn post built around the false-reassurance number
- Resume line: "Built a retrieval-grounded clinical QA system (RxNorm, openFDA, FDA CYP tables, FAERS) with LLM guardrails and an evaluation harness; reduced false-reassurance rate from X% to Y%."

## Also done 2026-10-17
- Summaries restructured into four parts: What can happen / What the label advises (or What to do) / Why it happens / Real-world reports
- Emergency and dosing responses shown in the UI; duplicate quotes removed; quotes rebuilt verbatim from label text

## Next session
- Phase 1 (grounded LLM) once the API key is added; the faithfulness check is already wired in and tested
- Phase 4: grow the eval set (aim 100+ cases, add supplements and foods), then work on the 7 remaining severity-rating errors without overfitting
- Phase 5: GitHub Action running `npm test` and `npm run eval` on every push

## Notes for testing
- Local: `node --env-file=.env.local test/dev.mjs` (real Redis) or `npm run dev`
- Heavy testing from one machine hits the 20/day limit; for test runs set `FREE_CHECKS_PER_DAY` locally or clear the `rl:<day>:<hash>` key
- Headless-Chrome screenshot scripts used: puppeteer-core in the session scratchpad (not in the repo)

## Audit remediation — 2026-10-17
See `docs/AUDIT.md` for every audit question with status and evidence. Done: held-out set (frozen; first run recorded unchanged), confidence intervals, fail-safe check, release gate + CI workflow, scope notices, report-a-problem, origin labels, safety signals, governance docs, Limitations/Privacy/Terms pages, tested kill switch.
Open, needs other people: pharmacist review of `evals/review/review-<date>.csv` and held-out v2; regulatory/legal opinion; licensed benchmark.
