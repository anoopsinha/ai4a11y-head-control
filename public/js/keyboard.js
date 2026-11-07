// An on-screen keyboard modelled on Apple's: the standard rows, shift and
// caps, delete, return, space and arrows. It appears when a text box takes
// focus, rising from the bottom and shrinking the screen above it; it hides
// when the text box is left. Drag anywhere that is not a key to move it (it
// then floats), and drag the corner grip to make it bigger or smaller.
const ROWS = [
  [['`', '~'], ['1', '!'], ['2', '@'], ['3', '#'], ['4', '$'], ['5', '%'], ['6', '^'], ['7', '&'], ['8', '*'], ['9', '('], ['0', ')'], ['-', '_'], ['=', '+'], { k: 'delete', label: 'delete', w: 'w15', dark: true }],
  [{ k: 'tab', label: 'tab', w: 'w15', dark: true }, 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', ['[', '{'], [']', '}'], ['\\', '|']],
  [{ k: 'caps', label: 'caps lock', w: 'w2', dark: true }, 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', [';', ':'], ["'", '"'], { k: 'return', label: 'return', w: 'w2', dark: true }],
  [{ k: 'shift', label: 'shift', w: 'w25', dark: true }, 'z', 'x', 'c', 'v', 'b', 'n', 'm', [',', '<'], ['.', '>'], ['/', '?'], { k: 'shift', label: 'shift', w: 'w25', dark: true }],
  [{ k: 'hide', label: 'hide', w: 'w15', dark: true }, { k: ' ', label: ' ', w: 'space' }, { k: 'left', label: '◀', dark: true }, { k: 'right', label: '▶', dark: true }, { k: 'done', label: 'done', w: 'w15', dark: true }],
];

export function createKeyboard({ root, rows, bar, grip, onDock = () => {} }) {
  let target = null;        // the text box being typed into
  let shift = false, caps = false;
  let floating = false;
  let keySize = 3.4;        // rem; the grip changes it

  function build() {
    rows.innerHTML = ROWS.map((row) => `<div class="kb-row">${row.map((k) => {
      if (typeof k === 'string') return `<button type="button" class="key" data-k="${k}">${k}</button>`;
      if (Array.isArray(k)) return `<button type="button" class="key" data-k="${k[0]}" data-up="${k[1].replace(/"/g, '&quot;')}">${k[0]}</button>`;
      return `<button type="button" class="key ${k.dark ? 'dark' : ''} ${k.w || ''}" data-k="${k.k === ' ' ? ' ' : k.k}" aria-label="${k.label === ' ' ? 'space' : k.label}">${k.label}</button>`;
    }).join('')}</div>`).join('');
    paint();
  }
  // Letters follow shift and caps; symbols follow shift.
  function paint() {
    const upper = shift !== caps;
    for (const b of rows.querySelectorAll('.key')) {
      const k = b.dataset.k;
      if (k.length === 1 && /[a-z]/.test(k)) b.textContent = upper ? k.toUpperCase() : k;
      else if (b.dataset.up) b.textContent = shift ? b.dataset.up : k;
      if (k === 'shift') b.classList.toggle('on', shift);
      if (k === 'caps') b.classList.toggle('on', caps);
    }
  }

  function insert(ch) {
    if (!target) return;
    const { selectionStart: a, selectionEnd: z, value } = target;
    target.value = value.slice(0, a) + ch + value.slice(z);
    target.setSelectionRange(a + ch.length, a + ch.length);
    target.dispatchEvent(new Event('input', { bubbles: true }));
  }
  function press(k, b) {
    if (!target) return;
    switch (k) {
      case 'delete': { const { selectionStart: a, selectionEnd: z, value } = target; const from = a === z ? Math.max(0, a - 1) : a; target.value = value.slice(0, from) + value.slice(z); target.setSelectionRange(from, from); target.dispatchEvent(new Event('input', { bubbles: true })); break; }
      case 'shift': shift = !shift; paint(); return;
      case 'caps': caps = !caps; paint(); return;
      case 'tab': insert('\t'); break;
      case 'return': case 'done': target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); if (k === 'done') hide(); return;
      case 'hide': hide(); return;
      case 'left': { const p = Math.max(0, target.selectionStart - 1); target.setSelectionRange(p, p); break; }
      case 'right': { const p = Math.min(target.value.length, target.selectionStart + 1); target.setSelectionRange(p, p); break; }
      default: {
        const upper = shift !== caps;
        let ch = k;
        if (/^[a-z]$/.test(k)) ch = upper ? k.toUpperCase() : k;
        else if (shift && b?.dataset.up) ch = b.dataset.up;
        insert(ch);
        if (shift) { shift = false; paint(); }
      }
    }
    target.focus({ preventScroll: true });
  }

  // Keys take the press on mousedown and keep the text box focused.
  rows.addEventListener('mousedown', (e) => { if (e.target.closest('.key')) e.preventDefault(); });
  rows.addEventListener('click', (e) => { const b = e.target.closest('.key'); if (b) press(b.dataset.k, b); });

  function show(input) {
    target = input;
    root.hidden = false;
    if (!floating) dock();
  }
  function hide() {
    if (root.hidden) return;
    root.hidden = true;
    target = null;
    onDock(0);
  }
  function dock() {
    root.classList.remove('floating');
    root.style.left = root.style.top = root.style.width = '';
    requestAnimationFrame(() => onDock(root.hidden ? 0 : root.offsetHeight));
  }

  // A text box taking focus brings the keyboard; leaving it (for anything
  // but the keyboard) hides it.
  document.addEventListener('focusin', (e) => {
    const el = e.target;
    if (el.matches('input[type="text"], input[type="search"], input:not([type]), textarea')) show(el);
  });
  document.addEventListener('focusout', (e) => {
    if (e.target === target) setTimeout(() => { if (document.activeElement !== target && !root.contains(document.activeElement)) hide(); }, 0);
  });
  document.addEventListener('mousedown', (e) => { if (!root.hidden && !root.contains(e.target) && e.target !== target && !e.target.closest('input')) hide(); });

  // Dragging the frame moves it; dragging the grip resizes it.
  let drag = null;
  const onDown = (e) => {
    if (e.target.closest('.key')) return;
    const r = root.getBoundingClientRect();
    const resizing = e.target === grip;
    drag = { x: e.clientX, y: e.clientY, left: r.left, top: r.top, width: r.width, size: keySize, resizing };
    if (!resizing && !floating) { floating = true; root.classList.add('floating'); root.style.left = `${r.left}px`; root.style.top = `${r.top}px`; root.style.width = `${r.width}px`; onDock(0); }
    root.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  };
  root.addEventListener('pointerdown', onDown);
  root.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (drag.resizing) {
      // Wider by dragging right (floating) or taller by dragging up (docked): the keys scale.
      const factor = floating ? (drag.width + dx) / drag.width : (drag.width + -dy * 4) / drag.width;
      keySize = Math.max(2, Math.min(6.5, drag.size * factor));
      root.style.setProperty('--key', `${keySize}rem`);
      if (floating) root.style.width = `${Math.max(420, drag.width * factor)}px`;
      else onDock(root.offsetHeight);
    } else {
      root.style.left = `${Math.max(0, Math.min(window.innerWidth - 120, drag.left + dx))}px`;
      root.style.top = `${Math.max(0, Math.min(window.innerHeight - 60, drag.top + dy))}px`;
    }
  });
  const onUp = () => { drag = null; };
  root.addEventListener('pointerup', onUp); root.addEventListener('pointercancel', onUp);
  // Double-click the bar to dock it at the bottom again.
  bar.addEventListener('dblclick', () => { floating = false; dock(); });

  build();
  return { show, hide, get target() { return target; }, get floating() { return floating; }, dock: () => { floating = false; dock(); } };
}
