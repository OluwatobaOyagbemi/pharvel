// Offline stand-in for RxNorm + openFDA so the app can be run and tested without network. TEST DATA ONLY.
const RX = { warfarin: ['11289', 'IN', 'warfarin'], ibuprofen: ['5640', 'IN', 'ibuprofen'], zoloft: ['82728', 'BN', 'Zoloft'], sertraline: ['36437', 'IN', 'sertraline'], vitamin: null };
const IN = { '82728': [{ rxcui: '36437', name: 'sertraline', tty: 'IN' }] };
const LABELS = {
  warfarin: { set_id: 'w-1', effective_time: '20250601', openfda: { generic_name: ['WARFARIN SODIUM'], brand_name: ['Warfarin Sodium', 'Coumadin'], manufacturer_name: ['Teva'], pharm_class_epc: ['Vitamin K Antagonist [EPC]'], route: ['ORAL'] },
    boxed_warning: ['WARNING: BLEEDING RISK Warfarin sodium can cause major or fatal bleeding.'],
    indications_and_usage: ['1 INDICATIONS AND USAGE Warfarin sodium tablets are indicated for prophylaxis and treatment of venous thrombosis.'],
    drug_interactions: ['7 DRUG INTERACTIONS 7.3 Drugs that Increase Bleeding Risk Non-steroidal Anti-Inflammatory Agents celecoxib, diclofenac, ibuprofen, naproxen Serotonin Reuptake Inhibitors citalopram, sertraline, venlafaxine. Closely monitor patients receiving any such drug with warfarin.'] },
  ibuprofen: { set_id: 'i-1', effective_time: '20240110', openfda: { generic_name: ['IBUPROFEN'], brand_name: ['Motrin'], pharm_class_epc: ['Nonsteroidal Anti-inflammatory Drug [EPC]'], route: ['ORAL'] },
    indications_and_usage: ['Uses temporarily relieves minor aches and pains'],
    drug_interactions: ['7 DRUG INTERACTIONS Anticoagulants: the effects of warfarin and NSAIDs on GI bleeding are synergistic. Concomitant use with SSRIs may potentiate the risk of bleeding.'] },
  sertraline: { set_id: 's-1', effective_time: '20250301', openfda: { generic_name: ['SERTRALINE HYDROCHLORIDE'], brand_name: ['Zoloft'], pharm_class_epc: ['Serotonin Reuptake Inhibitor [EPC]'], route: ['ORAL'] },
    indications_and_usage: ['1 INDICATIONS AND USAGE Sertraline is indicated for the treatment of major depressive disorder.'],
    contraindications: ['4 CONTRAINDICATIONS Concomitant use with MAOIs or pimozide.'],
    drug_interactions: ['7 DRUG INTERACTIONS Drugs that interfere with hemostasis (NSAIDs, aspirin, warfarin): increased risk of bleeding. Monitor.'] },
};
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });
export async function mockFetch(url) {
  const u = new URL(url), p = u.pathname;
  if (p.endsWith('/rxcui.json')) { const r = RX[u.searchParams.get('name')]; return json({ idGroup: r ? { rxnormId: [r[0]] } : {} }); }
  if (p.endsWith('/spellingsuggestions.json')) return json({ suggestionGroup: { suggestionList: u.searchParams.get('name') === 'ibuprofin' ? { suggestion: ['ibuprofen'] } : null } });
  let m;
  if ((m = p.match(/rxcui\/(\d+)\/properties/))) { const r = Object.values(RX).find(r => r && r[0] === m[1]); return json({ properties: { rxcui: r[0], tty: r[1], name: r[2] } }); }
  if ((m = p.match(/rxcui\/(\d+)\/related/))) return json({ relatedGroup: { conceptGroup: [{ tty: 'IN', conceptProperties: IN[m[1]] || [] }] } });
  if (u.hostname === 'api.fda.gov') { const n = decodeURIComponent(u.search).match(/"([^"]+)"/)[1]; return LABELS[n] ? json({ results: [LABELS[n]] }) : json({ error: {} }, 404); }
  throw new Error('unmocked ' + url);
}
