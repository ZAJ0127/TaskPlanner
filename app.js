'use strict';

/* =========================================================
   TaskPlanner — plan tasks around your usual week,
   keep chores on repeat, and log where your time goes.
   All data lives in localStorage on this device.
   ========================================================= */

/* ---------- Constants ---------- */
const STORE_KEY = 'taskplanner.v1';
const DAYS1 = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAYS3 = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const PALETTE = ['#2A2E36', '#F97316', '#6D5BD0', '#0F7B6C', '#2F5BEA', '#7FA0F5', '#B8901F', '#A3ABB8', '#D9488F', '#1495A8', '#8A5A3B', '#5B8C2A'];
const DEFAULT_CATEGORIES = [
  { id: 'work', name: 'Work', color: '#2A2E36' },
  { id: 'driving', name: 'Driving', color: '#F97316' },
  { id: 'sleep', name: 'Sleep', color: '#6D5BD0' },
  { id: 'gym', name: 'Gym', color: '#0F7B6C' },
  { id: 'chores', name: 'Chores', color: '#2F5BEA' },
  { id: 'errands', name: 'Errands', color: '#7FA0F5' },
  { id: 'meals', name: 'Meals', color: '#B8901F' },
  { id: 'other', name: 'Other', color: '#A3ABB8' }
];
const DURS = [15, 30, 45, 60, 90, 120];

/* ---------- Small utils ---------- */
const $ = (sel, el = document) => el.querySelector(sel);
const range = (n) => Array.from({ length: n }, (_, i) => i);
const pad = (n) => String(n).padStart(2, '0');
const roundUp = (m, step) => Math.ceil(m / step) * step;
const roundDown = (m, step) => Math.floor(m / step) * step;
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function parseYmd(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
function addDays(s, n) { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); }
function todayStr() { return ymd(new Date()); }
function nowMin() { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); }
function dow(s) { return parseYmd(s).getDay(); }
function daysBetween(a, b) { return Math.round((parseYmd(b) - parseYmd(a)) / 86400000); }
function hhmm(min) { min = ((min % 1440) + 1440) % 1440; return pad(Math.floor(min / 60)) + ':' + pad(min % 60); }
function toMin(s) { const [h, m] = s.split(':').map(Number); return h * 60 + m; }

function fmtTime(min) {
  min = ((min % 1440) + 1440) % 1440;
  let h = Math.floor(min / 60); const m = min % 60;
  const ap = h < 12 ? 'AM' : 'PM'; h = h % 12 || 12;
  return h + (m ? ':' + pad(m) : '') + ' ' + ap;
}
function fmtHour(min) {
  const h = Math.floor(min / 60) % 24;
  if (h === 0) return '12 AM';
  if (h === 12) return '12 PM';
  return (h % 12) + (h < 12 ? ' AM' : ' PM');
}
function fmtDur(min) {
  min = Math.round(min);
  const h = Math.floor(min / 60), m = min % 60;
  if (!h) return m + 'm';
  return h + 'h' + (m ? ' ' + m + 'm' : '');
}
function fmtDateLong(s) { const d = parseYmd(s); return DAYS3[d.getDay()] + ', ' + MONTHS3[d.getMonth()] + ' ' + d.getDate(); }
function fmtShort(s) { const d = parseYmd(s); return MONTHS3[d.getMonth()] + ' ' + d.getDate(); }
function relDay(s) {
  const t = todayStr();
  if (s === t) return 'Today';
  if (s === addDays(t, 1)) return 'Tomorrow';
  if (s === addDays(t, -1)) return 'Yesterday';
  const diff = daysBetween(t, s);
  if (diff > 0 && diff < 7) return DAYS3[dow(s)];
  return fmtDateLong(s);
}
function onColor(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62 ? '#15171C' : '#FFFFFF';
}
function daysText(days) {
  const d = [...days].sort((a, b) => a - b).join(',');
  if (d === '0,1,2,3,4,5,6') return 'Every day';
  if (d === '1,2,3,4,5') return 'Mon–Fri';
  if (d === '0,6') return 'Weekends';
  return [...days].sort((a, b) => a - b).map((x) => DAYS3[x]).join(' · ');
}

