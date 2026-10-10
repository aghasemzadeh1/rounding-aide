import { PROCEDURES, DRAIN_OPTIONS, DIET_OPTIONS, QUESTIONS, EXAM_GROUPS, procByKey, subjFor, examFor } from './templates.js';
import { data, save, uid, replaceAll, isValidBackup } from './store.js';

const main = document.getElementById('main');
const topbar = document.getElementById('topbar');
const footer = document.getElementById('footer');
let H = {};              // click handlers for the current view, keyed by data-act
let leaveGuard = null;   // resolves true when it's OK to leave the current view

// ---------- helpers ----------
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const localInput = d => `${ymd(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const parseYMD = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const dayStart = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const sameDay = (a, b) => ymd(a) === ymd(b);
const fmtDay = d => d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric', year: 'numeric' });
const fmtDayShort = d => d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
const fmtTime = d => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

// A patient has a list of procedures ({ key, other, date }): the index surgery first, then takebacks etc.
// Patients saved before multi-procedure support have single procedure/procedureOther/surgeryDate fields.
function procs(p) {
  if (Array.isArray(p.procs)) return p.procs;
  return p.procedure || p.surgeryDate ? [{ key: p.procedure || '', other: p.procedureOther || '', date: p.surgeryDate || '' }] : [];
}
const procKeys = p => procs(p).map(x => x.key).filter(Boolean);
const podOn = (date, at = new Date()) => (date ? Math.round((dayStart(at) - parseYMD(date)) / 864e5) : null);
const podLabel = n => (n == null ? '' : n < 0 ? 'Pre-op' : `POD ${n}`);
const entryName = (x, short) => (x.key === 'other' || !procByKey(x.key) ? x.other || '' : procByKey(x.key)[short ? 'short' : 'label']);
// e.g. "POD 5 s/p Radical cystectomy w/ ileal conduit (Mon, 10/5)"
function procLine(x, at = new Date(), short = false) {
  const d = podOn(x.date, at);
  const name = entryName(x, short);
  return [d != null ? podLabel(d) + (name ? ' s/p' : '') : '', name, !short && x.date ? `(${fmtDayShort(parseYMD(x.date))})` : ''].filter(Boolean).join(' ');
}
const procLines = (p, at, short) => procs(p).map(x => procLine(x, at, short)).filter(Boolean);
// Compact POD for every procedure, e.g. "POD 5/1" after a takeback.
function podShort(p, at = new Date()) {
  const ds = procs(p).map(x => podOn(x.date, at)).filter(d => d != null);
  if (!ds.length) return '';
  return ds.every(d => d < 0) ? 'Pre-op' : 'POD ' + ds.map(d => (d < 0 ? 'pre' : d)).join('/');
}
const joinNote = (list, note) => [list.join(', '), note].filter(Boolean).join('; ');
const drainText = o => joinNote(o.drains || [], o.drainsNote);
const dietText = o => joinNote(o.diet ? [o.diet] : [], o.dietNote);

const patient = id => data().patients.find(p => p.id === id);
const notesFor = pid => data().notes.filter(n => n.patientId === pid).sort((a, b) => b.at.localeCompare(a.at));

function persist() {
  if (!save()) toast('Could not save — storage full or blocked');
}

let toastTimer;
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 2200);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    document.execCommand('copy');
    ta.remove();
  }
  toast('Copied');
}

async function shareText(title, text) {
  if (navigator.share) {
    try { await navigator.share({ title, text }); } catch {}
  } else {
    await copyText(text);
  }
}

// ---------- chips (button groups; the DOM holds the selection state) ----------
// `only` lists options that can't be combined with others in a pick-many row (e.g. "Incision c/d/i").
function chips(group, options, selected = [], { multi = false, sys = '', only = [] } = {}) {
  const sel = new Set(selected);
  const all = [...options, ...selected.filter(v => !options.includes(v))];
  return `<div class="chips" data-group="${esc(group)}" data-multi="${multi ? 1 : 0}"${sys ? ` data-sys="${esc(sys)}"` : ''}>${all
    .map(o => `<button type="button" class="chip${sel.has(o) ? ' on' : ''}" data-act="chip" data-val="${esc(o)}"${only.includes(o) ? ' data-only="1"' : ''} aria-pressed="${sel.has(o)}">${esc(o)}</button>`)
    .join('')}</div>`;
}
const groupEl = group => main.querySelector(`.chips[data-group="${CSS.escape(group)}"]`);
const readChips = group => [...(groupEl(group)?.querySelectorAll('.chip.on') || [])].map(b => b.dataset.val);
function setChips(group, vals) {
  const set = new Set(vals);
  groupEl(group)?.querySelectorAll('.chip').forEach(b => {
    const on = set.has(b.dataset.val);
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on);
  });
}
// An exam system can span several chip rows (sub-groups); these read/write all of them.
const sysEls = name => [...main.querySelectorAll(`.chips[data-sys="${CSS.escape(name)}"]`)];
const readSys = name => sysEls(name).flatMap(el => [...el.querySelectorAll('.chip.on')].map(b => b.dataset.val));
const setSys = (name, vals) => sysEls(name).forEach(el => setChips(el.dataset.group, vals));

// In-app Yes/No dialog (resolves true for Yes).
function ask(title, message, { yes = 'Yes', no = 'No', danger = true } = {}) {
  return new Promise(resolve => {
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.innerHTML = `<div class="modal" role="alertdialog" aria-modal="true" aria-labelledby="mTitle">
      <h3 id="mTitle">${esc(title)}</h3>${message ? `<p>${esc(message)}</p>` : ''}
      <div class="modal-actions"><button type="button" class="btn" data-m="no">${esc(no)}</button>
      <button type="button" class="btn ${danger ? 'danger-fill' : 'primary'}" data-m="yes">${esc(yes)}</button></div></div>`;
    wrap.addEventListener('click', e => {
      const b = e.target.closest('[data-m]');
      if (!b && e.target !== wrap) return;
      e.stopPropagation();
      wrap.remove();
      resolve(b?.dataset.m === 'yes');
    });
    document.body.appendChild(wrap);
    wrap.querySelector('[data-m="no"]').focus();
  });
}

function toggleChip(btn) {
  const wrap = btn.closest('.chips');
  const turnOn = !btn.classList.contains('on');
  const clear = wrap.dataset.multi !== '1' ? '.chip.on' : btn.dataset.only ? '.chip.on' : '.chip.on[data-only]';
  if (turnOn) wrap.querySelectorAll(clear).forEach(b => { b.classList.remove('on'); b.setAttribute('aria-pressed', false); });
  btn.classList.toggle('on', turnOn);
  btn.setAttribute('aria-pressed', turnOn);
}

// ---------- navigation ----------
async function navigate(href) {
  if (leaveGuard && !(await leaveGuard())) return;
  leaveGuard = null;
  if (location.hash === href) route(); else location.hash = href;
}

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const act = el.dataset.act;
  if (act === 'chip') {
    toggleChip(el);
    H.onChip?.(el.closest('.chips').dataset.group, el);
  } else if (act === 'go') {
    navigate(el.dataset.href);
  } else {
    H[act]?.(el, e);
  }
});

function setTop({ title, sub = '', left = '', right = '' }) {
  topbar.innerHTML = `<div class="tb-side">${left}</div>
    <div class="tb-title"><div class="tb-main">${esc(title)}</div>${sub ? `<div class="tb-sub">${esc(sub)}</div>` : ''}</div>
    <div class="tb-side tb-right">${right}</div>`;
  document.title = title ? `${title} · Rounds` : 'Rounds';
}
const backBtn = (href, label) => `<button class="tb-btn" data-act="go" data-href="${href}">‹ ${esc(label)}</button>`;

function route() {
  H = {};
  leaveGuard = null;
  footer.innerHTML = '';
  footer.hidden = true;
  const seg = location.hash.slice(1).split('/').filter(Boolean);
  if (!seg.length) viewCensus();
  else if (seg[0] === 'new') viewPatientForm(null);
  else if (seg[0] === 'p' && patient(seg[1])) {
    const p = patient(seg[1]);
    if (seg[2] === 'edit') viewPatientForm(p);
    else if (seg[2] === 'note') viewNoteEditor({ p, copy: seg[3] === 'copy' });
    else viewPatient(p);
  } else if (seg[0] === 'n' && data().notes.some(n => n.id === seg[1])) {
    const n = data().notes.find(x => x.id === seg[1]);
    const p = patient(n.patientId);
    if (seg[2] === 'edit') viewNoteEditor({ p, note: n });
    else viewNote(n, p);
  } else if (seg[0] === 'report') viewReport();
  else if (seg[0] === 'settings') viewSettings();
  else { location.replace('#/'); return; }
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);

// ---------- report text ----------
function noteReport(n, p) {
  const at = new Date(n.at);
  const L = [];
  L.push([p.name, p.age ? `${p.age} y/o` : ''].filter(Boolean).join(', ') + (p.room ? ` — Rm ${p.room}` : ''));
  L.push(`${fmtDay(at)} ${fmtTime(at)} (${n.session} rounds)`);
  L.push(...procLines(p, at));
  L.push(`PMH: ${p.pmh || '—'}`);
  L.push(`ALL: ${p.allergies || '—'}`);
  L.push(`Drains/lines: ${drainText(n) || 'None'}`);
  L.push(`Diet: ${dietText(n) || '—'}`);

  L.push('', 'SUBJECTIVE');
  const subj = subjLines(n, p);
  L.push(...(subj.length ? subj : ['Not documented']));
  if (n.comment) L.push(`Comments: ${n.comment}`);

  L.push('', 'EXAM');
  const exam = Object.keys(n.exam || {}).length || Object.keys(n.examText || {}).length
    ? examSystems(n, p).map(s => ({ name: s.name, text: [(n.exam?.[s.name] || []).join(', '), n.examText?.[s.name]].filter(Boolean).join('; ') })).filter(s => s.text)
    : [];
  L.push(...(exam.length ? exam.map(s => `${s.name}: ${s.text}`) : ['Not documented']));
  return L.join('\n');
}

// Template questions in order, plus any answered questions no longer in the template (procedure changed).
function questionsFor(n, p) {
  const qs = subjFor(procKeys(p));
  for (const id of Object.keys(n?.subj || {})) if (!qs.some(q => q.id === id) && QUESTIONS[id]) qs.splice(qs.length - 1, 0, QUESTIONS[id]);
  return qs;
}
const followText = (n, q) => (q.follow && n.subj?.[q.id] === q.follow.when && n.follow?.[q.id] ? `, ${n.follow[q.id]} ${q.follow.unit}` : '');
const subjLines = (n, p) => questionsFor(n, p).filter(q => n.subj?.[q.id]).map(q => `${q.label}: ${n.subj[q.id]}${followText(n, q)}`);
const examSystems = (n, p) => examFor(procKeys(p), n.drains || []);

// ---------- census ----------
function byRoom(a, b) {
  if (!!a.room !== !!b.room) return a.room ? -1 : 1;
  return (a.room || '').localeCompare(b.room || '', undefined, { numeric: true }) || a.name.localeCompare(b.name);
}

function viewCensus() {
  const today = new Date();
  const pts = data().patients.filter(p => p.active !== false).sort(byRoom);
  setTop({
    title: 'Census',
    sub: fmtDay(today),
    left: `<button class="tb-btn icon" data-act="go" data-href="#/settings" aria-label="Settings &amp; backup">⚙︎</button>`,
    right: `${pts.length ? `<button class="tb-btn" data-act="go" data-href="#/report">Report</button>` : ''}<button class="tb-btn icon add" data-act="go" data-href="#/new" aria-label="Add patient">＋</button>`,
  });
  if (!pts.length) {
    main.innerHTML = `<div class="empty"><p>No patients on the census.</p>
      <button class="btn primary" data-act="go" data-href="#/new">Add patient</button>
      <p class="hint">Data is stored only on this device.</p></div>`;
    return;
  }
  main.innerHTML = `<ul class="list">${pts.map(p => {
    const todays = notesFor(p.id).filter(n => sameDay(new Date(n.at), today));
    const am = todays.some(n => n.session === 'AM');
    const pm = todays.some(n => n.session === 'PM');
    const meta = [dietText(p), drainText(p)].filter(Boolean).join(' · ');
    return `<li><button class="row" data-act="go" data-href="#/p/${p.id}">
      <div class="row-main">
        <div class="row-title">${esc(p.name)}${p.age ? `<span class="muted">, ${esc(p.age)}</span>` : ''}</div>
        ${procLines(p, today, true).map(l => `<div class="row-sub">${esc(l)}</div>`).join('')}
        ${meta ? `<div class="row-sub muted">${esc(meta)}</div>` : ''}
      </div>
      <div class="row-side">
        ${p.room ? `<span class="room">${esc(p.room)}</span>` : ''}
        <span class="badges"><span class="badge${am ? ' done' : ''}">AM</span><span class="badge${pm ? ' done' : ''}">PM</span></span>
      </div></button></li>`;
  }).join('')}</ul>`;
}

// ---------- patient form ----------
const procRow = x => `<div class="proc-row">
  <div class="proc-row-head"><span class="sub-label proc-title"></span><button type="button" class="btn small subtle" data-act="rmProc">Remove</button></div>
  <select class="proc-key" aria-label="Procedure"><option value="">Select procedure…</option>
    ${PROCEDURES.map(o => `<option value="${o.key}"${o.key === x.key ? ' selected' : ''}>${esc(o.label)}</option>`).join('')}</select>
  <input class="proc-other" value="${esc(x.other)}" placeholder="Procedure name" aria-label="Procedure name">
  <div class="proc-date-row"><input type="date" class="proc-date" value="${esc(x.date)}" aria-label="Procedure date"><span class="hint proc-pod"></span></div>
