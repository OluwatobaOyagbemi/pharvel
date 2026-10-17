# Data sources and licences

| Source | Used for | Access | Licence | Refresh |
|---|---|---|---|---|
| NIH RxNorm (RxNav REST) | Name → ingredient resolution, spelling suggestions | Live API | US Government work; RxNorm content from NLM, free to use (UMLS licence terms apply only to some source vocabularies, not used here) | Live per request; answers cached 7 days |
| NIH RxClass (RxNav) | FDA established pharmacologic class when labels omit it | Live API | As above | Live |
| openFDA drug label endpoint (SPL) | Label sections quoted to users | Live API | Public domain (CC0) per openFDA terms | Live; label date shown to users |
| DailyMed | Source links for every quote | Link only | Public | — |
| FDA, Drugs that interact with CYP enzymes and transporter systems (examples table) | Mechanism layer (`lib/mechanism.js`) | Encoded in code, 2026-10-11 | US Government work, public domain | Manual; re-check against FDA page at each release |
| openFDA FAERS (drug event endpoint) | Co-report counts and top reported reactions | Live API | Public domain (CC0); FDA disclaimer applies: reports are unverified and do not establish causation | Live |
| PubChem | 3D conformers, 2D images, computed properties | Live API (browser) | Public domain data from NCBI | Live |

**Removed:** DDInter 2.0 (CC BY-NC-SA 4.0, non-commercial) on 2026-10-11, so that no source restricts commercial use.

**Rule for new sources:** a source may be added only with its licence recorded here, and only if it permits the intended use (including commercial use if a paid tier is planned).

**Evaluated, not used — DrugBank (2026-10-17):** interaction data is available only under the Academic License (free, CC BY-NC 4.0, for students, faculty or research staff at an academic institution building a tool solely for academic purposes; requires an account and approved application) or a paid commercial licence. Academic downloads were marked "temporarily unavailable" on the release page, and the CC0 Open Data (vocabulary and structures) contains no interaction data and returned HTTP 403 to unauthenticated download. Revisit if a commercial licence is purchased or academic access is granted to the owner.
