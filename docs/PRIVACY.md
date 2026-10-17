# Privacy and data inventory

| Data | Where | Identity? | Retention |
|---|---|---|---|
| Question text | Processed in memory for the request only | — | Not stored |
| IP address | Hashed (SHA-256 with a fixed prefix, first 8 bytes) for the daily limit and a distinct-visitor count | Not reversible to an address | Rate-limit keys expire about 24 h after midnight UTC; visitor sets expire after 2 days |
| Medicine names checked | Aggregate pair counters (`st:pairs`); answer cache keyed by RxNorm IDs | No | Counters kept as aggregates; cache 7 days |
| Daily totals, guardrail and mode counters | Upstash Redis | No | Day counters 40 days; totals kept |
| Problem reports | Upstash Redis list `fb:items`: reason, pair, severity shown, engine mode, optional comment (≤300 characters) | No identity collected; users are asked not to include personal information | Newest 500 kept; older ones dropped automatically |
| Saved medicine list | The user's own browser (localStorage) | Stays on the device | Until the user clears it |
| Request logs | Vercel function logs: time, medicine names, pair count, mode, guardrails, duration | No IP or question text logged by the app | Vercel's plan retention (short; see the Vercel dashboard) |
| Analytics | Vercel Web Analytics if enabled: page views, country, device | Aggregated by Vercel | Vercel's terms |

**HIPAA:** Pharvel is not a covered entity or business associate and does not store health information about identifiable people, so HIPAA does not apply as currently built. This must be re-assessed before any integration with a provider, insurer or pharmacy.

**GDPR / NDPR:** visitors from the EU or Nigeria may be covered. The public privacy notice (`/privacy.html`) describes the processing above. No legal review has been done.

**Third parties that receive request data:** NIH (RxNorm/RxClass), FDA (openFDA), NCBI (PubChem) receive medicine names in API requests, without user identity. If the language-model layer is enabled, label passages and the question text are sent to Anthropic's API.
