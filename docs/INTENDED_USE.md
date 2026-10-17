# Intended use statement

Version 1.0 · 2026-10-17 · Owner: Oluwatoba S. Oyagbemi

## Purpose
Pharvel helps a person read what US FDA drug labels say about using two or more medicines together. For each pair it shows the label passage that mentions the other medicine or its drug class, a fixed plain-language summary of that passage, the enzyme or transporter mechanism listed by FDA where one applies, and how many FDA adverse-event reports list both medicines.

## Intended users
Primary: adults who take, or care for someone who takes, more than one medicine, and who want to prepare questions for a pharmacist or prescriber.
Secondary: students and portfolio reviewers.
**Not intended for** clinicians making prescribing decisions, or for use in place of a clinical interaction-checking system.

## Supported decision
Whether to ask a pharmacist or prescriber about a combination, and what to ask. Pharvel does not tell anyone to start, stop or change a medicine, and does not give doses.

## Out of scope (stated to users)
- Dosing, dose adjustment, and timing advice (dose questions receive a fixed referral; see `lib/guardrails.js`).
- Patient-specific factors: pregnancy and breastfeeding, children, older adults, kidney or liver disease, allergies, genetics. Messages mentioning these receive a scope notice.
- Supplements, herbal products and foods, except where an FDA label or FDA's CYP/transporter table names them.
- Medicines and labeling outside the United States.
- Emergencies: messages describing one are answered only with emergency guidance.

## Worst credible outcome
**False reassurance:** a person reads "nothing found" for a dangerous combination and takes both medicines without advice. This is the primary safety metric (`EVALS.md`) and the first hazard in `docs/RISK.md`.

## Claims
Pharvel claims only that it shows what the cited FDA labels and FDA tables say, with links. It never states that a combination is safe. Every result is accompanied by an instruction to confirm with a pharmacist or prescriber.
