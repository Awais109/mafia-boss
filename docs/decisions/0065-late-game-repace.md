# 0065. The late game re-paced: laundering keeps up, prices and gates set the pace

- **Status:** Accepted
- **Date:** 2026-11-14
- **Issue:** #6

## Context
From Act IV the bot visits every 12–24 hours, but a front's buffer held 10 hours of throughput. Fronts ran dry between visits, and Dirty sat 97–100% idle in Acts IV–VI. Late Dirty income was worthless, and laundering was what actually set the late game's pace. A bigger buffer fixed the throttle but made Acts III–VI clear far too fast: more Clean means more Rep, which opens the acts. Raising only Act IV's gate stalled Act III, whose catalogue couldn't earn the Rep (#32, TUNING.md). The owner chose to re-pace the late game.

## Decision
- **Laundering keeps up with the visits:** `fronts.bufferHours` 10 → 20, so a filled buffer lasts the 12–24 hours between late sessions.
- **Prices and gates set the late pace instead,** moved together act by act, in the game's order, measured after each step:
  - `costs.paybackHoursByAct` 3, 4 and 5: 40 → 55. Late businesses cost more, so growth is slower, and a catalogue can earn the Rep its gate asks for;
  - the Rep gates: Act IV 9,000 → 12,000, Act V 30,000 → 45,000, Act VI 96,000 → 190,000;
  - `legalize.hoursOfYield` 170 → 300, so Act VI lasts with more Clean coming in.
- **Each act's unlock ladder is stretched across its new span,** in proportion. Act IV's places run 12,300–23,000 (were 9,200–16,000); Act V's 47,000–62,500 (were 31,000–38,000); the Holding unlocks with Act VI, at 190,000. They still arrive one by one through their act, rather than all at its opening.

## Consequences
10 seeds, 60 days, with ADRs 0063 and 0064 in place:
- **Pacing:**
  - Act III 6.92 d (10/10), IV 9.51 (10/10), V 12.12 (10/10), VI 12.54 (8/10);
  - before: 6.59 (10/10), 9.16 (10/10), 13.32 (4/10), 15.74 (4/10).
- **The throttle:**
  - front use is 75% over the run (was 54%), and 86%, 95% and 92% in Acts III–V;
  - idle Dirty is 74% (was 88%): 51% in Act III, 64% in IV.
- **Other targets:** heat 30.9; wage share 12% (8/10 in range, was 9%); no raids for the careful bot. The greedy bot still meets the odd raid (0.7 a run).
- **Still open:**
  - idle Dirty in Act V (85%): its fronts are near capacity (92%), so the next lever is front capacity there, not the buffer;
  - Act VI (97%), where legal businesses earn Clean without laundering, so idle Dirty matters less.
- **A save in a late act keeps playing:** the gates and prices change, and the save doesn't. A save that had passed a gate keeps its act, since gates are checked only to open the next.

## Related
`engine/config/defaults.ts` (`fronts.bufferHours`, `costs.paybackHoursByAct`, `progression.acts`, `legalize.hoursOfYield`, the Act IV–VI `unlockRep`s), `tests/apply.test.ts`, [TUNING.md](../../TUNING.md), [fronts.md](../systems/fronts.md), [progression.md](../systems/progression.md).