/* ---------- Icons ---------- */
const P = {
  today: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  week: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  chores: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>',
  time: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  routine: '<path d="M4 6h16M4 12h10M4 18h7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  left: '<path d="M15 18l-6-6 6-6"/>',
  right: '<path d="M9 18l6-6-6-6"/>',
  repeat: '<path d="M17 2l4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  alert: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16v.5"/>'
};
function svg(name, size = 24, sw = 2) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name]}</svg>`;
}

/* ---------- State ---------- */
function defaultState() {
  return {
    v: 1,
    settings: { windowStart: 8 * 60, windowEnd: 21 * 60, gapMin: 15 },
    categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })),
    routine: [],
    tasks: [],
    chores: [],
    entries: [],
    hints: {},
    dismissed: {}
  };
}
function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      const base = defaultState();
      return { ...base, ...s, settings: { ...base.settings, ...(s.settings || {}) } };
    }
  } catch (e) { /* fall through */ }
  return defaultState();
}
let S = load();
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); }
  catch (e) { toast('Couldn’t save — storage is full or blocked'); }
}
let undoSnap = null;
function snapshot() { undoSnap = JSON.stringify(S); }
function undo() {
  if (!undoSnap) return;
  S = JSON.parse(undoSnap); undoSnap = null; save(); render();
}

function cat(id) { return S.categories.find((c) => c.id === id) || { id: 'other', name: 'Other', color: '#A3ABB8' }; }

/* ---------- Schedule model ---------- */
function routineOn(date) {
  const d = dow(date);
  return S.routine.filter((r) => r.days.includes(d)).map((r) => ({
    kind: 'routine', key: 'routine:' + r.id, id: r.id, title: r.name,
    start: r.start, end: r.end > r.start ? r.end : 1440, category: r.category
  }));
}

function choreNext(c, from) {
  if (c.repeat.type === 'weekdays') {
    const days = c.repeat.days.length ? c.repeat.days : [0, 1, 2, 3, 4, 5, 6];
    for (let i = 1; i <= 7; i++) { const d = addDays(from, i); if (days.includes(dow(d))) return d; }
    return addDays(from, 7);
  }
  const n = Math.max(1, c.repeat.every | 0);
  if (c.repeat.unit === 'month') {
    const d = parseYmd(from); const day = d.getDate();
    d.setDate(1); d.setMonth(d.getMonth() + n);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(day, last));
    return ymd(d);
  }
  return addDays(from, c.repeat.unit === 'week' ? 7 * n : n);
}
function choreOccurrences(c, a, b) {
  const out = []; let d = c.nextDue, guard = 0;
  while (d <= b && guard++ < 400) { if (d >= a) out.push(d); d = choreNext(c, d); }
  return out;
}
function choreItem(c, date) {
  const actionable = date === c.nextDue;
  let start = null;
  if (actionable && c.slot && c.slot.date === date) start = c.slot.start;
  else if (c.mode === 'fixed') start = c.time;
  return {
    kind: 'chore', key: 'chore:' + c.id, id: c.id, title: c.title,
    start, end: start == null ? null : start + c.durationMin,
    category: c.category, actionable, upcoming: !actionable, done: false
  };
}
function taskItem(t) {
  return {
    kind: 'task', key: 'task:' + t.id, id: t.id, title: t.title,
    start: t.start, end: t.start == null ? null : t.start + t.durationMin,
    category: t.category, done: !!t.done, auto: t.mode === 'auto'
  };
}

function dayItems(date) {
  const today = todayStr();
  const timed = routineOn(date), anytime = [];
  for (const t of S.tasks) {
    if (t.date !== date) continue;
    const it = taskItem(t);
    (it.start == null ? anytime : timed).push(it);
  }
  for (const c of S.chores) {
    for (const d of choreOccurrences(c, date, date)) {
      const it = choreItem(c, d);
      (it.start == null ? anytime : timed).push(it);
    }
    if ((c.doneDates || []).includes(date)) {
      anytime.push({ kind: 'chore', key: 'chore:' + c.id, id: c.id, title: c.title, category: c.category, start: null, end: null, done: true, doneChore: true });
    }
  }
  if (date === today) {
    for (const t of S.tasks) {
      if (t.date < today && !t.done) anytime.push({ ...taskItem(t), start: null, end: null, overdue: t.date });
    }
    for (const c of S.chores) {
      if (c.nextDue < today) anytime.push({ kind: 'chore', key: 'chore:' + c.id, id: c.id, title: c.title, category: c.category, start: null, end: null, actionable: true, overdue: c.nextDue });
    }
  }
  anytime.sort((a, b) => (a.done - b.done) || ((b.overdue ? 1 : 0) - (a.overdue ? 1 : 0)));
  return { timed, anytime };
}

function freeGaps(date, excludeKey) {
  const gap = S.settings.gapMin;
  let ws = S.settings.windowStart; const we = S.settings.windowEnd;
  const today = todayStr();
  if (date < today) return [];
  if (date === today) ws = Math.max(ws, roundUp(nowMin() + 10, 15));
  if (ws >= we) return [];
  const busy = dayItems(date).timed
    .filter((i) => i.key !== excludeKey)
    .map((i) => [i.start - gap, i.end + gap])
    .sort((a, b) => a[0] - b[0]);
  const gaps = []; let cur = ws;
  for (const [s, e] of busy) {
    if (e <= cur) continue;
    if (s > cur) gaps.push({ start: cur, end: Math.min(s, we) });
    cur = Math.max(cur, e);
    if (cur >= we) break;
  }
  if (cur < we) gaps.push({ start: cur, end: we });
  return gaps.filter((g) => g.end > g.start);
}

function suggestSlots(dur, excludeKey) {
  const today = todayStr(); const cands = [];
  for (let i = 0; i < 14; i++) {
    const d = addDays(today, i);
    for (const g of freeGaps(d, excludeKey)) {
      const s = roundUp(g.start, 15);
      if (s + dur <= g.end) cands.push({ date: d, start: s, room: g.end - s });
    }
  }
  if (!cands.length) return [];
  const out = [{ ...cands[0], why: 'Soonest' }];
  const weekEnd = addDays(today, 6);
  const roomy = cands.slice(1).filter((c) => c.date <= weekEnd).sort((a, b) => b.room - a.room)[0];
  if (roomy && roomy.room > cands[0].room + 30) out.push({ ...roomy, why: 'Most free time around it' });
  for (const c of cands.slice(1)) {
    if (out.length >= 3) break;
    if (out.some((o) => o.date === c.date && o.start === c.start)) continue;
    out.push({ ...c, why: c.date === out[0].date ? 'Later the same day' : 'Next opening' });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start);
}

function placeChore(c) {
  c.slot = null;
  if (c.mode !== 'auto') return;
  const today = todayStr();
  if (c.nextDue < today) return;
  const gaps = freeGaps(c.nextDue, 'chore:' + c.id);
  for (const g of gaps) {
    const s = roundUp(g.start, 15);
    if (s + c.durationMin <= g.end) { c.slot = { date: c.nextDue, start: s }; return; }
  }
}
function refreshAutoChores() {
  const today = todayStr(); let changed = false;
  for (const c of S.chores) {
    if (c.mode === 'auto' && c.nextDue >= today && (!c.slot || c.slot.date !== c.nextDue)) {
      placeChore(c); changed = true;
    }
  }
  if (changed) save();
}

/* ---------- Actions on data ---------- */
function addEntry(category, date, start, minutes, note, source) {
  S.entries.push({ id: uid(), category, date, start: Math.max(0, start), minutes, note: note || '', source: source || 'manual' });
}
function completeItem(key, minutes, log) {
  snapshot();
  const [kind, id] = key.split(':'); const today = todayStr();
  let title = '';
  if (kind === 'task') {
    const t = S.tasks.find((x) => x.id === id); if (!t) return;
    title = t.title;
    t.done = true; t.doneAt = Date.now();
    if (minutes) t.actualMin = minutes;
    if (log && minutes) {
      const start = (t.start != null && t.date === today && t.start + minutes <= nowMin() + 60) ? t.start : nowMin() - minutes;
      addEntry(t.category, today, start, minutes, t.title, 'task');
    }
  } else if (kind === 'chore') {
    const c = S.chores.find((x) => x.id === id); if (!c) return;
    title = c.title;
    c.doneDates = [today, ...(c.doneDates || []).filter((d) => d !== today)].slice(0, 60);
    if (minutes) c.history = [minutes, ...(c.history || [])].slice(0, 10);
    if (log && minutes) addEntry(c.category, today, nowMin() - minutes, minutes, c.title, 'chore');
    const base = c.repeat.type === 'weekdays' ? (c.nextDue > today ? c.nextDue : today) : today;
    c.nextDue = choreNext(c, base);
    placeChore(c);
  }
  save(); render();
  toast(title + ' done', true);
}
function uncompleteTask(id) {
  const t = S.tasks.find((x) => x.id === id); if (!t) return;
  snapshot();
  t.done = false; delete t.doneAt;
  save(); render();
}
function skipChore(id) {
  const c = S.chores.find((x) => x.id === id); if (!c) return;
  snapshot();
  const today = todayStr();
  c.nextDue = choreNext(c, c.nextDue > today ? c.nextDue : today);
  placeChore(c);
  save(); render();
  toast('Skipped — next one ' + relDay(c.nextDue).toLowerCase(), true);
}

/* ---------- Insights (planned vs. actual) ---------- */
function computeInsights() {
  const out = [];
  const groups = {};
  for (const t of S.tasks) {
    if (!t.done || !t.actualMin) continue;
    const k = t.title.trim().toLowerCase();
    (groups[k] = groups[k] || []).push(t);
  }
  for (const [k, list] of Object.entries(groups)) {
    if (list.length < 2) continue;
    const recent = list.sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0)).slice(0, 4);
    const avg = recent.reduce((s, t) => s + t.actualMin, 0) / recent.length;
    const planned = S.hints[k] || recent[0].durationMin;
    const sug = Math.max(5, roundUp(avg, 5));
    if (Math.abs(avg - planned) >= 10 && S.dismissed['t:' + k] !== sug) {
      out.push({
        id: 't:' + k, value: sug,
        text: `<b>${esc(recent[0].title)}</b> took <b>${fmtDur(avg)}</b> on average the last ${recent.length} times — you planned ${fmtDur(planned)}.`,
        apply: () => { S.hints[k] = sug; }
      });
    }
  }
  for (const c of S.chores) {
    const h = (c.history || []).slice(0, 4);
    if (h.length < 2) continue;
    const avg = h.reduce((s, x) => s + x, 0) / h.length;
    const sug = Math.max(5, roundUp(avg, 5));
    if (Math.abs(avg - c.durationMin) >= 10 && S.dismissed['c:' + c.id] !== sug) {
      out.push({
        id: 'c:' + c.id, value: sug,
        text: `<b>${esc(c.title)}</b> took <b>${fmtDur(avg)}</b> on average the last ${h.length} times — it’s set to ${fmtDur(c.durationMin)}.`,
        apply: () => { c.durationMin = sug; placeChore(c); }
      });
    }
  }
  return out.slice(0, 3);
}

/* ---------- UI state ---------- */
const ui = {
  tab: 'today',
  date: todayStr(),
  weekOf: todayStr(),
  timePeriod: 'week',
  timeOffset: 0,
  insights: []
};
const TABS = [['today', 'Today'], ['week', 'Week'], ['chores', 'Chores'], ['time', 'Time'], ['routine', 'Routine']];
const appEl = $('#app'), navEl = $('#nav'), sheetRoot = $('#sheet-root'), toastEl = $('#toast');

/* ---------- Shared bits ---------- */
function chk(it) {
  const label = (it.done ? 'Mark not done: ' : 'Mark done: ') + it.title;
  const dis = it.upcoming || it.doneChore ? 'disabled' : '';
  return `<button class="chk ${it.done ? 'on' : ''} ${it.overdue ? 'late' : ''}" data-act="toggle" data-key="${it.key}" aria-label="${esc(label)}" ${dis}>${svg('check', 14, 3)}</button>`;
}
function anyRow(it) {
  let sub, cls = '';
  if (it.overdue) { sub = 'From ' + relDay(it.overdue); cls = 'warn'; }
  else if (it.doneChore) sub = 'Chore · done';
  else if (it.kind === 'chore') {
    const c = S.chores.find((x) => x.id === it.id);
    sub = it.upcoming ? 'Upcoming · ' + repeatText(c.repeat) : 'Chore · ' + repeatText(c.repeat);
  } else sub = cat(it.category).name;
  return `<div class="row ${it.done ? 'done' : ''} ${it.upcoming ? 'up' : ''}">${chk(it)}
    <button class="row-main" data-act="open" data-key="${it.key}"><span class="t">${esc(it.title)}</span><span class="s ${cls}">${esc(sub)}</span></button></div>`;
}

function layoutLanes(items) {
  items.sort((a, b) => a.start - b.start || b.end - a.end);
  const clusters = []; let cur = [], curEnd = -1;
  for (const it of items) {
    if (cur.length && it.start >= curEnd) { clusters.push(cur); cur = []; curEnd = -1; }
    cur.push(it); curEnd = Math.max(curEnd, it.end);
  }
  if (cur.length) clusters.push(cur);
  for (const cl of clusters) {
    const lanes = [];
    for (const it of cl) {
      let i = lanes.findIndex((e) => e <= it.start);
      if (i < 0) { i = lanes.length; lanes.push(0); }
      lanes[i] = it.end; it.lane = i;
    }
    for (const it of cl) it.lanes = lanes.length;
  }
  return items;
}

function blockHtml(it, base, px, compact) {
  const c = cat(it.category);
  const h = Math.max(compact ? 16 : 26, (it.end - it.start) * px - 2);
  const short = h < (compact ? 30 : 42);
  const lane = it.lane || 0, lanes = it.lanes || 1;
  const pos = `left:calc(${lane} * 100% / ${lanes});width:calc(100% / ${lanes} - ${compact ? 1 : 3}px);`;
  const cls = ['blk', 'k-' + it.kind, it.done ? 'done' : '', it.upcoming ? 'up' : '', short ? 'short' : ''].join(' ');
  let tag = '';
  if (!compact) {
    if (it.kind === 'routine') tag = ' · Routine';
    else if (it.auto) tag = ' · Auto-placed';
    else if (it.kind === 'chore') tag = it.upcoming ? ' · Upcoming chore' : ' · Chore';
  }
  const sub = compact ? '' : `<span class="bs">${fmtTime(it.start)} – ${fmtTime(it.end)}${tag}</span>`;
  return `<button class="${cls}" style="top:${(it.start - base) * px}px;height:${h}px;${pos}--c:${c.color};--on:${onColor(c.color)}" data-act="open" data-key="${it.key}" aria-label="${esc(it.title + ', ' + fmtTime(it.start) + ' to ' + fmtTime(it.end))}"><span class="bt">${esc(it.title)}</span>${sub}</button>`;
}

function hourBounds(allTimed) {
  let a = S.settings.windowStart, b = S.settings.windowEnd;
  for (const it of allTimed) { a = Math.min(a, it.start); b = Math.max(b, it.end); }
  return [Math.floor(a / 60) * 60, Math.min(1440, Math.ceil(b / 60) * 60)];
}

/* ---------- Views ---------- */
function viewToday() {
  const today = todayStr(), date = ui.date, isToday = date === today;
  const { timed, anytime } = dayItems(date);
  const weekStart = addDays(date, -dow(date));
  const strip = range(7).map((i) => {
    const d = addDays(weekStart, i);
    const its = dayItems(d); const n = its.timed.filter((x) => x.kind !== 'routine').length + its.anytime.length;
    return `<button class="day ${d === date ? 'sel' : ''} ${d === today ? 'is-today' : ''}" data-act="date" data-date="${d}" aria-label="${fmtDateLong(d)}" ${d === date ? 'aria-current="date"' : ''}>
      <span class="dw">${DAYS1[i]}</span><span class="dn">${parseYmd(d).getDate()}</span><span class="dot ${n ? '' : 'hide'}"></span></button>`;
  }).join('');
  const title = isToday ? 'Today' : date === addDays(today, 1) ? 'Tomorrow' : date === addDays(today, -1) ? 'Yesterday' : DAYS_FULL[dow(date)];
  const openAny = anytime.filter((x) => !x.done && !x.upcoming).length;

  let html = `<header class="hdr"><div><div class="sub">${fmtDateLong(date)}</div><h1>${title}</h1></div>
    ${isToday ? '' : `<button class="pill" data-act="date" data-date="${today}">Today</button>`}</header>
    <div class="strip">
      <button class="arrow" data-act="date" data-date="${addDays(weekStart, -7)}" aria-label="Previous week">${svg('left', 20)}</button>
      ${strip}
      <button class="arrow" data-act="date" data-date="${addDays(weekStart, 7)}" aria-label="Next week">${svg('right', 20)}</button>
    </div>`;

  if (!S.routine.length) {
    html += `<div class="banner"><b>Set up your usual week first</b><p>Add work hours, gym and anything else that repeats. Tasks you add get scheduled around it.</p><a class="btn small" href="#routine">Set up routine</a></div>`;
  }

  html += `<section class="card"><div class="card-h"><h2>Anytime${isToday ? ' today' : ''} · ${openAny}</h2><span class="label" style="text-transform:none;letter-spacing:0;font-weight:500">No set time</span></div>
    ${anytime.length ? anytime.map(anyRow).join('') : '<p class="empty">Nothing without a set time.</p>'}</section>`;

  const [a, b] = hourBounds(timed);
  const px = 1;
  const hours = range((b - a) / 60 + 1).map((i) => a + i * 60);
  let body = hours.map((m) => `<div class="tl-line" style="top:${(m - a) * px}px"></div>`).join('');
  if (date >= today) {
    for (const g of freeGaps(date)) {
      if (g.end - g.start < 30) continue;
      body += `<button class="free" style="top:${(g.start - a) * px + 2}px;height:${(g.end - g.start) * px - 4}px" data-act="fill" data-date="${date}" data-start="${roundUp(g.start, 15)}">Free · ${fmtDur(g.end - g.start)} — tap to add</button>`;
    }
  }
  body += layoutLanes(timed).map((it) => blockHtml(it, a, px, false)).join('');
  if (isToday) {
    const n = nowMin();
    if (n >= a && n <= b) body += `<div class="now" style="top:${(n - a) * px - 5}px"><i></i><b></b></div>`;
  }
  html += `<section class="card" aria-label="Schedule"><div class="tl">
      <div class="tl-hours" style="height:${(b - a) * px}px">${hours.map((m) => `<div style="top:${(m - a) * px}px">${fmtHour(m)}</div>`).join('')}</div>
      <div class="tl-body" style="height:${(b - a) * px}px">${body}</div>
    </div></section>`;

  html += `<button class="fab" data-act="new-task" aria-label="Add task">${svg('plus', 26, 2.4)}</button>`;
  return html;
}

function viewWeek() {
  const today = todayStr();
  const ws = addDays(ui.weekOf, -dow(ui.weekOf));
  const days = range(7).map((i) => addDays(ws, i));
  const items = days.map((d) => dayItems(d));
  const all = items.flatMap((x) => x.timed);
  const [a, b] = hourBounds(all);
  const px = 0.6;
  const placed = items.reduce((s, x) => s + x.timed.filter((i) => i.kind !== 'routine').length, 0);
  const anyN = items.reduce((s, x) => s + x.anytime.filter((i) => !i.done).length, 0);
  const isThis = ws === addDays(today, -dow(today));
  const hours = range((b - a) / 120 + 1).map((i) => a + i * 120).filter((m) => m <= b);

  const head = days.map((d, i) => {
    const n = items[i].anytime.filter((x) => !x.done).length;
    return `<button class="wk-day ${d === today ? 'is-today' : ''}" data-act="goday" data-date="${d}" aria-label="Open ${fmtDateLong(d)}">
      <span class="dw">${DAYS1[i]}</span><span class="dn">${parseYmd(d).getDate()}</span><span class="da">${n ? n + ' any' : ''}</span></button>`;
  }).join('');
  const cols = days.map((d, i) => `<div class="wk-col" style="height:${(b - a) * px}px">${layoutLanes(items[i].timed).map((it) => blockHtml(it, a, px, true)).join('')}</div>`).join('');
  const lines = hours.map((m) => `<div class="tl-line" style="top:${(m - a) * px}px"></div>`).join('');

  return `<header class="hdr"><div><div class="sub">${placed} placed · ${anyN} anytime</div><h1>${fmtShort(days[0])} – ${parseYmd(days[6]).getMonth() === parseYmd(days[0]).getMonth() ? parseYmd(days[6]).getDate() : fmtShort(days[6])}</h1></div>
      ${isThis ? '' : `<button class="pill" data-act="week" data-date="${today}">This week</button>`}</header>
    <div class="period-nav">
      <button class="arrow" data-act="week" data-date="${addDays(ws, -7)}" aria-label="Previous week">${svg('left', 20)}</button>
      <span>${isThis ? 'This week' : fmtShort(days[0]) + ' – ' + fmtShort(days[6])}</span>
      <button class="arrow" data-act="week" data-date="${addDays(ws, 7)}" aria-label="Next week">${svg('right', 20)}</button>
    </div>
    <section class="card" style="padding:10px 8px">
      <div class="wk-wrap"><div style="width:30px;flex-shrink:0"></div><div class="wk-head" style="flex:1">${head}</div></div>
      <div class="wk-wrap" style="margin-top:10px">
        <div class="tl-hours" style="height:${(b - a) * px}px">${hours.map((m) => `<div style="top:${(m - a) * px}px">${fmtHour(m).replace(' ', '').toLowerCase().replace('m', '')}</div>`).join('')}</div>
        <div class="tl-body" style="height:${(b - a) * px}px">${lines}<div class="wk-cols" style="position:absolute;inset:0">${cols}</div></div>
      </div>
    </section>
    <p class="empty" style="padding:0 4px">Tap a day to see it in detail.</p>
    <button class="fab" data-act="new-task" aria-label="Add task">${svg('plus', 26, 2.4)}</button>`;
}

function repeatText(r) {
  if (r.type === 'weekdays') return daysText(r.days);
  if (r.every === 1) return 'Every ' + r.unit;
  return 'Every ' + r.every + ' ' + r.unit + 's';
}
function choreDueText(c) {
  const today = todayStr();
  if (c.nextDue < today) {
    const n = daysBetween(c.nextDue, today);
    return n === 1 ? '1 day late' : n + ' days late';
  }
  const item = choreItem(c, c.nextDue);
  return relDay(c.nextDue) + (item.start != null ? ' ' + fmtTime(item.start) : '');
}

function viewChores() {
  const today = todayStr(), weekEnd = addDays(today, 6);
  const sorted = [...S.chores].sort((a, b) => a.nextDue.localeCompare(b.nextDue));
  const groups = [
    ['Overdue', sorted.filter((c) => c.nextDue < today)],
    ['Today', sorted.filter((c) => c.nextDue === today)],
    ['This week', sorted.filter((c) => c.nextDue > today && c.nextDue <= weekEnd)],
    ['Later', sorted.filter((c) => c.nextDue > weekEnd)]
  ];
  const doneToday = S.chores.filter((c) => (c.doneDates || []).includes(today));
  const overdue = groups[0][1].length;
  const week = groups[1][1].length + groups[2][1].length;

  const row = (c) => {
    const late = c.nextDue < today;
    const modeTag = late ? '<span class="tag late">Find time</span>'
      : c.mode === 'auto' ? '<span class="tag auto">Auto</span>'
        : c.mode === 'fixed' ? '<span class="tag fixed">Fixed</span>' : '<span class="tag">Anytime</span>';
    return `<div class="row">${chk({ key: 'chore:' + c.id, title: c.title, overdue: late })}
      <button class="row-main" data-act="open" data-key="chore:${c.id}"><span class="t">${esc(c.title)}</span>
      <span class="s ${late ? 'warn' : ''}">${esc(repeatText(c.repeat))} · ${esc(choreDueText(c))}</span></button>
      ${late ? `<button class="tag late" style="border:0;height:32px" data-act="chore-find" data-id="${c.id}">Find time</button>` : modeTag}</div>`;
  };

  let html = `<header class="hdr"><div><div class="sub">Repeats on its own · planner finds the time</div><h1>Chores</h1></div></header>`;
  if (!S.chores.length) {
    html += `<section class="card"><p class="empty">No chores yet. Add things that repeat — laundry, trash night, vacuuming, changing sheets — and they’ll show up on the right days.</p>
      <button class="btn primary" data-act="new-chore">Add a chore</button></section>`;
  } else {
    html += `<div class="chips" style="margin-bottom:14px">
      ${overdue ? `<span class="tag late" style="font-size:13px;padding:8px 12px">${overdue} overdue</span>` : ''}
      <span class="tag" style="font-size:13px;padding:8px 12px;background:var(--card);color:var(--ink)">${week} due this week</span></div>`;
    for (const [name, list] of groups) {
      if (!list.length) continue;
      html += `<section class="card"><div class="card-h"><h2>${name}</h2></div>${list.map(row).join('')}</section>`;
    }
    if (doneToday.length) {
      html += `<section class="card"><div class="card-h"><h2>Done today</h2></div>${doneToday.map((c) => `<div class="row done"><span class="chk on" aria-hidden="true">${svg('check', 14, 3)}</span>
        <button class="row-main" data-act="open" data-key="chore:${c.id}"><span class="t">${esc(c.title)}</span><span class="s">Next: ${esc(relDay(c.nextDue))}</span></button></div>`).join('')}</section>`;
    }
  }
  html += `<button class="fab" data-act="new-chore" aria-label="Add chore">${svg('plus', 26, 2.4)}</button>`;
  return html;
}

function periodRange() {
  const today = todayStr();
  if (ui.timePeriod === 'week') {
    const s = addDays(addDays(today, -dow(today)), ui.timeOffset * 7);
    const e = addDays(s, 6);
    return { a: s, b: e, pa: addDays(s, -7), pb: addDays(s, -1), label: ui.timeOffset === 0 ? 'This week' : ui.timeOffset === -1 ? 'Last week' : fmtShort(s) + ' – ' + fmtShort(e), cmp: 'vs. the week before' };
  }
  const d = parseYmd(today); d.setDate(1); d.setMonth(d.getMonth() + ui.timeOffset);
  const e = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const p = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  const pe = new Date(d.getFullYear(), d.getMonth(), 0);
  return { a: ymd(d), b: ymd(e), pa: ymd(p), pb: ymd(pe), label: MONTHS_FULL[d.getMonth()] + ' ' + d.getFullYear(), cmp: 'vs. ' + MONTHS_FULL[p.getMonth()] };
}
function totals(a, b) {
  const t = {}, days = {};
  for (const e of S.entries) {
    if (e.date < a || e.date > b) continue;
    t[e.category] = (t[e.category] || 0) + e.minutes;
    (days[e.category] = days[e.category] || new Set()).add(e.date);
  }
  return { t, days };
}

function viewTime() {
  const r = periodRange();
  const cur = totals(r.a, r.b), prev = totals(r.pa, r.pb);
  const total = Object.values(cur.t).reduce((s, x) => s + x, 0);
  const cats = Object.keys(cur.t).sort((x, y) => cur.t[y] - cur.t[x]);
  ui.insights = computeInsights();

  let html = `<header class="hdr"><div><div class="sub">Everything here is what you logged</div><h1>Time</h1></div>
    <div class="seg" role="group" aria-label="Period">
      <button class="${ui.timePeriod === 'week' ? 'on' : ''}" data-act="period" data-v="week" aria-pressed="${ui.timePeriod === 'week'}">Week</button>
      <button class="${ui.timePeriod === 'month' ? 'on' : ''}" data-act="period" data-v="month" aria-pressed="${ui.timePeriod === 'month'}">Month</button>
    </div></header>
    <div class="label" style="margin:0 4px 8px">Log time</div>
    <div class="quick">${S.categories.map((c) => `<button data-act="log" data-cat="${c.id}"><span class="swatch" style="background:${c.color}"></span>${esc(c.name)}</button>`).join('')}</div>
    <div class="period-nav">
      <button class="arrow" data-act="tshift" data-v="-1" aria-label="Previous period">${svg('left', 20)}</button>
      <span>${esc(r.label)}</span>
      <button class="arrow" data-act="tshift" data-v="1" aria-label="Next period" ${ui.timeOffset >= 0 ? 'disabled style="opacity:.3"' : ''}>${svg('right', 20)}</button>
    </div>`;

  if (!total) {
    html += `<section class="card"><p class="empty">Nothing logged ${ui.timeOffset === 0 ? 'yet' : 'in this period'}. Tap a category above to add time — like this morning’s drive or last night’s sleep. When you finish a task or chore you can log it too.</p></section>`;
  } else {
    html += `<section class="card">
      <div style="display:flex;align-items:baseline;gap:8px"><span class="big">${fmtDur(total)}</span><span style="color:var(--muted);font-size:14px">logged · ${esc(r.cmp)}</span></div>
      <div class="stack" role="img" aria-label="Share of logged time by category">${cats.map((k) => `<i style="flex:${cur.t[k]};background:${cat(k).color}"></i>`).join('')}</div>
      ${cats.map((k) => {
        const c = cat(k), v = cur.t[k], pv = prev.t[k] || 0, diff = v - pv;
        const nd = cur.days[k].size;
        const delta = !pv ? '' : Math.abs(diff) < 5 ? 'same' : (diff > 0 ? '+' : '−') + fmtDur(Math.abs(diff));
        return `<div class="cat-row"><span class="swatch" style="background:${c.color}"></span>
          <span class="n">${esc(c.name)}<small>avg ${fmtDur(v / nd)} · ${nd} day${nd > 1 ? 's' : ''}</small></span>
          <span class="d ${diff > 0 && pv ? 'up' : ''}">${delta}</span><span class="v">${fmtDur(v)}</span></div>`;
      }).join('')}
    </section>`;
  }

  ui.insights.forEach((ins, i) => {
    html += `<section class="card insight"><h2>Planned vs. actual</h2><p>${ins.text}</p>
      <div class="btns"><button class="btn primary small" style="flex:1" data-act="insight" data-i="${i}">Plan ${fmtDur(ins.value)} next time</button>
      <button class="btn small" data-act="dismiss" data-i="${i}">Keep</button></div></section>`;
  });

  const list = S.entries.filter((e) => e.date >= r.a && e.date <= r.b)
    .sort((x, y) => y.date.localeCompare(x.date) || y.start - x.start);
  if (list.length) {
    html += `<section class="card"><div class="card-h"><h2>Entries</h2></div>`;
    let lastDate = '';
    for (const e of list) {
      if (e.date !== lastDate) { html += `<div class="day-label">${esc(relDay(e.date))}</div>`; lastDate = e.date; }
      const c = cat(e.category);
      const end = e.start + e.minutes;
      html += `<div class="row"><span class="swatch" style="background:${c.color};width:12px;height:12px"></span>
        <button class="row-main" data-act="entry" data-id="${e.id}"><span class="t">${esc(e.note || c.name)}</span>
        <span class="s">${e.note ? esc(c.name) + ' · ' : ''}${fmtTime(e.start)} – ${fmtTime(end)}${end > 1440 ? ' (next day)' : ''}</span></button>
        <span class="v" style="font-family:var(--display);font-weight:600">${fmtDur(e.minutes)}</span></div>`;
    }
    html += `</section>`;
  }
  html += `<button class="fab" data-act="log" data-cat="" aria-label="Log time">${svg('plus', 26, 2.4)}</button>`;
  return html;
}

function viewRoutine() {
  const st = S.settings;
  const a = Math.min(st.windowStart, ...S.routine.map((r) => r.start)), b = Math.max(st.windowEnd, ...S.routine.map((r) => (r.end > r.start ? r.end : 1440)));
  const span = Math.max(60, b - a);
  const mini = range(7).map((d) => {
    const bl = S.routine.filter((r) => r.days.includes(d)).map((r) => {
      const e = r.end > r.start ? r.end : 1440;
      return `<i style="top:${((r.start - a) / span) * 100}%;height:${((e - r.start) / span) * 100}%;background:${cat(r.category).color}"></i>`;
    }).join('');
    return `<div class="col"><div class="bar">${bl}</div><span class="d">${DAYS1[d]}</span></div>`;
  }).join('');
  const rows = [...S.routine].sort((x, y) => x.start - y.start).map((r) => `<div class="row"><span class="swatch" style="background:${cat(r.category).color};width:12px;height:12px"></span>
    <button class="row-main" data-act="routine" data-id="${r.id}"><span class="t">${esc(r.name)}</span><span class="s">${fmtTime(r.start)} – ${fmtTime(r.end)}</span></button>
    <span class="tag">${esc(daysText(r.days))}</span></div>`).join('');

  const gapOpts = [0, 5, 10, 15, 30].map((g) => `<option value="${g}" ${st.gapMin === g ? 'selected' : ''}>${g ? g + ' min' : 'None'}</option>`).join('');

  return `<header class="hdr"><div><div class="sub">Tasks get scheduled around this</div><h1>Your week</h1></div></header>
    <section class="card"><div class="card-h"><h2>Usual week</h2></div>
      ${S.routine.length ? `<div class="mini-wk" aria-hidden="true">${mini}</div>` : ''}
      ${rows || '<p class="empty">Nothing yet. Add your work hours, gym, classes — anything that happens at the same time each week.</p>'}
      <button class="add-row" data-act="new-routine">${svg('plus', 18, 2.4)} Add something that repeats</button>
    </section>
    <section class="card"><div class="card-h"><h2>Scheduling</h2></div>
      <div class="fld" style="margin:8px 0 12px"><span>Only schedule tasks between</span>
        <div class="two"><input class="inp" type="time" data-setting="windowStart" value="${hhmm(st.windowStart)}" aria-label="Earliest time">
        <input class="inp" type="time" data-setting="windowEnd" value="${hhmm(st.windowEnd)}" aria-label="Latest time"></div></div>
      <label class="fld" style="margin-bottom:4px"><span>Breathing room between things</span>
        <select class="inp" data-setting="gapMin">${gapOpts}</select></label>
    </section>
    <section class="card"><div class="card-h"><h2>Categories</h2></div>
      <div class="chips" style="margin:8px 0 12px">${S.categories.map((c) => `<span class="chip" style="cursor:default"><span class="swatch" style="background:${c.color}"></span>${esc(c.name)}</span>`).join('')}</div>
      <div style="display:flex;gap:8px"><input class="inp" id="newcat" placeholder="New category, e.g. Study" maxlength="24" aria-label="New category name"><button class="btn dark small" data-act="addcat">Add</button></div>
    </section>
    <section class="card"><div class="card-h"><h2>Your data</h2></div>
      <p class="empty">Everything is stored on this phone only. Export a backup now and then so you don’t lose it.</p>
      <div style="display:flex;gap:8px"><button class="btn small" style="flex:1" data-act="export">Export backup</button>
      <label class="btn small" style="flex:1;cursor:pointer">Import backup<input type="file" accept="application/json,.json" class="hidden-file" data-setting="import"></label></div>
    </section>
    <button class="fab" data-act="new-routine" aria-label="Add routine block">${svg('plus', 26, 2.4)}</button>`;
}

/* ---------- Render ---------- */
function render() {
  const views = { today: viewToday, week: viewWeek, chores: viewChores, time: viewTime, routine: viewRoutine };
  appEl.innerHTML = (views[ui.tab] || viewToday)();
  navEl.innerHTML = `<div class="tabs">${TABS.map(([id, label]) => `<a href="#${id}" class="${ui.tab === id ? 'on' : ''}" ${ui.tab === id ? 'aria-current="page"' : ''}>${svg(id)}<span>${label}</span></a>`).join('')}</div>`;
}

/* ---------- Toast ---------- */
let toastTimer = null;
function toast(msg, withUndo) {
  toastEl.innerHTML = `<span>${esc(msg)}</span>${withUndo && undoSnap ? '<button data-act="undo">Undo</button>' : ''}`;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), withUndo ? 5000 : 2600);
}
toastEl.addEventListener('click', (e) => {
  if (e.target.closest('[data-act="undo"]')) { undo(); toastEl.classList.remove('show'); }
});

/* ---------- Sheets ---------- */
let sheet = null;
function openSheet(s) {
  sheet = s; toastEl.classList.remove('show'); renderSheet();
  requestAnimationFrame(() => requestAnimationFrame(() => sheetRoot.classList.add('open')));
}
function renderSheet() {
  if (!sheet) return;
  const prev = $('.sheet-body', sheetRoot);
  const scroll = prev ? prev.scrollTop : 0;
  sheetRoot.innerHTML = `<div class="scrim" data-act="close-sheet"></div>
    <div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(sheet.label)}"><div class="grab"></div><div class="sheet-body">${sheet.render()}</div></div>`;
  $('.sheet-body', sheetRoot).scrollTop = scroll;
}
function closeSheet() {
  sheetRoot.classList.remove('open'); sheet = null;
  setTimeout(() => { if (!sheet) sheetRoot.innerHTML = ''; }, 260);
}
sheetRoot.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || !sheet) return;
  if (el.dataset.act === 'close-sheet') { closeSheet(); return; }
  const r = sheet.act && sheet.act(el.dataset.act, el);
  if (r === 'close') closeSheet(); else if (r) renderSheet();
});
function sheetField(e, type) {
  const el = e.target;
  if (!el.dataset || !el.dataset.f || !sheet || !sheet.input) return;
  const r = sheet.input(el.dataset.f, el.type === 'checkbox' ? el.checked : el.value, el, type);
  if (r) renderSheet();
}
sheetRoot.addEventListener('input', (e) => sheetField(e, 'input'));
sheetRoot.addEventListener('change', (e) => sheetField(e, 'change'));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && sheet) closeSheet(); });

