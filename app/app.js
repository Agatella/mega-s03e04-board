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
  button.addEventListener('click', () => onAck(i.id, button, li));
  li.append(cell('id', i.id), cell('sev', i.severity), cell('what', `${i.service} · ${i.region} · ${i.summary}`), time, button);
  return li;
}

// R2: Ack calls api.ack(id), then the row shows the acked mark. A failed ack leaves the button usable.
async function onAck(id, button, li) {
  button.disabled = true;
  try {
    await ack(id);
    acked.add(id);
    markAcked(li);
  } catch (err) {
    console.error(err);
    button.disabled = false;
  }
}
function markAcked(li) {
  li.querySelector('[data-testid="ack"]')?.remove();
  if (li.querySelector('[data-testid="acked"]')) return;
  const mark = Object.assign(document.createElement('span'), { className: 'acked', textContent: '✓ acked' });
  mark.setAttribute('data-testid', 'acked');
  li.append(mark);
}

// R1: the API answers only what is new after the first page, so merge by id and keep newest first.
function merge(incidents) {
  for (const i of incidents) {
    if (rows.has(i.id)) continue;
    const li = makeRow(i);
    if (acked.has(i.id)) markAcked(li);
    rows.set(i.id, { incident: i, li });
  }
  const sorted = [...rows.values()].sort((a, b) => Date.parse(b.incident.openedAt) - Date.parse(a.incident.openedAt));
  list.append(...sorted.map((r) => r.li)); // moves existing nodes; nothing is rebuilt
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
