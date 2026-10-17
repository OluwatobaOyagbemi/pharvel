# External benchmark: Pharvel vs DDInter 2.0

Run 2026-10-17. Reference: DDInter 2.0 (Xiong G. et al., *Nucleic Acids Research* 2022), an independently curated drug–drug interaction database with Major / Moderate / Minor ratings. **Used for non-commercial evaluation only (CC BY-NC-SA 4.0); DDInter data is not deployed or shown to users.**

## Design
- Run v2: fresh sample (seed 77) excluding 507 pairs already used in benchmark v1 or in Pharvel's own test sets, measured after fixes developed on separate development cases.
- 67 commonly used medicines; all pairs between them looked up in DDInter and grouped by DDInter rating.
- Stratified random sample with a fixed seed: up to 80 Major, 80 Moderate, 30 Minor and 60 pairs with no DDInter record (242 pairs in total).
- Each pair run through the production pipeline (adverse-event lookups skipped; they never affect flags).
- Neither source is ground truth. DDInter rates clinical significance from the literature; Pharvel reports what FDA labels and FDA's CYP/transporter table say. Disagreements are where a pharmacist should look.

## Results
| Measure | Result |
|---|---|
| **DDInter Major pairs flagged by Pharvel** | **86.3% (69/80; 95% CI 77.0–92.1%)** |
| DDInter Major pairs rated serious by Pharvel | 43.8% (35/80; 95% CI 33.4–54.7%) |
| DDInter Moderate pairs flagged by Pharvel | 47.5% (38/80; 95% CI 36.9–58.3%) |
| DDInter Minor pairs flagged by Pharvel | 18.2% (4/22; 95% CI 7.3–38.5%) |
| Pairs with no DDInter record flagged by Pharvel | 31.7% (19/60; 95% CI 21.3–44.2%) |
| Pairs Pharvel could not check (label unavailable) | 0 |
| Agreement on serious / interaction / none (Cohen's κ) | 0.27 (observed agreement 51.7%) |

Agreement table (rows DDInter, columns Pharvel):

| DDInter \ Pharvel | none | interaction | serious |
|---|---|---|---|
| Minor or no record | 59 | 19 | 4 |
| Moderate | 42 | 31 | 7 |
| Major | 11 | 34 | 35 |

## DDInter Major pairs Pharvel did not flag
These are the most important disagreements: candidates for false reassurance, to be adjudicated by a pharmacist.

| Pair | DDInter | Pharvel |
|---|---|---|
| nortriptyline + ondansetron | Major | none |
| meloxicam + tacrolimus | Major | none |
| amoxicillin + methotrexate | Major | none |
| acyclovir + tacrolimus | Major | none |
| tizanidine + hydroxychloroquine | Major | none |
| amitriptyline + ondansetron | Major | none |
| sumatriptan + ondansetron | Major | none |
| buspirone + codeine | Major | none |
| diclofenac + tacrolimus | Major | none |
| buspirone + ondansetron | Major | none |
| tacrolimus + colchicine | Major | none |

## Pairs Pharvel rated serious that DDInter rates Minor or has no record
| Pair | DDInter | Pharvel |
|---|---|---|
| mirtazapine + fentanyl | none | major |
| mirtazapine + buprenorphine | none | major |
| tadalafil + itraconazole | none | major / CYP3A-strong |
| codeine + ketoconazole | none | major |

## Notes
- A pair absent from DDInter is not proof of no interaction, and a label mention is not proof of clinical significance.
- The sample is drawn from 67 common medicines; results may not generalise to rarer drugs.
- Re-run: `node evals/benchmark-ddinter.mjs` (DDInter CSVs must be in `evals/.cache/ddinter/`).
