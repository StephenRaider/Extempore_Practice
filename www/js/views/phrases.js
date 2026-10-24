// Phrase Bank: ready-to-use lines grouped by purpose. Tap to copy, heart to favourite.
import { esc, copyText, toast, buzz } from '../util.js';
import { DB, domainOf } from '../data.js';
import { isFav, toggleFav, get, activity } from '../store.js';

export function render(root, ctx) {
  ctx.setTitle('Phrase Bank');
  const catId = ctx.parts[1];
  const cat = catId === 'favourites' ? { id: 'favourites', name: 'My favourites', emoji: '💗' } : DB.phraseCats.find((c) => c.id === catId);
  const general = DB.phraseCats.filter((c) => !c.domain);
  const topical = DB.phraseCats.filter((c) => c.domain);
  const item = (c, n) => `<a class="list-item ${cat?.id === c.id ? 'active' : ''}" href="#/phrases/${c.id}">
      <span class="ico">${c.emoji || '💬'}</span><span class="txt"><b>${esc(c.name)}</b><span>${n} phrases</span></span><span class="chev">›</span></a>`;

  root.innerHTML = `<div class="view-inner"><div class="split ${cat ? 'has-detail' : ''}">
    <div class="pane-list">
      <p class="muted small list-hint" style="margin:0 4px">Tap any phrase to copy it. Learn a few from each group and your speeches will flow.</p>
      ${item({ id: 'favourites', name: 'My favourites', emoji: '💗' }, get().favPhrases.length)}
      <div class="section-title">By purpose</div>
      ${general.map((c) => item(c, c.phrases.length)).join('')}
      <div class="section-title">Topic phrases</div>
      ${topical.map((c) => item({ ...c, emoji: c.emoji || domainOf(c.domain)?.emoji }, c.phrases.length)).join('')}
    </div>
    <div class="pane-detail" id="detail">${cat ? '' : `<div class="empty-detail"><div><div class="ico">💬</div><p>Choose a group of phrases.</p></div></div>`}</div>
  </div></div>`;
  if (!cat) return;
  ctx.setTitle(cat.name);

  const detail = root.querySelector('#detail');
  const list = cat.id === 'favourites' ? get().favPhrases.map((id) => DB.phraseById[id]).filter(Boolean) : cat.phrases;
  detail.innerHTML = `<div class="stack">
    <div><h2>${cat.emoji || ''} ${esc(cat.name)}</h2>${cat.tip ? `<p class="muted" style="margin-top:6px">${esc(cat.tip)}</p>` : ''}</div>
    ${list.length ? `<div class="phrase-list">${list.map((p) => `<div class="phrase" data-id="${esc(p.id)}">
      <div class="p-text" data-copy>${esc(p.text)}${p.note ? `<span class="p-note">${esc(p.note)}</span>` : ''}</div>
      <button class="heart" data-heart aria-label="Favourite">${isFav('favPhrases', p.id) ? '💗' : '🤍'}</button>
    </div>`).join('')}</div>` : `<div class="card center muted">No favourites yet. Tap 🤍 on any phrase to save it here.</div>`}
  </div>`;

  detail.addEventListener('click', async (e) => {
    const row = e.target.closest('.phrase');
    if (!row) return;
    const p = DB.phraseById[row.dataset.id];
    if (e.target.closest('[data-heart]')) {
      const on = toggleFav('favPhrases', p.id);
      e.target.closest('[data-heart]').textContent = on ? '💗' : '🤍';
      toast(on ? 'Added to favourites' : 'Removed from favourites');
      return;
    }
    if (e.target.closest('[data-copy]')) {
      const ok = await copyText(p.text);
      row.classList.add('copied');
      setTimeout(() => row.classList.remove('copied'), 900);
      buzz(15);
      toast(ok ? 'Copied! 📋' : 'Could not copy');
      activity(0);
    }
  });
}
