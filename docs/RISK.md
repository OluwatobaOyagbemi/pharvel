# Hazard analysis and risk controls

Version 1.0 · 2026-10-17. Structure follows ISO 14971 (hazard → cause → harm → control → verification → residual risk). This is a developer's analysis and has **not** been reviewed by a clinician or a regulatory specialist.

Severity: S3 serious harm possible · S2 moderate · S1 minor. Likelihood after controls: L3 plausible · L2 unlikely · L1 rare. Verification references point to code, tests or `EVALS.md`.

| ID | Hazard | Cause | Possible harm | Controls | Verification | Residual |
|---|---|---|---|---|---|---|
| H1 | False reassurance: serious interaction shown as "nothing found" | Label does not name the drug; wording not matched; drug class missing; label not retrieved | S3: user combines medicines without advice | Three evidence layers (label text, class terms, FDA CYP/transporter table); class terms filled from all labels and NIH RxClass; "nothing found" text says labels are incomplete and to ask a pharmacist | `EVALS.md` false-reassurance metric on development and held-out sets; release gate threshold 0% (`evals/thresholds.json`) | **S3 · L3.** Internal sets: 0 misses after fixes, but the independent DDInter benchmark shows Pharvel does not flag 14–18% of interactions rated Major there across three independent samples (pooled recall 83.6%) (`evals/BENCHMARK.md`). This is the largest residual risk |
| H2 | Severity under-rated (serious shown as documented) | Label wording does not use serious language (e.g. warfarin bleeding table) | S2–S3 | Boxed-warning and contraindication sections, including class-level mentions, set "serious"; strong-inhibitor-on-sensitive-substrate rule | "Serious pairs rated serious" in `EVALS.md` | S2 · L3. Known cases listed in `EVALS.md` |
| H3 | Severity over-rated | "Avoid"/"do not exceed" wording in moderate interactions | S1: unnecessary worry, possible non-adherence | Narrow severity vocabulary; every result tells the user not to change medicines on their own | "Documented pairs rated serious" in `EVALS.md` | S1 · L3 |
| H4 | Wrong medicine recognised | Ambiguous names, combination products, misspellings | S3: check performed on the wrong drug | RxNorm resolution; recognised names shown as chips before results; spelling corrections shown ("Read as: …"); longest phrase wins | Name resolution metric; engine tests | S2 · L2. External audit found everyday words resolving to unrelated concepts (fixed: denylist, extract rejection, confidence ranking) |
| H5 | Misquoted or invented label text | Quote assembly errors; model rewrite inventing content | S3 | Quotes cut directly from label text, removals marked "…"; model output checked by `faithfulness()` and rejected on unsupported numbers, medicines, "safe" claims or missing pairs | Quote integrity 100% (re-verified against source sections); `test/guardrails.test.mjs` | S2 · L1 |
| H6 | Emergency not recognised | User describes overdose, poisoning, breathing trouble | S3: delayed care | Emergency detection runs before any lookup; emergency numbers shown | 10+ trigger and must-not-trigger tests; guardrail metric | S3 · L2. Rewritten after the external audit; red-team corpus (dev 36/36, held-out 13/13 emergencies caught) gated in release. Pattern-based; cannot catch every phrasing |
| H7 | Emergency false alarm | Question about a symptom treated as an emergency | S1: user not helped | Question-form detection for symptom words | Guardrail cases incl. must-not-trigger | S1 · L2 |
| H8 | Dosing advice given | Model or text implying a dose | S3 | Dose questions get a fixed referral; faithfulness check rejects unsupported numbers and instructions | Guardrail tests | S2 · L1 |
| H9 | Patient-specific risk ignored | Pregnancy, children, kidney/liver disease, older adults | S3 | Scope notice when mentioned; out-of-scope statement on Limitations page | `scope()` tests | S3 · L2. Users who do not mention it get no notice |
| H10 | Data source outage shown as "nothing found" | openFDA/RxNorm unavailable | S3 | Missing label → pair marked "unchecked"; one automatic retry; visible error with retry button | Fail-safe check in `npm run eval` (PASS) | S2 · L1 |
| H11 | Outdated label | Label updated after retrieval | S2 | Live retrieval; 7-day answer cache; label date shown; cache key versioned on engine changes | Manual | S2 · L2 |
| H12 | Adverse-event counts misread as risk | FAERS counts reflect usage, not causation | S2 | Never used to flag or rate; every display states reports are not proof | Eval method (FAERS excluded from flag) | S1 · L2 |
| H13 | Prompt injection alters output | Text in user message or label instructing a model | S3 (only when model layer is on) | Inputs passed as tagged data; injection attempts flagged; output faithfulness check | Guardrail tests | S2 · L1 |
| H14 | Privacy breach | Storing health questions or identity | S2 | No accounts; questions not stored; IPs hashed; aggregates only; feedback limited to 300 chars without identity | `docs/PRIVACY.md` | S1 · L1 |
| H15 | Coverage gap outside US | Non-US brand names and products | S2 | Stated in Limitations; unrecognised names reported to the user | Manual | S2 · L3 |

| H16 | Duplicate medicine not noticed | Brand and generic of the same drug typed together | S3: double dose (e.g. acetaminophen) | Duplicate notice (external audit finding 8) | Audit reproduction | S2 · L1 |
| H17 | Summary states the wrong direction | Pattern borrowed from a neighbouring sentence; prodrugs | S2–S3 | Lines only from the quoted sentence; direction and prodrug checks (finding 3) | Audit reproductions | S2 · L2 |
| H18 | Degraded result cached | Transient upstream failure | S3 | Degraded results never cached; partial-outage fail-safe test (finding 6) | Fail-safe check | S2 · L1 |

See `docs/EXTERNAL_AUDIT_2026-10-17.md` for the full external audit.

## Open actions
1. Clinical review of reference sets and a sample of outputs (`evals/review/`).
2. Held-out v2 written by someone other than the developer.
3. Formal regulatory assessment (`docs/REGULATORY.md`).
