// My Progress: streak, words mastered, quiz scores, per-domain bars, weak areas.
import { esc, pct, dayKey, addDays } from '../util.js';
import { DB, domainOf } from '../data.js';
import { get, streak, isMastered, wordState } from '../store.js';

export function render(root, ctx) {
  ctx.setTitle('My Progress');
  const s = get();
  const mastered = DB.words.filter((w) => isMastered(w.id)).length;
  const learning = DB.words.filter((w) => wordState(w.id) && !isMastered(w.id)).length;
  const hist = s.quiz.history;
  const avg = hist.length ? Math.round(hist.reduce((a, h) => a + h.s / h.t, 0) / hist.length * 100) : 0;
  const best = Math.max(0, ...Object.keys(s.days).map(() => 0));
  const longest = (() => { const ks = Object.keys(s.days).sort(); let b = 0, c = 0, prev = null; ks.forEach((k) => { c = prev && addDays(prev, 1) === k ? c + 1 : 1; b = Math.max(b, c); prev = k; }); return b; })();

  const week = Array.from({ length: 7 }, (_, n) => { const k = addDays(dayKey(), n - 6); const d = new Date(k + 'T00:00'); return { k, on: !!s.days[k], l: 'SMTWTFS'[d.getDay()] }; });
  const last10 = hist.slice(-10);

  const domRows = DB.domains.map((d) => {
    const cards = DB.cards.filter((c) => c.domain === d.id);
    const seen = cards.filter((c) => s.cardsSeen[c.id]).length;
    const speechesRead = d.topics.filter((t) => s.speechesRead[t.id]).length;
    const prog = Math.round((pct(seen, cards.length) * 0.6 + pct(speechesRead, d.topics.length) * 0.4));
    return { d, prog, seen, total: cards.length, speechesRead };
  });

  const weakTopics = Object.entries(s.topicStats).filter(([, t]) => t.r + t.w >= 3).map(([id, t]) => ({ id, rate: t.r / (t.r + t.w), n: t.r + t.w })).sort((a, b) => a.rate - b.rate).filter((t) => t.rate < 0.75).slice(0, 4);
  const weakWords = DB.words.filter((w) => (wordState(w.id)?.again || 0) > 0).sort((a, b) => wordState(b.id).again - wordState(a.id).again).slice(0, 8);
  const sessions = s.practice;
  const missedCount = {};
  sessions.forEach((x) => (x.missed || []).forEach((m) => { missedCount[m] = (missedCount[m] || 0) + 1; }));
  const weakSkills = Object.entries(missedCount).sort((a, b) => b[1] - a[1]).slice(0, 3);

  root.innerHTML = `<div class="view-inner stack">
    <div class="kpis">
      <div class="card kpi pink"><div class="v">🔥 ${streak()}</div><div class="k">day streak</div></div>
      <div class="card kpi"><div class="v">${mastered}</div><div class="k">words mastered</div></div>
      <div class="card kpi"><div class="v">${hist.length ? avg + '%' : '–'}</div><div class="k">average quiz score</div></div>
      <div class="card kpi pink"><div class="v">${s.xp}</div><div class="k">total XP</div></div>
    </div>
    <div class="prog-grid">
      <div class="stack">
        <div class="card"><h3>This week</h3><div class="week" style="margin-top:8px">${week.map((w) => `<div>${w.l}<i class="${w.on ? 'on' : ''}">${w.on ? '✓' : ''}</i></div>`).join('')}</div>
          <p class="small muted" style="margin:10px 0 0">Longest streak: <b>${longest}</b> day${longest === 1 ? '' : 's'}</p></div>
        <div class="card"><h3>Words</h3>
          <div class="bar" style="margin:8px 0"><i style="width:${pct(mastered, DB.words.length)}%"></i></div>
          <p class="small muted" style="margin:0">${mastered} mastered · ${learning} learning · ${DB.words.length - mastered - learning} not started</p></div>
        <div class="card"><h3>Last quiz rounds</h3>
          ${last10.length ? `<div class="spark">${last10.map((h) => `<i class="${h.s === h.t ? 'full' : ''}" style="height:${Math.max(6, pct(h.s, h.t))}%" title="${h.s}/${h.t}"></i>`).join('')}</div>` : '<p class="muted small">Play a quiz round to see your scores here.</p>'}</div>
        <div class="card"><h3>Speaking practice</h3>
          <p style="margin:6px 0"><b>${sessions.length}</b> session${sessions.length === 1 ? '' : 's'} · <b>${Math.round(sessions.reduce((a, x) => a + x.secs, 0) / 60)}</b> min spoken</p>
          ${weakSkills.length ? `<p class="small muted" style="margin:0">Most often missed: ${weakSkills.map(([m]) => `<span class="pill coral">${esc(m)}</span>`).join(' ')}</p>` : '<p class="small muted" style="margin:0">Rate yourself after practising to spot patterns.</p>'}</div>
      </div>
      <div class="stack">
        <div class="card"><h3>Domains</h3><div style="margin-top:10px">
          ${domRows.map((r) => `<div class="dom-row"><div class="row between"><span>${r.d.emoji} ${esc(r.d.name)}</span><span class="small muted">${r.seen}/${r.total} cards · ${r.speechesRead}/${r.d.topics.length} speeches</span></div><div class="bar"><i style="width:${r.prog}%"></i></div></div>`).join('')}</div></div>
        <div class="card"><h3>🎯 Weak spots</h3>
          ${weakTopics.length || weakWords.length || s.quiz.review.length ? `
            ${weakTopics.filter((t) => DB.kTopicById[t.id]).map((t) => `<a class="list-item" style="margin-top:8px" href="#/learn/knowledge?topic=${t.id}"><span class="ico">${DB.kTopicById[t.id].emoji}</span><span class="txt"><b>${esc(DB.kTopicById[t.id].name)}</b><span>${Math.round(t.rate * 100)}% correct over ${t.n} answers</span></span><span class="chev">›</span></a>`).join('')}
            ${weakWords.length ? `<p style="margin:12px 0 6px"><b>Words to revisit</b></p><div class="chips">${weakWords.map((w) => `<span class="pill pink">${esc(w.word)}</span>`).join('')}</div>` : ''}
            ${s.quiz.review.length ? `<a class="btn block" style="margin-top:12px" href="#/quiz/play/review">🔁 Review ${s.quiz.review.length} missed question${s.quiz.review.length === 1 ? '' : 's'}</a>` : ''}`
            : '<p class="muted small">Weak areas show up here once you have answered a few quiz questions. They also come back more often in quizzes and word lessons.</p>'}
        </div>
      </div>
    </div></div>`;
}
