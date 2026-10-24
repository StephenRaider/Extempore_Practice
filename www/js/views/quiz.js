// Quiz: 5-question rounds (MCQ and fill-in-the-blank). Wrong answers feed the review queue.
import { esc, confetti, beep, buzz, pct } from '../util.js';
import { DB } from '../data.js';
import { get, recordAnswer, recordRound } from '../store.js';
import { buildRound, poolSize, getPool } from '../quiz-engine.js';

export function render(root, ctx) {
  const [, sub, mode] = ctx.parts;
  if (sub === 'play') return play(root, ctx, mode || 'mixed');
  return menu(root, ctx);
}

function menu(root, ctx) {
  ctx.setTitle('Quiz');
  const s = get();
  const pool = getPool();
  const rv = s.quiz.review.length;
  const hist = s.quiz.history.slice(-5);
  const tile = (href, ico, name, sub, cls = '') => `<a class="tile ${cls}" href="${href}"><span class="ico">${ico}</span><span><div class="name">${esc(name)}</div><div class="sub">${esc(sub)}</div></span></a>`;
  root.innerHTML = `<div class="view-inner stack">
    <div class="card" style="background:var(--lav-100)"><div class="row between"><div><h2>🎯 Quick quiz</h2><p class="muted" style="margin:4px 0 0">${poolSize()} questions · rounds of 5</p></div>
      <a class="btn pink big" href="#/quiz/play/mixed">▶ Start a round</a></div>
      ${hist.length ? `<p class="small muted" style="margin:10px 0 0">Recent: ${hist.map((h) => `<span class="pill ${h.s === h.t ? 'mint' : ''}">${h.s}/${h.t}</span>`).join(' ')}</p>` : ''}</div>
    <div class="tiles">
      ${tile('#/quiz/play/review', '🔁', 'Review mistakes', rv ? `${rv} question${rv === 1 ? '' : 's'} waiting` : 'Nothing to review. Great!', 't-pink')}
      ${tile('#/quiz/play/words', '🚀', 'Words', `${pool.filter((q) => q.source === 'words').length} questions`)}
      ${tile('#/quiz/play/phrases', '💬', 'Phrases', `${pool.filter((q) => q.source === 'phrases').length} questions`)}
      ${DB.domains.map((d) => tile(`#/quiz/play/${d.id}`, d.emoji, d.name, `${pool.filter((q) => q.domain === d.id).length} questions`)).join('')}
    </div></div>`;
}

function play(root, ctx, mode) {
  ctx.setTitle(mode === 'review' ? 'Review mistakes' : mode === 'refresher' ? 'Quick refresher' : 'Quiz');
  const round = buildRound(mode, 5);
  const sound = get().settings.sound;
  if (!round.length) {
    root.innerHTML = `<div class="quiz-wrap card center stack"><div style="font-size:60px">✨</div><h2>${mode === 'review' ? 'No mistakes to review' : 'No questions here yet'}</h2><a class="btn" href="#/quiz">Back</a></div>`;
    return;
  }
  let i = 0, score = 0, answered = false;
  const missed = [];

  const draw = () => {
    const q = round[i];
    answered = false;
    const blank = q.type === 'blank';
    const text = blank ? esc(q.q).replace('____', '<span class="blank">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>') : esc(q.q);
    root.innerHTML = `<div class="quiz-wrap">
      <div class="progress-top"><div class="bar"><i style="width:${pct(i, round.length)}%"></i></div><b>${i + 1}/${round.length}</b></div>
      <div class="card q-card">
        ${blank ? '<div class="pill sky" style="margin-bottom:10px">Fill in the blank</div>' : ''}
        <div class="q-text">${text}</div>
        <div class="options ${q.opts.every((o) => o.length < 28) ? 'two' : ''}">
          ${q.opts.map((o, k) => `<button class="opt" data-k="${k}">${esc(o)}</button>`).join('')}
        </div>
        <div id="fb"></div>
      </div></div>`;
    root.querySelectorAll('.opt').forEach((b) => b.onclick = () => choose(+b.dataset.k));
  };

  const choose = (k) => {
    if (answered) return;
    answered = true;
    const q = round[i];
    const ok = k === q.correct;
    const opts = root.querySelectorAll('.opt');
    opts.forEach((b, n) => { b.disabled = true; if (n === q.correct) b.classList.add('right'); });
    if (!ok) { opts[k].classList.add('wrong', 'shake'); missed.push(q); }
    else score++;
    recordAnswer(q, ok);
    beep(ok ? 'good' : 'bad', sound); buzz(ok ? 15 : 60);
    const last = i === round.length - 1;
    root.querySelector('#fb').innerHTML = `<div class="feedback ${ok ? 'good' : 'bad'} pop">${ok ? '✅ Correct!' : `❌ Not quite. Answer: ${esc(q.answerText)}`}
      ${q.explain ? `<div class="exp">${esc(q.explain)}</div>` : ''}</div>
      <button class="btn block big" id="next" style="margin-top:14px">${last ? 'See results' : 'Next ›'}</button>`;
    root.querySelector('#next').onclick = () => { i++; last ? finish() : draw(); };
    root.querySelector('#next').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  const finish = () => {
    recordRound(score, round.length, mode === 'refresher' ? 'refresher' : mode);
    if (score >= 4) confetti(); beep('done', sound);
    const msg = score === 5 ? 'Perfect round! 🌟' : score >= 4 ? 'Excellent!' : score >= 3 ? 'Good going!' : 'Keep at it. Mistakes are how you learn.';
    root.innerHTML = `<div class="quiz-wrap"><div class="card center stack pop">
      <div class="score-big">${score}/${round.length}</div><h2>${msg}</h2>
      <p class="muted">+${score * 2 + 2} XP${missed.length ? ` · ${missed.length} added to your review queue` : ''}</p>
      ${missed.length ? `<div style="text-align:left"><b>Revisit:</b><ul>${missed.map((q) => `<li>${esc(q.answerText)}${q.explain ? ` <span class="muted small">— ${esc(q.explain)}</span>` : ''}</li>`).join('')}</ul></div>` : ''}
      <div class="row" style="justify-content:center">
        <a class="btn" href="#/quiz/play/${mode}" data-again>Another round</a>
        <a class="btn ghost" href="${mode === 'refresher' ? '#/' : '#/quiz'}">${mode === 'refresher' ? 'Home' : 'Quiz menu'}</a>
      </div></div></div>`;
    // Same hash would not re-render, so rebuild manually
    root.querySelector('[data-again]').onclick = (e) => { e.preventDefault(); location.hash = '#/quiz'; setTimeout(() => { location.hash = `#/quiz/play/${mode}`; }, 0); };
  };

  draw();
}
