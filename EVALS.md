# Pharvel evaluation

Run 2026-10-22 · extractive engine (no LLM) · cost $0 · 0 live API calls, 1303 replayed from the recorded cache · 3 s.

Expectations come from FDA labeling and FDA's CYP/transporter guidance (field `basis` in each case), not from Pharvel's output. **The reference sets have not yet been reviewed by a pharmacist**; a review sheet is generated at `evals/review/review-2026-10-22.csv`.

Percentages carry 95% Wilson confidence intervals. With sets this small the intervals are wide: 0 misses out of 22 serious held-out pairs is still compatible with a true miss rate of up to 14.9%.

**Fail-safe check (label service down):** PASS. total outage → unknown; partial outage → degraded result not cached (yes), healthy re-check level major.

**Topic guardrail** (added 2026-10-22): development — 24/24 off-topic or misuse requests refused, 0/10 medicine questions wrongly blocked; held-out — 11/11, 0/6. Evaluation drug queries blocked by the topic guardrail: 0.

**Symptom red-team** (`evals/redteam.json`, added 2026-10-21): development — 14/14 red-flag symptoms answered as emergencies, 32/32 other symptoms given help, 0/5 side-effect questions wrongly treated as emergencies; held-out (never tuned on) — 6/6, 10/10, 0/3.

**Red-team guardrail corpus** (`evals/redteam.json`): development set — 36/36 emergencies caught, 0/9 false alarms; held-out set (never tuned on) — 13/13 emergencies caught, 1/5 false alarms. False alarms: "does sertraline make you want to die".

Scoring (changed 2026-10-17 after the external audit): only the case's target pair is scored, on the severity the user sees; a missing target pair counts as not flagged. Results before that date used a looser rule and are higher.

Code fingerprint: `70cb4ff8582cca16`.

## Held-out set (`evals/heldout.json`)

