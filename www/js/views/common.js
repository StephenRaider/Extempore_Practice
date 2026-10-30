// Pieces shared by several screens.
import { esc, renderMarkup, toast, openSheet } from '../util.js';
import { DB, topicName, domainOf } from '../data.js';
import { isFav, toggleFav } from '../store.js';

export const KIND = {
  fact: { label: 'Key fact', ico: '📊', cls: 'sky' },
  example: { label: 'Landmark example', ico: '🏆', cls: 'sun' },
  quote: { label: 'Quote', ico: '❝', cls: 'pink' },
  sides: { label: 'Both sides', ico: '⚖️', cls: '' },
  angle: { label: 'Extempore angle', ico: '🎯', cls: 'mint' },
  concept: { label: 'Key idea', ico: '🔑', cls: '' },
};

export function cardHTML(c, { showTopic = false, fav = true } = {}) {
  const k = KIND[c.type] || KIND.concept;
  let body = '';
  if (c.type === 'quote') {
    body = `<div class="quote">“${esc(c.text)}”</div><div class="by">— ${esc(c.by)}</div>${c.use ? `<p class="small muted" style="margin-top:8px">${esc(c.use)}</p>` : ''}`;
  } else if (c.type === 'sides') {
    body = `${c.text ? `<p>${esc(c.text)}</p>` : ''}<div class="sides">
      <div><h4>👍 For</h4><ul>${(c.pros || []).map((p) => `<li>${esc(p)}</li>`).join('')}</ul></div>
      <div><h4>👎 Against</h4><ul>${(c.cons || []).map((p) => `<li>${esc(p)}</li>`).join('')}</ul></div></div>`;
  } else if (c.type === 'angle') {
    body = `<p><b>Open:</b> ${esc(c.open)}</p><p><b>Close:</b> ${esc(c.close)}</p>${c.text ? `<p class="muted small">${esc(c.text)}</p>` : ''}`;
  } else {
    body = `<p>${esc(c.text)}</p>`;
  }
  const d = domainOf(c.domain);
  return `<div class="card kcard" data-card="${esc(c.id)}">
    <div class="kind"><span class="pill ${k.cls}">${k.ico} ${k.label}</span>${showTopic ? `<span class="pill">${d?.emoji || ''} ${esc(topicName(c.topic))}</span>` : ''}</div>
    ${fav ? `<button class="heart fav" data-fav-card="${esc(c.id)}" aria-label="Favourite">${isFav('favCards', c.id) ? '💗' : '🤍'}</button>` : ''}
    ${c.title ? `<div class="title">${esc(c.title)}</div>` : ''}
    ${body}
    ${c.verify ? `<div class="verify">⚠️ Double-check this figure before quoting it: ${esc(typeof c.verify === 'string' ? c.verify : 'numbers like this change over time.')}</div>` : ''}
  </div>`;
}

export function bindCardFavs(root) {
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-fav-card]');
    if (!b) return;
    const on = toggleFav('favCards', b.dataset.favCard);
    b.textContent = on ? '💗' : '🤍';
    toast(on ? 'Saved to favourites' : 'Removed from favourites');
  });
}

export function frameworkHTML() {
  return `<div class="framework" aria-label="Speech framework">
    <span class="f-hook">Hook</span><span class="arrow">→</span>
    <span class="f-stance">Stance</span><span class="arrow">→</span>
    <span class="f-point">2–3 points + examples</span><span class="arrow">→</span>
    <span class="f-conclusion">Conclusion</span></div>`;
}

// Tapping a highlighted word in a speech shows its meaning.
export function bindMeanings(root) {
  root.addEventListener('click', (e) => {
    const el = e.target.closest('.hl');
    if (!el) return;
    const w = el.dataset.word;
    let meaning = el.dataset.meaning;
    let extra = '';
    const found = DB.words.find((x) => x.word.toLowerCase() === w.toLowerCase());
    if (found) {
      meaning = meaning || found.meaning;
      extra = `<p class="muted">Upgrade for <b>“${esc(found.base)}”</b> · ${found.tone.map((t) => `<span class="pill">${esc(t)}</span>`).join(' ')}</p><p><i>${esc(found.example)}</i></p>`;
    }
    openSheet(`<h2 style="font-size:1.8rem;color:var(--lav-700)">${esc(w)}</h2>
      <p style="font-size:1.15rem;font-weight:700;margin-top:8px">${esc(meaning || 'A strong word worth borrowing.')}</p>${extra}
      <button class="btn block" data-close style="margin-top:12px">Got it</button>`);
  });
}

export { renderMarkup };
