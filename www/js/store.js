// On-device progress, saved in localStorage. No accounts, nothing leaves the device.
import { dayKey, addDays } from './util.js';

const KEY = 'extempore.progress.v1';

const fresh = () => ({
  name: '',
  settings: { sound: true, refresherEvery: 1 },
  days: {},            // dayKey -> { xp, acts }
  xp: 0,
  words: {},           // wordId -> { box, due, got, again }
  favPhrases: [],
  favCards: [],
  cardsSeen: {},       // cardId -> 1 (long library cards)
  flashSeen: {},       // flashcard id -> times seen
  phraseSeen: {},      // phrase id -> times seen
  speechesRead: {},    // topicId -> 1
  quiz: { history: [], q: {}, review: [] },  // q: qid -> { r, w }
  topicStats: {},      // topicId -> { r, w }
  practice: [],        // sessions
  lastRefresher: '',
});

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    const s = JSON.parse(raw);
    const base = fresh();
    return { ...base, ...s, settings: { ...base.settings, ...(s.settings || {}) }, quiz: { ...base.quiz, ...(s.quiz || {}) } };
  } catch {
    return fresh();
  }
}
export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage full or blocked */ }
}
export const get = () => state;
export function reset() { state = fresh(); save(); }
export function exportJSON() { return JSON.stringify(state); }
export function importJSON(text) {
  const s = JSON.parse(text);
  if (typeof s !== 'object' || !s.days) throw new Error('Not a progress file');
  localStorage.setItem(KEY, JSON.stringify(s));
  state = load();
}

// ---- Activity, XP and streak ----
export function activity(xp = 1) {
  const k = dayKey();
  const d = state.days[k] || (state.days[k] = { xp: 0, acts: 0 });
  d.xp += xp; d.acts += 1;
  state.xp += xp;
  save();
}
export function streak() {
  let k = dayKey();
  if (!state.days[k]) k = addDays(k, -1);   // today not done yet: streak still alive from yesterday
  let n = 0;
  while (state.days[k]) { n++; k = addDays(k, -1); }
  return n;
}
export const todayXP = () => state.days[dayKey()]?.xp || 0;

// ---- Word Upgrade spaced repetition (Leitner boxes 0..5) ----
const INTERVALS = [0, 1, 2, 4, 8, 16]; // days until next review for each box
export const MASTERED_BOX = 4;
export const wordState = (id) => state.words[id];
export function gradeWord(id, ok) {
  const w = state.words[id] || (state.words[id] = { box: 0, due: dayKey(), got: 0, again: 0 });
  if (ok) { w.box = Math.min(5, w.box + 1); w.got++; } else { w.box = 1; w.again++; }
  w.due = addDays(dayKey(), ok ? INTERVALS[w.box] : 0);
  save();
}
export const isDue = (id) => { const w = state.words[id]; return !!w && w.due <= dayKey(); };
export const isMastered = (id) => (state.words[id]?.box || 0) >= MASTERED_BOX;

// ---- Favourites ----
export function toggleFav(list, id) {
  const arr = state[list];
  const i = arr.indexOf(id);
  if (i >= 0) arr.splice(i, 1); else arr.push(id);
  save();
  return i < 0;
}
export const isFav = (list, id) => state[list].includes(id);

// ---- Flashcards (knowledge) and phrases ----
export function seeFlash(id) { state.flashSeen[id] = (state.flashSeen[id] || 0) + 1; save(); }
export const flashSeenCount = (id) => state.flashSeen[id] || 0;
export function seePhrase(id) { state.phraseSeen[id] = (state.phraseSeen[id] || 0) + 1; save(); }
export const phraseSeenCount = (id) => state.phraseSeen[id] || 0;

// ---- Knowledge & speeches ----
export function seeCard(id) { if (!state.cardsSeen[id]) { state.cardsSeen[id] = 1; activity(1); } }
export function readSpeech(topic) { if (!state.speechesRead[topic]) { state.speechesRead[topic] = 1; activity(5); } }

// ---- Quiz ----
export function recordAnswer(qq, ok) {
  const s = state.quiz.q[qq.id] || (state.quiz.q[qq.id] = { r: 0, w: 0, k: 0 });
  ok ? s.r++ : s.w++;
  s.k = ok ? (s.k || 0) + 1 : 0; // correct-in-a-row streak
  if (qq.topic) {
    const t = state.topicStats[qq.topic] || (state.topicStats[qq.topic] = { r: 0, w: 0 });
    ok ? t.r++ : t.w++;
  }
  const rv = state.quiz.review;
  const i = rv.indexOf(qq.id);
  if (!ok && i < 0) rv.push(qq.id);
  if (ok && i >= 0) rv.splice(i, 1);
  if (qq.wordId && !ok) gradeWord(qq.wordId, false); // missed words come back in Word Upgrade
  save();
}
export function recordRound(score, total, mode) {
  state.quiz.history.push({ d: dayKey(), s: score, t: total, m: mode });
  if (state.quiz.history.length > 200) state.quiz.history.shift();
  if (mode === 'refresher') state.lastRefresher = dayKey();
  activity(score * 2 + 2);
}
export const refresherDue = () => state.lastRefresher !== dayKey() && Object.keys(state.days).length > 0;

// ---- Practice ----
export function recordPractice(session) {
  state.practice.push({ d: dayKey(), ...session });
  if (state.practice.length > 300) state.practice.shift();
  activity(10);
}
