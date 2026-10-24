// Local reminders (Android notifications). Works only inside the app; in a browser everything here is a no-op.
// A daily reminder at the chosen time, plus an evening "save your streak" nudge. Each is skipped on a day you have already practised.
import { get, save, streak } from './store.js';
import { dayKey } from './util.js';

const plugin = () => {
  const cap = window.Capacitor;
  if (!cap?.isNativePlatform?.()) return null;
  return cap.Plugins?.LocalNotifications || null;
};
export const supported = () => !!plugin();

export const defaults = () => ({ on: false, asked: false, time: '18:00', saver: true });
export const prefs = () => { const s = get(); return (s.settings.reminders = { ...defaults(), ...s.settings.reminders }); };

const REMINDERS = [
  ['Time for 5 flashcards', 'A quick round keeps your speaking sharp.'],
  ['Your flamingo is waiting', 'Learn a new word to swap into your next speech.'],
  ['Two minutes, one new idea', 'Open Knowledge and pick up something to talk about.'],
  ['Practise a speech today?', 'Three minutes of speaking beats an hour of thinking.'],
  ['Quick quiz time', 'Questions you answered before are ready to come back.'],
  ['Small steps add up', 'One vocabulary round today, a better speech tomorrow.'],
  ['Ready for a phrase or two?', 'Pick up a new opener or closer for your speeches.'],
];

const at = (offsetDays, hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(); d.setDate(d.getDate() + offsetDays); d.setHours(h, m, 0, 0);
  return d;
};

export async function requestPermission() {
  const P = plugin(); if (!P) return false;
  try {
    let r = await P.checkPermissions();
    if (r.display !== 'granted') r = await P.requestPermissions();
    return r.display === 'granted';
  } catch { return false; }
}

export async function schedule() {
  const P = plugin(); if (!P) return;
  try {
    const pending = await P.getPending();
    if (pending.notifications?.length) await P.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
    const p = prefs();
    if (!p.on) return;
    if ((await P.checkPermissions()).display !== 'granted') return;
    const doneToday = !!get().days[dayKey()];
    const now = Date.now();
    const list = [];
    for (let d = 0; d < 14; d++) {
      const [title, body] = REMINDERS[(new Date().getDate() + d) % REMINDERS.length];
      const when = at(d, p.time);
      if (when.getTime() > now && !(d === 0 && doneToday)) list.push({ id: 100 + d, title, body, schedule: { at: when, allowWhileIdle: true }, smallIcon: 'ic_stat_flamingo', iconColor: '#EC6A9F' });
      if (p.saver) {
        const eve = at(d, '20:30');
        const n = streak();
        if (eve.getTime() > now && !(d === 0 && doneToday) && !(at(d, p.time).getTime() > eve.getTime() - 30 * 60000 && at(d, p.time).getTime() < eve.getTime() + 30 * 60000)) {
          list.push({ id: 200 + d, title: d === 0 && n > 0 ? `Keep your ${n}-day streak` : 'Keep your streak going', body: 'A short round now is enough.', schedule: { at: eve, allowWhileIdle: true }, smallIcon: 'ic_stat_flamingo', iconColor: '#EC6A9F' });
        }
      }
    }
    if (list.length) await P.schedule({ notifications: list });
  } catch { /* notifications are optional */ }
}

// Called after a user's first bit of practice: ask once, then turn reminders on if allowed.
export async function offerOnce() {
  const p = prefs();
  if (!supported() || p.asked) return;
  p.asked = true; save();
  if (await requestPermission()) { p.on = true; save(); await schedule(); }
}

export async function init() {
  window.addEventListener('ep-activity', () => { offerOnce().then(schedule); });
  await schedule();
}
