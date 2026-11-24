// End-to-end check of the plan's requirements against a served board and the real incident API.
//   node test/e2e.mjs <board url> <expected build sha>
import { chromium } from 'playwright';
const [url, sha] = [process.argv[2] ?? 'http://localhost:8123/', process.argv[3] ?? 'dev'];
const tid = (id) => `[data-testid="${id}"]`;
let failed = 0;
const ok = (name, cond, extra = '') => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${name} ${extra}`); if (!cond) failed++; };
const browser = await chromium.launch({ channel: 'chrome' });

// R3 loader, R1 order, R6 sha, R2 ack, R4 refresh
{
  const ctx = await browser.newContext({ locale: 'en-GB', timezoneId: 'Europe/Warsaw' });
  const page = await ctx.newPage();
  const logs = []; page.on('console', (m) => logs.push(m.text()));
  let delayed = false;
  await page.route('**/incidents?*', async (route) => {
    const u = new URL(route.request().url());
    if (!u.searchParams.has('since') && !delayed) { delayed = true; await new Promise((r) => setTimeout(r, 1500)); return route.continue(); }
    if (u.searchParams.has('since') && !globalThis.injected) { // a live arrival: one newer incident after the first page
      globalThis.injected = true;
      const real = await route.fetch(); // keep the real cursor (the ack needs it) and add one newer incident
      const body = await real.json();
      body.incidents = [{ id: 'INC-LIVE-1', service: 'auth', region: 'eu-west', summary: 'live arrival', severity: 'sev1', openedAt: new Date(Date.now() + 60000).toISOString() }, ...body.incidents];
      return route.fulfill({ response: real, json: body });
    }
    return route.continue();
  });
  await page.addInitScript(() => {
    window.__rowsRemoved = 0;
    new MutationObserver((rs) => { for (const r of rs) for (const n of r.removedNodes) if (n.nodeType === 1 && (n.matches?.('[data-testid="incident-row"]') || n.querySelector?.('[data-testid="incident-row"]'))) window.__rowsRemoved++; }).observe(document, { childList: true, subtree: true });
  });
  await page.goto(url);
  ok('R3 loader shows on open', await page.locator(tid('loader')).isVisible());
  await page.locator(tid('incident-row')).first().waitFor({ timeout: 15000 });
  ok('R3 loader gone once incidents load', (await page.locator(tid('loader')).count()) === 0);
  ok('R6 meta build is the sha', (await page.locator('meta[name="build"]').getAttribute('content')) === sha);
  ok('R6 footer shows the same sha', (await page.locator(tid('build-sha')).textContent()) === sha);
  const times = await page.locator(`${tid('incident-row')} time`).evaluateAll((els) => els.map((e) => Date.parse(e.getAttribute('datetime'))));
  ok('R1 newest first', times.every((t, i) => i === 0 || times[i - 1] >= t), `(${times.length} rows)`);
  await page.waitForTimeout(2600);
  ok('R1 live arrival lands on top', (await page.locator(`${tid('incident-row')}`).first().getAttribute('data-id')) === 'INC-LIVE-1');
  const count1 = await page.locator(tid('incident-row')).count();
  const row = page.locator(`${tid('incident-row')}[data-id="INC-LIVE-1"]`);
  const target = page.locator(tid('incident-row')).nth(1);
  const targetId = await target.getAttribute('data-id');
  // R2 (SCHED-4515): Ack opens a confirm that names the incident; cancel acks nothing
  const before = logs.filter((l) => l.startsWith('ack ')).length;
  await target.locator(tid('ack')).click();
  ok('R2 Ack opens a confirm naming the incident', (await page.locator(tid('confirm')).innerText()).includes(targetId));
  await page.locator(tid('confirm-cancel')).click();
  ok('R2 Cancel closes it and acks nothing', (await page.locator(tid('confirm')).count()) === 0 && (await target.locator(tid('acked')).count()) === 0 && logs.filter((l) => l.startsWith('ack ')).length === before);
  await target.locator(tid('ack')).click();
  await page.keyboard.press('Escape');
  ok('R2 Escape closes it', (await page.locator(tid('confirm')).count()) === 0);
  await target.locator(tid('ack')).click();
  await page.locator(tid('confirm-ack')).click();
  await target.locator(tid('acked')).waitFor({ timeout: 10000 });
  ok('R2 confirm-ack marks the row acked', true, targetId);
  ok('R2 the receipt is logged', logs.some((l) => l.startsWith('ack ') && l.includes(targetId)));
  await page.waitForTimeout(4500);
  ok('R4 rows stay after more refreshes', (await page.locator(tid('incident-row')).count()) >= count1);
  ok('R2 acked mark survives refreshes', (await page.locator(`${tid('incident-row')}[data-id="${targetId}"] ${tid('acked')}`).count()) === 1);
  ok('R1 no row was ever taken off the board', (await page.evaluate(() => window.__rowsRemoved)) === 0);
  ok('R2 live row still has its Ack button', (await row.locator(tid('ack')).count()) === 1);
  await ctx.close();
}

// R5 local time, in the viewer's own order
for (const [locale, timeZone] of [['en-NZ', 'Pacific/Auckland'], ['de-DE', 'Europe/Berlin'], ['en-US', 'America/New_York']]) {
  const ctx = await browser.newContext({ locale, timezoneId: timeZone });
  const page = await ctx.newPage();
  await page.goto(url);
  const t = page.locator(`${tid('incident-row')} time`).first();
  await t.waitFor({ timeout: 15000 });
  const iso = await t.getAttribute('datetime');
  const text = (await t.textContent()).trim();
  const want = new Intl.DateTimeFormat(locale, { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(iso));
  ok(`R5 ${locale} ${timeZone}`, text.startsWith(want) && /^\d{4}-\d\d-\d\dT.*Z$/.test(iso), `"${text}"`);
  await ctx.close();
}
await browser.close();
console.log(failed ? `${failed} FAILED` : 'all ok');
process.exit(failed ? 1 : 0);