const sheetTop = (label, right = '') => `<div class="sh-top"><button class="link" data-act="close-sheet">Cancel</button><h2>${esc(label)}</h2><span style="text-align:right">${right}</span></div>`;
const chip = (text, on, act, v, color) => `<button class="chip ${on ? 'on' : ''}" data-act="${act}" data-v="${esc(v)}" aria-pressed="${on}">${color ? `<span class="swatch" style="background:${color}"></span>` : ''}${esc(text)}</button>`;
const opt = (on, act, v, title, sub) => `<button class="opt ${on ? 'on' : ''}" data-act="${act}" data-v="${v}" aria-pressed="${on}"><span class="radio"><i></i></span><span class="ot"><b>${esc(title)}</b><small>${esc(sub)}</small></span></button>`;
const catChips = (sel) => `<div class="chips scroll">${S.categories.map((c) => chip(c.name, sel === c.id, 'cat', c.id, c.color)).join('')}</div>`;
function durField(dur, label = 'How long?') {
  return `<div class="fld"><span>${label}</span><div class="chips">${DURS.map((d) => chip(fmtDur(d), dur === d, 'dur', d)).join('')}
    <input class="mini-num" type="number" inputmode="numeric" min="5" max="720" data-f="durc" value="${DURS.includes(dur) ? '' : dur}" placeholder="min" aria-label="Custom minutes"></div></div>`;
}
function slotList(sugg, sel) {
  if (!sugg.length) return `<div class="note warn">${svg('alert', 16)}<span>No free gap in the next 2 weeks between ${fmtTime(S.settings.windowStart)} and ${fmtTime(S.settings.windowEnd)}. Pick a time yourself, or widen your scheduling hours in Routine.</span></div>`;
  return sugg.map((s, i) => `<button class="slot ${i === sel ? 'on' : ''}" data-act="slot" data-v="${i}" aria-pressed="${i === sel}"><b>${relDay(s.date)} · ${fmtTime(s.start)}</b><small>${esc(s.why)}</small></button>`).join('');
}
function conflictsFor(date, start, dur, key) {
  return dayItems(date).timed.filter((i) => i.key !== key && i.start < start + dur && i.end > start);
}

