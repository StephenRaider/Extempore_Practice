// Practice Speaking: random topic -> prep timer -> speaking timer (with optional recording) -> playback + self-rating.
import { esc, pick, sample, fmtTime, beep, buzz, confetti, toast } from '../util.js';
import { DB, domainOf } from '../data.js';
import { get, recordPractice, save } from '../store.js';
import { frameworkHTML } from './common.js';

const MODES = {
  full: { name: 'Full extempore', ico: '🎤', prep: 60, speak: 180, desc: 'Prepare, then speak.',
    rate: ['Strong hook in the first 15 seconds', 'Clear stance stated early', 'Organised points (first, second, finally)', 'At least one concrete example or fact', 'Conclusion that ties back to the hook', 'Used upgrade words / varied vocabulary', 'Steady pace, few “umm”s and fillers'] },
  stretch: { name: '1-minute stretch', ico: '⚡', prep: 15, speak: 60, desc: 'An unusual one-word prompt. 15 s prep, 60 s talk. Builds fluency.',
    rate: ['Started within 5 seconds', 'Kept talking the full minute', 'Found a fresh angle', 'Used an example or story', 'Ended on a clear final line'] },
  opening: { name: 'Opening drill', ico: '🎣', prep: 20, speak: 30, desc: 'Practise just the hook + stance for a topic.',
    rate: ['Hook grabbed attention (question, fact, story or quote)', 'Stance was clear in one sentence', 'Previewed my points', 'Confident first words, no “so…”'] },
  transition: { name: 'Transition drill', ico: '🔗', prep: 15, speak: 30, desc: 'Link two points smoothly using a signpost phrase.',
    rate: ['Summed up the first point in a line', 'Used a signpost phrase', 'Introduced the second point clearly', 'Sounded natural, not abrupt'] },
  closing: { name: 'Closing drill', ico: '🎬', prep: 20, speak: 30, desc: 'Practise a memorable conclusion for a topic.',
    rate: ['Signalled the ending (“To conclude…”)', 'Summed up my points', 'Ended with a call to action, quote or image', 'Final line was strong and short'] },
};
const LENGTHS = [[120, '2 min'], [180, '3 min'], [240, '4 min']];
const PREPS = [[15, '15 s'], [30, '30 s'], [45, '45 s'], [60, '1 min']];

function newPrompt(mode, domain = '') {
  if (mode === 'stretch') return { text: pick(DB.drills.stretch), label: 'One-word prompt' };
  if (mode === 'transition') {
    const p = pick(DB.drills.transitions);
    return { text: `From: “${p.from}”\nTo: “${p.to}”`, label: 'Link these two points', from: p.from, to: p.to };
  }
  // 'affairs:<domain>' = current-affairs topics from the knowledge library; otherwise creative prompts
  if (domain.startsWith('affairs')) {
    const dom = domain.split(':')[1];
    const t = pick(dom ? DB.topicList.filter((x) => x.domain === dom) : DB.topicList);
    return { text: pick(t.prompts), topic: t.id, label: `${domainOf(t.domain).emoji} ${domainOf(t.domain).name}` };
  }
  const cats = domain ? DB.prompts.filter((c) => c.id === domain) : DB.prompts;
  const c = pick(cats);
  return { text: pick(c.prompts), label: `${c.emoji} ${c.name}` };
}

