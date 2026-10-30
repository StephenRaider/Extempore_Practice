// Knowledge Cards: 9 domains x 3 topics, ~6 cards each.
import { esc, pct } from '../util.js';
import { DB, domainOf } from '../data.js';
import { get, seeCard } from '../store.js';
import { cardHTML, bindCardFavs } from './common.js';

const seenIn = (cards) => cards.filter((c) => get().cardsSeen[c.id]).length;

export function render(root, ctx) {
  const [, domId, topicId] = ctx.parts;
  bindCardFavs(root);
  if (domId === 'favourites') return renderFavs(root, ctx);
  const dom = domainOf(domId);
  if (!dom) return renderDomains(root, ctx);
  return renderDomain(root, ctx, dom, topicId);
}

function renderDomains(root, ctx) {
  ctx.setTitle('Knowledge');
  root.innerHTML = `<div class="view-inner stack">
    <p class="muted" style="margin:0">Facts, examples, quotes and angles for every topic. Use them as the “evidence” in your speeches.</p>
    <div class="domain-grid">
      ${DB.domains.map((d) => {
        const cards = DB.cards.filter((c) => c.domain === d.id);
        return `<a class="domain-tile" href="#/knowledge/${d.id}" style="background:${d.tint || 'var(--surface)'}">
          <span class="ico">${d.emoji}</span><b>${esc(d.name)}</b>
          <span class="small muted">${seenIn(cards)}/${cards.length} cards read</span>
          <div class="bar"><i style="width:${pct(seenIn(cards), cards.length)}%"></i></div></a>`;
      }).join('')}
      <a class="domain-tile" href="#/knowledge/favourites" style="background:var(--pink-100)"><span class="ico">💗</span><b>Favourite cards</b><span class="small muted">${get().favCards.length} saved</span></a>
    </div></div>`;
}

function renderDomain(root, ctx, dom, topicId) {
  const topic = dom.topics.find((t) => t.id === topicId);
  ctx.setTitle(topic ? topic.title : dom.name);
  root.innerHTML = `<div class="view-inner"><div class="split ${topic ? 'has-detail' : ''}">
    <div class="pane-list">
      <div class="card" style="background:${dom.tint || 'var(--lav-100)'}"><div style="font-size:40px">${dom.emoji}</div><h2>${esc(dom.name)}</h2>
        ${dom.blurb ? `<p class="muted small" style="margin:6px 0 0">${esc(dom.blurb)}</p>` : ''}</div>
      ${dom.topics.map((t) => {
        const cards = DB.cardsByTopic[t.id] || [];
        return `<a class="list-item ${t.id === topicId ? 'active' : ''}" href="#/knowledge/${dom.id}/${t.id}">
          <span class="ico">${t.emoji || '📘'}</span>
          <span class="txt"><b>${esc(t.title)}</b><span>${seenIn(cards)}/${cards.length} read</span></span><span class="chev">›</span></a>`;
      }).join('')}
      <a class="btn ghost block" href="#/quiz/play/${dom.id}">🎯 Quiz: ${esc(dom.name)}</a>
    </div>
    <div class="pane-detail" id="detail"></div>
  </div></div>`;
  const detail = root.querySelector('#detail');
  if (!topic) {
    detail.innerHTML = `<div class="empty-detail"><div><div class="ico">${dom.emoji}</div><p>Pick a topic to open its cards.</p></div></div>`;
    return;
  }
  const cards = DB.cardsByTopic[topic.id] || [];
  detail.innerHTML = `<div class="stack">
    <div class="row">
      <a class="btn pink" href="#/speeches/${topic.id}">🎤 Sample speech</a>
      <a class="btn ghost" href="#/practice?topic=${topic.id}">⏱️ Practise this topic</a>
    </div>
    <div class="kcards">${cards.map((c) => cardHTML(c)).join('')}</div>
    ${topic.prompts?.length ? `<div class="card flat"><h3>Likely extempore prompts</h3><ul style="margin:0;padding-left:20px">${topic.prompts.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></div>` : ''}
  </div>`;
  cards.forEach((c) => seeCard(c.id));
}

function renderFavs(root, ctx) {
  ctx.setTitle('Favourite cards');
  const favs = get().favCards.map((id) => DB.cards.find((c) => c.id === id)).filter(Boolean);
  root.innerHTML = `<div class="view-inner">${favs.length
    ? `<div class="kcards">${favs.map((c) => cardHTML(c, { showTopic: true })).join('')}</div>`
    : `<div class="card center muted">No favourites yet. Tap 🤍 on any knowledge card to keep it here.</div>`}</div>`;
}