/* Task sheet: add or edit */
function taskSheet(init = {}) {
  const today = todayStr();
  const t = init.id ? S.tasks.find((x) => x.id === init.id) : null;
  const key = t ? 'task:' + t.id : null;
  const f = {
    title: t ? t.title : '',
    dur: t ? t.durationMin : 30,
    category: t ? t.category : 'errands',
    mode: init.mode || (t ? (t.start == null ? 'anytime' : t.mode === 'auto' ? 'auto' : 'pick') : 'auto'),
    date: init.date || (t && t.date >= today ? t.date : (ui.date >= today ? ui.date : today)),
    start: init.start != null ? init.start : (t && t.start != null ? t.start : Math.min(roundUp(nowMin() + 30, 15), 1425)),
    slot: 0, sugg: null
  };
  const sugg = () => (f.sugg = f.sugg || suggestSlots(f.dur, key));
  const saveIt = () => {
    const title = ($('[data-f="title"]', sheetRoot).value || '').trim();
    if (!title) { toast('Give the task a name'); $('[data-f="title"]', sheetRoot).focus(); return false; }
    let date, start, mode;
    if (f.mode === 'auto') {
      const s = sugg()[f.slot];
      if (!s) { toast('No free slot — pick a time instead'); return false; }
      date = s.date; start = s.start; mode = 'auto';
    } else if (f.mode === 'pick') { date = f.date; start = f.start; mode = 'fixed'; }
    else { date = f.date; start = null; mode = 'anytime'; }
    snapshot();
    if (t) Object.assign(t, { title, durationMin: f.dur, category: f.category, date, start, mode });
    else S.tasks.push({ id: uid(), title, durationMin: f.dur, category: f.category, date, start, mode, done: false, created: Date.now() });
    save();
    if (ui.tab === 'today') ui.date = date;
    render();
    toast(title + (start == null ? ' · ' + relDay(date) : ' · ' + relDay(date) + ' ' + fmtTime(start)), true);
    return 'close';
  };
  return {
    label: t ? 'Edit task' : 'New task',
    render() {
      let when = '';
      if (f.mode === 'auto') {
        when = `<div class="fld"><span>Open slots that fit ${fmtDur(f.dur)}</span>${slotList(sugg(), f.slot)}</div>`;
      } else if (f.mode === 'pick') {
        const cf = conflictsFor(f.date, f.start, f.dur, key);
        const outside = f.start < S.settings.windowStart || f.start + f.dur > S.settings.windowEnd;
        when = `<div class="fld"><div class="two">
            <label class="fld" style="margin:0"><span>Day</span><input class="inp" type="date" data-f="date" min="${today}" value="${f.date}"></label>
            <label class="fld" style="margin:0"><span>Starts</span><input class="inp" type="time" data-f="start" step="300" value="${hhmm(f.start)}"></label></div>
          ${cf.length ? `<div class="note warn">${svg('alert', 16)}<span>Overlaps ${cf.map((c) => esc(c.title)).join(', ')}</span></div>` : ''}
          ${!cf.length && outside ? `<div class="note">${svg('alert', 16)}<span>Outside your usual scheduling hours — that’s fine, just a heads-up.</span></div>` : ''}
          </div>`;
      } else {
        const tm = addDays(today, 1);
        when = `<div class="fld"><span>Goes on the Anytime list for</span><div class="chips">${chip('Today', f.date === today, 'anyday', today)}${chip('Tomorrow', f.date === tm, 'anyday', tm)}</div>
          <input class="inp" type="date" data-f="date" min="${today}" value="${f.date}" aria-label="Other day"></div>`;
      }
      let cta;
      if (f.mode === 'auto') { const s = sugg()[f.slot]; cta = s ? (t ? 'Save · ' : 'Add · ') + relDay(s.date) + ' ' + fmtTime(s.start) : 'No slot found'; }
      else if (f.mode === 'pick') cta = (t ? 'Save · ' : 'Add · ') + relDay(f.date) + ' ' + fmtTime(f.start);
      else cta = (t ? 'Save · ' : 'Add to ') + relDay(f.date);
      return `${sheetTop(t ? 'Edit task' : 'New task')}
        <label class="fld"><span>What needs doing?</span><input class="inp" data-f="title" value="${esc(f.title)}" placeholder="e.g. Groceries" autocomplete="off" enterkeyhint="done" maxlength="80"></label>
        ${durField(f.dur)}
        <div class="fld"><span>Category</span>${catChips(f.category)}</div>
        <div class="fld"><span>When?</span>
          ${opt(f.mode === 'auto', 'mode', 'auto', 'Find a time for me', 'Fits it into a free gap in your week')}
          ${opt(f.mode === 'pick', 'mode', 'pick', 'I’ll pick a time', 'Choose the day and start time')}
          ${opt(f.mode === 'anytime', 'mode', 'anytime', 'Just add to a day', 'No set time — goes on the Anytime list')}</div>
        ${when}
        <div class="actions"><button class="btn primary" data-act="save">${cta}</button>
        ${t ? '<button class="btn ghost danger" data-act="delete">Delete task</button>' : ''}</div>`;
    },
    act(a, el) {
      const v = el.dataset.v;
      if (a === 'dur') { f.dur = +v; f.sugg = null; f.slot = 0; return true; }
      if (a === 'cat') { f.category = v; return true; }
      if (a === 'mode') { f.mode = v; return true; }
      if (a === 'slot') { f.slot = +v; return true; }
      if (a === 'anyday') { f.date = v; return true; }
      if (a === 'save') return saveIt();
      if (a === 'delete') {
        snapshot(); S.tasks = S.tasks.filter((x) => x.id !== t.id); save(); render();
        toast('Task deleted', true); return 'close';
      }
      return false;
    },
    input(k, v, el, type) {
      if (k === 'title') {
        f.title = v;
        if (type === 'change' && !t) {
          const h = S.hints[v.trim().toLowerCase()];
          if (h && h !== f.dur) { f.dur = h; f.sugg = null; f.slot = 0; return true; }
        }
        return false;
      }
      if (k === 'durc') { const n = parseInt(v, 10); if (n > 0) { f.dur = Math.min(n, 720); f.sugg = null; f.slot = 0; } return type === 'change'; }
      if (k === 'date') { if (v) f.date = v < today ? today : v; return type === 'change'; }
      if (k === 'start') { if (v) f.start = toMin(v); return type === 'change'; }
      return false;
    }
  };
}

