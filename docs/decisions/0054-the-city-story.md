# 0054. The city's story: decisions that move opinion, the Ministry and the crew

- **Status:** Accepted
- **Date:** 2026-09-30

## Context
The designs for Home in Act V and after the story show decisions about the city, not about a business:
- **The Newspaper has two front pages:** buy one for +4 opinion, or let the editor choose for −3.
- **Golovin's workers are at the gate:** pay a month (+5 opinion, +6 Ministry), send Dima to listen (+2 opinion, Dima busy 4h), or leave them to Golovin (−4 opinion).
- **School No. 14 wants a roof:** pay for it (+★180), send Lena with tar (Lena busy 6h), or pass it to the council (−2 opinion).

The inbox couldn't express three of those effects: public opinion, the Ministry's attention, and a crew member kept busy.

## Decision
- **Three new option effects:**
  - `opinion` and `attention` move `politics.opinion` and `politics.attention` now, clamped to 0–100. Both still drift toward their targets at the usual hourly rate, so a bump helps for about a day.
  - `busyHours` sends the crew member the item names on an errand for that long.
- **An errand rides the job machinery,** as a job of type `'errand'` named after the incident. The member is on it like any job, so they can't be sent elsewhere and the time is a reconcile boundary. It comes back with nothing but them (`ERRAND_DONE`), and gold can finish it early.
  - If the member isn't free when the option is chosen, the rest applies without them.
  - With nobody idle at filing, the option has no busy effect and reads "someone".
- **Options can name who goes:** an option's name may hold `{crew}`, filled at filing with the named member's first name ("Send Sasha to listen"). An incident names someone when it needs idle crew or any option sends someone. The card's body then leaves off the bracketed name.
- **Incidents can end:** `lastAct` stops an incident rolling after its act (the workers are an Act V story). A new need, `afterStory`, holds once the story is over.
- **Three incidents, in the designs' words:** `frontPage` (from Act V), `workersAtGate` (Act V only) and `schoolRoof` (after the story). Their Clean is `cleanHoursOfYield` of the city's gross income, so it keeps up with the city; defaults never cost money.
- **The bot** values a point of opinion, or of attention avoided, at `opinionHours` (0.5) hours of yield. It values an hour of someone's time as it does an hour hurt.

## Consequences
- **Opinion and the Ministry become things a player decides about daily** from Act V, not only through the media businesses and campaigns.
- **Three more incident types** share the hourly roll from Act V on, so the others come a little less often.
  - The bot's Act V takes 12.33 days (from 12.03) and Act VI 12.73 (from 12.63), both in range.
- **No schema change:** new effects and a new op type are optional fields, and an old save simply has none of them.

## Related
`engine/systems/inbox.ts` (`incidentEligible`, `sendOnErrand`, `resolveErrand`), `engine/config/defaults.ts` (`incidents.types`), `engine/config/schema.ts`, `engine/systems/ops.ts`, `app/inbox.ts`, `sim/persona.ts`, `tests/city.test.ts`, [systems/inbox.md](../systems/inbox.md), [systems/politics.md](../systems/politics.md).
