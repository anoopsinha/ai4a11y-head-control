// Universal Control Hub: one screen for the remotes a person would otherwise
// hold in their hands. Two levels: the hub (a panel per remote) and one
// remote at a time. Everything is a big button so a cursor steered by head
// movement can reach it; the four regions of the screen each hold a group.
import { apps } from './apps.js';
import { createKeyboard } from './keyboard.js';
import { createCursor } from './cursor.js';
import { createHeadTracker } from './head.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const text = (v, s) => (typeof v === 'function' ? v(s) : v);
let current = null; // the open app's id, or null at the hub
let note = '';      // the last message from an entry box

// ── The hub ──────────────────────────────────────────────────────────────────
function renderHub() {
  const ids = Object.keys(apps);
  $('panels').innerHTML = ids.map((id, i) => {
    const a = apps[id], s = a.state;
    return `<article class="panel${i === ids.length - 1 && ids.length % 2 ? ' wide' : ''}" aria-labelledby="p-${id}">
      <div class="head"><h2 id="p-${id}">${esc(a.name)}</h2><span class="chip">${esc(a.chip(s))}</span></div>
      <p class="line1">${esc(a.line1(s))}</p><p class="line2">${esc(a.line2(s))}</p>
      <button type="button" class="open" data-open="${id}">Open ${esc(a.name)} Remote →</button>
    </article>`;
  }).join('');
}

// ── One remote ───────────────────────────────────────────────────────────────
function renderRemote() {
  const a = apps[current], s = a.state;
  $('remote-title').textContent = `${a.name} Remote`;
  const entry = a.entry ? `<label class="hint" for="entry">${esc(a.entry.label)}</label>
    <div class="entry"><input id="entry" type="text" placeholder="${esc(a.entry.placeholder)}" autocomplete="off">
      <button type="button" data-entry="go">${esc(a.entry.go)}</button><button type="button" class="quiet" data-entry="clear">Clear</button></div>` : '';
  const groups = a.groups.map((g) => `<h3>${esc(g.title)}</h3><div class="${g.layout}">${g.buttons.map((b) => {
    const on = b.on ? b.on(s) : false;
    return `<button type="button" class="rbtn ${b.cls || ''}${on ? ' on' : ''}" data-btn="${b.id}" aria-pressed="${b.on ? String(on) : ''}">${esc(text(b.label, s))}</button>`;
  }).join('')}</div>`).join('');
  $('remote-controls').innerHTML = `<div class="card">${entry}${note ? `<p class="hint" role="status">${esc(note)}</p>` : ''}${groups}</div>`;
  $('remote-info').innerHTML = a.info(s);
}

function render() {
  if (current) renderRemote(); else renderHub();
  cursor.refresh();
}

function open(id) {
  current = id; note = '';
  $('view-hub').hidden = true; $('view-remote').hidden = false;
  $('title').textContent = apps[id].name;
  render();
  $('back').focus({ preventScroll: true });
}
function backToHub() {
  current = null; note = '';
  keyboard.hide();
  $('view-remote').hidden = true; $('view-hub').hidden = false;
  $('title').textContent = 'Universal Control Hub';
  render();
}

// One click handler for the whole screen, so the head cursor's "select" is
// just a click on whatever it is over.
document.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  const d = b.dataset;
  if (d.open) return open(d.open);
  if (b.id === 'back') return backToHub();
  if (!current) return;
  const a = apps[current], s = a.state;
  if (d.btn) { const btn = a.groups.flatMap((g) => g.buttons).find((x) => x.id === d.btn); btn?.act(s); note = ''; render(); return; }
  if (d.pick !== undefined) { a.pick?.(s, d.pick); render(); return; }
  if (d.entry === 'go') { const v = $('entry').value.trim(); if (v) { note = a.entry.act(s, v); $('entry').value = ''; keyboard.hide(); render(); } return; }
  if (d.entry === 'clear') { $('entry').value = ''; $('entry').focus(); return; }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.id === 'entry') { e.preventDefault(); document.querySelector('[data-entry="go"]')?.click(); }
  if (e.key === 'Escape' && current && $('settings').hidden && $('keyboard').hidden) backToHub();
});

// ── The keyboard, the cursor and head tracking ───────────────────────────────
const keyboard = createKeyboard({ root: $('keyboard'), rows: $('kb-rows'), bar: $('kb-bar'), grip: $('kb-grip'), onDock: (h) => document.documentElement.style.setProperty('--kb-h', `${h}px`) });
const cursor = createCursor({ el: $('cursor'), regions: $('regions'), onStatus: (m) => { $('track-status').textContent = m; } });
const tracker = createHeadTracker({
  video: $('camera'), preview: $('preview'),
  onMove: (nx, ny) => cursor.moveNormalized(nx, ny),
  onStatus: (m, found) => { $('marker-status').textContent = m; $('center').disabled = !found; },
});

// Settings panel wiring.
$('settings-button').addEventListener('click', () => { const open = $('settings').hidden; $('settings').hidden = !open; $('settings-button').setAttribute('aria-expanded', String(open)); });
$('settings-close').addEventListener('click', () => { $('settings').hidden = true; $('settings-button').setAttribute('aria-expanded', 'false'); $('settings-button').focus(); });
$('camera-toggle').addEventListener('click', async () => {
  if (tracker.running) { tracker.stop(); $('camera-toggle').textContent = 'Turn camera on'; cursor.enable(false); $('track-status').textContent = 'Head tracking: off'; return; }
  try {
    await tracker.start();
    $('camera-toggle').textContent = 'Turn camera off';
    cursor.enable(true);
    $('track-status').textContent = 'Head tracking: on';
  } catch (e) { $('marker-status').textContent = `The camera could not start: ${e.message}`; }
});
$('center').addEventListener('click', () => { tracker.center(); $('marker-status').textContent = 'Centered. Move your head to move the cursor.'; });
$('preview').addEventListener('click', (e) => { const r = $('preview').getBoundingClientRect(); tracker.pickColor((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height); });
$('gain').addEventListener('input', (e) => tracker.set({ gain: Number(e.target.value) }));
$('smooth').addEventListener('input', (e) => tracker.set({ smoothing: Number(e.target.value) }));
$('tolerance').addEventListener('input', (e) => tracker.set({ tolerance: Number(e.target.value) }));
$('mirror').addEventListener('change', (e) => tracker.set({ mirror: e.target.checked }));
$('select-key').addEventListener('change', (e) => cursor.set({ selectKey: e.target.value }));
$('dwell').addEventListener('change', (e) => cursor.set({ dwell: e.target.checked }));
$('dwell-ms').addEventListener('input', (e) => { cursor.set({ dwellMs: Number(e.target.value) }); $('dwell-ms-out').textContent = `${(Number(e.target.value) / 1000).toFixed(1)} s`; });
$('show-regions').addEventListener('change', (e) => cursor.set({ showRegions: e.target.checked }));

renderHub();
window.hub = { apps, open, backToHub, cursor, tracker, keyboard, get current() { return current; } };
