import assert from 'node:assert/strict';
import { analyze } from '../lib/engine.js';
import { mockFetch } from './mock.mjs';
const run = (message, keep = []) => analyze({ message, keep }, mockFetch, {});
const lv = (r, a, b) => r.pairs.find(p => p.a === a && p.b === b)?.level;

let r = await run('Can my mom take warfarin with ibuprofin and Zoloft daily?');
assert.deepEqual(r.drugs.map(d => d.display).sort(), ['Ibuprofen', 'Sertraline', 'Warfarin']);
assert.deepEqual(r.corrections, ['ibuprofin → ibuprofen']);
assert.equal(r.pairs.length, 3);
assert.equal(lv(r, 'Warfarin', 'Sertraline'), 'moderate');
assert.equal(r.pairs.find(p => p.a === 'Warfarin' && p.b === 'Ibuprofen').evidence.length, 2);
const si = r.pairs.find(p => [p.a, p.b].sort().join() === 'Ibuprofen,Sertraline');
assert.equal(si.level, 'class'); assert.ok(si.evidence.every(e => e.kind === 'class'));
assert.ok(r.drugs.every(d => d.source.url.includes('dailymed')));
assert.equal(r.drugs.find(d => d.name === 'warfarin').facts[0][1].startsWith('Warfarin sodium tablets are indicated'), true);

assert.ok(r.findings.length === 3 && r.findings.every(f => f.label && f.text), 'structured findings');
const wi = r.findings.find(f => [f.a, f.b].sort().join() === 'Ibuprofen,Warfarin');
assert.ok(wi.quote && /ibuprofen/i.test(wi.quote) && r.answer.includes(wi.quote), 'answer quotes the label sentence');
assert.ok(r.answer.includes('Confirm with a pharmacist'));
assert.ok(wi.plain.some(l => /bleeding/i.test(l)), 'plain-language line for warfarin + ibuprofen mentions bleeding: ' + wi.plain);
assert.ok(r.answer.includes(wi.plain[0]));
assert.ok(Array.isArray(wi.mechanism) && 'faers' in wi, 'findings carry mechanism and faers fields');
{
  const { mechanism } = await import('../lib/mechanism.js');
  const m = mechanism('clarithromycin', 'simvastatin');
  assert.equal(m[0].enzyme, 'CYP3A'); assert.equal(m[0].strength, 'strong'); assert.equal(m[0].role, 'inhibitor');
  assert.equal(mechanism('rifampin', 'warfarin')[0].role, 'inducer');
  assert.deepEqual(mechanism('warfarin', 'ibuprofen'), []);
}

r = await run('warfarin and foobarium'); assert.deepEqual(r.unresolved, ['foobarium']); assert.ok(r.answer.includes('foobarium'));

// Cache: the second ask for the same medicines must not fetch labels again.
{
  const box = new Map(), cache = { get: k => box.get(k) ?? null, set: (k, v) => box.set(k, v) };
  let calls = 0; const counting = (...a) => { if (String(a[0]).includes('api.fda.gov')) calls++; return mockFetch(...a); };
  const first = await analyze({ message: 'warfarin and ibuprofen' }, counting, {}, cache);
  const before = calls;
  const second = await analyze({ message: 'can I take ibuprofen with warfarin and foobarium' }, counting, {}, cache);
  assert.equal(second.cached, true); assert.equal(second.pairs[0].level, first.pairs[0].level);
  assert.ok(second.answer.includes('foobarium'), 'unresolved names are still reported on a cache hit');
  assert.equal(calls - before, 0, 'cache hit skips label retrieval');
}
// Store: memory fallback counts and expires.
{
  const { store } = await import('../lib/store.js');
  assert.equal(store.kind, 'memory');
  assert.equal(await store.incr('t:x', 60), 1); assert.equal(await store.incr('t:x', 60), 2);
  await store.set('t:exp', { a: 1 }, 1); assert.deepEqual(await store.get('t:exp'), { a: 1 });
  await store.zincr('t:z', 'a'); await store.zincr('t:z', 'b'); await store.zincr('t:z', 'b');
  assert.deepEqual(await store.ztop('t:z', 1), [['b', 2]]);
}

r = await run('hello there'); assert.equal(r.drugs.length, 0);
r = await run('', ['Warfarin']); assert.equal(r.drugs.length, 1); assert.equal(r.pairs.length, 0);
console.log('all engine tests passed');
