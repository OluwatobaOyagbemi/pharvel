# Changelog

## 2026-10-17 (external audit remediation, engine 20)
- Independent external audit: 25 findings (1 critical, 8 high). 22 fixed, 2 partly fixed (openFDA key needs the owner; deploys outside `npm run release` still possible), 1 open (quote relevance). Full record: `docs/EXTERNAL_AUDIT_2026-10-17.md`.
- Critical fix: emergency detection rewritten and gated by a red-team corpus with a held-out part.
- Evaluation scoring made stricter (target pair only, visible severity, circular cases excluded, quote order); results before this date used a looser rule.
- New visible severity "Predicted from FDA enzyme table"; duplicate-medicine and dropped-medicine notices; security headers; privacy notice corrected.

## 2026-10-17 (help guardrail)
- Found by the owner while testing: "please help me" got a cold "could not recognise a medicine" reply. New guardrail: calls for help or descriptions of feeling unwell get urgent-help routes (911, Poison Control, a pharmacist) and an explanation of what Pharvel does; with medicines named, a short symptoms note is added above the check. First version also caught "is X a side effect of Y?" questions; the release gate blocked it and the trigger was narrowed. Guardrail tests 20/20 dev, 10/10 held-out.

## 2026-10-17 (benchmark v3)
- Fixes developed on new dev cases D25–D28: serotonergic and nephrotoxic effect groups read from each drug's own label; penicillin/cephalosporin/aminoglycoside class words; class warnings whose governing sentence names a life-threatening outcome (fatal, respiratory depression, serotonin syndrome…) rate serious. Held-out over-rating rose from 37.5% to 43.8% (accepted trade-off, reported).
- Benchmark v3 on a third, disjoint pool of 78 drugs: 81.9% of DDInter Major pairs flagged. Across v1–v3 recall is 82–86% (pooled 83.6%) and fixes did not move it: label-text matching plateaus. Limitations page updated to "82–86%, roughly 1 in 6".
- Repository prepared for GitHub (README front page for reviewers).

## 2026-10-17 (later)
- **Regulatory research:** `docs/REGULATORY.md` v0.2 quotes FDA's CDS guidance (January 29, 2026) and Policy for Device Software Functions (September 2022). Patient-facing drug-interaction information matches Appendix B item 18 (enforcement discretion). Briefing questions and low-cost routes to a qualified opinion added. Not legal advice.
- **External benchmark vs DDInter 2.0** (non-commercial evaluation only; data not deployed). v1: 82.5% of DDInter Major pairs flagged (14 misses). Fixes developed on new dev cases D21–D24: effect groups read from each drug's own label (QT prolongation, seizures), enzyme-group terms from FDA's CYP table ("CYP3A4 inhibitors"), antipsychotic/opioid CNS-depressant and antidepressant class terms. v2 on 68 different drugs and unseen pairs: 86.3% (11 misses; difference within confidence intervals, not claimed as improvement). Open patterns recorded in `evals/BENCHMARK.md`.
- Limitations page now states the benchmark result plainly (about 1 in 7 serious interactions not flagged). Risk H1 residual raised to S3·L3.

## 2026-10-17
- **Audit remediation.** Held-out evaluation set (53 cases) frozen before its first run; 95% Wilson confidence intervals; readability score; fail-safe check; clinical review sheet; release gate with thresholds; CI workflow.
- **Held-out v1 first run:** false reassurance on serious pairs 1/22 (sumatriptan + phenelzine), recall 92.1%, guardrails 9/10 (a symptom question triggered the emergency response). Recorded unchanged in `evals/history.json`.
- **Fixes developed on new development cases D17–D20 and new guardrail cases:** drug classes taken from all retrieved labels and NIH RxClass when the primary label omits them; mineral class terms (multivalent cations, iron preparations, magnesium-containing antacids); MAO-A wording; symptom questions no longer treated as emergencies. Held-out v1 marked as seen; future fixes need held-out v2.
- New dev false alarm accepted and reported: amlodipine + metformin (metformin label lists calcium channel blockers among drugs affecting glycaemic control; reference set says not clinically significant). Flagged for pharmacist adjudication.
- **Scope notice** for pregnancy, children, kidney or liver disease and older adults.
- **Report a problem** form; reports stored without identity; `npm run feedback` for triage.
- Answer origin shown ("assembled by fixed rules" vs "AI-written, checked"); safety signals on `/stats.html`.
- Governance documents in `docs/`; public Limitations, Privacy and Terms pages.

## 2026-10-17 (earlier)
- Guardrails (emergency, dosing, injection, faithfulness); evaluation harness; four-part summaries; verbatim quotes; St John's wort; precise ingredients; class-level boxed warnings; de-duplicated quotes.

## 2026-10-11
- FDA CYP/transporter mechanism layer; FAERS real-world reports; DDInter removed (non-commercial licence); 2D structures and property notes.
