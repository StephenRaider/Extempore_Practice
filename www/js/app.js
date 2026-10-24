// App shell: loads data, routes between screens, handles Android back button.
import { loadAll } from './data.js';
import { $, esc, closeSheet, sheetOpen } from './util.js';
import * as home from './views/home.js';
import * as words from './views/words.js';
import * as phrases from './views/phrases.js';
import * as knowledge from './views/knowledge.js';
import * as speeches from './views/speeches.js';
import * as practice from './views/practice.js';
import * as quiz from './views/quiz.js';
import * as progress from './views/progress.js';
import * as settings from './views/settings.js';

export const SECTIONS = [
  { id: 'tidbit', name: "Today's Tidbit", ico: '💡', sub: 'One fresh idea a day', mod: home, route: 'tidbit' },
  { id: 'words', name: 'Word Upgrade', ico: '🚀', sub: 'Swap plain words for sharp ones', mod: words },
  { id: 'phrases', name: 'Phrase Bank', ico: '💬', sub: 'Ready-made lines to sound polished', mod: phrases },
  { id: 'knowledge', name: 'Knowledge', ico: '🧠', sub: '9 domains, 27 topics', mod: knowledge },
  { id: 'speeches', name: 'Sample Speeches', ico: '🎤', sub: 'Annotated 3-minute speeches', mod: speeches },
  { id: 'practice', name: 'Practice Speaking', ico: '⏱️', sub: 'Prep, speak, record, rate', mod: practice },
  { id: 'quiz', name: 'Quiz', ico: '🎯', sub: '5-question rounds', mod: quiz },
  { id: 'progress', name: 'My Progress', ico: '🌟', sub: 'Streaks, mastery, weak spots', mod: progress },
];

const ROUTES = {
  '': home, home, tidbit: home, words, phrases, knowledge, speeches, practice, quiz, progress, settings,
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

function renderRail(active) {
  const items = [{ id: 'home', name: 'Home', ico: '🏠' }, ...SECTIONS.filter((s) => s.id !== 'tidbit'), { id: 'settings', name: 'Settings', ico: '⚙️' }];
  $('#rail').innerHTML = items.map((s) => `
    <a href="#/${s.id === 'home' ? '' : s.id}" class="${active === s.id ? 'active' : ''}">
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
  renderRail(isHome ? 'home' : key === 'tidbit' ? 'home' : key);
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
  // Go "up" one level so the back button is predictable even after deep links.
  const up = parts.slice(0, -1).join('/');
  go(up, true);
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

  route();
}

start();
