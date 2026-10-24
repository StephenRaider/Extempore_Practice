// Word Upgrade: overused words -> sharper alternatives, with a flashcard flow and spaced repetition.
import { esc, shuffle, confetti, beep, buzz, pct } from '../util.js';
import { DB } from '../data.js';
import { get, gradeWord, isDue, isMastered, wordState, activity, MASTERED_BOX } from '../store.js';

const TONE_CLS = { formal: '', persuasive: 'pink', emotional: 'sun', vivid: 'sky', academic: 'mint' };
const toneTags = (w) => w.tone.map((t) => `<span class="pill ${TONE_CLS[t] || ''}">${esc(t)}</span>`).join(' ');
const boxDots = (id) => { const b = wordState(id)?.box || 0; return `<span class="box-dots" title="Mastery">${[1, 2, 3, 4].map((i) => `<i class="${b >= i ? 'on' : ''}"></i>`).join('')}</span>`; };

export function render(root, ctx) {
  const [, sub, arg] = ctx.parts;
  if (sub === 'learn') return renderSession(root, ctx);
  return renderBrowse(root, ctx, sub === 'g' ? arg : null);
}

function counts() {
  const due = DB.words.filter((w) => isDue(w.id)).length;
  const mastered = DB.words.filter((w) => isMastered(w.id)).length;
  const fresh = DB.words.filter((w) => !wordState(w.id)).length;
  return { due, mastered, fresh };
}

function renderBrowse(root, ctx, base) {
  ctx.setTitle('Word Upgrade');
  const c = counts();
  const group = base ? DB.wordGroups.find((g) => g.base === base) : null;
  let tone = 'all';
  root.innerHTML = `<div class="view-inner">
    <div class="split ${group ? 'has-detail' : ''}">
      <div class="pane-list">
        <div class="card" style="background:var(--lav-100)">
          <div class="row between"><b>🚀 Your words</b><span class="pill pink">${c.mastered}/${DB.words.length} mastered</span></div>
          <div class="bar" style="margin:10px 0 14px"><i style="width:${pct(c.mastered, DB.words.length)}%"></i></div>
          <div class="stack">
            <a class="btn block big" href="#/words/learn?mode=mix">▶ Start a lesson</a>
            <a class="btn block pink ${c.due ? '' : 'hidden'}" href="#/words/learn?mode=due">🔁 Review ${c.due} due word${c.due === 1 ? '' : 's'}</a>
          </div>
          <p class="small muted" style="margin:12px 0 0">${c.fresh} new words to discover. Tap “Again” when unsure and the word comes back sooner.</p>
        </div>
        <div class="section-title">Overused words</div>
        ${DB.wordGroups.map((g) => {
          const m = g.alternatives.filter((w) => isMastered(w.id)).length;
          return `<a class="list-item ${g.base === base ? 'active' : ''}" href="#/words/g/${encodeURIComponent(g.base)}">
            <span class="ico">${g.emoji || '✏️'}</span>
            <span class="txt"><b>“${esc(g.base)}”</b><span>${g.alternatives.length} upgrades · ${m} mastered</span></span>
            <span class="chev">›</span></a>`;
        }).join('')}
      </div>
      <div class="pane-detail" id="detail">${group ? '' : `<div class="empty-detail"><div><div class="ico">🚀</div><p>Pick an overused word to see its sharper alternatives,<br>or start a lesson.</p></div></div>`}</div>
    </div></div>`;

  if (!group) return;
  ctx.setTitle(`Instead of “${group.base}”`);
  const detail = root.querySelector('#detail');
  const draw = () => {
    const list = group.alternatives.filter((w) => tone === 'all' || w.tone.includes(tone));
    const tones = [...new Set(group.alternatives.flatMap((w) => w.tone))];
    detail.innerHTML = `<div class="stack">
      <div class="row between">
        <h2>Instead of <s style="color:var(--coral-500)">${esc(group.base)}</s>, try…</h2>
        <a class="btn pink" href="#/words/learn?mode=group&g=${encodeURIComponent(group.base)}">▶ Practise these</a>
      </div>
      <div class="chips">${['all', ...tones].map((t) => `<button class="chip ${t === tone ? 'on' : ''}" data-tone="${t}">${t === 'all' ? 'All tones' : esc(t)}</button>`).join('')}</div>
      <div class="word-list">${list.map((w) => `<div class="card word-item">
        <div class="row between"><b>${esc(w.word)}</b>${boxDots(w.id)}</div>
        <div style="margin:6px 0">${toneTags(w)}</div>
        <p style="margin:6px 0"><b>${esc(w.meaning)}</b></p>
        <p class="muted" style="margin:0"><i>${esc(w.example)}</i></p>
      </div>`).join('')}</div>
    </div>`;
    detail.querySelectorAll('[data-tone]').forEach((b) => { b.onclick = () => { tone = b.dataset.tone; draw(); }; });
  };
  draw();
}

