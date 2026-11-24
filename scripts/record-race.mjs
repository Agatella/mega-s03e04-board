// Records the ack race on the deployed board: aim at the top row's Ack, a new incident lands and shifts the list,
// click where the button was a quarter second later (a person's reaction time). Prints what the report needs.
//   node scripts/record-race.mjs <board url> <out.webm>
import { chromium } from 'playwright';
import { copyFileSync, mkdirSync, statSync } from 'node:fs';
const [url, out] = [process.argv[2], process.argv[3] ?? 'videos/publish/demo-2.webm'];
mkdirSync('videos/raw', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: 'videos/raw', size: { width: 1280, height: 720 } }, locale: 'en-GB', timezoneId: 'Europe/Warsaw' });
// A visible pointer for the recording only (headless video has no cursor). Not part of the board.
await ctx.addInitScript(() => {
  addEventListener('DOMContentLoaded', () => {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;z-index:99999;width:20px;height:20px;border-radius:50%;background:rgba(220,0,0,.5);border:2px solid #900;pointer-events:none;left:-50px;top:-50px;transform:translate(-50%,-50%)';
    document.body.appendChild(d);
    addEventListener('mousemove', (e) => { d.style.left = e.clientX + 'px'; d.style.top = e.clientY + 'px'; }, true);
  });
});
const t0 = Date.now();
const page = await ctx.newPage();
const logs = []; page.on('console', (m) => logs.push(m.text()));
const sec = () => (Date.now() - t0) / 1000;
const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const rowSel = '[data-testid="incident-row"]';
await page.goto(url);
await page.locator(rowSel).first().waitFor({ timeout: 20000 });
await page.waitForTimeout(1500);
const meant = await page.locator(rowSel).first().getAttribute('data-id');
const box = await page.locator(rowSel).first().locator('[data-testid="ack"]').boundingBox();
const x = box.x + box.width / 2, y = box.y + box.height / 2;
await page.mouse.move(x - 120, y + 60);
await page.mouse.move(x, y, { steps: 12 });
const aimed = sec();
let landed = null;
while (sec() - aimed < 45) { // wait for the next incident to land on top
  const top = await page.locator(rowSel).first().getAttribute('data-id');
  if (top !== meant) { landed = { id: top, sec: sec() }; break; }
  await page.waitForTimeout(40);
}
if (!landed) { console.error('no incident landed in 45 s'); process.exit(2); }
await page.waitForTimeout(250); // reaction time
const clickedAt = sec();
await page.mouse.click(x, y); // where the Ack for the meant row was a moment ago
await page.locator('[data-testid="acked"]').first().waitFor({ timeout: 15000 });
const got = await page.locator(`${rowSel}:has([data-testid="acked"])`).first().getAttribute('data-id');
const landedTime = await page.locator(`${rowSel}[data-id="${landed.id}"] time`).getAttribute('datetime');
await page.waitForTimeout(3000);
const sha = await page.locator('[data-testid="build-sha"]').textContent();
const meantStill = await page.locator(`${rowSel}[data-id="${meant}"]`).count();
const meantAcked = await page.locator(`${rowSel}[data-id="${meant}"] [data-testid="acked"]`).count();
const line = logs.find((l) => l.startsWith(`ack ${got} `)) ?? '';
const [, , ackedAt, receipt] = line.split(' ');
const dur = sec();
await ctx.close();
const file = await page.video().path();
await browser.close();
copyFileSync(file, out);
console.log(JSON.stringify({ file: out, bytes: statSync(out).size, durationSec: +dur.toFixed(1), meant, landed: landed.id, landedOpenedAt: landedTime, got, ackedAt, receipt, sha, meantStillOnBoard: meantStill === 1, meantAcked: meantAcked === 1, secs: { aimed: +aimed.toFixed(1), landed: +landed.sec.toFixed(1), clicked: +clickedAt.toFixed(1) }, at: mmss(clickedAt) }, null, 1));
