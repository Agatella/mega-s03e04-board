// Records the deployed board in use (open → watch → ack) and prints what the report needs. No LLM calls.
//   node scripts/record.mjs <board url> <out.webm>
import { chromium } from 'playwright';
import { copyFileSync, mkdirSync, statSync } from 'node:fs';
const [url, out] = [process.argv[2], process.argv[3] ?? 'videos/demo.webm'];
mkdirSync('videos/raw', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: 'videos/raw', size: { width: 1280, height: 720 } }, locale: 'en-GB', timezoneId: 'Europe/Warsaw' });
const t0 = Date.now();
const page = await ctx.newPage();
const logs = []; page.on('console', (m) => logs.push(m.text()));
const sec = () => (Date.now() - t0) / 1000;
const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const marks = {};
await page.goto(url);
await page.locator('[data-testid="incident-row"]').first().waitFor({ timeout: 20000 });
marks.opened = sec();
await page.waitForTimeout(3000); // the board is open and stays current: two refreshes
marks.watched = sec();
const row = page.locator('[data-testid="incident-row"]').first();
const id = await row.getAttribute('data-id');
await row.locator('[data-testid="ack"]').hover();
await page.waitForTimeout(700);
await row.locator('[data-testid="ack"]').click();
await row.locator('[data-testid="acked"]').waitFor({ timeout: 15000 });
marks.acked = sec();
await page.waitForTimeout(3500); // hold on the acked row, past another refresh
const sha = await page.locator('[data-testid="build-sha"]').textContent();
const line = logs.find((l) => l.startsWith(`ack ${id} `)) ?? '';
const [, , ackedAt, receipt] = line.split(' ');
const dur = sec();
await ctx.close(); // flushes the video
const file = await page.video().path();
await browser.close();
mkdirSync('videos/publish', { recursive: true });
copyFileSync(file, out);
console.log(JSON.stringify({ file: out, bytes: statSync(out).size, durationSec: +dur.toFixed(1), id, ackedAt, receipt, sha, at: mmss(marks.acked - 0.3), marks }, null, 1));
