// Small shared helpers: escaping, randomness, dates, toast, bottom sheet, confetti, sounds.

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function shuffle(arr, rnd = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export const pick = (arr, rnd = Math.random) => arr[Math.floor(rnd() * arr.length)];
export const sample = (arr, n, rnd = Math.random) => shuffle(arr, rnd).slice(0, n);

// Deterministic generator so "today's" picks stay the same all day.
export function seeded(seedStr) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

export function dayKey(d = new Date()) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
export function addDays(key, n) {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return dayKey(dt);
}
export const fmtTime = (sec) => {
  sec = Math.max(0, Math.ceil(sec));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
};
export const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

let toastTimer;
export function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
}

export function openSheet(html, onMount) {
  const s = $('#sheet');
  $('#sheetBody').innerHTML = html;
  s.classList.remove('hidden');
  const close = () => s.classList.add('hidden');
  s.onclick = (e) => { if (e.target.closest('[data-close]')) close(); };
  onMount?.($('#sheetBody'), close);
  return close;
}
export const closeSheet = () => $('#sheet').classList.add('hidden');
export const sheetOpen = () => !$('#sheet').classList.contains('hidden');

export function confetti(n = 70) {
  const box = $('#confetti');
  const colors = ['#a996f5', '#ff94bd', '#8c78ea', '#ffcde0', '#3dbb7e', '#f0b429'];
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i');
    p.style.left = Math.random() * 100 + 'vw';
    p.style.background = colors[i % colors.length];
    p.style.animationDelay = Math.random() * 0.4 + 's';
    p.style.animationDuration = 1.2 + Math.random() * 1.2 + 's';
    box.appendChild(p);
    setTimeout(() => p.remove(), 3000);
  }
}

let audioCtx;
export function beep(kind = 'tick', enabled = true) {
  if (!enabled) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const notes = { tick: [660], good: [660, 880], bad: [300], start: [523, 659, 784], end: [784, 659, 523], done: [523, 659, 784, 1047] }[kind] || [600];
    notes.forEach((f, i) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = 'sine'; o.frequency.value = f;
      const t0 = audioCtx.currentTime + i * 0.12;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.18, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
      o.connect(g).connect(audioCtx.destination);
      o.start(t0); o.stop(t0 + 0.2);
    });
  } catch { /* audio not available */ }
}
export const buzz = (ms = 30) => { try { navigator.vibrate?.(ms); } catch { /* ignore */ } };

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove();
    return ok;
  }
}

// Text markup used in speeches: [[word|meaning]] = upgrade word, {{phrase}} = key phrase.
export function renderMarkup(text) {
  return esc(text)
    .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, (_, w, m) => `<span class="hl" data-meaning="${m}" data-word="${w}">${w}</span>`)
    .replace(/\[\[([^\]]+)\]\]/g, (_, w) => `<span class="hl" data-word="${w}">${w}</span>`)
    .replace(/\{\{([^}]+)\}\}/g, (_, p) => `<span class="kp">${p}</span>`);
}
export const stripMarkup = (text) => String(text).replace(/\[\[([^|\]]+)(\|[^\]]+)?\]\]/g, '$1').replace(/\{\{([^}]+)\}\}/g, '$1');
export const wordCount = (text) => stripMarkup(text).split(/\s+/).filter(Boolean).length;
