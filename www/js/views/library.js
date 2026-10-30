// The Library: everything that is not the quick daily flow. Names only, no explanations.
import { esc } from '../util.js';
import { DB } from '../data.js';

const ITEMS = [
  ['#/kmenu', '🧠', 'Knowledge cards'],
  ['#/words', '🚀', 'Vocabulary'],
  ['#/phrases', '💬', 'Phrase bank'],
  ['#/speeches', '📜', 'Sample speeches'],
  ['#/quizmenu', '🎯', 'Quiz by topic'],
  ['#/progress', '🌟', 'My progress'],
  ['#/tidbit', '💡', 'Daily tidbit'],
  ['#/settings', '⚙️', 'Settings'],
];

function knowledgeMenu(root, ctx) {
  ctx.setTitle('Knowledge cards');
  const tiles = DB.kTopics.map((t) => [`#/learn/knowledge?topic=${t.id}`, t.emoji, t.name]);
  tiles.push(['#/knowledge', '📰', 'Current affairs reading']);
  root.innerHTML = `<div class="view-inner"><div class="tiles lib">
    ${tiles.map(([href, ico, name]) => `<a class="tile" href="${href}"><span class="ico">${ico}</span><span><div class="name">${esc(name)}</div></span></a>`).join('')}
  </div></div>`;
}

export function render(root, ctx) {
  if (ctx.parts[0] === 'kmenu') return knowledgeMenu(root, ctx);
  ctx.setTitle('Library');
  root.innerHTML = `<div class="view-inner"><div class="tiles lib">
    ${ITEMS.map(([href, ico, name]) => `<a class="tile" href="${href}"><span class="ico">${ico}</span><span><div class="name">${esc(name)}</div></span></a>`).join('')}
  </div></div>`;
}
