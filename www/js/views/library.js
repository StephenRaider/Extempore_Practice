// The Library: everything that is not the quick daily flow. Names only, no explanations.
import { esc } from '../util.js';
import { DB } from '../data.js';

const ITEMS = [
  ['#/knowledge', '🧠', 'Knowledge cards'],
  ['#/words', '🚀', 'Vocabulary'],
  ['#/phrases', '💬', 'Phrase bank'],
  ['#/speeches', '📜', 'Sample speeches'],
  ['#/quizmenu', '🎯', 'Quiz by topic'],
  ['#/progress', '🌟', 'My progress'],
  ['#/tidbit', '💡', 'Daily tidbit'],
  ['#/settings', '⚙️', 'Settings'],
];

export function render(root, ctx) {
  ctx.setTitle('Library');
  root.innerHTML = `<div class="view-inner"><div class="tiles lib">
    ${ITEMS.map(([href, ico, name]) => `<a class="tile" href="${href}"><span class="ico">${ico}</span><span><div class="name">${esc(name)}</div></span></a>`).join('')}
  </div></div>`;
}
