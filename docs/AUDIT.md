# Healthcare AI audit: status and evidence

2026-10-17. Each question from the audit checklist, with Pharvel's status and where the evidence is.
✅ answered with evidence · ⚠️ partly, gap stated · ❌ open, needs someone other than the developer

| # | Question | Status | Evidence |
|---|---|---|---|
| 1.1 | Intended use and exclusions | ✅ | `docs/INTENDED_USE.md`; public `/limitations.html` |
| 1.2 | Intended users | ✅ | `docs/INTENDED_USE.md` (patients and caregivers; not clinicians) |
| 1.3 | Worst-case outcome named and measured | ✅ | False reassurance: `docs/RISK.md` H1, headline metric in `EVALS.md` |
| 1.4 | Out-of-scope populations | ✅ | Scope notice for pregnancy, children, kidney/liver disease, older adults (`scope()` in `lib/guardrails.js`, tests); `/limitations.html` |
| 2.1 | Medical device status | ⚠️ | `docs/REGULATORY.md` v0.2 quotes FDA's 2026 CDS guidance and the 2022 software-functions policy: patient-facing drug-interaction information matches Appendix B item 18 (enforcement discretion). Briefing questions ready; **qualified opinion still needed** |
| 2.2 | Claims supportable | ✅ | Claims limited in `docs/INTENDED_USE.md`; "never safe" enforced by `faithfulness()` |
| 2.3 | Terms, privacy notice, disclaimers | ⚠️ | `/terms.html`, `/privacy.html`, disclaimers at every result; **not reviewed by a lawyer** |
| 2.4 | Data licences | ✅ | `docs/DATA_SOURCES.md` licence register; DDInter removed |
| 3.1 | Traceability to source | ✅ | Every quote linked to DailyMed; quote integrity 100% re-verified against source text (`EVALS.md`) |
| 3.2 | Currency and refresh | ⚠️ | Live retrieval, label date shown, 7-day cache, versioned cache key; no automated label-change monitoring |
| 3.3 | Label selection rule | ✅ | Scored primary label plus alternates; classes from all labels and RxClass (`docs/MODEL_CARD.md`) |
| 3.4 | Name normalisation measured | ✅ | Name resolution 100% on both sets with 95% CI (`EVALS.md`) |
| 3.5 | Combination products and salts | ✅ | Engine handling + eval cases E04, HS22 |
| 3.6 | FAERS presented responsibly | ✅ | Never used to flag; "not proof" on every display; `docs/RISK.md` H12 |
| 4.1 | Reference set built and validated | ⚠️ | Every case cites its FDA labeling basis; review sheet `evals/review/review-<date>.csv`; **pharmacist review not yet done** |
| 4.2 | False-negative rate with uncertainty | ✅ | 95% Wilson intervals on both sets (`EVALS.md`) |
| 4.3 | False-alarm rate | ✅ | 27 negative controls across both sets, with CIs; the one false alarm reported |
| 4.4 | Severity accuracy, both directions | ✅ | Under- and over-rating reported separately with every error listed |
| 4.5 | Independent held-out evaluation | ✅ | `evals/heldout.json` frozen before first run; first-run results recorded unchanged; fixes developed on new dev cases; v1 marked as seen (`status` field) |
| 4.6 | Reproducible | ✅ | `npm run eval`, recorded API responses, dated history, CI cache |
| 4.7 | Benchmark vs an independent reference | ⚠️ | Non-commercial benchmark vs DDInter 2.0 (`evals/BENCHMARK.md`): 82.5%, 86.3% and 81.9% of DDInter Major pairs flagged on three independent samples (pooled 83.6%); recall plateaus with label-text matching. A licensed clinical reference (Lexicomp, Micromedex, DrugBank) is still needed for commercial use |
| 4.8 | Clinician review of outputs | ❌ | Review sheet ready (`evals/review/`); needs a pharmacist |
| 5.1 | Hazard analysis | ✅ | `docs/RISK.md` (15 hazards, controls, verification, residual risk) |
| 5.2 | Emergency handling | ✅ | Emergency guardrail before any lookup; trigger and must-not-trigger tests; guardrail metric |
| 5.3 | No dosing advice | ✅ | Dosing guardrail; faithfulness rejects unsupported numbers and instructions |
| 5.4 | Meaning of "nothing found" | ✅ | Wording states labels are incomplete and to ask a pharmacist |
| 5.5 | Fail-safe on data outage | ✅ | Fail-safe check in every eval run: labels down → "unchecked", never "nothing found" (PASS) |
| 5.6 | Red-teaming | ⚠️ | Injection, unsafe-claim and invented-dose cases in tests; no independent red team |
| 6.1 | What the model decides | ✅ | Nothing safety-relevant: severity and evidence are deterministic (`docs/MODEL_CARD.md`) |
| 6.2 | Hallucination controls | ✅ | Tagged evidence, faithfulness check, fallback to quoted answer; model layer off in production |
| 6.3 | Faithfulness measured on real outputs | ⚠️ | Check tested on synthetic outputs; real outputs need the API key, then a rejection-rate review (release checklist) |
| 6.4 | Prompt-injection defence | ✅ | Tagged data, injection flagging, output verification, tests |
| 6.5 | Model version control | ✅ | Pinned by `ANTHROPIC_MODEL`; change requires faithfulness review (`docs/MODEL_CARD.md`, release checklist) |
| 6.6 | Data sent to model vendor | ✅ | Documented in `docs/PRIVACY.md` and `/privacy.html` (only if enabled) |
| 7.1 | Subgroup performance | ⚠️ | Scope stated (US, English); no subgroup analysis possible on current data |
| 7.2 | Health-literacy readability | ✅ | Flesch reading ease of summaries reported in `EVALS.md` |
| 7.3 | Accessibility | ✅ | WCAG 2.1 AA (axe) clean; severity by icon and text, not colour alone |
| 7.4 | Non-US coverage | ⚠️ | Stated as a limitation; unrecognised names reported to the user |
| 8.1 | Data inventory | ✅ | `docs/PRIVACY.md` |
| 8.2 | HIPAA / GDPR applicability | ⚠️ | Reasoned position in `docs/PRIVACY.md`; not legally reviewed |
| 8.3 | Logs and retention | ✅ | Retention per data type in `docs/PRIVACY.md`; feedback capped at 500 |
| 8.4 | Secrets | ✅ | Vercel environment variables; `.env*` git-ignored |
| 8.5 | Abuse prevention | ✅ | Daily limit per hashed IP, input length limits, max six medicines |
| 9.1 | Explainability | ✅ | Quote, mechanism, source link and labelled summary for every finding |
| 9.2 | Automated vs AI output labelled | ✅ | Origin line on every answer ("assembled by fixed rules" / "AI-written, checked") |
| 9.3 | Published limitations and model card | ✅ | `/limitations.html`, `docs/MODEL_CARD.md`, `EVALS.md` |
| 10.1 | Production monitoring | ✅ | `/stats.html` safety signals: guardrail triggers, answer modes, AI rejections, problem reports |
| 10.2 | User error reporting | ✅ | "Report a problem" on every result; `npm run feedback` |
| 10.3 | Incident response | ✅ | `docs/INCIDENT_RESPONSE.md` with severity levels and a tested kill switch |
| 10.4 | Regression protection | ✅ | `npm run gate` with thresholds; `.github/workflows/ci.yml` (activates when the repo is pushed to GitHub) |
| 10.5 | Cache after fixes | ✅ | `ENGINE_VERSION` in the cache key |
| 11.1 | Clinical accountability | ❌ | Developer is interim owner; a pharmacist or clinician reviewer is needed |
| 11.2 | Release review process | ✅ | `docs/RELEASE_CHECKLIST.md` |
| 11.3 | Documentation set | ✅ | `docs/` (intended use, risk, model card, data sources, privacy, regulatory, incidents, release), `EVALS.md`, `CHANGELOG.md` |

## Open items that need other people
1. **Pharmacist** to review both reference sets and the generated review sheet (4.1, 4.8, 11.1), and to write held-out v2.
2. **Regulatory specialist / lawyer** for device status, terms and privacy (2.1, 2.3, 8.2).
3. **Licensed clinical reference** (e.g. DrugBank) for a commercial-grade benchmark (4.7); the DDInter benchmark covers non-commercial evaluation.
