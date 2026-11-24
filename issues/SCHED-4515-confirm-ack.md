---
id: SCHED-4515
title: Ack asks to confirm, and names the incident
status: ready
plan: R2
---

Product watched the step-one recording at 00:09: a new incident landed while the pointer was on the Ack of INC-6926,
and the click acked INC-4134 instead, with nothing to say so.

- New incidents stay live at the top and Ack stays on the row (R1, R2).
- Clicking Ack opens a confirm that names the incident id (`data-testid="confirm"`, with `confirm-ack` and
  `confirm-cancel`). Only `confirm-ack` calls `api.ack(id)` and marks the row acked.
- Cancel, Escape or a click outside closes the confirm and acks nothing.
- Rows already on the board are never moved or rebuilt when new incidents arrive.

Acceptance: aim at one row, let an incident land, click: the confirm names the incident under the pointer; cancel,
click the row you meant, and the ack goes to that one.
