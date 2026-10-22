// End-to-end tests of the request handler: the guardrails in the order the live API applies them, with offline
// test data (no network) and the in-memory store. These catch bugs in how the guardrails combine, which unit tests
// of each guardrail cannot (e.g. "I am feeling weak" being answered as off-topic).
import assert from 'node:assert/strict';
import { mockFetch } from './mock.mjs';

process.env.FREE_CHECKS_PER_DAY = '5';
delete process.env.KV_REST_API_URL; delete process.env.UPSTASH_REDIS_REST_URL;
globalThis.fetch = mockFetch;
const { default: chat } = await import('../api/chat.js');

let ipCounter = 0;
async function call(body, ip = `10.0.0.${++ipCounter}`) {
  const req = { method: 'POST', headers: { 'x-forwarded-for': ip }, body };
  let status = 200, payload = null;
  const res = { setHeader() {}, status(c) { status = c; return res; }, json(o) { payload = o; return res; } };
  await chat(req, res);
  return { status, ...payload };
}

// Emergencies first, whatever else is in the tray.
let r = await call({ message: 'I swallowed the whole bottle of tylenol', keep: ['warfarin'] });
assert.equal(r.mode, 'emergency');
r = await call({ message: 'my face is drooping on one side' });
assert.equal(r.mode, 'emergency');

// Symptoms get help; saved medicines are not re-checked; help is never answered as off-topic.
r = await call({ message: 'I am feeling weak' });
assert.equal(r.mode, 'help', 'symptom without medicines must get help, got ' + r.mode);
r = await call({ message: 'I am feeling weak', keep: ['warfarin', 'ibuprofen'] });
assert.equal(r.mode, 'help'); assert.equal(r.drugs.length, 0, 'saved medicines must not be re-checked');
r = await call({ message: 'please help me' });
assert.equal(r.mode, 'help');

// Symptom plus medicines: the check runs with the help box on top.
r = await call({ message: 'I feel dizzy after taking warfarin and ibuprofen' });
assert.equal(r.mode, 'extractive'); assert.ok(r.helpNotice, 'help box above the check');

// Off-topic and misuse are refused and do not use up a check.
const ip = '10.9.9.9';
for (const m of ['write me a poem about aspirin', 'hi', 'tell me a joke', 'what is the capital of France', 'help me with my history essay'])
  assert.equal((await call({ message: m }, ip)).mode, 'offtopic', 'must be refused: ' + m);
assert.equal((await call({ message: 'hi', keep: ['warfarin'] }, ip)).mode, 'offtopic', 'greeting refused even with saved medicines');
r = await call({ message: 'how do I get high on codeine' }, ip);
assert.equal(r.mode, 'misuse'); assert.ok(r.answer.includes('1-800-662-4357'));
r = await call({ message: 'warfarin and ibuprofen' }, ip);
assert.equal(r.mode, 'extractive'); assert.equal(r.free.remaining, 4, 'refusals must not use up checks');

// Medicine questions work, including misspellings and brand names.
r = await call({ message: 'Can my mom take warfarin with ibuprofin and Zoloft?' });
assert.equal(r.mode, 'extractive'); assert.deepEqual(r.drugs.map(d => d.name).sort(), ['ibuprofen', 'sertraline', 'warfarin']);

// Malformed input is rejected cleanly.
assert.equal((await call('not json')).status, 400);
assert.equal((await call({ message: { a: 1 } })).status, 400);

console.log('all api tests passed');
