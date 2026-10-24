// Builds the quiz pool: hand-written knowledge questions (data/domains/*.json)
// plus questions generated from the Word Upgrade and Phrase Bank data.
import { DB } from './data.js';
import { shuffle, sample, pick } from './util.js';
import { get, isDue } from './store.js';

let pool = null;

function wordQuestions() {
  const out = [];
  DB.words.forEach((w) => {
    const others = DB.words.filter((o) => o.base !== w.base);
    // Meaning question
    out.push({
      id: `w-m-${w.id}`, source: 'words', wordId: w.id, type: 'mcq',
      q: `What does “${w.word}” mean?`,
      answer: w.meaning,
      options: sample(others, 3).map((o) => o.meaning),
      explain: `“${w.word}” is an upgrade for “${w.base}”. ${w.example}`,
    });
    // Fill in the blank, using the example sentence
    const re = new RegExp(`\\b${w.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (re.test(w.example)) {
      out.push({
        id: `w-b-${w.id}`, source: 'words', wordId: w.id, type: 'blank',
        q: w.example.replace(re, '____'),
        answer: w.word,
        options: sample(others, 3).map((o) => o.word),
        explain: `${w.word}: ${w.meaning}`,
      });
    }
    // Which everyday word does it replace?
    const bases = shuffle(DB.wordGroups.map((g) => g.base).filter((b) => b !== w.base && !(w.notFor || []).includes(b))).slice(0, 3);
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
  general.forEach((c) => {
    c.phrases.forEach((p) => {
      const others = general.filter((o) => o.id !== c.id).flatMap((o) => o.phrases);
      out.push({
        id: `p-${p.id}`, source: 'phrases', type: 'mcq',
        q: `Which phrase works best for: ${c.quizLabel || c.name}?`,
        answer: p.text,
        options: sample(others, 3).map((o) => o.text),
        explain: p.note || `Find it in Phrase Bank → ${c.name}.`,
      });
    });
  });
  return out;
}

export function getPool() {
  if (!pool) pool = [...DB.quiz, ...wordQuestions(), ...phraseQuestions()];
  return pool;
}
export const poolSize = () => getPool().length;

// Turn a stored question into a ready-to-show one with shuffled options.
export function prepare(q) {
  let opts;
  let ans;
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

function weight(q, s) {
  const st = s.quiz.q[q.id];
  let w = st ? 1 : 1.6;                     // unseen questions a bit more often
  if (st && st.w > st.r) w += 2;            // still getting it wrong
  if (q.topic) {
    const t = s.topicStats[q.topic];
    if (t && t.w + t.r >= 3) w += 3 * (t.w / (t.w + t.r)); // weak topics come back more
  }
  if (q.wordId && isDue(q.wordId)) w += 1.5;
  if (st && st.r >= 3 && st.w === 0) w *= 0.3; // well known
  return w;
}

function weightedPick(list, n, s) {
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

// mode: 'mixed' | 'words' | 'phrases' | 'review' | 'refresher' | <domainId>
export function buildRound(mode = 'mixed', n = 5) {
  const s = get();
  const all = getPool();
  let list;
  if (mode === 'words') list = all.filter((q) => q.source === 'words');
  else if (mode === 'phrases') list = all.filter((q) => q.source === 'phrases');
  else if (mode === 'review') list = all.filter((q) => s.quiz.review.includes(q.id));
  else if (mode === 'mixed' || mode === 'refresher') list = all;
  else list = all.filter((q) => q.domain === mode);

  let round = [];
  if (mode !== 'review') {
    // Up to 2 questions from the review queue (things missed before)
    const rv = list.filter((q) => s.quiz.review.includes(q.id));
    round = sample(rv, Math.min(2, rv.length));
  }
  const rest = list.filter((q) => !round.includes(q));
  if (mode === 'mixed' || mode === 'refresher') {
    // Keep a healthy mix of words, phrases and knowledge
    const bySrc = (src) => rest.filter((q) => q.source === src);
    const wantK = Math.max(0, Math.ceil((n - round.length) / 2));
    round.push(...weightedPick(bySrc('knowledge'), wantK, s));
    round.push(...weightedPick(bySrc('words'), Math.max(0, n - round.length - 1), s));
    round.push(...weightedPick(bySrc('phrases'), n - round.length, s));
    if (round.length < n) round.push(...weightedPick(rest.filter((q) => !round.includes(q)), n - round.length, s));
  } else {
    round.push(...weightedPick(rest, n - round.length, s));
  }
  return shuffle(round).slice(0, n).map(prepare);
}

export const randomPrompt = (topicId) => {
  const t = topicId ? DB.topics[topicId] : pick(DB.topicList);
  return { topic: t, prompt: pick(t.prompts) };
};