52 scored cases: 22 serious, 15 documented, 15 negative controls (1 cases whose expectation comes from FDA's CYP table excluded as circular). **Written and frozen before its first run on 2026-10-17. Its first-run results were then seen, and fixes followed (developed on separate development cases), so it is no longer independent; the first-run row in the history is the independent measurement.**

| Metric | Result | Meaning |
|---|---|---|
| **False reassurance, serious pairs** | **0% (0/22; 95% CI 0–14.9%)** | Serious interactions shown as "nothing found". |
| False reassurance, all real interactions | 0% (0/37; 95% CI 0–9.4%) | Including documented interactions. |
| Recall | 100% (37/37; 95% CI 90.6–100%) | Real interactions flagged by at least one source. |
| Serious pairs rated serious | 95.5% (21/22; 95% CI 78.2–99.2%) | Flagged at the right severity. |
| Documented pairs rated serious | 46.7% (7/15; 95% CI 24.8–69.9%) | Over-rating. |
| False alarms on negative controls | 0% (0/15; 95% CI 0–20.4%) | Controls flagged anyway. |
| Name resolution | 100% (52/52; 95% CI 93.1–100%) | Every expected medicine recognised. |
| Quote integrity | 100% (131/131; 95% CI 97.2–100%) | Quotes found verbatim in the cited label section. |
| Guardrail detection | 100% (10/10; 95% CI 72.2–100%) | Emergency, dosing, injection; includes must-not-trigger cases. |
| Readability of summaries | Flesch 58.2 (37 summaries) | 60–70 is plain English; 50–60 fairly difficult. |

Caught by: FDA label text 100% · FDA CYP/transporter table 29.7% of real interactions.

**Serious pairs rated below serious**

| Case | Query | Expected | Got |
|---|---|---|---|
| HS13 | warfarin and clopidogrel | serious | Warfarin+Clopidogrel:moderate |

**Documented pairs rated serious**

| Case | Query | Expected | Got |
|---|---|---|---|
| HD02 | tacrolimus and fluconazole | documented | Tacrolimus+Fluconazole:major/CYP3A-moderate |
| HD08 | glipizide and fluconazole | documented | Glipizide+Fluconazole:major |
| HD11 | furosemide and gentamicin | documented | Furosemide+Gentamicin:major |
| HD13 | escitalopram and ibuprofen | documented | Escitalopram+Ibuprofen:major |
| HD14 | rosuvastatin and gemfibrozil | documented | Rosuvastatin+Gemfibrozil:major/OATP1B1-moderate |
| HD15 | quetiapine and ketoconazole | documented | Quetiapine+Ketoconazole:major/CYP3A-strong |
| HD16 | Eliquis and ibuprofen | documented | Apixaban+Ibuprofen:major |

## Development set (`evals/pairs.json`)

79 scored cases: 45 serious, 22 documented, 12 negative controls (1 cases whose expectation comes from FDA's CYP table excluded as circular). Used to find and fix bugs, so results here are optimistic.

| Metric | Result | Meaning |
|---|---|---|
| **False reassurance, serious pairs** | **0% (0/45; 95% CI 0–7.9%)** | Serious interactions shown as "nothing found". |
| False reassurance, all real interactions | 0% (0/67; 95% CI 0–5.4%) | Including documented interactions. |
| Recall | 100% (67/67; 95% CI 94.6–100%) | Real interactions flagged by at least one source. |
| Serious pairs rated serious | 88.9% (40/45; 95% CI 76.5–95.2%) | Flagged at the right severity. |
| Documented pairs rated serious | 22.7% (5/22; 95% CI 10.1–43.4%) | Over-rating. |
| False alarms on negative controls | 8.3% (1/12; 95% CI 1.5–35.4%) | Controls flagged anyway. |
| Name resolution | 100% (79/79; 95% CI 95.4–100%) | Every expected medicine recognised. |
| Quote integrity | 100% (196/196; 95% CI 98.1–100%) | Quotes found verbatim in the cited label section. |
| Guardrail detection | 100% (20/20; 95% CI 83.9–100%) | Emergency, dosing, injection; includes must-not-trigger cases. |
| Readability of summaries | Flesch 58.6 (68 summaries) | 60–70 is plain English; 50–60 fairly difficult. |

Caught by: FDA label text 100% · FDA CYP/transporter table 28.4% of real interactions.

**Serious pairs rated below serious**

| Case | Query | Expected | Got |
|---|---|---|---|
| S10 | warfarin and aspirin | serious | Warfarin+Aspirin:moderate |
| S11 | warfarin and fluconazole | serious | Warfarin+Fluconazole:moderate/CYP2C9-moderate |
| S21 | digoxin and amiodarone | serious | Digoxin+Amiodarone:moderate/P-gp-moderate |
| D21 | haloperidol and clarithromycin | serious | Haloperidol+Clarithromycin:class |
| D29 | tylenol and alcohol | serious | Acetaminophen+Ethanol:moderate |

**Documented pairs rated serious**

| Case | Query | Expected | Got |
|---|---|---|---|
| D01 | atorvastatin and clarithromycin | documented | Atorvastatin+Clarithromycin:major/CYP3A-strong |
| D08 | amlodipine and simvastatin | documented | Amlodipine+Simvastatin:major |
| D16 | rifampin and warfarin | documented | Rifampin+Warfarin:major/CYP2C9-moderate |
| E06 | can I take Lipitor with Biaxin? | documented | Atorvastatin+Clarithromycin:major/CYP3A-strong |
| D22 | bupropion and haloperidol | documented | Bupropion+Haloperidol:major |
| D30 | aspirin and alcohol | documented | Aspirin+Ethanol:major |

**False alarms on negative controls**

| Case | Query | Expected | Got |
|---|---|---|---|
| N04 | amlodipine and metformin | none | Amlodipine+Metformin:class |

## History

| Date | Set | Change | False reassurance (serious) | Recall | Serious rated serious | Documented over-rated | False alarms | Names | Quotes verbatim | Guardrails |
|---|---|---|---|---|---|---|---|---|---|---|
| 2026-10-17 | dev | baseline (first run) | 2.7% | 98.1% | 81.1% | – | 0% | 98.5% | 94.1% | 14/14 |
| 2026-10-17 | dev | verbatim quotes, St John's wort, precise ingredients, class boxed warnings, narrowed severity words, de-duplicated quotes | 0% | 100% | 91.9% | 23.5% | 0% | 100% | 100% | 14/14 |
| 2026-10-17 | dev | first run of held-out set (frozen 2026-10-17) | 0% | 100% | 91.9% | 23.5% | 0% | 100% | 100% | 14/14 |
| 2026-10-17 | heldout | first run of held-out set (frozen 2026-10-17) | 4.5% | 92.1% | 90.9% | 37.5% | 0% | 100% | 100% | 9/10 |
| 2026-10-17 | dev | mineral class words, MAO-A wording, symptom questions not treated as emergencies (fixed on new dev cases D17-D20) | 2.6% | 98.3% | 89.5% | 20% | 0% | 100% | 100% | 17/17 |
| 2026-10-17 | heldout | mineral class words, MAO-A wording, symptom questions not treated as emergencies (fixed on new dev cases D17-D20) | 4.5% | 97.4% | 90.9% | 37.5% | 0% | 100% | 100% | 10/10 |
| 2026-10-17 | dev | drug classes from all labels plus NIH RxClass fallback (fixed on dev case D17) | 0% | 100% | 92.1% | 20% | 8.3% | 100% | 100% | 17/17 |
| 2026-10-17 | heldout | drug classes from all labels plus NIH RxClass fallback (fixed on dev case D17) | 0% | 100% | 95.5% | 37.5% | 0% | 100% | 100% | 10/10 |
| 2026-10-17 | dev | effect groups from labels (QT, seizures), enzyme-group terms, CNS-depressant and antidepressant classes (fixed on dev cases D21-D24) | 0% | 100% | 90.2% | 23.8% | 8.3% | 100% | 100% | 17/17 |
| 2026-10-17 | heldout | effect groups from labels (QT, seizures), enzyme-group terms, CNS-depressant and antidepressant classes (fixed on dev cases D21-D24) | 0% | 100% | 95.5% | 37.5% | 0% | 100% | 100% | 10/10 |
| 2026-10-17 | dev | serotonergic and nephrotoxic effect groups, antibacterial class words, severe class warnings (fixed on dev cases D25-D28) | 0% | 100% | 90.9% | 22.7% | 8.3% | 100% | 100% | 17/17 |
| 2026-10-17 | heldout | serotonergic and nephrotoxic effect groups, antibacterial class words, severe class warnings (fixed on dev cases D25-D28) | 0% | 100% | 95.5% | 43.8% | 0% | 100% | 100% | 10/10 |
| 2026-10-17 | dev | help/distress guardrail: calls for help and symptoms get urgent-help routes | 0% | 100% | 90.9% | 22.7% | 8.3% | 100% | 100% | 20/20 |
| 2026-10-17 | heldout | help/distress guardrail: calls for help and symptoms get urgent-help routes | 0% | 100% | 95.5% | 43.8% | 0% | 100% | 100% | 10/10 |
| 2026-10-17 | dev | external-audit remediation: stricter scoring (target pair, visible severity, circular cases excluded), red-team corpus, engine fixes | 0% | 100% | 88.9% | 22.7% | 8.3% | 100% | 100% | 20/20 |
| 2026-10-17 | heldout | external-audit remediation: stricter scoring (target pair, visible severity, circular cases excluded), red-team corpus, engine fixes | 0% | 100% | 95.5% | 46.7% | 0% | 100% | 100% | 10/10 |

## Method

- Each case runs the production `analyze()` pipeline: RxNorm name resolution, openFDA label retrieval, the FDA CYP/transporter table and FAERS lookups. Responses are recorded under `evals/.cache/` and replayed so numbers change only when code changes; `--fresh` re-records.
- *Flagged* = a label warning (contraindicated, major, documented or class-level) or a strong/moderate effect predicted from FDA's CYP/transporter table. Adverse-event counts are shown to users but never count as a flag.
- *Rated serious* = contraindicated or serious label warning, or a strong inhibitor acting on a sensitive substrate.
- Quote integrity re-checks every quoted fragment against the full label section it came from.
- The development set was used to find bugs; the held-out set was written and frozen before its first run. Rules are not changed in response to held-out results; failures there are fixed only after adding new development cases that reproduce them, and are then measured on a new held-out set.
- Known limits: small hand-written sets; US labeling only; negative controls mean "no clinically significant interaction expected", not proven safe; remaining severity errors largely reflect label wording (e.g. the warfarin label lists aspirin and SSRIs in the same bleeding-risk table).
