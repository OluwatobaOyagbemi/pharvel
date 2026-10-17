# External benchmark: Pharvel vs DDInter 2.0

Run 2026-10-17. Reference: DDInter 2.0 (Xiong G. et al., *Nucleic Acids Research* 2022), an independently curated drug–drug interaction database with Major / Moderate / Minor ratings. **Used for non-commercial evaluation only (CC BY-NC-SA 4.0); DDInter data is not deployed or shown to users.**

## Design
- Run v3: fresh sample (seed 303) excluding 600 pairs already used in benchmark v1 or in Pharvel's own test sets, measured after fixes developed on separate development cases.
- 74 commonly used medicines; all pairs between them looked up in DDInter and grouped by DDInter rating.
- Stratified random sample with a fixed seed: up to 80 Major, 80 Moderate, 30 Minor and 60 pairs with no DDInter record (242 pairs in total).
- Each pair run through the production pipeline (adverse-event lookups skipped; they never affect flags).
- Neither source is ground truth. DDInter rates clinical significance from the literature; Pharvel reports what FDA labels and FDA's CYP/transporter table say. Disagreements are where a pharmacist should look.

## Results
| Measure | Result |
|---|---|
| **DDInter Major pairs flagged by Pharvel** | **81.9% (59/72; 95% CI 71.5–89.1%)** |
| DDInter Major pairs rated serious by Pharvel | 47.2% (34/72; 95% CI 36.1–58.6%) |
| DDInter Moderate pairs flagged by Pharvel | 50.0% (40/80; 95% CI 39.3–60.7%) |
| DDInter Minor pairs flagged by Pharvel | 33.3% (10/30; 95% CI 19.2–51.2%) |
| Pairs with no DDInter record flagged by Pharvel | 26.7% (16/60; 95% CI 17.1–39.0%) |
| Pairs Pharvel could not check (label unavailable) | 0 |
| Agreement on serious / interaction / none (Cohen's κ) | 0.28 (observed agreement 52.9%) |

Agreement table (rows DDInter, columns Pharvel):

| DDInter \ Pharvel | none | interaction | serious |
|---|---|---|---|
| Minor or no record | 64 | 19 | 7 |
| Moderate | 40 | 30 | 10 |
| Major | 13 | 25 | 34 |

## DDInter Major pairs Pharvel did not flag
These are the most important disagreements: candidates for false reassurance, to be adjudicated by a pharmacist.

| Pair | DDInter | Pharvel |
|---|---|---|
| dronedarone + granisetron | Major | none |
| cilostazol + moxifloxacin | Major | none |
| edoxaban + felodipine | Major | none |
| doxepin + zonisamide | Major | none |
| edoxaban + ticagrelor | Major | none |
| sulfasalazine + sirolimus | Major | none |
| doxepin + granisetron | Major | none |
| edoxaban + cilostazol | Major | none |
| posaconazole + methylprednisolone | Major | none |
| sotalol + granisetron | Major | none |
| doxepin + clozapine | Major | none |
| clozapine + azathioprine | Major | none |
| cilostazol + sotalol | Major | none |

## Pairs Pharvel rated serious that DDInter rates Minor or has no record
| Pair | DDInter | Pharvel |
|---|---|---|
| eletriptan + voriconazole | none | major / CYP3A-strong |
| lurasidone + pregabalin | none | major |
| lurasidone + paliperidone | none | major |
| cilostazol + eplerenone | none | major / CYP3A-weak |
| vortioxetine + clomipramine | none | major |
| meperidine + atomoxetine | none | major |
| olmesartan + bumetanide | none | major |

## Notes
- A pair absent from DDInter is not proof of no interaction, and a label mention is not proof of clinical significance.
- The sample is drawn from 74 common medicines; results may not generalise to rarer drugs.
- Re-run: `node evals/benchmark-ddinter.mjs` (DDInter CSVs must be in `evals/.cache/ddinter/`).
