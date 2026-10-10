// Button templates for the census form and the note editor.
// Edit the lists here to change what buttons appear — no other code changes needed.

export const DRAIN_OPTIONS = ['Foley', 'JP', 'Ureteral stents', 'SP tube', 'Nephrostomy tube', 'NG tube', 'CBI', 'Epidural', 'PCA'];
export const DIET_OPTIONS = ['NPO', 'Sips/ice chips', 'Clear liquids', 'Full liquids', 'Regular', 'Low-fat', 'Diabetic'];

// Subjective questions. `short` is used in the timeline summary; `flag` values are highlighted as concerning.
const Q = {
  pain:      { id: 'pain', label: 'Pain', short: 'Pain', options: ['Well controlled', 'Controlled w/ PRNs', 'Poorly controlled'], flag: ['Poorly controlled'] },
  nv:        { id: 'nv', label: 'Nausea/vomiting', short: 'N/V', options: ['None', 'Nausea, no emesis', 'Emesis'], flag: ['Emesis'] },
  flatus:    { id: 'flatus', label: 'Flatus', short: 'Flatus', options: ['Yes', 'No'] },
  bm:        { id: 'bm', label: 'BM', short: 'BM', options: ['Yes', 'No'] },
  po:        { id: 'po', label: 'Diet tolerance', short: 'PO', options: ['Tolerating', 'Poor appetite', 'Not tolerating', 'NPO'], flag: ['Not tolerating'] },
  amb:       { id: 'amb', label: 'Ambulation', short: 'Amb', options: ['Independent', 'With assistance', 'Not yet'] },
  is:        { id: 'is', label: 'Incentive spirometer', short: 'IS', options: ['Using', 'Not using'] },
  events:    { id: 'events', label: 'Overnight/interval events', short: 'Events', options: ['None', 'See comments'], flag: ['See comments'] },
  // procedure-specific
  leg:       { id: 'leg', label: 'Calf pain/leg swelling', short: 'Leg sx', options: ['Denies', 'Reports'], flag: ['Reports'] },
  spasms:    { id: 'spasms', label: 'Bladder spasms', short: 'Spasms', options: ['None', 'Mild', 'Significant'], flag: ['Significant'] },
  hematuria: { id: 'hematuria', label: 'Gross hematuria', short: 'Hematuria', options: ['None', 'Light pink', 'Red', 'Clots'], flag: ['Red', 'Clots'] },
  flank:     { id: 'flank', label: 'Flank pain', short: 'Flank', options: ['None', 'Mild', 'Significant'], flag: ['Significant'] },
  ostomy:    { id: 'ostomy', label: 'Ostomy teaching', short: 'Ostomy teach', options: ['Not started', 'In progress', 'Independent'] },
  irrig:     { id: 'irrig', label: 'Catheter irrigation', short: 'Irrigation', options: ['Irrigating well', 'Mucus plugging', 'Not irrigating'], flag: ['Mucus plugging', 'Not irrigating'] },
  cathteach: { id: 'cathteach', label: 'Catheter teaching', short: 'Cath teach', options: ['Not started', 'In progress', 'Complete'] },
  bloating:  { id: 'bloating', label: 'Bloating/early satiety', short: 'Bloating', options: ['None', 'Present'], flag: ['Present'] },
  wound:     { id: 'wound', label: 'Wound drainage', short: 'Wound', options: ['None', 'Serous', 'Purulent'], flag: ['Purulent'] },
};
export const QUESTIONS = Q;

const COMMON_SUBJ = [Q.pain, Q.nv, Q.flatus, Q.bm, Q.po, Q.amb, Q.is];

// Exam chips: `n: true` marks the finding filled in by "Normal" / "All normal".
const EXAM_BASE = [
  { name: 'General', chips: [{ t: 'NAD', n: true }, { t: 'A&Ox3', n: true }, { t: 'Resting comfortably' }, { t: 'Appears uncomfortable' }, { t: 'Lethargic' }, { t: 'Ill-appearing' }, { t: 'Diaphoretic' }] },
  { name: 'Resp', chips: [{ t: 'Non-labored breathing', n: true }, { t: 'On room air', n: true }, { t: 'CTAB' }, { t: 'On NC O2' }, { t: 'Diminished bases' }, { t: 'Crackles' }, { t: 'Wheezing' }, { t: 'Tachypneic' }] },
  { name: 'Abd', chips: [{ t: 'Soft', n: true }, { t: 'Non-distended', n: true }, { t: 'Appropriately TTP', n: true }, { t: 'Incisions c/d/i', n: true }, { t: 'Mildly distended' }, { t: 'Distended' }, { t: 'Tympanic' }, { t: 'Diffusely tender' }, { t: 'Rebound/guarding' }, { t: 'Incisional erythema' }, { t: 'Incisional drainage' }] },
  { name: 'GU', chips: [{ t: 'Scrotal edema' }, { t: 'Penile edema' }, { t: 'Hematoma' }] },
  { name: 'Urine', chips: [{ t: 'Clear yellow', n: true }, { t: 'Light pink' }, { t: 'Pink' }, { t: 'Red' }, { t: 'Clots' }, { t: 'Cloudy' }, { t: 'Concentrated' }, { t: 'Sediment' }] },
];
export const EXAM_SYSTEMS = EXAM_BASE.map(s => s.name);

