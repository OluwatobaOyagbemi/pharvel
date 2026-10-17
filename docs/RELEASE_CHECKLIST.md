# Release checklist

Every deploy to production:

- [ ] `npm test` passes (engine and guardrail tests)
- [ ] `npm run eval -- --label "<what changed>"` run; `EVALS.md` reviewed, including any new failures
- [ ] `npm run gate` passes (thresholds in `evals/thresholds.json`)
- [ ] `ENGINE_VERSION` bumped if matching, severity or wording changed
- [ ] Held-out set not edited; if its results influenced the change, `status` in `evals/heldout.json` updated
- [ ] `CHANGELOG.md` entry written (what changed, why, eval deltas)
- [ ] New data sources recorded in `docs/DATA_SOURCES.md` with licence
- [ ] `docs/RISK.md` updated if a hazard, control or residual risk changed
- [ ] Deployed; one serious pair, one emergency message and one dosing question checked on the live site
- [ ] If a language model is enabled or changed: faithfulness rejections reviewed on a sample before release
