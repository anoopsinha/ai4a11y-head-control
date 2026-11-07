// The head cursor. Head tracking gives a position from -1 to 1 on each axis;
// this draws the cursor there, lights the region of the screen it is in (one
// of four corners), highlights the control under it, and presses that
// control on the select key (a switch wired as a key works the same), or
// after holding still when dwell is on. A real mouse works alongside.
export function createCursor({ el, regions, onStatus = () => {} }) {
  const cfg = { selectKey: ' ', dwell: false, dwellMs: 1200, showRegions: true };
  let enabled = false;
  let x = -100, y = -100;
  let over = null;          // the control under the cursor
  let dwellTimer = 0, dwellFrom = null;
  const TARGETS = 'button, input, select, textarea, a[href], [role="button"]';

  function enable(on) {
    enabled = on;
    el.hidden = !on;
    regions.hidden = !on || !cfg.showRegions;
    if (!on) { setOver(null); cancelDwell(); for (const r of regions.children) r.classList.remove('active'); }
  }
  function moveNormalized(nx, ny) {
    if (!enabled) return;
    moveTo((nx + 1) / 2 * window.innerWidth, (ny + 1) / 2 * window.innerHeight);
  }
  function moveTo(px, py) {
    x = Math.max(0, Math.min(window.innerWidth - 1, px));
    y = Math.max(0, Math.min(window.innerHeight - 1, py));
    el.style.left = `${x}px`; el.style.top = `${y}px`;
    const q = (y < window.innerHeight / 2 ? 0 : 2) + (x < window.innerWidth / 2 ? 0 : 1);
    [...regions.children].forEach((r, i) => r.classList.toggle('active', i === q));
    refresh();
  }
  // What is under the cursor now (the cursor and region layers let clicks through).
  function refresh() {
    if (!enabled) return;
    const hit = document.elementFromPoint(x, y)?.closest(TARGETS);
    setOver(hit && !hit.disabled ? hit : null);
  }
  function setOver(hit) {
    if (hit === over) { if (cfg.dwell && over) armDwell(); return; }
    over?.classList.remove('hover');
    over = hit;
    over?.classList.add('hover');
    cancelDwell();
    if (cfg.dwell && over) armDwell();
  }
  function armDwell() {
    if (dwellFrom === over) return;
    cancelDwell();
    dwellFrom = over;
    el.style.setProperty('--dwell', `${cfg.dwellMs}ms`);
    el.classList.add('dwelling');
    dwellTimer = setTimeout(() => { if (over === dwellFrom) select(); cancelDwell(); }, cfg.dwellMs);
  }
  function cancelDwell() { clearTimeout(dwellTimer); dwellTimer = 0; dwellFrom = null; el.classList.remove('dwelling'); }

  // Press what the cursor is on. A text box takes focus (and so brings the keyboard).
  function select() {
    if (!over) return false;
    el.animate([{ transform: 'scale(1)' }, { transform: 'scale(.6)' }, { transform: 'scale(1)' }], { duration: 160 });
    if (over.matches('input, textarea, select')) { over.focus(); return true; }
    over.click();
    setTimeout(refresh, 50);
    return true;
  }
  document.addEventListener('keydown', (e) => {
    if (!enabled || !over) return;
    const isSelect = cfg.selectKey === 'any' ? !e.repeat && !['Shift', 'Control', 'Alt', 'Meta'].includes(e.key) : e.key === cfg.selectKey;
    if (!isSelect) return;
    // Typing into a focused text box with a real keyboard must still work.
    if (document.activeElement?.matches('input, textarea') && over === document.activeElement) return;
    e.preventDefault();
    select();
  }, true);

  function set(changes) {
    Object.assign(cfg, changes);
    regions.hidden = !enabled || !cfg.showRegions;
    if (!cfg.dwell) cancelDwell(); else if (over) armDwell();
  }
  window.addEventListener('resize', refresh);
  return { enable, moveNormalized, moveTo, refresh, select, set, get enabled() { return enabled; }, get over() { return over; }, get position() { return { x, y }; } };
}
