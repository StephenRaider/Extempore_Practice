// Loads the editable JSON content in www/data and builds lookup tables.
export const DB = {
  domains: [], topics: {}, topicList: [],
  wordGroups: [], words: [], wordById: {},
  phraseCats: [], phrases: [], phraseById: {},
  cards: [], cardsByTopic: {},
  speeches: {},
  flash: [], flashById: {}, flashByTopic: {}, kTopics: [], kTopicById: {},
  quiz: [],
  drills: {},
  creativeSpeeches: [],
  prompts: [],        // creative speaking prompt categories
};

async function getJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Could not load ${path}`);
  return res.json();
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export async function loadAll() {
  const [domainsFile, wordsFile, phrasesFile, drills, promptsFile, cSpeechFile] = await Promise.all([
    getJSON('data/domains.json'), getJSON('data/words.json'), getJSON('data/phrases.json'), getJSON('data/drills.json'), getJSON('data/topics.json'), getJSON('data/creative-speeches.json'),
  ]);

  DB.domains = domainsFile.domains;
  const contents = await Promise.all(DB.domains.map((d) => getJSON(`data/domains/${d.id}.json`)));
  const [kFile, flashFile] = await Promise.all([getJSON('data/knowledge.json'), getJSON('data/flash.json')]);
  DB.kTopics = kFile.topics;
  DB.kTopics.forEach((t) => { DB.kTopicById[t.id] = t; });
  flashFile.cards.forEach((card) => {
    DB.flash.push(card);
    DB.flashById[card.id] = card;
    (DB.flashByTopic[card.topic] ||= []).push(card);
  });

  DB.domains.forEach((d, di) => {
    d.topics.forEach((t, ti) => {
      t.domain = d.id;
      t.letter = String.fromCharCode(97 + ti);
      DB.topics[t.id] = t;
      DB.topicList.push(t);
    });
    const c = contents[di];
    (c.cards || []).forEach((card, i) => {
      card.id = card.id || `${card.topic}-c${i}`;
      card.domain = d.id;
      DB.cards.push(card);
      (DB.cardsByTopic[card.topic] ||= []).push(card);
    });
    (c.speeches || []).forEach((s) => { s.domain = d.id; DB.speeches[s.topic] = s; });
    (c.quiz || []).forEach((q, i) => {
      q.id = q.id || `${d.id}-q${i}`;
      q.domain = d.id;
      q.source = 'knowledge';
      DB.quiz.push(q);
    });
  });

  DB.wordGroups = wordsFile.groups;
  DB.wordGroups.forEach((g) => {
    g.alternatives.forEach((w) => {
      w.id = `${slug(g.base)}:${slug(w.word)}`;
      w.base = g.base;
      DB.words.push(w);
      DB.wordById[w.id] = w;
    });
  });

  DB.phraseCats = phrasesFile.categories;
  DB.phraseCats.forEach((c) => {
    c.phrases = c.phrases.map((p) => (typeof p === 'string' ? { text: p } : p));
    c.phrases.forEach((p) => {
      p.id = `${c.id}:${slug(p.text).slice(0, 48)}`;
      p.cat = c.id;
      DB.phrases.push(p);
      DB.phraseById[p.id] = p;
    });
  });

  DB.drills = drills;
  DB.prompts = promptsFile.categories;
  DB.creativeSpeeches = cSpeechFile.speeches;
  DB.creativeSpeeches.forEach((sp) => { DB.speeches[sp.topic] = sp; });
  return DB;
}

export const domainOf = (id) => DB.domains.find((d) => d.id === id);
export const topicName = (id) => DB.topics[id]?.title || id;