/* Done sheet: how long did it take? */
function doneSheet(key) {
  const [kind, id] = key.split(':');
  const obj = kind === 'task' ? S.tasks.find((x) => x.id === id) : S.chores.find((x) => x.id === id);
  if (!obj) return null;
  const planned = obj.durationMin;
  const opts = [...new Set([planned - 15, planned, planned + 15, planned + 30].filter((x) => x > 0))];
  const f = { min: planned, log: true };
  return {
    label: 'Mark done',
    render() {
      const c = cat(obj.category);
      return `${sheetTop('Mark done')}
        <div class="sh-title">${esc(obj.title)}</div>
        <div class="sh-sub">How long did it actually take? You planned ${fmtDur(planned)}.</div>
        <div class="fld"><div class="chips">${opts.map((m) => chip(fmtDur(m), f.min === m, 'dur', m)).join('')}
          <input class="mini-num" type="number" inputmode="numeric" min="1" max="720" data-f="durc" value="${opts.includes(f.min) ? '' : f.min}" placeholder="min" aria-label="Custom minutes"></div></div>
        <label class="toggle"><span>Add to Time as <b>${esc(c.name)}</b></span><input type="checkbox" data-f="log" ${f.log ? 'checked' : ''}></label>
        <div class="actions"><button class="btn primary" data-act="save">Done</button>
        <button class="btn ghost" data-act="quick">Just mark done</button></div>`;
    },
    act(a, el) {
      if (a === 'dur') { f.min = +el.dataset.v; return true; }
      if (a === 'save') { completeItem(key, f.min, f.log); return 'close'; }
      if (a === 'quick') { completeItem(key, 0, false); return 'close'; }
      return false;
    },
    input(k, v, el, type) {
      if (k === 'durc') { const n = parseInt(v, 10); if (n > 0) f.min = Math.min(n, 720); return type === 'change'; }
      if (k === 'log') { f.log = !!v; return false; }
      return false;
    }
  };
}