export function render(root, ctx) {
  ctx.setTitle('Practice Speaking');
  const s = get();
  const pref = s.practicePrefs || (s.practicePrefs = { mode: 'full', speak: 180, prep: 60, challenge: false, record: true, domain: '' });
  if (!pref.prep) pref.prep = 60;
  if (DB.domains.some((d) => d.id === pref.domain)) pref.domain = ''; // old saved setting from before creative topics
  const presetTopic = ctx.query.topic && DB.topics[ctx.query.topic];
  if (presetTopic) { pref.mode = ['full', 'opening', 'closing'].includes(pref.mode) ? pref.mode : 'full'; }
  let prompt = ctx.query.p ? { text: ctx.query.p, label: '✨ Your topic' } : presetTopic ? { text: pick(presetTopic.prompts), topic: presetTopic.id, label: `${domainOf(presetTopic.domain).emoji} ${domainOf(presetTopic.domain).name}` } : newPrompt(pref.mode, pref.domain);
  let challengeWords = sample(DB.words, 3);
  let cleanupRun = null;

  const prepFor = () => (pref.mode === 'full' ? pref.prep : MODES[pref.mode].prep);
  const speakFor = () => (pref.mode === 'full' ? pref.speak : MODES[pref.mode].speak);

  const drawSetup = () => {
    root.innerHTML = `<div class="view-inner practice-setup">
      <div class="chips center-chips">
        ${Object.entries(MODES).map(([id, mm]) => `<button class="chip ${pref.mode === id ? 'on' : ''}" data-mode="${id}">${mm.ico} ${mm.name}</button>`).join('')}
      </div>
      <div class="topic-box">
        <div class="t-domain">${esc(prompt.label)}</div>
        <div class="t-text" style="white-space:pre-line">${esc(prompt.text)}</div>
        <button class="btn ghost" id="reroll" style="margin-top:10px">New topic</button>
      </div>
      ${pref.mode === 'full' && pref.challenge ? `<div class="challenge center">${challengeWords.map((w) => `<span class="pill">${esc(w.word)}</span>`).join('')}</div>` : ''}
      <button class="btn pink big block" id="go">Start · ${fmtTime(prepFor())} prep, ${fmtTime(speakFor())} speak</button>
      <details class="options">
        <summary>Options</summary>
        <div class="stack" style="margin-top:12px">
          ${pref.mode === 'full' ? `
          <div class="field"><b class="small">Prep time</b><div class="chips">${PREPS.map(([v, l]) => `<button class="chip ${pref.prep === v ? 'on' : ''}" data-prep="${v}">${l}</button>`).join('')}</div></div>
          <div class="field"><b class="small">Speaking time</b><div class="chips">${LENGTHS.map(([v, l]) => `<button class="chip ${pref.speak === v ? 'on' : ''}" data-len="${v}">${l}</button>`).join('')}</div></div>
          <div class="switch-row"><label for="chal"><b>Use 3 upgrade words</b></label><input type="checkbox" id="chal" ${pref.challenge ? 'checked' : ''}></div>
          <div class="field"><b class="small">Topic type</b><div class="chips">
            <button class="chip ${!pref.domain ? 'on' : ''}" data-dom="">Any</button>
            ${DB.prompts.map((c) => `<button class="chip ${pref.domain === c.id ? 'on' : ''}" data-dom="${c.id}">${c.emoji} ${esc(c.name)}</button>`).join('')}
            <button class="chip ${pref.domain.startsWith('affairs') ? 'on' : ''}" data-dom="affairs">🌍 Current affairs</button></div></div>` : ''}
          <div class="switch-row"><label for="rec"><b>Record myself</b></label><input type="checkbox" id="rec" ${pref.record ? 'checked' : ''}></div>
        </div>
      </details>
    </div>`;

    root.querySelectorAll('[data-mode]').forEach((b) => b.onclick = () => { pref.mode = b.dataset.mode; prompt = newPrompt(pref.mode, pref.domain); save(); drawSetup(); });
    root.querySelectorAll('[data-len]').forEach((b) => b.onclick = () => { pref.speak = +b.dataset.len; save(); keepOpen(); });
    root.querySelectorAll('[data-prep]').forEach((b) => b.onclick = () => { pref.prep = +b.dataset.prep; save(); keepOpen(); });
    root.querySelectorAll('[data-dom]').forEach((b) => b.onclick = () => { pref.domain = b.dataset.dom; prompt = newPrompt(pref.mode, pref.domain); save(); keepOpen(); });
    const chal = root.querySelector('#chal'); if (chal) chal.onchange = () => { pref.challenge = chal.checked; save(); keepOpen(); };
    const rec = root.querySelector('#rec'); if (rec) rec.onchange = () => { pref.record = rec.checked; save(); };
    root.querySelector('#reroll').onclick = () => { prompt = newPrompt(pref.mode, pref.domain); drawSetup(); };
    root.querySelector('#go').onclick = () => { cleanupRun = run(); };
  };
  // Redraw while keeping the Options panel open.
  const keepOpen = () => { drawSetup(); root.querySelector('details.options').open = true; };

  // ---------------- Run ----------------
  const run = () => {
    const m = MODES[pref.mode];
    const speakSecs = speakFor();
    const sound = get().settings.sound;
    const useChallenge = pref.mode === 'full' && pref.challenge;
    let raf = 0, stream = null, recorder = null, chunks = [], audioUrl = null, stopped = false;
    let notes = '';
    const used = new Set();

    const ringHTML = (phase) => `<div class="timer-wrap"><div class="ring" id="ring">
      <svg viewBox="0 0 120 120"><circle class="track" cx="60" cy="60" r="52" fill="none" stroke-width="10"/>
      <circle class="prog" id="prog" cx="60" cy="60" r="52" fill="none" stroke-width="10" stroke-dasharray="326.7" stroke-dashoffset="0"/></svg>
      <div class="label"><div><div class="time" id="time">0:00</div><div class="phase">${phase}</div></div></div></div></div>`;

    const promptBox = () => `<div class="topic-box"><div class="t-domain">${esc(prompt.label)}</div><div class="t-text" style="white-space:pre-line">${esc(prompt.text)}</div></div>`;
    const challengeHTML = () => useChallenge ? `<div class="challenge" id="chal">${challengeWords.map((w, i) => `<button class="pill ${used.has(i) ? 'used' : ''}" data-w="${i}" style="border:none;cursor:pointer" title="${esc(w.meaning)}">${esc(w.word)}</button>`).join('')}</div>
      <p class="small muted center" style="margin:6px 0 0">Tap a word once you've used it</p>` : '';

    const countdown = (secs, onTick, onDone) => {
      const t0 = performance.now();
      let lastWhole = -1;
      const step = () => {
        if (stopped) return;
        const el = (performance.now() - t0) / 1000;
        const left = secs - el;
        const prog = root.querySelector('#prog'), time = root.querySelector('#time');
        if (prog) prog.setAttribute('stroke-dashoffset', String(326.7 * Math.min(1, el / secs)));
        if (time) time.textContent = fmtTime(left);
        const whole = Math.ceil(left);
        if (whole !== lastWhole) { lastWhole = whole; onTick?.(left, el); }
        if (left <= 0) { onDone(); return; }
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
      return () => cancelAnimationFrame(raf);
    };

    const tips = {
      full: 'Jot: hook idea → your stance → 2–3 points with one example each → closing line.',
      stretch: 'Think of one angle: a memory, a lesson, or a surprising link to life.',
      opening: 'Pick a hook type: a question, a striking fact, a short story or a quote. Then one-line stance.',
      transition: 'Summarise point 1 in a line, then use a signpost: “Building on this…”, “Equally important…”, “On the other hand…”.',
      closing: 'Signal the end, recap in one breath, finish with a call to action, quote or image.',
    };

    const prep = () => {
      root.innerHTML = `<div class="view-inner"><div class="practice-grid">
        <div class="stack">${promptBox()}${ringHTML('Prepare')}<button class="btn pink big block" id="skip">I'm ready, start speaking ▶</button></div>
        <div class="stack">
          <div class="card flat"><b>Plan</b><p class="small muted" style="margin:4px 0 8px">${esc(tips[pref.mode])}</p>${frameworkHTML()}</div>
          ${useChallenge ? `<div class="card flat center"><b>Use these words</b>${challengeHTML()}</div>` : ''}
          ${pref.mode === 'transition' ? `<div class="card flat"><b>Signpost phrases</b><ul class="small" style="margin:6px 0 0;padding-left:20px">${sample(DB.phraseCats.find((c) => c.id === 'transitions')?.phrases || [], 4).map((p) => `<li>${esc(p.text)}</li>`).join('')}</ul></div>` : ''}
          ${pref.mode === 'opening' ? `<div class="card flat"><b>Opening lines to borrow</b><ul class="small" style="margin:6px 0 0;padding-left:20px">${sample(DB.phraseCats.find((c) => c.id === 'openings')?.phrases || [], 4).map((p) => `<li>${esc(p.text)}</li>`).join('')}</ul></div>` : ''}
          ${pref.mode === 'closing' ? `<div class="card flat"><b>Closing lines to borrow</b><ul class="small" style="margin:6px 0 0;padding-left:20px">${sample(DB.phraseCats.find((c) => c.id === 'conclusions')?.phrases || [], 4).map((p) => `<li>${esc(p.text)}</li>`).join('')}</ul></div>` : ''}
          <textarea class="notes" id="notes" placeholder="Quick notes (optional)…"></textarea>
        </div></div></div>`;
      root.querySelector('#notes').oninput = (e) => { notes = e.target.value; };
      bindChallenge();
      beep('start', sound);
      const stop = countdown(prepFor(), (left) => { if (left <= 3.5 && left > 0.5) beep('tick', sound); }, () => speak());
      root.querySelector('#skip').onclick = () => { stop(); speak(); };
    };

    const bindChallenge = () => {
      root.querySelectorAll('[data-w]').forEach((b) => b.onclick = () => {
        const i = +b.dataset.w;
        used.has(i) ? used.delete(i) : used.add(i);
        b.classList.toggle('used', used.has(i));
        buzz(15);
      });
    };

    const startRecording = async () => {
      if (!pref.record) return;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (stopped) { stream.getTracks().forEach((t) => t.stop()); return; }
        recorder = new MediaRecorder(stream);
        chunks = [];
        recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
        recorder.start();
        const ri = root.querySelector('#recInd'); if (ri) ri.innerHTML = '<span class="rec-dot"></span> Recording';
      } catch (e) {
        const ri = root.querySelector('#recInd'); if (ri) ri.textContent = '🎙️ Microphone not available, timing only';
      }
    };
    const stopRecording = () => new Promise((resolve) => {
      if (!recorder || recorder.state === 'inactive') { stream?.getTracks().forEach((t) => t.stop()); resolve(null); return; }
      recorder.onstop = () => {
        stream?.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        resolve(blob.size ? blob : null);
      };
      recorder.stop();
    });

    const cueFor = (frac) => {
      if (pref.mode !== 'full') return { opening: 'Hook, then your stance', transition: 'Wrap point 1 → signpost → point 2', closing: 'Signal, recap, final line', stretch: 'Keep going: angle, example, final line' }[pref.mode];
      if (frac < 0.12) return '🎣 Hook: grab their attention';
      if (frac < 0.22) return '📍 Stance: say clearly where you stand';
      if (frac < 0.45) return '1️⃣ First point + example';
      if (frac < 0.68) return '2️⃣ Second point + example';
      if (frac < 0.84) return '3️⃣ Third point, or the other side';
      return '🎬 Conclude: tie back to your hook';
    };

    let speakStart = 0;
    const speak = () => {
      cancelAnimationFrame(raf);
      speakStart = performance.now();
      root.innerHTML = `<div class="view-inner"><div class="practice-grid">
        <div class="stack">${ringHTML('Speak')}<div class="cue" id="cue"></div>
          <div class="center small muted" id="recInd">${pref.record ? 'Starting microphone…' : ''}</div>
          <button class="btn coral big block" id="finish">■ Finish</button></div>
        <div class="stack">${promptBox()}
          ${useChallenge ? `<div class="card flat center"><b>Challenge words</b>${challengeHTML()}</div>` : ''}
          ${notes ? `<div class="card flat"><b>Your notes</b><p class="small" style="white-space:pre-line;margin:6px 0 0">${esc(notes)}</p></div>` : ''}
          <div class="card flat">${frameworkHTML()}</div>
        </div></div></div>`;
      bindChallenge();
      beep('start', sound); buzz(60);
      startRecording();
      const stop = countdown(speakSecs, (left, el) => {
        root.querySelector('#cue').textContent = cueFor(el / speakSecs);
        if (Math.round(left) === 30 && speakSecs > 60) { beep('tick', sound); buzz(40); }
        if (left <= 15) root.querySelector('#ring')?.classList.add('warn');
      }, () => review());
      root.querySelector('#finish').onclick = () => { stop(); review(); };
    };

    const review = async () => {
      cancelAnimationFrame(raf);
      const spoke = Math.round((performance.now() - speakStart) / 1000);
      beep('end', sound); buzz(80);
      root.innerHTML = `<div class="view-inner center"><div class="card">Saving your recording…</div></div>`;
      const blob = await stopRecording();
      if (stopped) return;
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      audioUrl = blob ? URL.createObjectURL(blob) : null;
      const ratings = {};
      root.innerHTML = `<div class="view-inner"><div class="practice-grid">
        <div class="stack">
          <div class="card center pop"><div style="font-size:54px">🎉</div><h2>Nice work!</h2>
            <p class="muted" style="margin:4px 0 0">You spoke for ${fmtTime(spoke)} on:</p><p><b style="white-space:pre-line">${esc(prompt.text)}</b></p>
            ${useChallenge ? `<p class="small">Challenge words used: <b>${used.size}/3</b></p>` : ''}</div>
          <div class="card"><h3>🎧 Listen back</h3>${audioUrl ? `<audio controls src="${audioUrl}"></audio><p class="small muted" style="margin:6px 0 0">Listen for fillers, pace, and whether your stance is clear.</p>` : `<p class="muted small" style="margin:0">No recording this time. Turn on “Record myself” to hear yourself back.</p>`}</div>
        </div>
        <div class="stack">
          <div class="card"><h3>Rate yourself honestly</h3><div class="checklist" style="margin-top:10px">
            ${m.rate.map((r, i) => `<label data-i="${i}"><input type="checkbox" data-r="${i}"> ${esc(r)}</label>`).join('')}
          </div><div class="small muted" id="score"></div></div>
          <button class="btn mint big block" id="saveBtn">Save session</button>
        </div></div></div>`;
      root.querySelectorAll('[data-r]').forEach((cb) => cb.onchange = () => {
        ratings[cb.dataset.r] = cb.checked;
        cb.closest('label').classList.toggle('on', cb.checked);
        const n = Object.values(ratings).filter(Boolean).length;
        root.querySelector('#score').textContent = `${n}/${m.rate.length} ticked`;
      });
      root.querySelector('#saveBtn').onclick = () => {
        const n = Object.values(ratings).filter(Boolean).length;
        recordPractice({ mode: pref.mode, topic: prompt.topic || null, prompt: prompt.text, secs: spoke, score: n, of: m.rate.length, words: useChallenge ? used.size : null, missed: m.rate.filter((_, i) => !ratings[i]) });
        confetti(); beep('done', sound);
        toast('+10 XP · session saved');
        afterSave(n);
      };
    };

    const afterSave = (n) => {
      const weakest = MODES[pref.mode].rate.filter((_, i) => !root.querySelector(`[data-r="${i}"]`)?.checked);
      root.innerHTML = `<div class="view-inner" style="max-width:640px"><div class="card center stack pop">
        <div style="font-size:60px">🌟</div><h2>Session saved</h2>
        <p class="muted">${n}/${MODES[pref.mode].rate.length} on your checklist.${weakest.length ? ` Next time focus on: <b>${esc(weakest[0])}</b>.` : ' A perfect self-check!'}</p>
        <div class="row" style="justify-content:center">
          <button class="btn pink" id="again">🎲 New topic</button>
          <button class="btn ghost" id="same">↺ Same topic again</button>
          <a class="btn ghost" href="#/">Home</a>
        </div></div></div>`;
      root.querySelector('#again').onclick = () => { prompt = newPrompt(pref.mode, pref.domain); challengeWords = sample(DB.words, 3); cleanupRun?.(); cleanupRun = run(); };
      root.querySelector('#same').onclick = () => { cleanupRun?.(); cleanupRun = run(); };
    };

    prep();
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      try { if (recorder && recorder.state !== 'inactive') recorder.stop(); } catch { /* ignore */ }
      stream?.getTracks().forEach((t) => t.stop());
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  };

  drawSetup();
  return () => cleanupRun?.();
}
