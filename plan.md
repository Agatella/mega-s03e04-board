# sched-prod incident board — plan

The on-call board for sched-prod. One page, one list: tonight's incidents, newest first, so on-call sees
what just broke and takes it.

## Flows

| flow | who | what happens |
|------|-----|--------------|
| `open-board` | on-call | opens the board; sees tonight's incidents |
| `ack-incident` | on-call | picks an incident on the board and acks it — "I've got this one" |
| `watch-board` | on-call | keeps the board open; it stays current without a reload |

## Requirements

- **R1** New incidents appear live at the top of the list, newest first.
- **R2** Each incident row has an **Ack** button. Ack opens a **confirm that names the incident id**; only the confirm sends the ack (`api.ack(id)`) and marks the row acked. Cancel (button, Escape or a click outside) closes it and acks nothing. *(Changed by product after the step-one recording, SCHED-4515.)*
- **R3** Show a loader until incidents load.
- **R4** The board refreshes itself every 2 seconds while open.
- **R5** Times show in the viewer's local time; day before month for EU locales (dd/mm).
- **R6** The page names its build: `<meta name="build" content="<git sha>">` in the head and the same sha in the footer.

## Hooks (pinned — tests and the replay rely on them)

| `data-testid` | element |
|---------------|---------|
| `board` | the board's main area |
| `loader` | the loader (gone once incidents load) |
| `empty` | what shows when there are no incidents |
| `incident-list` | the list |
| `incident-row` | one incident row, with `data-id="<incident id>"` |
| `ack` | the Ack button in a row |
| `acked` | the acked mark in a row |
| `confirm` | the confirm: it names the incident id (`data-id` has it too) |
| `confirm-ack` | the button in the confirm that sends the ack |
| `confirm-cancel` | the button in the confirm that closes it without an ack |
| `build-sha` | the sha in the footer |

## Decision log

- **Ack race (SCHED-4515).** New incidents land every few seconds and push the rows down; a click aimed at one row can land on another (recording demo-2: aimed at INC-6926, acked INC-4134). Product's decision: new incidents stay live at the top and Ack stays on the row, but Ack asks to confirm and the confirm names the incident id. Not chosen: holding the list under the pointer, or a "N new" bar.

## Done

Every issue in `issues/` delivered, deployed to a public https address, and shown working.
