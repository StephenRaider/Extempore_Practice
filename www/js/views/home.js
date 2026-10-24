// Minimal home: a few big buttons, nothing to read, nothing to decide.
import { esc, seeded, dayKey, pick, FLAMINGO } from '../util.js';
import { DB } from '../data.js';
import { get, streak, seeCard } from '../store.js';
import { cardHTML, bindCardFavs } from './common.js';

const TILES = [
  { href: '#/learn/knowledge', ico: '🧠', name: 'Knowledge', cls: 'big' },
  { href: '#/learn/words', ico: '🚀', name: 'Vocabulary', cls: 'big' },
  { href: '#/learn/phrases', ico: '💬', name: 'Phrases' },
  { href: '#/quiz', ico: '🎯', name: 'Quiz' },
  { href: '#/practice', ico: '🎤', name: 'Speak' },
];

export function render(view, ctx) {
  if (ctx.parts[0] === 'tidbit') return renderTidbit(view, ctx);
  ctx.setTitle('');
  ctx.setRight('');
  const s = get();
  const name = s.name?.trim();
  const st = streak();
  view.innerHTML = `<div class="home">
    <div class="home-top">
      <div class="home-hi">${FLAMINGO}<div><h2>${name ? `Hi, ${esc(name)}` : 'Hi there'}</h2></div></div>
      ${st ? `<div class="pill pink streak">🔥 ${st}</div>` : ''}
    </div>
    <div class="home-tiles">
      ${TILES.map((t) => `<a class="home-tile ${t.cls || ''}" href="${t.href}"><span class="ico">${t.ico}</span><span class="name">${esc(t.name)}</span></a>`).join('')}
    </div>
    <a class="library-link" href="#/library">Library</a>
  </div>`;
}

function todaysCard() {
  const rnd = seeded('tidbit-' + dayKey());
  return DB.cards[Math.floor(rnd() * DB.cards.length)];
}

function renderTidbit(view, ctx) {
  ctx.setTitle("Today's Tidbit");
  let card = todaysCard();
  const draw = () => {
    view.innerHTML = `<div class="view-inner" style="max-width:760px"><div class="stack">
      ${cardHTML(card, { showTopic: true })}
      <button class="btn pink" id="another">Another</button></div></div>`;
    seeCard(card.id);
    view.querySelector('#another').onclick = () => { card = pick(DB.cards.filter((c) => c !== card)); draw(); };
  };
  bindCardFavs(view);
  draw();
}