// `drains` and `diet` pre-fill the census form when a procedure is picked.
// `subj` adds questions; `exam` adds chips to a system.
export const PROCEDURES = [
  { key: 'rc_ic', label: 'Radical cystectomy w/ ileal conduit', short: 'RC / ileal conduit', drains: ['JP', 'Ureteral stents'], diet: 'Clear liquids',
    subj: [Q.ostomy, Q.leg],
    exam: { Abd: [{ t: 'Stoma pink/viable', n: true }, { t: 'Appliance intact', n: true }, { t: 'Stoma dusky' }, { t: 'Peristomal erythema' }, { t: 'Appliance leaking' }], Urine: [{ t: 'Mucus' }] } },
  { key: 'rc_neo', label: 'Radical cystectomy w/ neobladder', short: 'RC / neobladder', drains: ['Foley', 'JP', 'Ureteral stents'], diet: 'Clear liquids',
    subj: [Q.irrig, Q.cathteach, Q.leg],
    exam: { GU: [{ t: 'Catheter irrigates easily', n: true }, { t: 'Mucus in catheter' }], Urine: [{ t: 'Mucus' }] } },
  { key: 'ralp', label: 'Robotic radical prostatectomy', short: 'RALP', drains: ['Foley', 'JP'], diet: 'Clear liquids',
    subj: [Q.spasms, Q.cathteach, Q.leg] },
  { key: 'rad_neph', label: 'Radical nephrectomy', short: 'Radical neph', drains: ['Foley'], diet: 'Clear liquids',
    subj: [Q.flank, Q.leg],
    exam: { Resp: [{ t: 'Splinting' }] } },
  { key: 'part_neph', label: 'Partial nephrectomy', short: 'Partial neph', drains: ['Foley', 'JP'], diet: 'Clear liquids',
    subj: [Q.hematuria, Q.flank],
    exam: { Abd: [{ t: 'No flank tenderness', n: true }, { t: 'Flank tenderness' }] } },
  { key: 'rnu', label: 'Nephroureterectomy', short: 'RNU', drains: ['Foley', 'JP'], diet: 'Clear liquids',
    subj: [Q.hematuria, Q.spasms, Q.leg] },
  { key: 'rplnd', label: 'RPLND', short: 'RPLND', drains: ['Foley'], diet: 'Low-fat',
    subj: [Q.bloating, Q.leg],
    exam: { Abd: [{ t: 'JP chylous' }] } },
  { key: 'turbt', label: 'TURBT', short: 'TURBT', drains: ['Foley'], diet: 'Regular',
    subj: [Q.hematuria, Q.spasms] },
  { key: 'ilnd', label: 'Inguinal lymph node dissection', short: 'ILND', drains: ['JP'], diet: 'Regular',
    subj: [Q.wound, Q.leg],
    exam: { GU: [{ t: 'Groin incisions c/d/i', n: true }, { t: 'Groin seroma' }, { t: 'Flap edge necrosis' }, { t: 'Lower extremity edema' }] } },
  { key: 'other', label: 'Other', short: '', drains: [], subj: [] },
];

export const procByKey = key => PROCEDURES.find(p => p.key === key);

export function subjFor(procKey) {
  const proc = procByKey(procKey);
  return [...COMMON_SUBJ, ...(proc?.subj || []), Q.events];
}

export function examFor(procKey, drains = []) {
  const has = d => drains.includes(d);
  const sys = EXAM_BASE.map(s => ({ name: s.name, chips: s.chips.map(c => ({ ...c })) }));
  const add = (name, list, front = false) => {
    const s = sys.find(x => x.name === name);
    const fresh = list.filter(c => !s.chips.some(x => x.t === c.t)).map(c => ({ ...c }));
    s.chips = front ? [...fresh, ...s.chips] : [...s.chips, ...fresh];
  };

  if (has('JP')) add('Abd', [{ t: 'JP serosanguinous', n: true }, { t: 'JP serous' }, { t: 'JP sanguinous' }, { t: 'JP turbid' }]);
  if (has('Ureteral stents')) add('Abd', [{ t: 'Stents in place/draining', n: true }]);
  if (has('NG tube')) add('Abd', [{ t: 'NG to LIWS', n: true }, { t: 'NG output bilious' }]);

  const gu = [];
  if (has('Foley')) gu.push({ t: 'Foley in place/draining', n: true }, { t: 'Foley secured', n: true });
  if (has('SP tube')) gu.push({ t: 'SP tube in place/draining', n: true });
  if (has('CBI')) gu.push({ t: 'CBI running', n: true }, { t: 'CBI off' });
  if (has('Nephrostomy tube')) gu.push({ t: 'Nephrostomy draining', n: true });
  const voids = !has('Foley') && !has('SP tube') && procKey !== 'rc_ic';
  gu.push({ t: 'Voiding spontaneously', n: voids });
  add('GU', gu, true);

  const proc = procByKey(procKey);
  for (const [name, list] of Object.entries(proc?.exam || {})) add(name, list);
  // Normal findings first, then abnormal ones.
  for (const s of sys) s.chips = [...s.chips.filter(c => c.n), ...s.chips.filter(c => !c.n)];
  return sys;
}
