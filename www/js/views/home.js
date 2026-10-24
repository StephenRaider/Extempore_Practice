import { esc, seeded, dayKey, pick } from '../util.js';
import { DB } from '../data.js';
import { get, streak, todayXP, refresherDue, seeCard } from '../store.js';
import { SECTIONS } from '../app.js';
import { cardHTML, bindCardFavs } from './common.js';

function todaysCard() {
  const rnd = seeded('tidbit-' + dayKey());
  return DB.cards[Math.floor(rnd() * DB.cards.length)];
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export function render(view, ctx) {
  if (ctx.parts[0] === 'tidbit') return renderTidbit(view, ctx);
  ctx.setTitle('Extempore Prep');
  ctx.setRight(`<a class="icon-btn" href="#/settings" aria-label="Settings" style="font-size:22px;text-decoration:none">⚙️</a>`);
  const s = get();
  const name = s.name?.trim();
  const card = todaysCard();
  const st = streak();
  const tiles = SECTIONS.filter((x) => x.id !== 'tidbit');

  view.innerHTML = `<div class="view-inner">
    <div class="hero">
      <div class="mascot">🦉</div>
      <div>
        <h2>${name ? `Hi, ${esc(name)}!` : `${greeting()}!`}</h2>
        <div class="muted">Ready to sound sharp today?</div>
      </div>
    </div>
    <div class="stats-strip">
      <div class="stat-chip streak"><span class="big">🔥 ${st}</span> day streak</div>
      <div class="stat-chip"><span class="big">⭐ ${todayXP()}</span> XP today</div>
      <div class="stat-chip"><span class="big">🏅 ${s.xp}</span> total</div>
    </div>
    <div class="home-grid">
      <div class="side stack">
        <div class="card tidbit">
          <div class="row between"><span class="label">💡 Today's Tidbit</span><a href="#/tidbit" class="pill pink" style="text-decoration:none">More ›</a></div>
          <div style="margin-top:10px">${tidbitInner(card)}</div>
        </div>
        ${refresherDue() ? `<a class="refresher" href="#/quiz/play/refresher"><span class="ico">⚡</span><span><b>Quick refresher</b><br><span class="small">5 questions on things you're learning</span></span></a>` : ''}
      </div>
      <div class="tiles">
        ${tiles.map((t, i) => `<a class="tile ${i === 4 ? 't-pink' : i % 3 === 0 ? 't-lav' : ''}" href="#/${t.id}">
          <span class="ico">${t.ico}</span>
          <span><div class="name">${esc(t.name)}</div><div class="sub">${esc(t.sub)}</div></span>
        </a>`).join('')}
      </div>
    </div>
  </div>`;
  seeCard(card.id);
}

function tidbitInner(c) {
  const t = DB.topics[c.topic];
  const d = DB.domains.find((x) => x.id === c.domain);
  const text = c.type === 'quote' ? `“${c.text}” — ${c.by}` : c.type === 'sides' ? (c.text || c.title) : c.type === 'angle' ? c.open : c.text;
  return `<div class="small muted" style="font-weight:800">${d.emoji} ${esc(d.name)} · ${esc(t.title)}</div>
    ${c.title ? `<div style="font-weight:900;font-size:1.1rem;margin:4px 0">${esc(c.title)}</div>` : ''}
    <p style="margin:0">${esc(text)}</p>`;
}

function renderTidbit(view, ctx) {
  ctx.setTitle("Today's Tidbit");
  let card = todaysCard();
  const draw = () => {
    const t = DB.topics[card.topic];
    view.innerHTML = `<div class="view-inner" style="max-width:760px">
      <div class="stack">
        ${cardHTML(card, { showTopic: true })}
        <div class="row">
          <button class="btn pink" id="another">🎲 Another tidbit</button>
          <a class="btn ghost" href="#/knowledge/${card.domain}/${card.topic}">More on ${esc(t.title.split(',')[0])}</a>
        </div>
      </div></div>`;
    seeCard(card.id);
    view.querySelector('#another').onclick = () => { card = pick(DB.cards.filter((c) => c !== card)); draw(); };
  };
  bindCardFavs(view);
  draw();
}
