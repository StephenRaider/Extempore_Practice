// Builds the quiz pool and rounds. Questions come from:
//  - flashcards (data/flash): each card has 1-2 written questions plus an auto "which fact matches?" question
//  - the longer knowledge library (data/domains/*.json)
//  - Word Upgrade words (meaning, fill-in-the-blank, which word it replaces)
//  - Phrase Bank phrases (which phrase fits, fill-in-the-blank)
import { DB } from './data.js';
import { shuffle, sample, pick } from './util.js';
import { get, isDue, flashSeenCount, phraseSeenCount, wordState } from './store.js';

let pool = null;

const STOP = new Set('about their there which would could should these those where while being other because through before after under between during without against among'.split(' '));

function wordQuestions() {
  const out = [];
  DB.words.forEach((w) => {
    const others = DB.words.filter((o) => o.base !== w.base);
    out.push({
      id: `w-m-${w.id}`, source: 'words', wordId: w.id, type: 'mcq',
      q: `What does “${w.word}” mean?`,
      answer: w.meaning,
      options: sample(others, 3).map((o) => o.meaning),
      explain: `“${w.word}” is an upgrade for “${w.base}”. ${w.example}`,
    });
    // quiz uses a different sentence from the lesson card, so the word is learnt in two contexts
    const quizSentence = w.example2 || w.example;
    const re = new RegExp(`\\b${w.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (re.test(quizSentence)) {
      out.push({
        id: `w-b-${w.id}`, source: 'words', wordId: w.id, type: 'blank',
        q: quizSentence.replace(re, '____'),
        answer: w.word,
        options: sample(others, 3).map((o) => o.word),
        explain: `${w.word}: ${w.meaning}`,
      });
    }
    const bases = shuffle(DB.wordGroups.map((g) => g.base).filter((b) => b !== w.base)).slice(0, 3);
    out.push({
      id: `w-u-${w.id}`, source: 'words', wordId: w.id, type: 'mcq',
      q: `“${w.word}” is a sharper way to say…`,
      answer: w.base,
      options: bases,
      explain: `${w.word}: ${w.meaning}`,
    });
  });
  return out;
}

function phraseQuestions() {
  const out = [];
  const general = DB.phraseCats.filter((c) => c.quizzable);
  const allWords = [...new Set(general.flatMap((c) => c.phrases.flatMap((p) => p.text.toLowerCase().replace(/[^a-z' ]/g, ' ').split(/\s+/)))
    .filter((w) => w.length >= 6 && !STOP.has(w)))];
  general.forEach((c) => {
    c.phrases.forEach((p) => {
      const others = general.filter((o) => o.id !== c.id).flatMap((o) => o.phrases);
      out.push({
        id: `p-${p.id}`, source: 'phrases', phraseId: p.id, type: 'mcq',
        q: `Which phrase works best for: ${c.quizLabel || c.name}?`,
        answer: p.text,
        options: sample(others, 3).map((o) => o.text),
        explain: p.note || `Phrase Bank → ${c.name}.`,
      });
      // fill-in-the-blank: hide one meaningful word of the phrase
      const toks = p.text.split(/\s+/);
      const idx = toks.map((t, i) => ({ t: t.replace(/[^A-Za-z']/g, ''), i })).filter((x) => x.t.length >= 6 && !STOP.has(x.t.toLowerCase()));
      if (toks.length >= 5 && idx.length) {
        const target = idx[Math.floor(idx.length / 2)];
        const answer = target.t;
        const blanked = toks.map((t, i) => (i === target.i ? t.replace(answer, '____') : t)).join(' ');
        const wrong = sample(allWords.filter((w) => w !== answer.toLowerCase() && Math.abs(w.length - answer.length) <= 4), 3);
        out.push({
          id: `p-b-${p.id}`, source: 'phrases', phraseId: p.id, type: 'blank',
          q: blanked, answer, options: wrong,
          explain: `Full phrase: ${p.text}`,
        });
      }
    });
  });
  return out;
}

function flashQuestions() {
  const out = [];
  DB.flash.forEach((c) => {
    c.qs.forEach((q, i) => {
      out.push({
        id: `${c.id}#${i}`, source: 'knowledge', cardId: c.id, topic: c.topic, domain: c.domain,
        type: 'mcq', q: q.q, options: q.options, answer: q.answer || 0,
        explain: `${c.title}: ${c.text}`,
      });
    });
    // "Which fact matches...?" built from sibling cards in the same topic
    const siblings = (DB.flashByTopic[c.topic] || []).filter((o) => o.id !== c.id);
    if (siblings.length >= 3) {
      out.push({
        id: `${c.id}#r`, source: 'knowledge', cardId: c.id, topic: c.topic, domain: c.domain,
        type: 'mcq', q: `Which fact goes with “${c.title}”?`,
        options: [c.text, ...sample(siblings, 3).map((o) => o.text)], answer: 0,
        explain: `${c.title}: ${c.text}`,
      });
    }
  });
  return out;
}

export function getPool() {
  if (!pool) pool = [...flashQuestions(), ...wordQuestions(), ...phraseQuestions()];
  return pool;
}
export const poolSize = () => getPool().length;

// Turn a stored question into a ready-to-show one with shuffled options.
export function prepare(q) {
  let ans;
  let opts;
  if (typeof q.answer === 'number') {
    ans = q.options[q.answer];
    opts = q.options.slice();
  } else {
    ans = q.answer;
    opts = [q.answer, ...q.options.filter((o) => o !== q.answer)];
  }
  opts = shuffle([...new Set(opts)]);
  return { ...q, opts, correct: opts.indexOf(ans), answerText: ans };
}

