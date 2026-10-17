# External benchmark: Pharvel vs DDInter 2.0

Run 2026-10-17. Reference: DDInter 2.0 (Xiong G. et al., *Nucleic Acids Research* 2022), an independently curated drug–drug interaction database with Major / Moderate / Minor ratings. **Used for non-commercial evaluation only (CC BY-NC-SA 4.0); DDInter data is not deployed or shown to users.**

## Design
- 54 commonly used medicines; all pairs between them looked up in DDInter and grouped by DDInter rating.
- Stratified random sample with a fixed seed: up to 80 Major, 80 Moderate, 30 Minor and 60 pairs with no DDInter record (250 pairs in total).
- Each pair run through the production pipeline (adverse-event lookups skipped; they never affect flags).
- Neither source is ground truth. DDInter rates clinical significance from the literature; Pharvel reports what FDA labels and FDA's CYP/transporter table say. Disagreements are where a pharmacist should look.

## Results
| Measure | Result |
|---|---|
| **DDInter Major pairs flagged by Pharvel** | **82.5% (66/80; 95% CI 72.7–89.3%)** |
| DDInter Major pairs rated serious by Pharvel | 50.0% (40/80; 95% CI 39.3–60.7%) |
| DDInter Moderate pairs flagged by Pharvel | 60.0% (48/80; 95% CI 49.0–70.0%) |
| DDInter Minor pairs flagged by Pharvel | 33.3% (10/30; 95% CI 19.2–51.2%) |
| Pairs with no DDInter record flagged by Pharvel | 33.3% (20/60; 95% CI 22.7–45.9%) |
| Pairs Pharvel could not check (label unavailable) | 0 |
| Agreement on serious / interaction / none (Cohen's κ) | 0.35 (observed agreement 56.8%) |

Agreement table (rows DDInter, columns Pharvel):

| DDInter \ Pharvel | none | interaction | serious |
|---|---|---|---|
| Minor or no record | 60 | 24 | 6 |
| Moderate | 32 | 42 | 6 |
| Major | 14 | 26 | 40 |

## DDInter Major pairs Pharvel did not flag
These are the most important disagreements: candidates for false reassurance, to be adjudicated by a pharmacist.

| Pair | DDInter | Pharvel |
|---|---|---|
| bupropion + hydrocodone | Major | none |
| citalopram + fluconazole | Major | none |
| morphine + quetiapine | Major | none |
| hydrocodone + amiodarone | Major | none |
| clopidogrel + fluconazole | Major | none |
| citalopram + clarithromycin | Major | none |
| bupropion + morphine | Major | none |
| escitalopram + clarithromycin | Major | none |
| escitalopram + fluconazole | Major | none |
| bupropion + quetiapine | Major | none |
| hydrocodone + ciprofloxacin | Major | none |
| bupropion + ciprofloxacin | Major | none |
| bupropion + oxycodone | Major | none |
| bupropion + lithium | Major | none |

## Pairs Pharvel rated serious that DDInter rates Minor or has no record
| Pair | DDInter | Pharvel |
|---|---|---|
| omeprazole + clarithromycin | Minor | contraindicated |
| clarithromycin + fluconazole | Minor | major |
| aspirin + furosemide | Minor | major |
| venlafaxine + tramadol | none | major |
| sertraline + amiodarone | none | major |
| citalopram + amiodarone | none | major |

## Notes
- A pair absent from DDInter is not proof of no interaction, and a label mention is not proof of clinical significance.
- The sample is drawn from 54 common medicines; results may not generalise to rarer drugs.
- Re-run: `node evals/benchmark-ddinter.mjs` (DDInter CSVs must be in `evals/.cache/ddinter/`).
