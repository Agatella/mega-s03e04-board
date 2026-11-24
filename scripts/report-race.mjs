// Builds the step-one report for the ack-race recording from the recorder's output. No LLM calls.
import { readFileSync, writeFileSync } from 'node:fs';
const r = JSON.parse(readFileSync(`${process.env.HOME}/mega-s03e04/.log/record2.json`, 'utf8'));
const video = 'https://agatella.github.io/mega-s03e04-board/demo-2.webm';
const t = (s) => `00:${String(Math.floor(s)).padStart(2, '0')}`;
const md = `## What you checked
I used the deployed board the way on-call does, in one ${r.durationSec} second recording of build ${r.sha.slice(0, 7)}. A Playwright script drove Chrome (real mouse moves and one real click at fixed screen coordinates, after a 250 ms pause that stands for a person's reaction time). The red dot in the video is a pointer overlay my recorder adds; it is not part of the board.
- **open-board:** the incidents loaded, newest first, with the top row ${r.meant}.
- **watch-board:** the board stayed open and a new incident, ${r.landed}, landed at the top without a reload.
- **ack-incident, the moment the board misbehaved:** I meant to ack **${r.meant}**, the top row. I moved the pointer onto its Ack button and held it there. ${r.landed} landed (opened ${r.landedOpenedAt}) and pushed every row down one place. I clicked the spot where the Ack of ${r.meant} had been, ${(r.secs.clicked - r.secs.landed).toFixed(1)} seconds after the landing. The click hit the Ack of **${r.got}**, the row that had just landed, and the ack API answered with the receipt below, acked at ${r.ackedAt} (${((Date.parse(r.ackedAt) - Date.parse(r.landedOpenedAt)) / 1000).toFixed(1)} seconds after ${r.got} opened). ${r.meant}, the incident I meant, was **not** acked: it still shows Ack. Nothing on the board told me the ack went to a different incident.
- In my polling the incident API answered with the full current list every time (a new incident every 5 to 10 seconds), so the board merges by id and keeps newest first.

## When
- ${t(r.secs.aimed)} the pointer rests on the Ack of ${r.meant}.
- ${t(r.secs.landed)} ${r.landed} lands at the top and the list shifts down one row.
- ${r.at} the click: it acks ${r.got}, not ${r.meant}. The acked mark shows a moment later.
- The recording ends ${r.durationSec} seconds in, with ${r.meant} still un-acked.

## Where
- \`app/app.js:52\` merge and \`:60\` list.append: a new incident is inserted at the top and every row moves down one row height, whatever the pointer is doing. This is what moved the row.
- \`app/app.js:32\` onAck: the ack goes to the id of the button that is clicked (line 35), so the click is honoured exactly; what is wrong is that the button under the pointer changed a moment before.
- \`app/app.js:67\` tick and \`:82\` setInterval(tick, 2000): the refresh that brings new rows in.
- \`app/index.html:6\` and \`:21\`: the build sha in the head and in the footer.

## Options for product
1. **Hold the list while the pointer is on it.** New incidents wait in a bar, "N new incidents, show", and join the list when the pointer leaves the list. Rows never move under the pointer. On-call sees new incidents a few seconds later when they are busy with the list.
2. **New incidents never move existing rows.** Rows keep their place on screen and new ones appear above the visible area, with a "N new" jump button. Nothing shifts, and the newest incident is one click away.
3. **Make a wrong ack visible and undoable.** The button names its incident ("Ack ${r.meant}") and the acked row says "acked ${r.got}, undo" for a few seconds. Rows still shift, but an ack to the wrong incident is noticed at once.
4. **Leave it.** On-call checks the acked mark every time. The cost is a silent wrong ack on a busy night, as in the recording.

\`\`\`evidence
${JSON.stringify({ flow: 'ack-incident', at: r.at, receipt: r.receipt, sha: r.sha, videoLink: video }, null, 2)}
\`\`\`
`;
writeFileSync(`${process.env.HOME}/mega-s03e04/.log/report-race.md`, md);
console.log(md);