// Questions answered right 3 times in a row become rare but never vanish; a miss resets them.
const STREAK_W = [1, 0.6, 0.25, 0.06];
function weight(q, s) {
  const st = s.quiz.q[q.id];
  let w = st ? STREAK_W[Math.min(st.k ?? st.r, 3)] : 1;
  if (q.topic) {
    const t = s.topicStats[q.topic];
    if (t && t.w + t.r >= 3) w *= 1 + 2 * (t.w / (t.w + t.r));
  }
  if (q.wordId && isDue(q.wordId)) w += 1;
  return w;
}

function weightedPick(list, n, s) {
  const answered = list.filter((q) => s.quiz.q[q.id]);
  if (answered.length && answered.length < list.length) {
    // about 40% of slots go to questions already answered, so they resurface without a full cycle
    const k = Math.min(answered.length, Math.round(n * 0.4));
    const a = pickByWeight(answered, k, s);
    return [...a, ...pickByWeight(list.filter((q) => !a.includes(q)), n - a.length, s)];
  }
  return pickByWeight(list, n, s);
}
function pickByWeight(list, n, s) {
  const chosen = [];
  const items = list.map((q) => ({ q, w: weight(q, s) }));
  while (chosen.length < n && items.length) {
    const total = items.reduce((a, b) => a + b.w, 0);
    let r = Math.random() * total;
    let i = 0;
    for (; i < items.length - 1; i++) { r -= items[i].w; if (r <= 0) break; }
    chosen.push(items[i].q);
    items.splice(i, 1);
  }
  return chosen;
}

// One question per item (card, word or phrase). Used right after a study set of 5.
function onePer(keyFn, items, qs, s) {
  const round = [];
  items.forEach((it) => {
    const mine = qs.filter((q) => keyFn(q) === it.id);
    if (mine.length) round.push(...weightedPick(mine, 1, s));
  });
  return shuffle(round).map(prepare);
}
export const flashQuiz = (cards) => onePer((q) => q.cardId, cards, getPool(), get());
export const wordQuiz = (words) => {
  // Prefer fill-in-the-blank, as the Vocabulary flow asks for
  const pl = getPool();
  const out = words.map((w) => pl.find((q) => q.id === `w-b-${w.id}`) || pl.find((q) => q.id === `w-m-${w.id}`)).filter(Boolean);
  return shuffle(out).map(prepare);
};
export const phraseQuiz = (phrases) => {
  const pl = getPool();
  const out = phrases.map((p) => pick([pl.find((q) => q.id === `p-${p.id}`), pl.find((q) => q.id === `p-b-${p.id}`)].filter(Boolean))).filter(Boolean);
  return shuffle(out).map(prepare);
};

// mode: 'revision' | 'mixed' | 'words' | 'phrases' | 'review' | 'flash:<topicId>' | <domainId>
export function buildRound(mode = 'revision', n = 5) {
  const s = get();
  const all = getPool();
  const isSeen = (q) => {
    if (q.cardId) return flashSeenCount(q.cardId) > 0;
    if (q.wordId) return !!wordState(q.wordId);
    if (q.phraseId) return phraseSeenCount(q.phraseId) > 0;
    return false;
  };
  let list;
  if (mode === 'revision') {
    list = all.filter(isSeen);
    // Not enough seen yet? Top up with random flashcard questions so the button always works.
    if (list.length < n * 2) list = [...list, ...sample(all.filter((q) => q.cardId && !isSeen(q)), n * 3)];
  } else if (mode === 'words') list = all.filter((q) => q.source === 'words');
  else if (mode === 'phrases') list = all.filter((q) => q.source === 'phrases');
  else if (mode === 'review') list = all.filter((q) => s.quiz.review.includes(q.id));
  else if (mode === 'mixed') list = all;
  else if (mode.startsWith('flash:')) list = all.filter((q) => q.cardId && q.topic === mode.slice(6));
  else list = all.filter((q) => q.domain === mode && (q.cardId || !q.source || q.source === 'knowledge'));

  let round = [];
  if (mode !== 'review') {
    const rv = list.filter((q) => s.quiz.review.includes(q.id));
    round = sample(rv, Math.min(2, rv.length));
  }
  const rest = list.filter((q) => !round.includes(q));
  if (mode === 'revision' || mode === 'mixed') {
    const bySrc = (src) => rest.filter((q) => q.source === src);
    const wantK = Math.ceil((n - round.length) / 2);
    round.push(...weightedPick(bySrc('knowledge'), wantK, s));
    round.push(...weightedPick(bySrc('words'), Math.max(0, Math.min(2, n - round.length - 1)), s));
    round.push(...weightedPick(bySrc('phrases'), n - round.length, s));
    if (round.length < n) round.push(...weightedPick(rest.filter((q) => !round.includes(q)), n - round.length, s));
  } else {
    round.push(...weightedPick(rest, n - round.length, s));
  }
  // avoid two questions about the same card in one round
  const seenCards = new Set();
  round = round.filter((q) => { if (!q.cardId) return true; if (seenCards.has(q.cardId)) return false; seenCards.add(q.cardId); return true; });
  return shuffle(round).slice(0, n).map(prepare);
}

export const randomPrompt = (topicId) => {
  const t = topicId ? DB.topics[topicId] : pick(DB.topicList);
  return { topic: t, prompt: pick(t.prompts) };
};
