// App shell: loads data, routes between screens, handles Android back button.
import { loadAll } from './data.js';
import { $, esc, closeSheet, sheetOpen, tintEmoji } from './util.js';
import * as home from './views/home.js';
import * as words from './views/words.js';
import * as phrases from './views/phrases.js';
import * as knowledge from './views/knowledge.js';
import * as speeches from './views/speeches.js';
import * as practice from './views/practice.js';
import * as quiz from './views/quiz.js';
import * as progress from './views/progress.js';
import * as settings from './views/settings.js';
import * as learn from './views/learn.js';
import * as library from './views/library.js';

// Left rail (wide screens) and which routes belong under it.
export const RAIL = [
  { id: 'home', href: '#/', name: 'Home', ico: '🏠' },
  { id: 'knowledge', href: '#/learn/knowledge', name: 'Knowledge', ico: '🧠' },
  { id: 'words', href: '#/learn/words', name: 'Vocab', ico: '🚀' },
  { id: 'phrases', href: '#/learn/phrases', name: 'Phrases', ico: '💬' },
  { id: 'quiz', href: '#/quiz', name: 'Quiz', ico: '🎯' },
  { id: 'practice', href: '#/practice', name: 'Speak', ico: '🎤' },
  { id: 'library', href: '#/library', name: 'Library', ico: '📚' },
];
const LIBRARY_KEYS = ['library', 'knowledge', 'words', 'phrases', 'speeches', 'quizmenu', 'progress', 'tidbit', 'settings'];

const ROUTES = {
  '': home, home, tidbit: home, learn, library, words, phrases, knowledge, speeches, practice,
  quiz, quizmenu: quiz, progress, settings,
};

let cleanup = null;
let NativeApp = null;

function parse() {
  const h = location.hash.replace(/^#\/?/, '');
  const [path, query = ''] = h.split('?');
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  return { parts, query: Object.fromEntries(new URLSearchParams(query)) };
}

export function go(path, replace = false) {
  const h = '#/' + path.replace(/^\//, '');
  if (replace) location.replace(h); else location.hash = h;
}

function activeRail(parts) {
  const [key, sub] = parts;
  if (!key || key === 'home') return 'home';
  if (key === 'learn') return sub === 'words' ? 'words' : sub === 'phrases' ? 'phrases' : 'knowledge';
  if (key === 'quiz' || key === 'practice') return key;
  return LIBRARY_KEYS.includes(key) ? 'library' : 'home';
}
function renderRail(active) {
  $('#rail').innerHTML = RAIL.map((s) => `
    <a href="${s.href}" class="${active === s.id ? 'active' : ''}">
      <span class="ico">${s.ico}</span><span>${esc(s.name)}</span>
    </a>`).join('');
}

async function route() {
  if (cleanup) { try { cleanup(); } catch { /* ignore */ } cleanup = null; }
  closeSheet();
  const { parts, query } = parse();
  const key = parts[0] || '';
  const mod = ROUTES[key] || home;
  const view = $('#view');
  const ctx = {
    parts, query, go,
    setTitle: (t) => { $('#title').textContent = t; document.title = `${t} · Extempore Prep`; },
    setRight: (html) => { $('#topbarRight').innerHTML = html || ''; },
  };
  ctx.setRight('');
  const isHome = key === '' || key === 'home';
  $('#backBtn').style.display = isHome ? 'none' : 'grid';
  renderRail(activeRail(parts));
  // Fresh root per screen so event listeners never pile up across screens.
  const root = document.createElement('div');
  view.replaceChildren(root);
  view.scrollTop = 0;
  const res = mod.render(root, ctx);
  cleanup = typeof res === 'function' ? res : null;
}

function back() {
  if (sheetOpen()) { closeSheet(); return; }
  const { parts } = parse();
  if (!parts.length) {
    NativeApp?.exitApp?.();
    return;
  }
  const [k0, k1, k2] = parts;
  if (k0 === 'learn' || k0 === 'library' || k0 === 'practice') { go('', true); return; }
  if (k0 === 'quiz') { go(k1 === 'play' && k2 && k2 !== 'revision' ? 'quizmenu' : '', true); return; }
  // Go "up" one level so the back button is predictable even after deep links.
  if (parts.length === 1 && LIBRARY_KEYS.includes(parts[0]) && parts[0] !== 'library') { go('library', true); return; }
  go(parts.slice(0, -1).join('/'), true);
}

async function start() {
  try {
    await loadAll();
  } catch (e) {
    $('#view').innerHTML = `<div class="card">Could not load the app content.<br><span class="muted">${esc(e.message)}</span></div>`;
    return;
  }
  $('#backBtn').addEventListener('click', back);
  window.addEventListener('hashchange', route);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') back(); });

  // Android hardware back button (Capacitor App plugin)
  try {
    const cap = window.Capacitor;
    const App = cap?.Plugins?.App || (cap?.registerPlugin ? cap.registerPlugin('App') : null);
    if (cap?.isNativePlatform?.() && App) { NativeApp = App; App.addListener('backButton', back); }
  } catch { /* running in a browser */ }

  // Everything is pink, including emoji: tint them whenever the page changes.
  let queued = false;
  const tint = () => { queued = false; ['#app', '#sheet', '#toast'].forEach((sel) => tintEmoji($(sel))); };
  new MutationObserver(() => { if (!queued) { queued = true; requestAnimationFrame(tint); } })
    .observe(document.body, { childList: true, subtree: true, characterData: true });

  route();
}

start();