</div>`;

function viewPatientForm(p) {
  const isNew = !p;
  const v = p || { name: '', age: '', room: '', procs: [{ key: '', other: '', date: ymd(new Date()) }], pmh: '', allergies: '', drains: [], drainsNote: '', diet: '', dietNote: '' };
  let drainsTouched = !isNew;

  setTop({
    title: isNew ? 'New patient' : 'Edit patient',
    left: `<button class="tb-btn" data-act="go" data-href="${isNew ? '#/' : `#/p/${p.id}`}">Cancel</button>`,
    right: `<button class="tb-btn strong" data-act="save">Save</button>`,
  });
  main.innerHTML = `<form class="form" id="pf" autocomplete="off">
    <section class="card">
      <label class="field"><span>Name</span><input name="name" value="${esc(v.name)}" autocapitalize="words" autocorrect="off" spellcheck="false"></label>
      <div class="grid2">
        <label class="field"><span>Age</span><input name="age" inputmode="numeric" value="${esc(v.age)}"></label>
        <label class="field"><span>Room</span><input name="room" value="${esc(v.room)}"></label>
      </div>
    </section>
    <section class="card">
      <div id="procs">${(procs(v).length ? procs(v) : [{ key: '', other: '', date: ymd(new Date()) }]).map(procRow).join('')}</div>
      <button type="button" class="btn small" data-act="addProc">+ Add procedure (e.g. takeback)</button>
    </section>
    <section class="card">
      <label class="field"><span>PMH</span><textarea name="pmh" rows="2">${esc(v.pmh)}</textarea></label>
      <div class="field"><span>Allergies</span><div class="inline"><input name="allergies" value="${esc(v.allergies)}" aria-label="Allergies"><button type="button" class="chip" data-act="nkda">NKDA</button></div></div>
    </section>
    <section class="card">
      <div class="field"><span>Drains / catheters</span>${chips('drains', DRAIN_OPTIONS, v.drains, { multi: true })}
        <input name="drainsNote" value="${esc(v.drainsNote)}" placeholder="Details (e.g. JP x2, L stent)" aria-label="Drain details"></div>
      <div class="field"><span>Diet</span>${chips('diet', DIET_OPTIONS, v.diet ? [v.diet] : [])}
        <input name="dietNote" value="${esc(v.dietNote)}" placeholder="Details (optional)" aria-label="Diet details"></div>
    </section>
    ${isNew ? '' : `<section class="card"><button type="button" class="btn danger" data-act="delete">Delete patient and all notes</button></section>`}
  </form>`;

  const form = document.getElementById('pf');
  const f = name => form.elements[name];
  const procsEl = document.getElementById('procs');
  const rows = () => [...procsEl.querySelectorAll('.proc-row')];
  // Label rows, show "Remove" only when there's more than one, and refresh each row's POD.
  const refreshRows = () => rows().forEach((r, i, all) => {
    r.querySelector('.proc-title').textContent = i === 0 ? 'Index surgery' : 'Additional procedure';
    r.querySelector('[data-act=rmProc]').hidden = all.length < 2;
    r.querySelector('.proc-other').hidden = r.querySelector('.proc-key').value !== 'other';
    const d = podOn(r.querySelector('.proc-date').value);
    r.querySelector('.proc-pod').textContent = d == null ? '' : `${podLabel(d)} today`;
  });
  const readProcs = () => rows()
    .map(r => { const key = r.querySelector('.proc-key').value; return { key, other: key === 'other' ? r.querySelector('.proc-other').value.trim() : '', date: r.querySelector('.proc-date').value }; })
    .filter(x => x.key || x.date)
    .sort((a, b) => (!a.date) - (!b.date) || a.date.localeCompare(b.date));
  refreshRows();
  procsEl.addEventListener('change', e => {
    refreshRows();
    if (!e.target.classList.contains('proc-key')) return;
    const picked = readProcs().map(x => procByKey(x.key)).filter(Boolean);
    if (!drainsTouched) setChips('drains', [...new Set(picked.flatMap(x => x.drains))]);
    const diet = picked.find(x => x.diet)?.diet;
    if (diet && !readChips('diet').length) setChips('diet', [diet]);
  });
  H.addProc = () => {
    procsEl.insertAdjacentHTML('beforeend', procRow({ key: '', other: '', date: ymd(new Date()) }));
    refreshRows();
    rows().at(-1).querySelector('.proc-key').focus();
  };
  H.rmProc = el => { el.closest('.proc-row').remove(); refreshRows(); };
  form.addEventListener('submit', e => { e.preventDefault(); H.save(); });

  H.onChip = group => { if (group === 'drains') drainsTouched = true; };
  H.nkda = () => { f('allergies').value = 'NKDA'; };
  H.save = () => {
    const name = f('name').value.trim();
    if (!name) { toast('Name is required'); f('name').focus(); return; }
    const vals = {
      name,
      age: f('age').value.trim(),
      room: f('room').value.trim(),
      procs: readProcs(),
      pmh: f('pmh').value.trim(),
      allergies: f('allergies').value.trim(),
      drains: readChips('drains'),
      drainsNote: f('drainsNote').value.trim(),
      diet: readChips('diet')[0] || '',
      dietNote: f('dietNote').value.trim(),
    };
    let target = p;
    if (isNew) {
      target = { id: uid(), active: true, createdAt: new Date().toISOString(), ...vals };
      data().patients.push(target);
    } else {
      Object.assign(target, vals);
      delete target.procedure; delete target.procedureOther; delete target.surgeryDate;
    }
    persist();
    navigate(`#/p/${target.id}`);
  };
  H.delete = async () => {
    if (!(await ask(`Do you really want to delete ${p.name}?`, 'All of their notes will be deleted too. This cannot be undone.', { yes: 'Yes, delete' }))) return;
    const d = data();
    d.patients = d.patients.filter(x => x.id !== p.id);
    d.notes = d.notes.filter(n => n.patientId !== p.id);
    persist();
    navigate('#/');
  };
}