function buildQueue(mode, base) {
  if (mode === 'group') return shuffle(DB.wordGroups.find((g) => g.base === base)?.alternatives || []);
  const due = shuffle(DB.words.filter((w) => isDue(w.id)));
  if (mode === 'due') return due.slice(0, 15);
  // Up to 5 due words, then new words in group order (so a lesson stays coherent), topped up with random ones
  const fresh = DB.words.filter((w) => !wordState(w.id));
  const picked = [...due.slice(0, 5), ...fresh].slice(0, 10);
  const extra = shuffle(DB.words.filter((w) => !picked.includes(w))).slice(0, 10 - picked.length);
  return shuffle([...picked, ...extra]);
}

function renderSession(root, ctx) {
  ctx.setTitle('Word lesson');
  const mode = ctx.query.mode || 'mix';
  const queue = buildQueue(mode, ctx.query.g);
  const total = queue.length;
  let done = 0, correct = 0, flipped = false;
  const firstTry = new Set();
  const sound = get().settings.sound;

  if (!total) {
    root.innerHTML = `<div class="flash-wrap center card"><div style="font-size:60px">🎉</div><h2>Nothing due right now</h2><p class="muted">Start a new lesson to learn fresh words.</p><a class="btn" href="#/words/learn?mode=mix">Start a lesson</a></div>`;
    return;
  }

  const draw = () => {
    if (!queue.length) return finish();
    const w = queue[0];
    flipped = false;
    root.innerHTML = `<div class="flash-wrap">
      <div class="progress-top"><div class="bar"><i style="width:${pct(done, total)}%"></i></div><b>${done}/${total}</b></div>
      <div class="flash" id="flash" role="button" aria-label="Flip card">
        <div class="flash-inner">
          <div class="flash-face">
            <div class="from">Instead of <s>${esc(w.base)}</s> say…</div>
            <div class="word">${esc(w.word)}</div>
            <div>${toneTags(w)}</div>
            <div class="hint">Do you know what it means? Tap to check</div>
          </div>
          <div class="flash-face back">
            <div class="word" style="font-size:1.7rem">${esc(w.word)}</div>
            <div class="meaning">${esc(w.meaning)}</div>
            <div class="example">“${esc(w.example)}”</div>
            ${w.pron ? `<div class="small muted">Say it: ${esc(w.pron)}</div>` : ''}
          </div>
        </div>
      </div>
      <div class="answer-row" id="answers" style="visibility:hidden">
        <button class="btn coral big" id="again">↺ Again</button>
        <button class="btn mint big" id="got">✓ Got it</button>
      </div>
      <button class="btn ghost block" id="reveal" style="margin-top:-6px">Show meaning</button>
    </div>`;
    const flash = root.querySelector('#flash');
    const flip = () => {
      flipped = !flipped;
      flash.classList.toggle('flipped', flipped);
      root.querySelector('#answers').style.visibility = 'visible';
      root.querySelector('#reveal').classList.add('hidden');
    };
    flash.onclick = flip;
    root.querySelector('#reveal').onclick = flip;
    root.querySelector('#got').onclick = () => answer(true);
    root.querySelector('#again').onclick = () => answer(false);
  };

  const answer = (ok) => {
    const w = queue.shift();
    gradeWord(w.id, ok);
    if (ok) {
      done++;
      if (!firstTry.has(w.id)) correct++;
      beep('good', sound); buzz(20);
    } else {
      firstTry.add(w.id);
      queue.splice(Math.min(queue.length, 3), 0, w); // comes back in a few cards
      beep('bad', sound);
    }
    draw();
  };

  const finish = () => {
    activity(total * 2);
    const mastered = DB.words.filter((w) => (wordState(w.id)?.box || 0) >= MASTERED_BOX).length;
    root.innerHTML = `<div class="flash-wrap center"><div class="card pop stack">
      <div style="font-size:70px">🏆</div>
      <h2>Lesson complete!</h2>
      <p class="muted">${correct}/${total} known on the first try · +${total * 2} XP</p>
      <p><span class="pill pink">${mastered} words mastered overall</span></p>
      <div class="row" style="justify-content:center">
        <a class="btn" href="#/words/learn?mode=mix">Another lesson</a>
        <a class="btn ghost" href="#/quiz/play/words">Quiz me on words</a>
        <a class="btn ghost" href="#/words">Done</a>
      </div></div></div>`;
    confetti(); beep('done', sound);
  };

  draw();
}
