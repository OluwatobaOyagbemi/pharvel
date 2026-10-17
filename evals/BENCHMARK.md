# External benchmark summary

Reference: DDInter 2.0 (Xiong G. et al., *Nucleic Acids Research* 2022), used for **non-commercial evaluation only** (CC BY-NC-SA 4.0). DDInter data is kept in the git-ignored eval cache and is never deployed or shown to users. Neither source is ground truth: DDInter rates clinical significance from the literature; Pharvel reports what FDA labels and FDA's CYP/transporter table say.

| Run | Sample | DDInter Major flagged | Major rated serious | Moderate flagged | No-record pairs flagged | κ |
|---|---|---|---|---|---|---|
| v1 (before changes) | 54 common drugs, 250 pairs, seed 20261017 | **82.5%** (66/80; CI 72.7–89.3%) | 50.0% | 60.0% | 33.3% | 0.35 |
| v2 (after fixes developed on separate dev cases) | 68 different drugs, 242 unseen pairs, seed 77 | **86.3%** (69/80; CI 77.0–92.1%) | 43.8% | 47.5% | 31.7% | 0.27 |
| v3 (after a second round of fixes on dev cases D25–D28) | 78 further drugs, 242 unseen pairs, seed 303 | **81.9%** (59/72; CI 71.5–89.1%) | 47.2% | 50.0% | 26.7% | 0.28 |

**Reading:** across three independent samples Pharvel flags **82–86%** of the interactions an independent curated database rates Major (pooled 194/232 = 83.6%). Two rounds of fixes worked on the development cases they targeted but did **not** move the independent number: the misses spread across ever more varied patterns. Conclusion: matching FDA label text plateaus at roughly 82–86% recall for serious interactions, because labels do not name every interaction recorded in curated databases. Going meaningfully higher requires a curated interaction source in the product (e.g. a DrugBank licence), not more matching rules. Pharvel rates fewer than half of the Major pairs it flags as serious, because label wording rarely matches clinical-severity ratings.

**Misses by pattern**
- v1 (fixed afterwards on dev cases D21–D24): QT-prolongation wording; seizure-threshold and CNS-depressant wording; enzyme-group wording ("CYP3A4 inhibitors").
- v2 (fixed afterwards on dev cases D25–D28, re-measured in v3): serotonergic combinations described only as "serotonin syndrome" (ondansetron with tricyclics, triptans, buspirone); nephrotoxic combinations with tacrolimus (NSAIDs, acyclovir, colchicine); class wording not yet recognised (methotrexate + penicillins; tizanidine + hydroxychloroquine).

- v3 (not fixed; long tail): anticoagulant + antiplatelet (edoxaban with ticagrelor or cilostazol), QT combinations not phrased as a group (granisetron, sotalol, doxepin), immunosuppression (clozapine + azathioprine), steroid exposure (posaconazole + methylprednisolone).

Full reports: [BENCHMARK-v1.md](BENCHMARK-v1.md) · [BENCHMARK-v2.md](BENCHMARK-v2.md) · [BENCHMARK-v3.md](BENCHMARK-v3.md). Re-run: `node evals/benchmark-ddinter.mjs [--pool 2] [--seed N] [--exclude-seen]`.