/* Slot picker (for finding time for a chore) */
function slotSheet(title, dur, key, onPick) {
  const sugg = suggestSlots(dur, key); let sel = 0;
  return {
    label: 'Find a time',
    render() {
      return `${sheetTop('Find a time')}
        <div class="sh-title">${esc(title)}</div><div class="sh-sub">Open slots that fit ${fmtDur(dur)}</div>
        <div class="fld">${slotList(sugg, sel)}</div>
        ${sugg.length ? `<button class="btn primary" data-act="pick">Schedule · ${relDay(sugg[sel].date)} ${fmtTime(sugg[sel].start)}</button>` : ''}`;
    },
    act(a, el) {
      if (a === 'slot') { sel = +el.dataset.v; return true; }
      if (a === 'pick') { onPick(sugg[sel]); return 'close'; }
      return false;
    }
  };
}

/* Chore sheet: add or edit */
function choreSheet(init = {}) {
  const today = todayStr();
  const c = init.id ? S.chores.find((x) => x.id === init.id) : null;
  const f = c ? {
    title: c.title, dur: c.durationMin, category: c.category, rtype: c.repeat.type,
    every: c.repeat.every || 1, unit: c.repeat.unit || 'week', days: [...(c.repeat.days || [])],
    mode: c.mode, time: c.time != null ? c.time : 18 * 60, due: c.nextDue
  } : { title: '', dur: 30, category: 'chores', rtype: 'interval', every: 1, unit: 'week', days: [], mode: 'auto', time: 18 * 60, due: today };
  const saveIt = () => {
    const title = ($('[data-f="title"]', sheetRoot).value || '').trim();
    if (!title) { toast('Give the chore a name'); return false; }
    if (f.rtype === 'weekdays' && !f.days.length) { toast('Pick at least one day'); return false; }
    const repeat = f.rtype === 'weekdays' ? { type: 'weekdays', days: [...f.days].sort() } : { type: 'interval', every: Math.max(1, f.every | 0), unit: f.unit };
    let due = f.due < today ? today : f.due;
    if (f.rtype === 'weekdays' && !f.days.includes(dow(due))) due = choreNext({ repeat }, due);
    snapshot();
    const data = { title, durationMin: f.dur, category: f.category, repeat, mode: f.mode, time: f.mode === 'fixed' ? f.time : null, nextDue: due };
    let target;
    if (c) { Object.assign(c, data); target = c; }
    else { target = { id: uid(), ...data, doneDates: [], history: [], slot: null }; S.chores.push(target); }
    placeChore(target);
    save(); render();
    toast(title + ' · next ' + relDay(due).toLowerCase(), true);
    return 'close';
  };
  return {
    label: c ? 'Edit chore' : 'New chore',
    render() {
      const repeatUi = f.rtype === 'interval'
        ? `<div class="chips"><span style="align-self:center;font-weight:600">Every</span>
             <input class="mini-num" type="number" inputmode="numeric" min="1" max="99" data-f="every" value="${f.every}" aria-label="Repeat every">
             ${['day', 'week', 'month'].map((u) => chip(u + (f.every > 1 ? 's' : ''), f.unit === u, 'unit', u)).join('')}</div>`
        : `<div class="chips">${range(7).map((d) => `<button class="chip day-chip ${f.days.includes(d) ? 'on' : ''}" data-act="day" data-v="${d}" aria-pressed="${f.days.includes(d)}" aria-label="${DAYS_FULL[d]}">${DAYS1[d]}</button>`).join('')}</div>`;
      return `${sheetTop(c ? 'Edit chore' : 'New chore')}
        <label class="fld"><span>Chore</span><input class="inp" data-f="title" value="${esc(f.title)}" placeholder="e.g. Laundry" autocomplete="off" maxlength="80"></label>
        ${durField(f.dur, 'Takes about')}
        <div class="fld"><span>Repeats</span>
          <div class="seg full" role="group"><button class="${f.rtype === 'interval' ? 'on' : ''}" data-act="rtype" data-v="interval">Every few days/weeks</button><button class="${f.rtype === 'weekdays' ? 'on' : ''}" data-act="rtype" data-v="weekdays">On certain days</button></div>
          ${repeatUi}</div>
        <div class="fld"><span>When it’s due</span>
          ${opt(f.mode === 'auto', 'mode', 'auto', 'Find a time for me', 'Placed in a free gap on the due day')}
          ${opt(f.mode === 'fixed', 'mode', 'fixed', 'Same time each time', 'e.g. trash out at 9 PM')}
          ${opt(f.mode === 'anytime', 'mode', 'anytime', 'Anytime that day', 'Goes on the Anytime list')}</div>
        ${f.mode === 'fixed' ? `<label class="fld"><span>Time</span><input class="inp" type="time" step="300" data-f="time" value="${hhmm(f.time)}"></label>` : ''}
        <label class="fld"><span>${c ? 'Next due' : 'First due'}</span><input class="inp" type="date" data-f="due" min="${today}" value="${f.due < today ? today : f.due}"></label>
        <div class="fld"><span>Category</span>${catChips(f.category)}</div>
        <div class="actions"><button class="btn primary" data-act="save">${c ? 'Save chore' : 'Add chore'}</button>
        ${c ? '<button class="btn ghost danger" data-act="delete">Delete chore</button>' : ''}</div>`;
    },
    act(a, el) {
      const v = el.dataset.v;
      if (a === 'dur') { f.dur = +v; return true; }
      if (a === 'cat') { f.category = v; return true; }
      if (a === 'mode') { f.mode = v; return true; }
      if (a === 'rtype') { f.rtype = v; return true; }
      if (a === 'unit') { f.unit = v; return true; }
      if (a === 'day') { const d = +v; f.days = f.days.includes(d) ? f.days.filter((x) => x !== d) : [...f.days, d]; return true; }
      if (a === 'save') return saveIt();
      if (a === 'delete') { snapshot(); S.chores = S.chores.filter((x) => x.id !== c.id); save(); render(); toast('Chore deleted', true); return 'close'; }
      return false;
    },
    input(k, v, el, type) {
      if (k === 'title') { f.title = v; return false; }
      if (k === 'durc') { const n = parseInt(v, 10); if (n > 0) f.dur = Math.min(n, 720); return type === 'change'; }
      if (k === 'every') { const n = parseInt(v, 10); if (n > 0) f.every = Math.min(n, 99); return type === 'change'; }
      if (k === 'time') { if (v) f.time = toMin(v); return false; }
      if (k === 'due') { if (v) f.due = v; return false; }
      return false;
    }
  };
}

