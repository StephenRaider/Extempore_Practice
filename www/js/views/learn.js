// Effortless study flows. Each: 5 flashcards -> 5 questions about them.
//   #/learn/knowledge  random topic, short fact cards
//   #/learn/words      "instead of x use y": type y, flip to see it in a sentence
//   #/learn/phrases    situation + phrase: type it once, flip for a tip
import { esc, shuffle, sample, pick, beep, buzz, confetti } from '../util.js';
import { DB, domainOf } from '../data.js';
import { get, seeFlash, flashSeenCount, gradeWord, isDue, wordState, seePhrase, phraseSeenCount, activity } from '../store.js';
import { flashQuiz, wordQuiz, phraseQuiz } from '../quiz-engine.js';
import { runQuiz } from './quiz.js';

export function render(root, ctx) {
  const kind = ctx.parts[1];
  if (kind === 'words') return words(root, ctx);
  if (kind === 'phrases') return phrases(root, ctx);
  return knowledge(root, ctx);
}

const progressTop = (i, n) => `<div class="progress-top"><div class="bar"><i style="width:${(i / n) * 100}%"></i></div><b>${Math.min(i + 1, n)}/${n}</b></div>`;

// ---------------- Knowledge ----------------
function pickTopic(forced) {
  if (forced && DB.topics[forced]) return DB.topics[forced];
  // topics with more unseen cards are more likely
  const weights = DB.topicList.map((t) => ({ t, w: 1 + (DB.flashByTopic[t.id] || []).filter((c) => !flashSeenCount(c.id)).length }));
  let r = Math.random() * weights.reduce((a, b) => a + b.w, 0);
  for (const x of weights) { r -= x.w; if (r <= 0) return x.t; }
  return weights[0].t;
}
function pickCards(topic, n = 5) {
  const cards = shuffle(DB.flashByTopic[topic.id] || []);
  cards.sort((a, b) => flashSeenCount(a.id) - flashSeenCount(b.id));
  return shuffle(cards.slice(0, n));
}

function knowledge(root, ctx) {
  ctx.setTitle('Knowledge');
  const sound = get().settings.sound;
  const start = () => {
    const topic = pickTopic(ctx.query.topic);
    const dom = domainOf(topic.domain);
    const cards = pickCards(topic);
    let i = 0;
    const draw = () => {
      const c = cards[i];
      seeFlash(c.id);
      root.innerHTML = `<div class="learn-wrap">
        ${progressTop(i, cards.length)}
        <div class="learn-card pop">
          <div class="chip-label">${dom.emoji} ${esc(dom.name)}</div>
          <h2>${esc(c.title)}</h2>
          <p class="fact">${esc(c.text)}</p>
          ${c.verify ? '<p class="verify small">Double-check this figure before quoting it.</p>' : ''}
        </div>
        <button class="btn big block" id="next">${i === cards.length - 1 ? 'Quick quiz' : 'Next'}</button>
      </div>`;
      root.querySelector('#next').onclick = () => { beep('tick', sound); if (++i < cards.length) draw(); else quiz(); };
    };
    const quiz = () => {
      activity(cards.length);
      ctx.setTitle('Quick quiz');
      runQuiz(root, flashQuiz(cards), { mode: `flash:${topic.id}`, again: () => { ctx.setTitle('Knowledge'); delete ctx.query.topic; start(); }, home: '#/' });
    };
    draw();
  };
  start();
}

// ---------------- Vocabulary ----------------
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
function lev(a, b) {
  const m = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) m[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return m[a.length][b.length];
}

function pickWords(n = 5) {
  const due = shuffle(DB.words.filter((w) => isDue(w.id))).slice(0, 2);
  const fresh = DB.words.filter((w) => !wordState(w.id));
  const pool = shuffle(fresh.length >= n ? fresh : DB.words);
  const chosen = [...due];
  for (const w of pool) {
    if (chosen.length >= n) break;
    if (chosen.includes(w) || chosen.some((c) => c.base === w.base)) continue; // spread across different base words
    chosen.push(w);
  }
  for (const w of shuffle(DB.words)) { if (chosen.length >= n) break; if (!chosen.includes(w)) chosen.push(w); }
  return shuffle(chosen);
}

