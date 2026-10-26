// Quiz screens. The main Quiz button runs a revision round straight away; the full menu lives in the Library.
import { esc, confetti, beep, buzz, pct } from '../util.js';
import { DB } from '../data.js';
import { get, recordAnswer, recordRound } from '../store.js';
import { buildRound, poolSize, getPool } from '../quiz-engine.js';

export function render(root, ctx) {
  const [key, sub, mode] = ctx.parts;
  if (key === 'quizmenu') return menu(root, ctx);
  if (sub === 'play') return play(root, ctx, mode || 'revision');
  return play(root, ctx, 'revision');
}

function menu(root, ctx) {
  ctx.setTitle('Quiz by topic');
  const s = get();
  const pool = getPool();
  const rv = s.quiz.review.length;
  const tile = (href, ico, name, sub = '', cls = '') => `<a class="tile ${cls}" href="${href}"><span class="ico">${ico}</span><span><div class="name">${esc(name)}</div>${sub ? `<div class="sub">${esc(sub)}</div>` : ''}</span></a>`;
  root.innerHTML = `<div class="view-inner stack">
    <div class="tiles">
      ${tile('#/quiz', '🎯', 'Revision', 'Mix of what you studied', 't-pink')}
      ${tile('#/quiz/play/review', '🔁', 'Missed', rv ? `${rv} to review` : 'All clear')}
      ${tile('#/quiz/play/words', '🚀', 'Words')}
      ${tile('#/quiz/play/phrases', '💬', 'Phrases')}
      ${DB.kTopics.map((d) => tile(`#/quiz/play/flash:${d.id}`, d.emoji, d.name)).join('')}
    </div>
    <p class="muted small center">${poolSize()} questions</p></div>`;
}

// Runs a round of questions. opts.again() should start another round; opts.home is the "Done" link.
export function runQuiz(root, round, opts = {}) {
  const sound = get().settings.sound;
  const mode = opts.mode || 'revision';
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
    const optEls = root.querySelectorAll('.opt');
    optEls.forEach((b, n) => { b.disabled = true; if (n === q.correct) b.classList.add('right'); });
    if (!ok) { optEls[k].classList.add('wrong', 'shake'); missed.push(q); } else score++;
    recordAnswer(q, ok);
    beep(ok ? 'good' : 'bad', sound); buzz(ok ? 15 : 60);
    const last = i === round.length - 1;
    root.querySelector('#fb').innerHTML = `<div class="feedback ${ok ? 'good' : 'bad'} pop">${ok ? 'Correct!' : `Answer: ${esc(q.answerText)}`}
      ${q.explain ? `<div class="exp">${esc(q.explain)}</div>` : ''}</div>
      <button class="btn block big" id="next" style="margin-top:14px">${last ? 'Results' : 'Next'}</button>`;
    root.querySelector('#next').onclick = () => { i++; last ? finish() : draw(); };
    root.querySelector('#next').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  const finish = () => {
    recordRound(score, round.length, mode);
    if (score >= round.length - 1) confetti();
    beep('done', sound);
    const msg = score === round.length ? 'Perfect!' : score >= round.length - 1 ? 'Excellent!' : score >= 3 ? 'Good going!' : 'Keep going, it sticks with repeats.';
    root.innerHTML = `<div class="quiz-wrap"><div class="card center stack pop">
      <div class="score-big">${score}/${round.length}</div><h2>${msg}</h2>
      ${missed.length ? `<div style="text-align:left"><b>Revisit</b><ul>${missed.map((q) => `<li>${esc(q.answerText)}${q.explain ? ` <span class="muted small">${esc(q.explain)}</span>` : ''}</li>`).join('')}</ul></div>` : ''}
      <div class="row" style="justify-content:center">
        <button class="btn" id="again">${opts.againLabel || 'Another 5'}</button>
        <a class="btn ghost" href="${opts.home || '#/'}">Done</a>
      </div></div></div>`;
    root.querySelector('#again').onclick = () => opts.again?.();
  };

  draw();
}

function play(root, ctx, mode) {
  ctx.setTitle(mode === 'review' ? 'Missed questions' : 'Quiz');
  const start = () => {
    const round = buildRound(mode, 5);
    if (!round.length) {
      root.innerHTML = `<div class="quiz-wrap card center stack"><h2>${mode === 'review' ? 'Nothing to review' : 'No questions here yet'}</h2><a class="btn" href="#/">Home</a></div>`;
      return;
    }
    runQuiz(root, round, { mode, again: start, home: mode === 'revision' ? '#/' : '#/quizmenu' });
  };
  start();
}
