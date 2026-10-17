# Pharvel

[![ci](https://github.com/OluwatobaOyagbemi/pharvel/actions/workflows/ci.yml/badge.svg)](https://github.com/OluwatobaOyagbemi/pharvel/actions/workflows/ci.yml) — tests, evaluation and safety gate run on every push.

**A medicine-interaction checker where the AI is not allowed to decide.** Type medicines in plain words; Pharvel finds each one (NIH RxNorm), retrieves its FDA label (openFDA), checks every pair, and shows the exact label sentence, a fixed plain-language summary, the enzyme mechanism from FDA's CYP table, and real-world FDA adverse-event reports — each with a source link.

**Live:** https://drugfacts.vercel.app · **Checker:** https://drugfacts.vercel.app/app.html · **Limitations:** https://drugfacts.vercel.app/limitations.html

> Student portfolio project (Community College of Baltimore County). Not medical advice; non-commercial.

## Why it is built this way
In medicine, a confident wrong answer is the worst failure. So severity and evidence come only from FDA-published text and FDA tables; nothing is generated. An optional language-model layer may only rephrase retrieved evidence, and its output is rejected by a deterministic faithfulness check if it calls anything safe, invents a number or medicine, or drops a warning.

## How well it works — including where it fails
| Measure | Result |
|---|---|
| Serious interactions missed, internal held-out set (frozen before first run) | 1/22 on first run; 0/22 after fixes developed on separate cases (95% CI 0–14.9%) |
| **Serious interactions flagged vs an independent curated database (DDInter 2.0), three samples** | **82.5% · 86.3% · 81.9%** (pooled 83.6%) — about 1 in 6 missed |
| Quotes found word-for-word in the cited label | 100% |
| Emergency detection, red-team corpus (incl. misspellings, slang, other languages) | Held-out set: 13/13 emergencies caught, 1/5 false alarm; dev set 36/36, 0/9 |
| False alarms on harmless control pairs | 0/15 held-out, 1/12 development |

The headline lesson: **internal tests said 0% missed; an independent benchmark said ~16%.** Two rounds of targeted fixes did not move the independent number, which shows label-text matching plateaus around 82–86%. Full details: [EVALS.md](EVALS.md) · [evals/BENCHMARK.md](evals/BENCHMARK.md) · independent audit and remediation: [docs/EXTERNAL_AUDIT_2026-10-17.md](docs/EXTERNAL_AUDIT_2026-10-17.md).

## What is in the repo
| Area | Where |
|---|---|
| Retrieval and grading pipeline | `lib/engine.js` |
| FDA CYP/transporter mechanism table | `lib/mechanism.js` |
| Guardrails (emergency, dosing, scope, injection, faithfulness) | `lib/guardrails.js` + `test/guardrails.test.mjs` |
| Evaluation harness (dev + held-out sets, Wilson CIs, fail-safe check, review sheet) | `evals/run.mjs`, `evals/pairs.json`, `evals/heldout.json` |
| External benchmark | `evals/benchmark-ddinter.mjs` |
| Release gate + CI | `evals/gate.mjs`, `evals/thresholds.json`, `.github/workflows/ci.yml` |
| Governance (intended use, hazard analysis, model card, licences, privacy, FDA assessment, incident plan, audit map) | `docs/` |
| Serverless API and pages | `api/`, `public/` |

## Tech
Vanilla JavaScript (no framework, no build step), Vercel serverless functions, Upstash Redis (answer cache, daily limits, aggregate counters), canvas 3D molecule renderer with PubChem data. Data: NIH RxNorm/RxClass, openFDA labels and FAERS, FDA CYP/transporter table, PubChem — all public domain. Running cost ≈ $0/month.

## Analytics
Vercel Web Analytics is not enabled. To enable it: turn it on in the Vercel project dashboard, then add `<script defer src="/_vercel/insights/script.js"></script>` to `public/index.html` and `public/app.html`.

## Commands
`npm test` · `npm run eval -- --label "what changed"` · `npm run gate` · `npm run dev` · `npm run feedback`

## Limitations
US FDA labeling only; supplements and foods only where FDA sources name them; no patient-specific factors; reference sets not yet reviewed by a pharmacist; severity follows label wording, not a clinical scale. See [docs/AUDIT.md](docs/AUDIT.md) for every open item.

---


## Run locally

    npm run dev        # live RxNorm + openFDA, http://localhost:3000
    npm run dev:mock   # offline test data
    npm test

## How a finding is graded

| Level | Rule |
| --- | --- |
| Contraindicated in label | One label names the other medicine under Contraindications or Do not use |
| Serious warning in label | Named in a boxed warning, or beside wording such as "avoid", "do not use", "fatal", "serious" |
| Interaction documented | Named in another warning or interaction section |
| Class-level mention | Only the other medicine's drug class is named (for example "NSAIDs") |
| Nothing found | Neither label mentions the other. Not proof of safety |

These are text-matching rules over label sections, not a clinical severity score. Known limits: US labels only; one label is chosen per ingredient; an interaction described only by enzyme (for example "CYP3A4 inhibitors") is not linked to a specific drug; up to six medicines per question.

## Running costs, limits and usage

- **Free allowance:** each visitor gets `FREE_CHECKS_PER_DAY` checks per UTC day (default 20). Over the limit the API answers 429. Addresses are hashed before they are stored.
- **Answer cache:** the finished result for one set of medicines is reused for 7 days, so repeat questions make no label or model calls.
- **Store:** connect Upstash for Redis from the Vercel Marketplace (`npx vercel integration add upstash/upstash-kv`, free tier). Without it the limits and counters live in function memory and reset on cold starts.
- **Optional AI explanations:** set `ANTHROPIC_API_KEY` (and optionally `ANTHROPIC_MODEL`) in Vercel. The model only rephrases retrieved label passages; the extractive answers are used when the key is missing or the call fails.
- **Usage:** `/stats.html` (aggregate counters from `/api/stats`), plus Vercel Web Analytics once enabled in the project dashboard, and `npx vercel logs` for per-request JSON lines (medicine names, pair count, cache hit, duration; no addresses).


## Mechanism and real-world layers (public domain)

- **Why it can happen** — `lib/mechanism.js` encodes the FDA's published examples of clinical CYP and transporter substrates, inhibitors and inducers. When one medicine is a listed inhibitor/inducer and the other a listed substrate of the same enzyme or transporter, the expected direction and size of the effect is stated using FDA's own definitions.
- **Real-world reports** — for each pair, openFDA's FAERS endpoint is asked how many adverse-event reports list both medicines and which reactions were most reported. Shown as context with an explicit "spontaneous reports, not proof" note.

Both sources are US-government public domain, so they do not constrain commercial use.

## Guardrails

`lib/guardrails.js`, all deterministic and unit-tested (`test/guardrails.test.mjs`):

1. **Emergencies** (overdose, poisoning, breathing trouble, collapse, chest pain, seizure, self-harm) are answered first with emergency numbers, before any lookup, and do not count against the free allowance. Questions *about* a risk ("can tramadol cause seizures?") do not trigger.
2. **Dosing questions** get a fixed "ask a pharmacist" notice; the interaction check still runs.
3. **Prompt-injection attempts** are flagged. User text and label text only ever reach a model as tagged data.
4. **Faithfulness check** on any model rewrite: rejected if it calls a pair safe, introduces a number or medicine not in the evidence, drops a flagged pair, or gives an unsupported instruction. A rejected rewrite falls back to the exact quoted answer.

## Evaluation

`npm run eval` runs the production pipeline on `evals/pairs.json` (66 reference cases with the FDA labeling basis for each expectation, plus 14 guardrail cases) and writes `EVALS.md`. API responses are cached under `evals/.cache/` so results only change when the code does; `--fresh` re-records, `--label "..."` adds a row to the dated history. Current results are in [EVALS.md](EVALS.md).

## Governance

| Document | Contents |
|---|---|
| [docs/AUDIT.md](docs/AUDIT.md) | Every healthcare-AI audit question with status and evidence |
| [docs/INTENDED_USE.md](docs/INTENDED_USE.md) | Users, supported decision, exclusions, worst case |
| [docs/RISK.md](docs/RISK.md) | Hazard analysis with controls, verification and residual risk |
| [docs/MODEL_CARD.md](docs/MODEL_CARD.md) | How results are produced, limits, change control |
| [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md) | Licence register |
| [docs/PRIVACY.md](docs/PRIVACY.md) | Data inventory and retention |
| [docs/REGULATORY.md](docs/REGULATORY.md) | Preliminary device-status assessment (not legal advice) |
| [docs/INCIDENT_RESPONSE.md](docs/INCIDENT_RESPONSE.md) | Triage levels, steps, kill switch |
| [docs/RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md) | Required checks for every deploy |
| [EVALS.md](EVALS.md) · [evals/BENCHMARK.md](evals/BENCHMARK.md) · [CHANGELOG.md](CHANGELOG.md) | Internal evaluation; external benchmark vs DDInter; change log |

Commands: `npm test` · `npm run eval -- --label "..."` · `npm run gate` · `npm run feedback`.
