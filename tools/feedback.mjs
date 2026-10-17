// Prints the latest user reports for triage: npm run feedback  (reads the store credentials from .env.local)
import { store } from '../lib/store.js';

const items = await store.lrange('fb:items', 50);
if (!items.length) console.log(store.kind === 'memory' ? 'No store connected: run via `npm run feedback` so .env.local is loaded.' : 'No reports yet.');
for (const i of items) console.log(`${i.t}  [${i.reason}]  ${i.pair} (${i.level}, ${i.engine})${i.comment ? '  — ' + i.comment : ''}`);
