// sched-prod incident board. Plan: plan.md (R1–R6). Hooks (data-testid) are pinned by the plan.
import { ack, fetchIncidents } from './api.js';

const $ = (testid) => document.querySelector(`[data-testid="${testid}"]`);
const list = $('incident-list');
const rows = new Map(); // id -> { incident, li }
const acked = new Set();

// R5: the viewer's local time, in the viewer's own order (dd/mm for EU locales); the UTC value stays in datetime.
const fmt = new Intl.DateTimeFormat(undefined, {
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short',
});
const local = (iso) => fmt.format(new Date(iso));

function makeRow(i) {
  const li = document.createElement('li');
  li.dataset.testid = 'incident-row';
  li.setAttribute('data-testid', 'incident-row');
  li.dataset.id = i.id;
  li.className = `row ${i.severity}`;
  const cell = (cls, text) => Object.assign(document.createElement('span'), { className: cls, textContent: text });
  const time = Object.assign(document.createElement('time'), { textContent: local(i.openedAt) });
  time.setAttribute('datetime', i.openedAt);
  const button = Object.assign(document.createElement('button'), { type: 'button', textContent: 'Ack', className: 'ack' });
  button.setAttribute('data-testid', 'ack');
  button.addEventListener('click', () => openConfirm(i));
  li.append(cell('id', i.id), cell('sev', i.severity), cell('what', `${i.service} · ${i.region} · ${i.summary}`), time, button);
  return li;
}

// R2 (changed by product, SCHED-4515): Ack opens a confirm that names the incident. Only the confirm sends the ack
// (api.ack(id)) and marks the row acked. Cancel, Escape or a click outside close it and ack nothing.
let confirmBox = null;
function closeConfirm() {
  confirmBox?.remove();
  confirmBox = null;
}
function openConfirm(i) {
  closeConfirm();
  const el = (tag, props = {}, testid) => {
    const node = Object.assign(document.createElement(tag), props);
    if (testid) node.setAttribute('data-testid', testid);
    return node;
  };
  const backdrop = el('div', { className: 'backdrop' });
  const box = el('div', { className: 'confirm' }, 'confirm');
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-labelledby', 'confirm-title');
  box.dataset.id = i.id;
  const title = el('h2', { id: 'confirm-title', textContent: `Ack ${i.id}?` });
  const what = el('p', { className: 'what', textContent: `${i.service} · ${i.region} · ${i.summary}` });
  const message = el('p', { className: 'error', hidden: true });
  const yes = el('button', { type: 'button', textContent: `Ack ${i.id}`, className: 'primary' }, 'confirm-ack');
  const no = el('button', { type: 'button', textContent: 'Cancel' }, 'confirm-cancel');
  const buttons = el('div', { className: 'buttons' });
  buttons.append(yes, no);
  box.append(title, what, message, buttons);
  backdrop.append(box);
  document.body.append(backdrop);
  confirmBox = backdrop;
  no.addEventListener('click', closeConfirm);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeConfirm(); });
  backdrop.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeConfirm(); });
  yes.addEventListener('click', async () => {
    yes.disabled = no.disabled = true;
    try {
      await ack(i.id);
      acked.add(i.id);
      const row = rows.get(i.id);
      if (row) markAcked(row.li);
      closeConfirm();
    } catch (err) {
      console.error(err);
      message.textContent = `Could not ack ${i.id}. Try again.`;
      message.hidden = false;
      yes.disabled = no.disabled = false;
    }
  });
  yes.focus();
}
function markAcked(li) {
  li.querySelector('[data-testid="ack"]')?.remove();
  if (li.querySelector('[data-testid="acked"]')) return;
  const mark = Object.assign(document.createElement('span'), { className: 'acked', textContent: '✓ acked' });
  mark.setAttribute('data-testid', 'acked');
  li.append(mark);
}

// R1: merge by id, newest first. New rows are inserted at their place; rows already on the board are never moved
// or rebuilt (a moved row counts as a removed row, and the pointer must not be under a row that was rebuilt).
function merge(incidents) {
  const fresh = incidents.filter((i) => !rows.has(i.id)).sort((a, b) => Date.parse(a.openedAt) - Date.parse(b.openedAt));
  for (const i of fresh) {
    const li = makeRow(i);
    if (acked.has(i.id)) markAcked(li);
    const t = Date.parse(i.openedAt);
    let before = null;
    for (const row of list.children) {
      if (Date.parse(rows.get(row.dataset.id).incident.openedAt) < t) { before = row; break; }
    }
    list.insertBefore(li, before);
    rows.set(i.id, { incident: i, li });
  }
  $('empty').hidden = rows.size > 0;
}

// R3: a loader until the first answer.
let loaded = false;
let busy = false;
async function tick() {
  if (busy) return;
  busy = true;
  try {
    const page = await fetchIncidents();
    merge(page.incidents);
    if (!loaded) { loaded = true; $('loader')?.remove(); }
  } catch (err) {
    console.error(err); // keep the loader or the old list; the next tick retries
  } finally {
    busy = false;
  }
}

await tick();
setInterval(tick, 2000); // R4