/* Routine block sheet */
function routineSheet(init = {}) {
  const r = init.id ? S.routine.find((x) => x.id === init.id) : null;
  const f = r ? { name: r.name, category: r.category, days: [...r.days], start: r.start, end: r.end }
    : { name: '', category: 'work', days: [1, 2, 3, 4, 5], start: 9 * 60, end: 17 * 60 };
  return {
    label: r ? 'Edit routine' : 'Add to your week',
    render() {
      return `${sheetTop(r ? 'Edit' : 'Add to your week')}
        <label class="fld"><span>What is it?</span><input class="inp" data-f="name" value="${esc(f.name)}" placeholder="e.g. Work, Gym, Class" autocomplete="off" maxlength="60"></label>
        <div class="fld"><span>Category</span>${catChips(f.category)}</div>
        <div class="fld"><span>Days</span><div class="chips">${range(7).map((d) => `<button class="chip day-chip ${f.days.includes(d) ? 'on' : ''}" data-act="day" data-v="${d}" aria-pressed="${f.days.includes(d)}" aria-label="${DAYS_FULL[d]}">${DAYS1[d]}</button>`).join('')}</div>
          <div class="chips">${chip('Weekdays', f.days.join() === '1,2,3,4,5', 'preset', '1,2,3,4,5')}${chip('Every day', f.days.length === 7, 'preset', '0,1,2,3,4,5,6')}${chip('Weekends', f.days.join() === '0,6', 'preset', '0,6')}</div></div>
        <div class="fld"><div class="two">
          <label class="fld" style="margin:0"><span>Starts</span><input class="inp" type="time" step="300" data-f="start" value="${hhmm(f.start)}"></label>
          <label class="fld" style="margin:0"><span>Ends</span><input class="inp" type="time" step="300" data-f="end" value="${hhmm(f.end)}"></label></div></div>
        <div class="actions"><button class="btn primary" data-act="save">${r ? 'Save' : 'Add to week'}</button>
        ${r ? '<button class="btn ghost danger" data-act="delete">Remove from week</button>' : ''}</div>`;
    },
    act(a, el) {
      const v = el.dataset.v;
      if (a === 'cat') { f.category = v; return true; }
      if (a === 'day') { const d = +v; f.days = (f.days.includes(d) ? f.days.filter((x) => x !== d) : [...f.days, d]).sort(); return true; }
      if (a === 'preset') { f.days = v.split(',').map(Number); return true; }
      if (a === 'save') {
        const name = ($('[data-f="name"]', sheetRoot).value || '').trim();
        if (!name) { toast('Give it a name'); return false; }
        if (!f.days.length) { toast('Pick at least one day'); return false; }
        if (f.end === f.start) { toast('Start and end can’t be the same'); return false; }
        snapshot();
        const data = { name, category: f.category, days: f.days, start: f.start, end: f.end };
        if (r) Object.assign(r, data); else S.routine.push({ id: uid(), ...data });
        for (const c of S.chores) if (c.mode === 'auto') placeChore(c);
        save(); render(); toast(name + ' saved', true);
        return 'close';
      }
      if (a === 'delete') {
        snapshot(); S.routine = S.routine.filter((x) => x.id !== r.id);
        save(); render(); toast('Removed', true); return 'close';
      }
      return false;
    },
    input(k, v) {
      if (k === 'name') f.name = v;
      if (k === 'start' && v) f.start = toMin(v);
      if (k === 'end' && v) f.end = toMin(v);
      return false;
    }
  };
}

/* Time entry sheet: log time yourself */
function entrySheet(init = {}) {
  const e = init.id ? S.entries.find((x) => x.id === init.id) : null;
  const today = todayStr(), n = roundDown(nowMin(), 5);
  let f;
  if (e) f = { category: e.category, date: e.date, start: e.start, end: (e.start + e.minutes) % 1440, note: e.note || '' };
  else if (init.category === 'sleep') {
    const morning = nowMin() < 14 * 60;
    f = { category: 'sleep', date: morning ? addDays(today, -1) : today, start: 23 * 60, end: 7 * 60, note: '' };
  } else f = { category: init.category || 'driving', date: today, start: Math.max(0, n - 30), end: n, note: '' };
  f.adding = false;
  const mins = () => (f.end > f.start ? f.end - f.start : f.end + 1440 - f.start);
  return {
    label: e ? 'Edit entry' : 'Log time',
    render() {
      const m = mins(), overnight = f.end <= f.start;
      return `${sheetTop(e ? 'Edit entry' : 'Log time')}
        <div class="fld"><span>What were you doing?</span>
          <div class="chips scroll">${S.categories.map((c) => chip(c.name, f.category === c.id, 'cat', c.id, c.color)).join('')}
          <button class="chip" data-act="newcat" aria-expanded="${f.adding}">+ New</button></div>
          ${f.adding ? `<div style="display:flex;gap:8px"><input class="inp" id="entry-newcat" placeholder="Category name" maxlength="24"><button class="btn dark small" data-act="addcat">Add</button></div>` : ''}</div>
        <label class="fld"><span>${f.category === 'sleep' ? 'Night of' : 'Day'}</span><input class="inp" type="date" data-f="date" max="${today}" value="${f.date}"></label>
        <div class="fld"><div class="two">
          <label class="fld" style="margin:0"><span>${f.category === 'sleep' ? 'Went to bed' : 'Started'}</span><input class="inp" type="time" step="300" data-f="start" value="${hhmm(f.start)}"></label>
          <label class="fld" style="margin:0"><span>${f.category === 'sleep' ? 'Woke up' : 'Ended'}</span><input class="inp" type="time" step="300" data-f="end" value="${hhmm(f.end)}"></label></div></div>
        <div class="fld" style="flex-direction:row;align-items:baseline;gap:10px"><span class="dur-out">${fmtDur(m)}</span>${overnight ? '<span style="color:var(--muted);font-size:14px">ends the next day</span>' : ''}</div>
        <label class="fld"><span>Note (optional)</span><input class="inp" data-f="note" value="${esc(f.note)}" placeholder="${f.category === 'driving' ? 'e.g. Commute home' : 'Anything to remember'}" maxlength="80"></label>
        <div class="actions"><button class="btn primary" data-act="save">${e ? 'Save' : 'Log ' + fmtDur(m)}</button>
        ${e ? '<button class="btn ghost danger" data-act="delete">Delete entry</button>' : ''}</div>`;
    },
    act(a, el) {
      if (a === 'cat') { f.category = el.dataset.v; return true; }
      if (a === 'newcat') { f.adding = !f.adding; return true; }
      if (a === 'addcat') {
        const name = ($('#entry-newcat', sheetRoot).value || '').trim();
        const c = addCategory(name); if (!c) return false;
        f.category = c.id; f.adding = false; return true;
      }
      if (a === 'save') {
        const m = mins();
        if (m <= 0 || m > 24 * 60) { toast('Check the times'); return false; }
        snapshot();
        const note = ($('[data-f="note"]', sheetRoot).value || '').trim();
        if (e) Object.assign(e, { category: f.category, date: f.date, start: f.start, minutes: m, note });
        else addEntry(f.category, f.date, f.start, m, note, 'manual');
        save(); render(); toast(cat(f.category).name + ' · ' + fmtDur(m) + ' logged', true);
        return 'close';
      }
      if (a === 'delete') { snapshot(); S.entries = S.entries.filter((x) => x.id !== e.id); save(); render(); toast('Entry deleted', true); return 'close'; }
      return false;
    },
    input(k, v, el, type) {
      if (k === 'note') { f.note = v; return false; }
      if (k === 'date') { if (v) f.date = v > today ? today : v; return false; }
      if (k === 'start') { if (v) f.start = toMin(v); return type === 'change'; }
      if (k === 'end') { if (v) f.end = toMin(v); return type === 'change'; }
      return false;
    }
  };
}

