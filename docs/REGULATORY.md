# Regulatory assessment

Version 0.2 · 2026-10-17 · **Not legal advice.** Prepared by the developer from FDA's published guidance to structure, and shorten, a review by a qualified regulatory specialist. Quotations below were extracted from the FDA PDFs on 2026-10-17.

## United States (FDA)

### Sources read
- FDA, *Clinical Decision Support Software*, guidance issued January 29, 2026 (supersedes January 6, 2026). https://www.fda.gov/media/109618/download
- FDA, *Policy for Device Software Functions and Mobile Medical Applications*, September 2022 (current). https://www.fda.gov/media/80958/download
- FD&C Act section 520(o)(1)(E) (non-device CDS criteria).

### What the guidance says
1. **Patient-facing decision support is a device by definition.** CDS guidance (2026): *"Software functions that support or provide recommendations to patients or caregivers – not HCPs – meet the definition of a device."* The statutory non-device CDS exclusion therefore does not apply to Pharvel, which is intended for patients and caregivers.
2. **But existing digital-health policies still apply to such software.** CDS guidance (2026): *"FDA's existing digital health policies continue to apply to software functions that meet the definition of a device, including those that are intended for use by patients or caregivers"*, and FDA *"intends to be consistent with existing policies (including … Policy for Device Software Functions and Mobile Medical Applications …)"*.
3. **That policy lists this exact function under enforcement discretion.** Policy for Device Software Functions (2022), **Appendix B, "Examples of Software Functions for which FDA intends to exercise enforcement discretion", item 18:** *"Software functions that provide patients and/or caregivers information about drug-drug interactions and relevant safety information (side effects, drug interactions, active ingredient) as a report based on demographic data (e.g., age, sex), clinical information (current diagnosis), and current medications."* Appendix B covers software that *"MAY meet the definition of medical device but for which FDA intends to exercise enforcement discretion."*
4. **Expectations for drug-interaction software (HCP context, useful as good practice).** CDS guidance (2026), footnote to its drug-interaction examples: information *"should be kept up-to-date while prominently displaying the source of the information (e.g., FDA-approved labeling) … software that provides alerts for potential drug-drug interactions should provide a link directly to a trusted and up-to-date source for that information (e.g., DailyMed for drug labeling)."*

### Mapping Pharvel to item 18
| Element of item 18 | Pharvel |
|---|---|
| For patients and/or caregivers | Yes (`docs/INTENDED_USE.md`) |
| Information about drug-drug interactions and relevant safety information | Yes: label passages, plain summaries, mechanism, adverse-event counts |
| Based on demographics, diagnosis and current medications | Current medications only. Pharvel does not use age, sex or diagnosis; it shows a scope notice when they are mentioned. This is narrower than item 18 describes, not broader |
| Good-practice expectations (source shown, link to DailyMed, up to date) | Every finding quoted with a DailyMed link and label date; live retrieval |

### Preliminary conclusion
Pharvel's function appears to match Appendix B item 18 closely. If so, it may meet the definition of a device, but FDA has stated it intends to exercise enforcement discretion, meaning it does not intend to enforce device requirements (such as premarket review) for this type of function at this time.

### What would change this
Enforcement discretion is a policy, not an exemption. The position could change if Pharvel:
- gave **doses or dose adjustments** (dose calculation is a focus of oversight; Pharvel refuses dosing — `lib/guardrails.js`);
- issued **patient-specific treatment recommendations** ("stop drug X") rather than information;
- used **patient data to generate individualised risk scores**;
- was marketed with **claims to diagnose, treat or prevent** a condition, or to replace a pharmacist;
- was integrated into a **provider, pharmacy or EHR workflow** (changes intended use and users).
FDA may also revise the policy. Re-check both guidance documents at every major release.

## European Union (MDR 2017/745)
Software providing information used for therapeutic decisions can qualify as a device (MDCG 2019-11); if in scope, Rule 11 would likely give class IIa or higher. The EU has no equivalent of FDA's enforcement-discretion list. Pharvel is not marketed in the EU. **Specialist review required before any EU promotion.**

## Nigeria (NAFDAC)
NAFDAC regulates medical devices, including software. US labeling may not match Nigerian products. **Check NAFDAC requirements before promoting to Nigerian users.**

## Questions for the specialist (briefing pack)
1. Does Pharvel fall within Appendix B item 18 of the 2022 software-functions policy, given it uses current medications only and the 2026 CDS guidance?
2. Do the plain-language summaries ("What can happen", "What the label advises", "Why it happens") remain "information", or could any be read as a recommendation?
3. Does the optional AI rewrite change the analysis?
4. Would a paid tier, a printable report, or a pharmacy partnership change intended use?
5. Are the disclaimers, Limitations page and Terms adequate for the US; what is needed for EU, UK and Nigeria?
6. Is a 513(g) request for information worthwhile for written FDA feedback?

Supporting material for the specialist: `docs/INTENDED_USE.md`, `docs/RISK.md`, `docs/MODEL_CARD.md`, `EVALS.md`, `/limitations.html`, `/terms.html`.

## Low-cost routes to a qualified opinion
- **FDA Digital Health Center of Excellence** — accepts general questions about whether software is a device (no fee for informal questions).
- **513(g) request** — formal written FDA classification feedback; a user fee applies (reduced for small businesses; check FDA's current user-fee table).
- **University law-school clinics** and regulatory-affairs programmes often review student or start-up projects for free.
- **A regulatory consultant for a one-hour review** of this document plus the briefing questions.