// ---------- patient view ----------
function noteSummary(n, p) {
  const items = questionsFor(n, p).filter(q => n.subj?.[q.id] && q.id !== 'events')
    .map(q => ({ t: `${q.short}: ${n.subj[q.id]}${followText(n, q)}`, warn: q.flag?.includes(n.subj[q.id]) }));
  if (n.subj?.events === 'See comments') items.push({ t: 'Events', warn: true });
  const normals = new Set(examSystems(n, p).flatMap(s => s.chips.filter(c => c.n).map(c => c.t)));
  const known = new Set(examSystems(n, p).flatMap(s => s.chips.map(c => c.t)));
  for (const vals of Object.values(n.exam || {})) {
    for (const v of vals) if (known.has(v) && !normals.has(v)) items.push({ t: v, warn: true });
  }
  return items;
}

function viewPatient(p) {
  const ns = notesFor(p.id);
  const discharged = p.active === false;
  setTop({
    title: p.name,
    sub: [p.age && `${p.age} y/o`, p.room && `Rm ${p.room}`, discharged && 'Discharged'].filter(Boolean).join(' · '),
    left: backBtn(discharged ? '#/settings' : '#/', discharged ? 'Back' : 'Census'),
    right: `<button class="tb-btn" data-act="go" data-href="#/p/${p.id}/edit">Edit</button>`,
  });
  const info = [['PMH', p.pmh], ['ALL', p.allergies], ['Drains', drainText(p)], ['Diet', dietText(p)]];
  main.innerHTML = `
    <section class="card info">
      ${procs(p).length ? procs(p).map(x => {
        const d = podOn(x.date);
        return `<div class="info-proc">${esc(entryName(x) || 'Procedure')}</div>
          ${x.date ? `<div class="muted">${esc(fmtDayShort(parseYMD(x.date)))} · <strong>${esc(podLabel(d))}</strong> today</div>` : ''}`;
      }).join('') : '<div class="info-proc">No procedure entered</div>'}
      <dl>${info.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v || '—')}</dd>`).join('')}</dl>
    </section>
    <div class="actions">
      <button class="btn primary" data-act="go" data-href="#/p/${p.id}/note">New note</button>
      ${ns.length ? `<button class="btn" data-act="go" data-href="#/p/${p.id}/note/copy">Copy last note</button>` : ''}
    </div>
    <h2 class="section-title">Notes${ns.length ? ` (${ns.length})` : ''}</h2>
    ${ns.length ? `<ul class="timeline">${ns.map(n => {
      const at = new Date(n.at);
      const nd = podShort(p, at);
      return `<li><button class="note-card" data-act="go" data-href="#/n/${n.id}">
        <div class="note-card-head"><span class="strong">${esc(fmtDayShort(at))}</span>
          <span class="badge done">${esc(n.session)}</span>
          ${nd ? `<span class="muted">${esc(nd)}</span>` : ''}
          <span class="muted right">${esc(fmtTime(at))}</span></div>
        <div class="sum">${noteSummary(n, p).map(i => `<span class="pill${i.warn ? ' warn' : ''}">${esc(i.t)}</span>`).join('')}</div>
        ${n.comment ? `<div class="note-card-comment">${esc(n.comment)}</div>` : ''}
      </button></li>`;
    }).join('')}</ul>` : '<p class="empty small">No notes yet.</p>'}
    <section class="card"><button class="btn subtle" data-act="discharge">${discharged ? 'Return to census' : 'Discharge (remove from census)'}</button></section>`;

  H.discharge = async () => {
    if (!discharged && !(await ask(`Discharge ${p.name}?`, 'They will be removed from the census. Notes are kept and they can be returned from Settings.', { yes: 'Yes, discharge', danger: false }))) return;
    if (discharged) { p.active = true; delete p.dischargedAt; }
    else { p.active = false; p.dischargedAt = new Date().toISOString(); }
    persist();
    toast(discharged ? 'Back on census' : 'Discharged — find in Settings');
    navigate(discharged ? `#/p/${p.id}` : '#/');
  };
}

