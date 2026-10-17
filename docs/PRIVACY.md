# Privacy and data inventory

| Data | Where | Identity? | Retention |
|---|---|---|---|
| Question text | Processed in memory for the request only; the 7-day answer cache stores the resolved medicines and label results, not the typed wording (`typed` is removed before caching) | — | Not stored |
| IP address | HMAC-SHA-256 of the UTC day and the IP with a secret key (`HASH_SECRET` in Vercel), first 12 bytes; used for the daily limit, distinct-visitor count and feedback limit | Not reversible without the secret; changes daily, so not linkable across days | Rate-limit keys expire about 24 h after midnight UTC; visitor sets after 2 days |
| Medicine names checked | Aggregate pair counters (`st:pairs`); answer cache keyed by RxNorm IDs | No | Counters kept as aggregates; cache 7 days |
| Daily totals, guardrail and mode counters | Upstash Redis | No | Day counters 40 days; totals kept |
| Problem reports | Upstash Redis list `fb:items`: reason, pair, severity shown, engine mode and version, label links, optional comment (≤300 characters). Limited to 10 per visitor per day and 3 per minute | No identity collected; users are asked not to include personal information | Newest 5,000 kept |
| Saved medicine list | The user's own browser (localStorage); restored on return without running a check | Stays on the device | Until the user clears it |
| Request logs | App log lines: time, medicine names, pair count, mode, guardrails, duration. Vercel's own request logs also record the client IP | App lines contain no IP; Vercel's logs do | Vercel plan retention (short) |
| Analytics | Vercel Web Analytics if enabled: page views, country, device | Aggregated by Vercel | Vercel's terms |

**HIPAA:** Pharvel is not a covered entity or business associate and does not store health information about identifiable people, so HIPAA does not apply as currently built. This must be re-assessed before any integration with a provider, insurer or pharmacy.

**GDPR / NDPR:** visitors from the EU or Nigeria may be covered. The public privacy notice (`/privacy.html`) describes the processing above. No legal review has been done.

**Third parties that receive request data:** NIH (RxNorm/RxClass) and FDA (openFDA) receive medicine names from the server without user identity. **PubChem (NCBI) is called directly by the user's browser for 3D and 2D structures, so NCBI receives the user's IP address and the medicine names.** Public `/api/stats` shows pairs only after 5 checks and hides visitor counts below 5. If the language-model layer is enabled, label passages and the question text are sent to Anthropic's API.
