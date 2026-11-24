// Builds the step-one report (Markdown + evidence block) from the recorder's output. No LLM calls.
import { readFileSync, writeFileSync } from 'node:fs';
const r = JSON.parse(readFileSync(`${process.env.HOME}/mega-s03e04/.log/record1.json`, 'utf8'));
const video = 'https://agatella.github.io/mega-s03e04-board/demo-1.webm';
const md = `## What you checked
I opened the deployed board, watched it, and acked one incident, in one 8.5 second recording of build ${r.sha.slice(0, 7)}.
- **open-board:** the board showed a loader, then ${'8'} incidents, newest first (the top row is ${r.id}, 24/11/2026 12:26:28 CET, in my viewer's local time, dd/mm order). The footer names the build.
- **watch-board:** the board stayed open and refreshed itself every 2 seconds without a reload. No new incident arrived during the 8 seconds, so the recording cannot show a row appearing; I checked that separately with a simulated arrival in my test (it lands at the top and nothing else moves).
- **ack-incident:** I clicked **Ack** on ${r.id}. The button went away and the row showed "✓ acked". The ack API answered with the receipt below, acked at ${r.ackedAt}.

## When
- 00:01 the incidents are on screen (the loader is gone).
- 00:04 I click Ack on ${r.id}; the acked mark shows about a second later. The receipt in the evidence block is the one for this ack.
- 00:05–00:08 the board stays open, acked mark still there after another refresh.

## Where
- \`app/app.js:32\` onAck: calls \`api.ack(id)\` (line 35), then marks the row acked.
- \`app/app.js:52\` merge and \`:60\` list.append: the API answers only what is new after the first page, so new incidents are merged by id and sorted newest first, without rebuilding rows (the acked mark survives refreshes).
- \`app/app.js:67\` tick and \`:82\` setInterval(tick, 2000): the 2 second refresh.
- \`app/app.js:73\`: the loader is removed after the first answer (\`app/index.html:17\`).
- \`app/app.js:10\`–\`13\`: local time with Intl.DateTimeFormat in the viewer's locale; the UTC value stays in the time element's datetime attribute.
- \`app/index.html:6\` and \`:21\`: the build sha in the head and in the footer (build-sha).

## Options for product
1. **Acks only live in the page.** After a reload the row shows Ack again, because the API gives back no acked state. Options: (a) leave it, (b) ask the API owner to return who acked and when, so the board can show it after a reload, (c) keep acks in the browser.
2. **A failed load keeps the loader.** If the API is down the loader stays and the board retries every 2 seconds without saying so. Options: (a) leave it, (b) show "cannot reach the incident API, retrying" after a few failures.
3. **Refresh by polling.** Every open board calls the API every 2 seconds. Options: (a) keep 2 seconds, (b) slow down when the tab is hidden, (c) ask for a push channel.
4. **Odd incident text.** One incident in the data (INC-8942) has a summary that reads like a note, not an incident ("session · ilse · studio · auckland · 04:03 on the sheet"). The board shows summaries as plain text, never as markup. Options: (a) leave it, (b) clean the data upstream.

\`\`\`evidence
${JSON.stringify({ flow: 'ack-incident', at: r.at, receipt: r.receipt, sha: r.sha, videoLink: video }, null, 2)}
\`\`\`
`;
writeFileSync(`${process.env.HOME}/mega-s03e04/.log/report1.md`, md);
console.log(md.length, 'characters');
