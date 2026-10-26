// Sample Speeches: one annotated ~3-minute speech per topic.
import { esc, wordCount, toast, confetti } from '../util.js';
import { DB, domainOf } from '../data.js';
import { get, readSpeech } from '../store.js';
import { frameworkHTML, bindMeanings, renderMarkup } from './common.js';

const LABEL = { hook: 'Hook', stance: 'Stance', point: 'Point + example', transition: 'Transition', conclusion: 'Conclusion' };

export function render(root, ctx) {
  ctx.setTitle('Sample Speeches');
  const topicId = ctx.parts[1];
  const sp = DB.speeches[topicId];
  root.innerHTML = `<div class="view-inner"><div class="split ${sp ? 'has-detail' : ''}">
    <div class="pane-list">
      <p class="muted small list-hint" style="margin:0 4px">Each speech follows the framework and runs about 2 to 3 minutes aloud. Tap highlighted words for their meaning.</p>
      <div class="section-title">✨ Creative topics</div>
      ${DB.creativeSpeeches.map((s) => `<a class="list-item ${s.topic === topicId ? 'active' : ''}" href="#/speeches/${s.topic}">
            <span class="ico">${get().speechesRead[s.topic] ? '✅' : '🎤'}</span>
            <span class="txt"><b>${esc(s.title)}</b><span>${esc(s.prompt)}</span></span><span class="chev">›</span></a>`).join('')}
      ${DB.domains.map((d) => `<div class="section-title">${d.emoji} ${esc(d.name)}</div>
        ${d.topics.map((t) => {
          const s = DB.speeches[t.id];
          if (!s) return '';
          return `<a class="list-item ${t.id === topicId ? 'active' : ''}" href="#/speeches/${t.id}">
            <span class="ico">${get().speechesRead[t.id] ? '✅' : '🎤'}</span>
            <span class="txt"><b>${esc(s.title)}</b><span>${esc(t.title)}</span></span><span class="chev">›</span></a>`;
        }).join('')}`).join('')}
    </div>
    <div class="pane-detail" id="detail">${sp ? '' : `<div class="empty-detail"><div><div class="ico">🎤</div><p>Choose a speech to read.</p></div></div>`}</div>
  </div></div>`;
  if (!sp) return;
  ctx.setTitle(sp.title);

  const detail = root.querySelector('#detail');
  const words = sp.sections.reduce((n, s) => n + wordCount(s.text), 0);
  const mins = (words / 140).toFixed(1);
  const creative = !sp.domain;
  const dom = creative ? { emoji: '✨', name: sp.cat } : domainOf(sp.domain);
  const t = creative ? { title: sp.prompt } : DB.topics[sp.topic];
  let annotated = true;
  detail.innerHTML = `<div class="speech" id="speech">
    <div class="card" style="margin-bottom:14px">
      <div class="small muted" style="font-weight:800">${dom.emoji} ${esc(dom.name)} · ${esc(t.title)}</div>
      <h2 style="margin:6px 0">${esc(sp.title)}</h2>
      ${sp.prompt ? `<p class="muted" style="margin:0 0 10px">Prompt: <i>${esc(sp.prompt)}</i></p>` : ''}
      ${frameworkHTML()}
      <div class="row" style="margin-top:12px">
        <span class="pill">📝 ${words} words</span><span class="pill pink">⏱️ ~${mins} min aloud</span>
        <span class="spacer"></span>
        <label class="row small" style="font-weight:800;cursor:pointer"><input type="checkbox" id="ann" checked style="width:22px;height:22px;accent-color:var(--lav-500)"> Show annotations</label>
      </div>
    </div>
    ${sp.sections.map((s) => `<div class="speech-sec ${s.type}">
      <span class="sec-label f-${s.type}">${LABEL[s.type] || s.type}</span>
      <p>${renderMarkup(s.text)}</p>
      ${s.note ? `<p class="small muted" style="margin-top:6px">💡 ${esc(s.note)}</p>` : ''}
    </div>`).join('')}
    <div class="card flat small muted" style="margin-bottom:14px"><span class="hl" style="pointer-events:none">purple</span> = upgrade word (tap for meaning) · <span class="kp">pink</span> = key phrase you can reuse</div>
    <div class="row">
      <button class="btn mint" id="done">${get().speechesRead[sp.topic] ? '✅ Read' : '✓ Mark as read'}</button>
      <a class="btn pink" href="${creative ? `#/practice?p=${encodeURIComponent(sp.prompt)}` : `#/practice?topic=${sp.topic}`}">⏱️ Now you try this topic</a>
      <a class="btn ghost" href="${creative ? '#/learn/knowledge' : `#/knowledge/${sp.domain}/${sp.topic}`}">🧠 ${creative ? 'Knowledge cards' : 'Topic cards'}</a>
    </div>
  </div>`;
  bindMeanings(detail);
  detail.querySelector('#ann').onchange = (e) => {
    annotated = e.target.checked;
    detail.querySelector('#speech').classList.toggle('plain', !annotated);
  };
  detail.querySelector('#done').onclick = (e) => {
    if (!get().speechesRead[sp.topic]) { readSpeech(sp.topic); confetti(40); toast('+5 XP · speech read'); }
    e.target.textContent = '✅ Read';
  };
}