function addCategory(name) {
  if (!name) { toast('Type a name first'); return null; }
  const existing = S.categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
  if (existing) return existing;
  let id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cat';
  while (S.categories.some((c) => c.id === id)) id += '-2';
  const used = new Set(S.categories.map((c) => c.color));
  const color = PALETTE.find((p) => !used.has(p)) || PALETTE[S.categories.length % PALETTE.length];
  const c = { id, name, color };
  S.categories.push(c); save();
  return c;
}

/* Item sheet: tap on a task or chore */
function itemSheet(key) {
  const [kind, id] = key.split(':');
  if (kind === 'routine') return routineSheet({ id });
  const today = todayStr();
  if (kind === 'task') {
    const t = S.tasks.find((x) => x.id === id); if (!t) return null;
    const when = t.start == null ? relDay(t.date) + ' · anytime' : relDay(t.date) + ' · ' + fmtTime(t.start) + ' – ' + fmtTime(t.start + t.durationMin);
    return {
      label: t.title,
      render() {
        return `${sheetTop('Task')}
          <div class="sh-title">${esc(t.title)}</div>
          <div class="sh-sub">${esc(when)} · ${fmtDur(t.durationMin)} · ${esc(cat(t.category).name)}${t.mode === 'auto' ? ' · auto-placed' : ''}${t.done && t.actualMin ? '<br>Took ' + fmtDur(t.actualMin) : ''}</div>
          <div class="actions">
            ${t.done ? '<button class="btn" data-act="undone">Mark not done</button>' : '<button class="btn primary" data-act="done">Mark done</button>'}
            ${t.done ? '' : '<button class="btn" data-act="resched">Find a new time</button>'}
            ${t.done || t.start == null ? '' : '<button class="btn" data-act="anytime">Move to Anytime</button>'}
            <button class="btn" data-act="edit">Edit</button>
            <button class="btn ghost danger" data-act="delete">Delete</button></div>`;
      },
      act(a) {
        if (a === 'done') { const s = doneSheet(key); openSheet(s); return false; }
        if (a === 'undone') { uncompleteTask(t.id); return 'close'; }
        if (a === 'resched') { openSheet(taskSheet({ id: t.id, mode: 'auto' })); return false; }
        if (a === 'anytime') { snapshot(); t.start = null; t.mode = 'anytime'; if (t.date < today) t.date = today; save(); render(); toast('Moved to Anytime', true); return 'close'; }
        if (a === 'edit') { openSheet(taskSheet({ id: t.id })); return false; }
        if (a === 'delete') { snapshot(); S.tasks = S.tasks.filter((x) => x.id !== t.id); save(); render(); toast('Task deleted', true); return 'close'; }
        return false;
      }
    };
  }
  const c = S.chores.find((x) => x.id === id); if (!c) return null;
  return {
    label: c.title,
    render() {
      const last = (c.doneDates || [])[0];
      return `${sheetTop('Chore')}
        <div class="sh-title">${esc(c.title)}</div>
        <div class="sh-sub">${esc(repeatText(c.repeat))} · ${fmtDur(c.durationMin)}<br>Next: ${esc(choreDueText(c))}${last ? ' · Last done ' + esc(relDay(last).toLowerCase()) : ''}</div>
        <div class="actions">
          <button class="btn primary" data-act="done">Mark done</button>
          <button class="btn" data-act="find">Find a time${c.nextDue < today ? '' : ' (move it)'}</button>
          <button class="btn" data-act="skip">Skip this one</button>
          <button class="btn" data-act="edit">Edit</button></div>`;
    },
    act(a) {
      if (a === 'done') { openSheet(doneSheet(key)); return false; }
      if (a === 'find') { openSheet(choreFindSheet(c)); return false; }
      if (a === 'skip') { skipChore(c.id); return 'close'; }
      if (a === 'edit') { openSheet(choreSheet({ id: c.id })); return false; }
      return false;
    }
  };
}
function choreFindSheet(c) {
  return slotSheet(c.title, c.durationMin, 'chore:' + c.id, (s) => {
    snapshot(); c.nextDue = s.date; c.slot = { date: s.date, start: s.start };
    save(); render(); toast(c.title + ' · ' + relDay(s.date) + ' ' + fmtTime(s.start), true);
  });
}

/* ---------- App events ---------- */
appEl.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const a = el.dataset.act;
  switch (a) {
    case 'date': ui.date = el.dataset.date; render(); break;
    case 'week': ui.weekOf = el.dataset.date; render(); break;
    case 'goday': ui.date = el.dataset.date; location.hash = '#today'; break;
    case 'new-task': openSheet(taskSheet({})); break;
    case 'fill': openSheet(taskSheet({ mode: 'pick', date: el.dataset.date, start: +el.dataset.start })); break;
    case 'new-chore': openSheet(choreSheet({})); break;
    case 'new-routine': openSheet(routineSheet({})); break;
    case 'routine': openSheet(routineSheet({ id: el.dataset.id })); break;
    case 'open': { const s = itemSheet(el.dataset.key); if (s) openSheet(s); break; }
    case 'toggle': {
      const key = el.dataset.key; const [kind, id] = key.split(':');
      if (kind === 'task') {
        const t = S.tasks.find((x) => x.id === id);
        if (t && t.done) uncompleteTask(id); else { const s = doneSheet(key); if (s) openSheet(s); }
      } else { const s = doneSheet(key); if (s) openSheet(s); }
      break;
    }
    case 'chore-find': { const c = S.chores.find((x) => x.id === el.dataset.id); if (c) openSheet(choreFindSheet(c)); break; }
    case 'period': ui.timePeriod = el.dataset.v; ui.timeOffset = 0; render(); break;
    case 'tshift': ui.timeOffset = Math.min(0, ui.timeOffset + (+el.dataset.v)); render(); break;
    case 'log': openSheet(entrySheet({ category: el.dataset.cat || undefined })); break;
    case 'entry': openSheet(entrySheet({ id: el.dataset.id })); break;
    case 'insight': { const ins = ui.insights[+el.dataset.i]; if (ins) { snapshot(); ins.apply(); save(); render(); toast('Updated', true); } break; }
    case 'dismiss': { const ins = ui.insights[+el.dataset.i]; if (ins) { S.dismissed[ins.id] = ins.value; save(); render(); } break; }
    case 'addcat': { const inp = $('#newcat'); const c = addCategory((inp.value || '').trim()); if (c) { render(); toast(c.name + ' added'); } break; }
    case 'export': exportData(); break;
  }
});
appEl.addEventListener('change', (e) => {
  const el = e.target; const k = el.dataset && el.dataset.setting; if (!k) return;
  if (k === 'import') { importData(el.files && el.files[0]); return; }
  if (k === 'gapMin') S.settings.gapMin = +el.value;
  else if (el.value) S.settings[k] = toMin(el.value);
  if (S.settings.windowEnd <= S.settings.windowStart) { toast('End has to be after start'); S.settings.windowEnd = Math.min(1440, S.settings.windowStart + 60); }
  for (const c of S.chores) if (c.mode === 'auto') placeChore(c);
  save(); render(); toast('Saved');
});
appEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.id === 'newcat') { e.preventDefault(); $('[data-act="addcat"]', appEl).click(); }
});

function exportData() {
  const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'taskplanner-backup-' + todayStr() + '.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function importData(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data || !Array.isArray(data.tasks) || !Array.isArray(data.chores)) throw new Error('bad');
      snapshot();
      const base = defaultState();
      S = { ...base, ...data, settings: { ...base.settings, ...(data.settings || {}) } };
      save(); render(); toast('Backup restored', true);
    } catch (err) { toast('That file isn’t a TaskPlanner backup'); }
  };
  reader.readAsText(file);
}

/* ---------- Routing & lifecycle ---------- */
function route() {
  const t = (location.hash || '#today').slice(1);
  ui.tab = TABS.some(([id]) => id === t) ? t : 'today';
  if (sheet) closeSheet();
  render();
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);

let lastDay = todayStr();
function tick() {
  const t = todayStr();
  if (t !== lastDay) {
    if (ui.date === lastDay) ui.date = t;
    lastDay = t; refreshAutoChores();
  }
  if (!sheet && (ui.tab === 'today' || ui.tab === 'week')) render();
}
setInterval(tick, 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });

refreshAutoChores();
route();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
}
