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
  // `follow` shows a number box when the given answer is picked (stored per note, not copied forward).
  amb:       { id: 'amb', label: 'Ambulating', short: 'Amb', options: ['Yes', 'No'], follow: { when: 'Yes', label: 'Laps around the floor today', unit: 'laps' } },
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
// `g` puts a chip in a labeled sub-row; EXAM_GROUPS says whether that row is pick-one (true) or pick-many (false).
export const EXAM_GROUPS = { Consistency: true, Tenderness: true, Distension: true, Incision: false };
const EXAM_BASE = [
  { name: 'General', chips: [{ t: 'NAD', n: true }, { t: 'A&Ox3', n: true }, { t: 'Resting comfortably' }, { t: 'Appears uncomfortable' }, { t: 'Lethargic' }, { t: 'Ill-appearing' }, { t: 'Diaphoretic' }] },
  { name: 'Resp', chips: [{ t: 'Non-labored breathing', n: true }, { t: 'On room air', n: true }, { t: 'CTAB' }, { t: 'On NC O2' }, { t: 'Diminished bases' }, { t: 'Crackles' }, { t: 'Wheezing' }, { t: 'Tachypneic' }] },
  { name: 'Abd', chips: [
    { t: 'Soft', g: 'Consistency', n: true }, { t: 'Rigid', g: 'Consistency' },
    { t: 'Non-tender', g: 'Tenderness' }, { t: 'Appropriately tender', g: 'Tenderness', n: true }, { t: 'Minimally tender', g: 'Tenderness' }, { t: 'Moderately tender', g: 'Tenderness' },
    { t: 'Non-distended', g: 'Distension', n: true }, { t: 'Minimally distended', g: 'Distension' }, { t: 'Moderately distended', g: 'Distension' },
    { t: 'Incision c/d/i', g: 'Incision', n: true }, { t: 'Incision with erythema', g: 'Incision' }, { t: 'Incision with drainage', g: 'Incision' },
  ] },
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
  { key: 'exlap', label: 'Exploratory laparotomy / takeback', short: 'Ex-lap', drains: [], subj: [] },
  { key: 'ir_drain', label: 'IR drain placement', short: 'IR drain', drains: [], subj: [] },
  { key: 'other', label: 'Other', short: '', drains: [], subj: [] },
];

export const procByKey = key => PROCEDURES.find(p => p.key === key);

// Both take the patient's list of procedure keys (index surgery plus any takebacks) and combine their templates.
export function subjFor(procKeys = []) {
  const qs = [...COMMON_SUBJ];
  for (const key of procKeys) for (const q of procByKey(key)?.subj || []) if (!qs.includes(q)) qs.push(q);
  return [...qs, Q.events];
}

export function examFor(procKeys = [], drains = []) {
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
  const voids = !has('Foley') && !has('SP tube') && !procKeys.includes('rc_ic');
  gu.push({ t: 'Voiding spontaneously', n: voids });
  add('GU', gu, true);

  for (const key of procKeys) for (const [name, list] of Object.entries(procByKey(key)?.exam || {})) add(name, list);
  // Ungrouped chips: normal findings first, then abnormal ones. Grouped rows keep their defined order.
  for (const s of sys) s.chips = [...s.chips.filter(c => c.g), ...s.chips.filter(c => !c.g && c.n), ...s.chips.filter(c => !c.g && !c.n)];
  return sys;
}
