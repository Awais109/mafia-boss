# 0022. The end of the prototype is a cleared Act II, said in words; reports measure from game start

- **Status:** Accepted
- **Date:** 2026-09-12

## Context
A tester ran the Debug Bot for 5 days, twice. The header then read `Act II ✓` and `Rep 1,646/480` with a full bar, and the second bot report said `Act I clear: -4.1 d ✗`. They concluded the game had never entered Act II.

It had. Act II opened on Day 2 and was cleared on Day 6; [0015](0015-act-ii-pacing.md) leaves the game running after that, and the `ACT_UNLOCKED` and `ACT_CLEARED` events had long since dropped out of the 200-event log. Three presentation faults, no engine fault:

- the Rep readout kept showing a target that had already been passed, with only a `✓` to say so;
- nothing persistent on screen said when the acts had been reached;
- `sim/report.ts` measured Act I clear from the run's start ([0020](0020-sim-report-metrics.md)), which is right for the CLI, where run start is game start, and wrong for the Debug Bot, which starts from an existing save.

## Decision
- The game keeps running after Act II is cleared (unchanged from 0015). The app says so in words rather than with a glyph: the header reads `Act II cleared`, and the Rep line always names what its number is for: `x/80 to Act II`, `x/480 to clear Act II`, or `x · Act II cleared on Day N`.
- Home's act card lists the act milestones from `stats.actClearedAt`, which persist. After the clear it says that Acts I–II are all that's built, that Reputation keeps counting, and offers Export log.
- The Bot's notice names any act reached or cleared during the run.
- The report measures act clears from the game's `createdAt`, and scores a clear only if it happened inside the run (`actClear1InRun`, `actClear2InRun`). A clear from before the run is printed with `before this run`. This supersedes the two act-clear rows of 0020; the rest of that record stands. CLI numbers are unchanged, since there the run starts with the game.

## Consequences
- No end screen and no Act III stub in the UI: the prototype ends in words. A tester who never opens Home still sees `cleared` in the header.
- A Debug Bot run over a save that has already cleared both acts scores neither, so `Targets met` tops out at 8/10 there. That's right: such a run has no pacing evidence to give.
- CLI reports and `sim/baseline.csv` are unaffected.
- `Summary` gained two fields; anything that builds a `Summary` by hand must set them.

## Related
`app/components/Header.tsx`, `app/screens/HomeScreen.tsx`, `app/store.ts` (`runBot`), `sim/report.ts`, `tests/report.test.ts`, [app.md](../app.md), [sim.md](../sim.md#report), [systems/progression.md](../systems/progression.md#acts), [0015](0015-act-ii-pacing.md), [0020](0020-sim-report-metrics.md).
