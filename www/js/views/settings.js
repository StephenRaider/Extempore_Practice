import { esc, toast, copyText } from '../util.js';
import { get, save, reset, exportJSON, importJSON } from '../store.js';

export function render(root, ctx) {
  ctx.setTitle('Settings');
  const s = get();
  root.innerHTML = `<div class="view-inner stack" style="max-width:640px">
    <div class="card stack">
      <div class="field"><label for="nm"><b>Your name</b> <span class="muted small">(shown on the home screen)</span></label>
        <input type="text" id="nm" maxlength="24" placeholder="Leave empty to hide" value="${esc(s.name)}"></div>
      <div class="switch-row"><label for="snd"><b>Sounds and vibration</b></label><input type="checkbox" id="snd" ${s.settings.sound ? 'checked' : ''}></div>
    </div>
    <div class="card stack">
      <h3>Your data</h3>
      <p class="muted small" style="margin:0">Everything is stored only on this device. You can back up your progress as text and restore it later.</p>
      <div class="row"><button class="btn ghost" id="exp">📋 Copy backup</button><button class="btn ghost" id="imp">📥 Restore from backup</button></div>
      <textarea class="notes hidden" id="box" placeholder="Paste backup text here…"></textarea>
      <button class="btn mint hidden" id="doImp">Restore</button>
      <button class="btn coral" id="rst">Reset all progress</button>
    </div>
    <p class="muted small center">Extempore Prep · works fully offline</p>
  </div>`;
  root.querySelector('#nm').oninput = (e) => { s.name = e.target.value; save(); };
  root.querySelector('#snd').onchange = (e) => { s.settings.sound = e.target.checked; save(); };
  root.querySelector('#exp').onclick = async () => toast((await copyText(exportJSON())) ? 'Backup copied' : 'Could not copy');
  root.querySelector('#imp').onclick = () => { root.querySelector('#box').classList.remove('hidden'); root.querySelector('#doImp').classList.remove('hidden'); };
  root.querySelector('#doImp').onclick = () => {
    try { importJSON(root.querySelector('#box').value); toast('Progress restored'); location.hash = '#/'; } catch (e) { toast('That backup could not be read'); }
  };
  root.querySelector('#rst').onclick = () => {
    if (confirm('Erase all progress, favourites and streak? This cannot be undone.')) { reset(); toast('Progress reset'); location.hash = '#/'; }
  };
}
