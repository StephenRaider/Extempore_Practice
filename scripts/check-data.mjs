// Validates the editable content in www/data. Run: npm run check
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'www', 'data');
const read = (p) => JSON.parse(readFileSync(join(dir, p), 'utf8'));
const errors = [], warns = [];
const err = (m) => errors.push(m), warn = (m) => warns.push(m);

const { domains } = read('domains.json');
const topics = new Map();
domains.forEach((d) => d.topics.forEach((t) => { topics.set(t.id, d.id); if (!t.prompts?.length) err(`topic ${t.id} has no prompts`); }));
if (domains.length !== 9 || topics.size !== 27) err(`expected 9 domains and 27 topics, found ${domains.length} and ${topics.size}`);

const strip = (s) => s.replace(/\[\[([^|\]]+)(\|[^\]]+)?\]\]/g, '$1').replace(/\{\{([^}]+)\}\}/g, '$1');
let cards = 0, speeches = 0, quiz = 0;
const SECTIONS = new Set(['hook', 'stance', 'point', 'transition', 'conclusion']);
const CARD_TYPES = new Set(['fact', 'example', 'quote', 'sides', 'angle', 'concept']);

for (const d of domains) {
  const c = read(`domains/${d.id}.json`);
  c.cards.forEach((card) => {
    cards++;
    if (topics.get(card.topic) !== d.id) err(`${d.id}: card with bad topic ${card.topic}`);
    if (!CARD_TYPES.has(card.type)) err(`${d.id}: bad card type ${card.type}`);
    if (card.type === 'quote' && !(card.text && card.by)) err(`${d.id}: quote card missing text/by`);
    if (card.type === 'sides' && !(card.pros?.length && card.cons?.length)) err(`${d.id}: sides card needs pros and cons`);
    if (card.type === 'angle' && !(card.open && card.close)) err(`${d.id}: angle card needs open and close`);
  });
  d.topics.forEach((t) => {
    const n = c.cards.filter((x) => x.topic === t.id).length;
    if (n < 6) err(`${t.id}: only ${n} cards (want 6)`);
    const sp = c.speeches.filter((x) => x.topic === t.id);
    if (sp.length !== 1) err(`${t.id}: needs exactly one speech, has ${sp.length}`);
  });
  c.speeches.forEach((s) => {
    speeches++;
    const words = s.sections.reduce((n, x) => n + strip(x.text).split(/\s+/).length, 0);
    if (words < 370 || words > 480) warn(`${s.topic}: speech is ${words} words (target 400–450)`);
    const types = s.sections.map((x) => x.type);
    ['hook', 'stance', 'point', 'conclusion'].forEach((t) => { if (!types.includes(t)) err(`${s.topic}: speech missing a ${t}`); });
    s.sections.forEach((x) => { if (!SECTIONS.has(x.type)) err(`${s.topic}: bad section type ${x.type}`); if ((x.text.match(/\[\[/g) || []).length !== (x.text.match(/\]\]/g) || []).length) err(`${s.topic}: unbalanced [[ ]]`); });
  });
  c.quiz.forEach((q) => {
    quiz++;
    if (!Array.isArray(q.options) || q.options.length !== 4) err(`${d.id}: question needs 4 options: ${q.q}`);
    else if (typeof q.answer !== 'number' || !q.options[q.answer]) err(`${d.id}: bad answer index: ${q.q}`);
    else if (new Set(q.options).size !== 4) err(`${d.id}: duplicate options: ${q.q}`);
  });
}

// Flashcards: short, each with at least one valid question
const kTopics = new Map(read('knowledge.json').topics.map((t) => [t.id, t]));
const { cards: fc } = read('flash.json');
let flash = 0, flashQs = 0;
const fids = new Set();
fc.forEach((card) => {
  flash++;
  if (fids.has(card.id)) err(`duplicate flashcard id ${card.id}`); fids.add(card.id);
  if (!kTopics.has(card.topic)) err(`flashcard ${card.id} has unknown topic ${card.topic}`);
  if (card.text.length > 200) warn(`${card.id}: text is ${card.text.length} chars (keep it short)`);
  if (!card.qs?.length) err(`${card.id}: flashcard needs a question`);
  (card.qs || []).forEach((q) => {
    flashQs++;
    if (q.options.length !== 4 || new Set(q.options).size !== 4 || !q.options[q.answer || 0]) err(`${card.id}: bad question options: ${q.q}`);
  });
});
kTopics.forEach((t) => { if (fc.filter((x) => x.topic === t.id).length < 10) err(`${t.id}: needs at least 10 flashcards`); });
const pcats = read('topics.json').categories;
const promptCount = pcats.reduce((n, c) => n + c.prompts.length, 0);
const cs = read('creative-speeches.json').speeches;
cs.forEach((x) => { ['hook', 'stance', 'point', 'conclusion'].forEach((t) => { if (!x.sections.some((y) => y.type === t)) err(`${x.topic}: missing ${t}`); }); });
if (promptCount < 100) err(`only ${promptCount} speaking prompts`);

const words = read('words.json');
let wordCount = 0; const seen = new Set();
words.groups.forEach((g) => g.alternatives.forEach((w) => {
  wordCount++;
  const key = `${g.base}:${w.word}`; if (seen.has(key)) err(`duplicate word ${key}`); seen.add(key);
  if (!w.meaning || !w.example || !w.tone?.length) err(`word ${w.word} missing fields`);
}));
const phrases = read('phrases.json').categories.reduce((n, c) => n + c.phrases.length, 0);
console.log(`Domains ${domains.length} · topics ${topics.size} · cards ${cards} · flashcards ${flash} (${flashQs} questions) · speaking prompts ${promptCount} · speeches ${speeches} · knowledge questions ${quiz} · words ${wordCount} · phrases ${phrases}`);
warns.forEach((w) => console.warn('warning:', w));
if (errors.length) { errors.forEach((e) => console.error('error:', e)); process.exit(1); }
console.log('Data OK');