// Shared "type it once, flip" card used by words and phrases.
function typeAndFlip(root, { frontHTML, backHTML, answer, tolerance, index, total, onDone, sound }) {
  let tries = 0, flipped = false, ok = false;
  root.innerHTML = `<div class="learn-wrap">
    ${progressTop(index, total)}
    <div class="flash" id="flash"><div class="flash-inner">
      <div class="flash-face">${frontHTML}
        <form id="f" class="type-row" autocomplete="off">
          <input id="inp" type="text" placeholder="Type it once" autocapitalize="off" autocorrect="off" spellcheck="false">
          <button class="btn" type="submit">Check</button>
        </form>
        <div class="small muted" id="hint"></div>
      </div>
      <div class="flash-face back">${backHTML}</div>
    </div></div>
    <div class="row" style="justify-content:center"><button class="btn big" id="next" style="visibility:hidden">${index === total - 1 ? 'Quick quiz' : 'Next'}</button></div>
  </div>`;
  const flash = root.querySelector('#flash');
  const inp = root.querySelector('#inp');
  const hint = root.querySelector('#hint');
  const flip = () => { flipped = !flipped; flash.classList.toggle('flipped', flipped); };
  const done = () => { ok = true; root.querySelector('#next').style.visibility = 'visible'; hint.textContent = ''; setTimeout(flip, 350); beep('good', sound); buzz(20); };
  root.querySelector('#f').onsubmit = (e) => {
    e.preventDefault();
    if (ok) return;
    const typed = norm(inp.value), target = norm(answer);
    if (typed === target || (tolerance && lev(typed, target) <= tolerance)) { inp.disabled = true; inp.classList.add('good'); done(); return; }
    tries++; beep('bad', sound);
    flash.classList.remove('shake'); void flash.offsetWidth; flash.classList.add('shake');
    hint.textContent = tries >= 2 ? 'Almost! Copy it from the card above.' : 'Not quite, check the spelling and try again.';
  };
  flash.addEventListener('click', (e) => { if (ok && !e.target.closest('form')) flip(); });
  root.querySelector('#next').onclick = () => onDone(tries === 0);
  setTimeout(() => inp.focus({ preventScroll: true }), 150);
}

function words(root, ctx) {
  ctx.setTitle('Vocabulary');
  const sound = get().settings.sound;
  const start = () => {
    const set = pickWords();
    let i = 0;
    const draw = () => {
      const w = set[i];
      const re = new RegExp(`\\b(${w.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'i');
      const example = esc(w.example).replace(re, '<mark>$1</mark>');
      typeAndFlip(root, {
        index: i, total: set.length, answer: w.word, tolerance: 0, sound,
        frontHTML: `<div class="from">Instead of <s>${esc(w.base)}</s>, use</div><div class="word">${esc(w.word)}</div>`,
        backHTML: `<div class="word" style="font-size:1.6rem">${esc(w.word)}</div><div class="meaning">${esc(w.meaning)}</div><div class="example">“${example}”</div>`,
        onDone: (firstTry) => { gradeWord(w.id, firstTry); if (++i < set.length) draw(); else quiz(); },
      });
    };
    const quiz = () => {
      activity(set.length * 2);
      ctx.setTitle('Quick quiz');
      runQuiz(root, wordQuiz(set), { mode: 'words', again: () => { ctx.setTitle('Vocabulary'); start(); }, home: '#/' });
    };
    draw();
  };
  start();
}

// ---------------- Phrases ----------------
function pickPhrases(n = 5) {
  const cats = DB.phraseCats.filter((c) => c.quizzable);
  const all = cats.flatMap((c) => c.phrases.map((p) => ({ p, c })));
  const sorted = shuffle(all).sort((a, b) => phraseSeenCount(a.p.id) - phraseSeenCount(b.p.id));
  const chosen = [];
  for (const x of sorted) {
    if (chosen.length >= n) break;
    if (chosen.filter((y) => y.c.id === x.c.id).length >= 2) continue; // variety of situations
    chosen.push(x);
  }
  return shuffle(chosen);
}

function phrases(root, ctx) {
  ctx.setTitle('Phrases');
  const sound = get().settings.sound;
  const start = () => {
    const set = pickPhrases();
    let i = 0;
    const draw = () => {
      const { p, c } = set[i];
      seePhrase(p.id);
      typeAndFlip(root, {
        index: i, total: set.length, answer: p.text, tolerance: 3, sound,
        frontHTML: `<div class="from">${c.emoji || ''} ${esc(c.quizLabel ? c.quizLabel[0].toUpperCase() + c.quizLabel.slice(1) : c.name)}</div><div class="phrase-big">${esc(p.text)}</div>`,
        backHTML: `<div class="from">${c.emoji || ''} ${esc(c.name)}</div><div class="phrase-big">${esc(p.text)}</div>${p.note ? `<div class="meaning">${esc(p.note)}</div>` : ''}<div class="example">Now say it aloud in a sentence of your own.</div>`,
        onDone: () => { if (++i < set.length) draw(); else quiz(); },
      });
    };
    const quiz = () => {
      activity(set.length * 2);
      ctx.setTitle('Quick quiz');
      runQuiz(root, phraseQuiz(set.map((x) => x.p)), { mode: 'phrases', again: () => { ctx.setTitle('Phrases'); start(); }, home: '#/' });
    };
    draw();
  };
  start();
}
