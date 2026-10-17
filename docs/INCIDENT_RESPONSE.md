# Incident response and feedback triage

Owner: Oluwatoba S. Oyagbemi (product and clinical content owner until a clinical reviewer is appointed).

## Sources of incidents
- In-app "Report a problem" (stored in `fb:items`; read with `npm run feedback`).
- Safety signals on `/stats.html` (rejected AI explanations, guardrail counts).
- Release gate failures (`npm run gate`, CI).
- Messages from users or reviewers.

## Severity and response times
| Level | Definition | Examples | Response |
|---|---|---|---|
| P1 | A result could lead to serious harm | Serious interaction shown as "nothing found"; wrong medicine recognised; invented or wrong quote; dosing given | Same day: reproduce, add a failing development case, ship a fix or disable the affected path; post a notice on the site if users may have been affected |
| P2 | Wrong but lower risk | Severity under-rated with the warning still shown; emergency false alarm | Within 7 days |
| P3 | Quality | Unclear wording; over-rating; slow responses | Next release |

## Steps for every P1/P2
1. Reproduce with the exact medicines; record in `CHANGELOG.md`.
2. Add a development case that fails for the same reason (never edit the held-out set).
3. Fix, bump `ENGINE_VERSION` (clears cached answers), run `npm test`, `npm run eval -- --label "..."`, `npm run gate`.
4. Deploy; verify the case on the live site.
5. Review whether a held-out case would have caught it; if not, add the pattern to the next held-out version.

## Kill switch
If a P1 cannot be fixed quickly: set `FREE_CHECKS_PER_DAY=0` in Vercel and redeploy, which returns a polite limit message to every check while the landing page stays up.

## Review cadence
Feedback reviewed weekly; triage outcomes recorded in `CHANGELOG.md`.