// ---------- note editor ----------
function viewNoteEditor({ p, note, copy }) {
  const last = notesFor(p.id)[0];
  let d;
  if (note) {
    d = JSON.parse(JSON.stringify(note));
  } else {
    const now = new Date();
    d = { id: null, patientId: p.id, at: now.toISOString(), session: now.getHours() < 12 ? 'AM' : 'PM', subj: {}, follow: {}, comment: '', exam: {}, examText: {},
      drains: [...(p.drains || [])], drainsNote: p.drainsNote || '', diet: p.diet || '', dietNote: p.dietNote || '' };
    if (copy && last) {
      d.subj = { ...last.subj };
      delete d.subj.events;
      d.exam = JSON.parse(JSON.stringify(last.exam || {}));
      d.examText = { ...(last.examText || {}) };
    }
  }
  const qs = questionsFor(d, p);
  let dirty = false;

  setTop({
    title: note ? 'Edit note' : copy ? 'New note (copied)' : 'New note',
    sub: p.name,
    left: `<button class="tb-btn" data-act="cancel">Cancel</button>`,
    right: `<button class="tb-btn strong" data-act="saveNote">Save</button>`,
  });
  main.innerHTML = `<form class="form" id="nf" autocomplete="off">
    <section class="card">
      <div class="note-head"><span class="strong">${esc(p.name)}</span><span class="muted" id="podLine"></span></div>
      <div class="grid2">
        <div class="field"><span>Session</span>${chips('session', ['AM', 'PM'], [d.session])}</div>
        <label class="field"><span>Date / time</span><input type="datetime-local" name="at" value="${localInput(new Date(d.at))}"></label>
      </div>
    </section>

    <h2 class="section-title">Status</h2>
    <section class="card">
      <div class="field"><span>Diet</span>${chips('diet', DIET_OPTIONS, d.diet ? [d.diet] : [])}
        <input name="dietNote" value="${esc(d.dietNote)}" placeholder="Details (optional)" aria-label="Diet details"></div>
      <div class="field"><span>Drains / catheters</span>${chips('drains', DRAIN_OPTIONS, d.drains, { multi: true })}
        <input name="drainsNote" value="${esc(d.drainsNote)}" placeholder="Details (e.g. JP x2, L stent)" aria-label="Drain details"></div>
    </section>

    <h2 class="section-title">Subjective</h2>
    <section class="card">
      ${qs.map(q => `<div class="q"><div class="q-label">${esc(q.label)}</div>${chips('subj:' + q.id, q.options, d.subj[q.id] ? [d.subj[q.id]] : [])}
        ${q.follow ? `<label class="field follow" data-follow="${q.id}"${d.subj[q.id] === q.follow.when ? '' : ' hidden'}><span>${esc(q.follow.label)}</span>
          <input type="number" inputmode="numeric" min="0" name="f:${q.id}" value="${esc(d.follow?.[q.id] || '')}"></label>` : ''}</div>`).join('')}
      <label class="field"><span>Comments</span><textarea name="comment" rows="3" placeholder="Overnight events, concerns…">${esc(d.comment)}</textarea></label>
    </section>

    <div class="section-head"><h2 class="section-title">Exam</h2><button type="button" class="btn small primary" data-act="allNormal">All normal</button></div>
    <div id="exam"></div>
  </form>`;
  footer.hidden = false;
  footer.innerHTML = `<button class="btn primary block" data-act="saveNote">Save note</button>`;

  const form = document.getElementById('nf');
  let systems = [];

  function renderExam(sel, text) {
    systems = examFor(procKeys(p), readChips('drains'));
    document.getElementById('exam').innerHTML = systems.map(s => `<section class="card exam-sys">
      <div class="sys-head"><h3>${esc(s.name)}</h3>
        <span><button type="button" class="btn small" data-act="sysNormal" data-sys="${esc(s.name)}">Normal</button>
        <button type="button" class="btn small subtle" data-act="sysClear" data-sys="${esc(s.name)}">Clear</button></span></div>
      ${examRows(s, sel[s.name] || [])}
      <input name="ex:${esc(s.name)}" value="${esc(text[s.name] || '')}" placeholder="Other ${esc(s.name.toLowerCase())} findings" aria-label="Other ${esc(s.name)} findings">
    </section>`).join('');
  }
  // Grouped chips get a labeled row each (pick-one or pick-many per EXAM_GROUPS); the rest share one row.
  function examRows(s, sel) {
    const known = new Set(s.chips.map(c => c.t));
    const rows = [];
    for (const [g, single] of Object.entries(EXAM_GROUPS)) {
      const opts = s.chips.filter(c => c.g === g).map(c => c.t);
      if (opts.length) rows.push(`<div class="sub-label">${esc(g)}</div>${chips(`exam:${s.name}:${g}`, opts, sel.filter(v => opts.includes(v)), { multi: !single, sys: s.name, only: s.chips.filter(c => c.g === g && c.n).map(c => c.t) })}`);
    }
    const rest = s.chips.filter(c => !c.g).map(c => c.t);
    const restSel = sel.filter(v => rest.includes(v) || !known.has(v));
    if (rest.length || restSel.length) rows.push(`${rows.length ? '<div class="sub-label">Other</div>' : ''}${chips('exam:' + s.name, rest, restSel, { multi: true, sys: s.name })}`);
    return rows.join('');
  }
  function readExam() {
    const sel = {}, text = {};
    for (const s of systems) {
      const v = readSys(s.name);
      const t = form.elements['ex:' + s.name]?.value.trim();
      if (v.length) sel[s.name] = v;
      if (t) text[s.name] = t;
    }
    return { sel, text };
  }
  const normalsFor = name => systems.find(s => s.name === name).chips.filter(c => c.n).map(c => c.t);
  const atDate = () => (form.elements.at.value ? new Date(form.elements.at.value) : new Date());
  const updatePod = () => {
    document.getElementById('podLine').textContent = podShort(p, atDate());
  };

  renderExam(d.exam, d.examText);
  updatePod();
  form.elements.at.addEventListener('change', updatePod);
  form.addEventListener('input', () => { dirty = true; });
  form.addEventListener('submit', e => e.preventDefault());
  leaveGuard = async () => !dirty || ask('Discard changes to this note?', '', { yes: 'Discard', no: 'Keep editing' });

  H.onChip = group => {
    dirty = true;
    const q = group.startsWith('subj:') && QUESTIONS[group.slice(5)];
    if (q?.follow) {
      const box = main.querySelector(`[data-follow="${q.id}"]`);
      box.hidden = readChips(group)[0] !== q.follow.when;
      if (!box.hidden) box.querySelector('input').focus();
    }
    if (group === 'drains') { const cur = readExam(); renderExam(cur.sel, cur.text); }
  };
  H.sysNormal = el => { setSys(el.dataset.sys, normalsFor(el.dataset.sys)); dirty = true; };
  H.sysClear = el => { setSys(el.dataset.sys, []); dirty = true; };
  H.allNormal = () => { systems.forEach(s => setSys(s.name, normalsFor(s.name))); dirty = true; toast('Exam set to normal'); };
  H.cancel = () => navigate(note ? `#/n/${note.id}` : `#/p/${p.id}`);
  H.saveNote = () => {
    const at = atDate();
    const { sel, text } = readExam();
    const n = {
      id: d.id || uid(),
      patientId: p.id,
      at: at.toISOString(),
      session: readChips('session')[0] || (at.getHours() < 12 ? 'AM' : 'PM'),
      subj: {},
      follow: {},
      comment: form.elements.comment.value.trim(),
      exam: sel,
      examText: text,
      diet: readChips('diet')[0] || '',
      dietNote: form.elements.dietNote.value.trim(),
      drains: readChips('drains'),
      drainsNote: form.elements.drainsNote.value.trim(),
      createdAt: d.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    for (const q of qs) {
      const v = readChips('subj:' + q.id)[0];
      if (v) n.subj[q.id] = v;
      const f = q.follow && v === q.follow.when && form.elements['f:' + q.id].value.trim();
      if (f) n.follow[q.id] = f;
    }

    const notes = data().notes;
    const i = notes.findIndex(x => x.id === n.id);
    if (i >= 0) notes[i] = n; else notes.push(n);
    // The newest note's diet/drains become the patient's current status on the census.
    if (notesFor(p.id)[0].id === n.id) Object.assign(p, { diet: n.diet, dietNote: n.dietNote, drains: n.drains, drainsNote: n.drainsNote });
    persist();
    dirty = false;
    navigate(`#/n/${n.id}`);
  };
}

// ---------- note view ----------
function viewNote(n, p) {
  const ns = notesFor(p.id);
  const i = ns.findIndex(x => x.id === n.id);
  const older = ns[i + 1], newer = ns[i - 1];
  const at = new Date(n.at);
  const text = noteReport(n, p);
  setTop({
    title: `${fmtDayShort(at)} · ${n.session}`,
    sub: p.name,
    left: backBtn(`#/p/${p.id}`, 'Patient'),
    right: `<button class="tb-btn" data-act="go" data-href="#/n/${n.id}/edit">Edit</button>`,
  });
  const navBtn = (x, label) => x ? `<button class="btn small" data-act="go" data-href="#/n/${x.id}">${label}</button>` : `<button class="btn small" disabled>${label}</button>`;
  main.innerHTML = `
    <div class="pager">${navBtn(older, '‹ Older')}<span class="muted">Note ${ns.length - i} of ${ns.length}</span>${navBtn(newer, 'Newer ›')}</div>
    <pre class="report">${esc(text)}</pre>
    <div class="actions">
      <button class="btn primary" data-act="copy">Copy</button>
      <button class="btn" data-act="share">Email / Share</button>
    </div>
    <section class="card"><button class="btn danger" data-act="del">Delete note</button></section>`;

  H.copy = () => copyText(text);
  H.share = () => shareText('Rounds note', text);
  H.del = async () => {
    if (!(await ask('Do you really want to delete this note?', 'This cannot be undone.', { yes: 'Yes, delete' }))) return;
    data().notes = data().notes.filter(x => x.id !== n.id);
    persist();
    navigate(`#/p/${p.id}`);
  };
}

// ---------- census report ----------
function viewReport() {
  setTop({ title: 'Census report', left: backBtn('#/', 'Census') });
  const day = new Date();
  main.innerHTML = `<section class="card">
      <div class="field"><span>Include today's</span>${chips('which', ['Latest', 'AM', 'PM'], ['Latest'])}</div>
    </section>
    <pre class="report" id="rep"></pre>
    <div class="actions">
      <button class="btn primary" data-act="copy">Copy</button>
      <button class="btn" data-act="share">Email / Share</button>
    </div>`;

  let text = '';
  const build = () => {
    const which = readChips('which')[0] || 'Latest';
    const pts = data().patients.filter(p => p.active !== false).sort(byRoom);
    const blocks = pts.map(p => {
      const n = notesFor(p.id).find(x => sameDay(new Date(x.at), day) && (which === 'Latest' || x.session === which));
      if (n) return noteReport(n, p);
      return [`${p.name}${p.age ? `, ${p.age} y/o` : ''}${p.room ? ` — Rm ${p.room}` : ''}`,
        ...procLines(p, day), `No ${which === 'Latest' ? '' : which + ' '}note today`].filter(Boolean).join('\n');
    });
    text = `Rounds — ${fmtDay(day)}${which === 'Latest' ? '' : ` (${which})`}\n\n` + blocks.join('\n\n' + '-'.repeat(28) + '\n\n');
    document.getElementById('rep').textContent = text;
  };
  build();
  H.onChip = group => { if (group === 'which') build(); };
  H.copy = () => copyText(text);
  H.share = () => shareText('Rounds report', text);
}

// ---------- settings ----------
function viewSettings() {
  setTop({ title: 'Settings', left: backBtn('#/', 'Census') });
  const { patients, notes } = data();
  const gone = patients.filter(p => p.active === false).sort((a, b) => (b.dischargedAt || '').localeCompare(a.dischargedAt || ''));
  main.innerHTML = `
    <section class="card prose">
      <p><strong>Privacy:</strong> All patients and notes are stored only on this device, inside this app. Nothing is sent to any server.</p>
      <p class="muted">Use this from your Home Screen icon (Share → Add to Home Screen). Data saved in Safari and in the Home Screen app are separate.</p>
    </section>

    <h2 class="section-title">Discharged patients (${gone.length})</h2>
    ${gone.length ? `<ul class="list">${gone.map(p => `<li><button class="row" data-act="go" data-href="#/p/${p.id}">
        <div class="row-main"><div class="row-title">${esc(p.name)}</div>
        <div class="row-sub muted">${esc([procs(p).map(x => entryName(x, true)).filter(Boolean).join(' + '), p.dischargedAt ? 'D/c ' + fmtDayShort(new Date(p.dischargedAt)) : ''].filter(Boolean).join(' · '))}</div></div>
      </button></li>`).join('')}</ul>` : '<p class="empty small">None.</p>'}

    <h2 class="section-title">Backup</h2>
    <section class="card">
      <p class="muted">${patients.length} patients · ${notes.length} notes. A backup file contains patient information — keep it somewhere secure.</p>
      <div class="actions">
        <button class="btn" data-act="export">Export backup</button>
        <button class="btn" data-act="import">Restore backup</button>
      </div>
      <input type="file" id="importFile" accept="application/json,.json" hidden>
    </section>

    <section class="card"><button class="btn danger" data-act="wipe">Erase all data</button></section>`;

  H.export = async () => {
    const json = JSON.stringify({ app: 'rounding-aide', exportedAt: new Date().toISOString(), ...data() }, null, 2);
    const name = `rounds-backup-${ymd(new Date())}.json`;
    const file = new File([json], name, { type: 'application/json' });
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: name }); } catch {}
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const input = document.getElementById('importFile');
  H.import = () => input.click();
  input.addEventListener('change', async () => {
    const file = input.files[0];
    input.value = '';
    if (!file) return;
    try {
      const s = JSON.parse(await file.text());
      if (!isValidBackup(s)) throw new Error();
      if (!(await ask('Replace everything on this device with the backup?', `${s.patients.length} patients, ${s.notes.length} notes. Current data will be overwritten.`, { yes: 'Yes, replace' }))) return;
      if (!replaceAll(s)) throw new Error();
      toast('Backup restored');
      navigate('#/');
    } catch {
      toast('That file is not a valid backup');
    }
  });
  H.wipe = async () => {
    if (!(await ask('Do you really want to erase ALL data?', 'Every patient and note on this device will be deleted. This cannot be undone.', { yes: 'Yes, erase' }))) return;
    replaceAll({ patients: [], notes: [] });
    navigate('#/');
  };
}

// ---------- start ----------
route();

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
