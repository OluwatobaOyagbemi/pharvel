// Mechanism layer: FDA's published examples of clinical CYP and transporter substrates, inhibitors and inducers.
// Snapshot checked against the FDA page on 2026-10-17 (external audit): fluvoxamine (1A2 strong), fluconazole and
// ciprofloxacin (3A moderate) and oral contraceptives (1A2 moderate, as ethinyl estradiol) added; protease
// inhibitors that FDA lists only as ritonavir-boosted combinations removed as stand-alone strong inhibitors.
// Source (public domain): https://www.fda.gov/drugs/drug-interactions-labeling/healthcare-professionals-fdas-examples-drugs-interact-cyp-enzymes-and-transporter-systems
// A pair is flagged when one drug is a listed inhibitor or inducer of an enzyme/transporter and the other is a listed substrate of it.
// The expected size of the effect follows FDA's own definitions (strong inhibitor: >=5-fold AUC increase of a sensitive substrate, etc.).

const SJW = "st. john's wort, hypericum perforatum";
const T = {
  CYP1A2: { sens: 'alosetron, caffeine, duloxetine, fezolinetant, melatonin, ramelteon, tasimelteon, tizanidine', mod: 'clozapine, pirfenidone, theophylline',
    inhS: 'fluvoxamine', inhM: 'capmatinib, ciprofloxacin, methoxsalen, mexiletine, vemurafenib, ethinyl estradiol', inhW: 'acyclovir, allopurinol, cimetidine, zileuton', indM: 'phenytoin, rifampin, teriflunomide' },
  CYP2B6: { sens: 'bupropion', mod: 'efavirenz', inhW: 'clopidogrel, ticlopidine, tenofovir, voriconazole', indS: 'carbamazepine', indM: 'efavirenz, rifampin', indW: 'isavuconazole, lemborexant, lorlatinib, nevirapine, ritonavir' },
  CYP2C8: { sens: 'repaglinide, selexipag', mod: 'desloratadine, loperamide, montelukast, pioglitazone, resmetirom, rosiglitazone, tucatinib', inhS: 'gemfibrozil',
    inhM: 'clopidogrel, deferasirox, pirtobrutinib, selpercatinib, teriflunomide', inhW: 'trimethoprim, tucatinib', indM: 'rifampin' },
  CYP2C9: { sens: 'celecoxib', mod: 'glimepiride, phenytoin, tolbutamide, warfarin', inhM: 'amiodarone, fluconazole, miconazole', inhW: 'ceritinib, disulfiram, fluvastatin, voriconazole',
    indM: 'enzalutamide, rifampin', indW: 'apalutamide, aprepitant, carbamazepine, dabrafenib, lorlatinib, ritonavir' },
  CYP2C19: { sens: 'omeprazole', mod: 'diazepam, lansoprazole, rabeprazole, voriconazole', inhS: 'fluconazole, fluoxetine, fluvoxamine, ticlopidine', inhM: 'cenobamate, felbamate, voriconazole',
    inhW: 'omeprazole, pirtobrutinib', indS: 'rifampin', indM: 'apalutamide, efavirenz, enzalutamide, phenytoin', indW: 'zanubrutinib' },
  CYP2D6: { sens: 'atomoxetine, desipramine, dextromethorphan, eliglustat, nebivolol, perphenazine, venlafaxine, tolterodine', mod: 'imipramine, metoprolol, nortriptyline, pimozide, propafenone, propranolol, tramadol, trimipramine',
    inhS: 'bupropion, fluoxetine, paroxetine, quinidine, terbinafine', inhM: 'abiraterone, cinacalcet, duloxetine, mirabegron, rolapitant',
    inhW: 'amiodarone, celecoxib, cimetidine, clobazam, cobicistat, escitalopram, fluvoxamine, labetalol, sertraline, vemurafenib' },
  CYP3A: { sens: 'alfentanil, avanafil, budesonide, buspirone, conivaptan, darifenacin, darunavir, dasatinib, dronedarone, eletriptan, entrectinib, eplerenone, everolimus, felodipine, ibrutinib, indinavir, isavuconazole, ivabradine, lemborexant, lomitapide, lovastatin, lurasidone, maraviroc, midazolam, mobocertinib, naloxegol, nisoldipine, quetiapine, repotrectinib, saquinavir, sildenafil, simvastatin, sirolimus, tacrolimus, ticagrelor, tipranavir, tolvaptan, triazolam, vardenafil, venetoclax',
    mod: 'alprazolam, aprepitant, atorvastatin, brigatinib, colchicine, eliglustat, fostamatinib, larotrectinib, leniolisib, loperamide, pimozide, pralsetinib, rilpivirine, rivaroxaban, selpercatinib, tadalafil, tazemetostat, zanubrutinib',
    inhS: 'adagrasib, ceritinib, clarithromycin, cobicistat, idelalisib, itraconazole, ketoconazole, nefazodone, nelfinavir, posaconazole, ritonavir, telithromycin, tucatinib, voriconazole',
    inhM: 'aprepitant, ciprofloxacin, conivaptan, crizotinib, diltiazem, dronedarone, erythromycin, fluconazole, grapefruit, imatinib, isavuconazole, verapamil',
    inhW: 'amiodarone, cilostazol, chlorzoxazone, cimetidine, clotrimazole, cyclosporine, entrectinib, fluvoxamine, fosaprepitant, istradefylline, ivacaftor, larotrectinib, lazertinib, lomitapide, pirtobrutinib, ranitidine, ranolazine, selpercatinib, ticagrelor',
    indS: 'apalutamide, carbamazepine, enzalutamide, ivosidenib, lumacaftor, mitotane, phenytoin, rifampin, ' + SJW,
    indM: 'bosentan, cenobamate, dabrafenib, efavirenz, etravirine, lorlatinib, pexidartinib, phenobarbital, primidone, repotrectinib, sotorasib',
    indW: 'armodafinil, elagolix, mobocertinib, modafinil, rufinamide, tazemetostat, vemurafenib, zanubrutinib' },
  'P-gp': { sens: 'dabigatran, dabigatran etexilate, digoxin, edoxaban, fexofenadine, loperamide',
    inhM: 'amiodarone, belumosudil, capmatinib, clarithromycin, cobicistat, cyclosporine, danicopan, dronedarone, erythromycin, fostamatinib, itraconazole, ketoconazole, lapatinib, pirtobrutinib, propafenone, quinidine, ranolazine, rolapitant, tucatinib, verapamil' },
  BCRP: { sens: 'rosuvastatin, sulfasalazine', inhM: 'belumosudil, capmatinib, curcumin, cyclosporine, danicopan, darolutamide, eltrombopag, febuxostat, fostamatinib, lazertinib, leniolisib, momelotinib, oteseconazole, pirtobrutinib, resmetirom, rolapitant, teriflunomide, ticagrelor, vadadustat' },
  OATP1B1: { sens: 'atorvastatin, bosentan, docetaxel, elagolix, fexofenadine, glyburide, lovastatin, paclitaxel, pitavastatin, pravastatin, repaglinide, resmetirom, rosuvastatin, selexipag, simvastatin',
    inhM: 'clarithromycin, cyclosporine, darolutamide, gemfibrozil, leniolisib, resmetirom, rifampin, teriflunomide' },
  OAT3: { sens: 'baricitinib, bumetanide, cefaclor, ceftizoxime, ciprofloxacin, famotidine, furosemide, methotrexate, oseltamivir, penicillin g', inhM: 'gemfibrozil, probenecid, teriflunomide, vadadustat' },
  OAT1: { sens: 'adefovir, ciprofloxacin, furosemide, oseltamivir, tenofovir', inhM: 'probenecid' },
  'OCT2/MATE': { sens: 'metformin', inhM: 'cimetidine, dolutegravir, isavuconazole, pyrimethamine, ranolazine, trimethoprim, vandetanib' },
};
const split = s => (s || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
const TABLE = Object.fromEntries(Object.entries(T).map(([e, r]) => [e, {
  sens: split(r.sens), mod: split(r.mod), inhS: split(r.inhS), inhM: split(r.inhM), inhW: split(r.inhW), indS: split(r.indS), indM: split(r.indM), indW: split(r.indW),
}]));
const ALIAS = { "st. john's wort extract": "st. john's wort", 'grapefruit juice': 'grapefruit', 'grapefruit extract': 'grapefruit', 'st johns wort': "st. john's wort", "st john's wort": "st. john's wort", hypericum: 'hypericum perforatum' };
const norm = n => { n = String(n || '').toLowerCase().trim(); return ALIAS[n] || n.replace(/ (hydrochloride|sodium|potassium|sulfate|acetate|maleate|tartrate|citrate|calcium|mesylate|besylate)$/, ''); };

const STRENGTH = { S: 'strong', M: 'moderate', W: 'weak' };
// FDA definitions: strong inhibitor >=5-fold, moderate 2-5-fold, weak 1.25-2-fold increase in a sensitive substrate's exposure.
const SIZE = { 'S+sens': 'a large (five-fold or more)', 'S+mod': 'a two- to five-fold', 'M+sens': 'a two- to five-fold', 'M+mod': 'a modest', 'W+sens': 'a modest (up to two-fold)', 'W+mod': 'a small' };
const FALL = { S: ' sharply (by 80% or more)', M: ' substantially', W: ' somewhat' };

// Returns an array of mechanism findings for the pair (usually 0 or 1, occasionally 2), strongest first.
export function mechanism(nameA, nameB) {
  const out = [], a = norm(nameA), b = norm(nameB);
  for (const [enzyme, r] of Object.entries(TABLE)) {
    for (const [p, q, pName, qName] of [[a, b, nameA, nameB], [b, a, nameB, nameA]]) {
      const sub = r.sens.includes(q) ? 'sens' : r.mod.includes(q) ? 'mod' : null;
      if (!sub) continue;
      const subText = sub === 'sens' ? 'sensitive' : 'moderately sensitive';
      for (const k of ['S', 'M', 'W']) {
        const base = { enzyme, perpetrator: pName, victim: qName, strength: STRENGTH[k], substrate: subText };
        if (r['inh' + k].includes(p)) out.push({ ...base, role: 'inhibitor',
          text: `${pName} is listed by the FDA as a ${STRENGTH[k]} ${enzyme} inhibitor and ${qName} as a ${subText} ${enzyme} substrate, so ${SIZE[`${k}+${sub}`]} rise in ${qName} levels is expected, making its side effects more likely.` });
        if (r['ind' + k].includes(p)) out.push({ ...base, role: 'inducer',
          text: `${pName} is listed by the FDA as a ${STRENGTH[k]} ${enzyme} inducer and ${qName} as a ${subText} ${enzyme} substrate, so ${qName} levels are expected to fall${FALL[k]}, which can make it less effective.` });
      }
    }
  }
  const rank = { strong: 0, moderate: 1, weak: 2 };
  return out.sort((x, y) => rank[x.strength] - rank[y.strength]).slice(0, 2);
}
// Which enzyme/transporter groups a drug belongs to as inhibitor or inducer (any strength), used to match label
// wording such as "CYP3A4 inhibitors" to the drug.
export function roles(name) {
  const n = norm(name), out = [];
  for (const [enzyme, r] of Object.entries(TABLE)) {
    for (const [k, strength] of [['S', 'strong'], ['M', 'moderate'], ['W', 'weak']]) {
      if (r['inh' + k].includes(n)) out.push({ enzyme, role: 'inhibitor', strength });
      if (r['ind' + k].includes(n)) out.push({ enzyme, role: 'inducer', strength });
    }
  }
  return out;
}
export const MECHANISM_SOURCE = 'FDA, Drugs that interact with CYP enzymes and transporter systems (examples table, public domain)';
