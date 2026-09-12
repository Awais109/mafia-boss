# 0004. Durations in game hours; hours and days aligned to the epoch

- **Status:** Accepted
- **Date:** 2026-09-12

## Context
The dev manual's `fast` preset must scale time without touching any ratio: 1 game hour = 1 real minute. Wages settle daily, Influence from jobs is capped per day, and raid rolls happen hourly. Those boundaries must fall in the same place however a reconcile is split ([0003](0003-split-invariant-reconcile.md)).

## Decision
- Every duration in config is in **game hours**. Job durations are in minutes of game time. `time.hourMs` converts to milliseconds (`hoursToMs`, `minutesToMs` in `engine/core/time.ts`).
- Hours and days align to the epoch: `hourIndex = floor(t / hourMs)`, and a day starts where `t % (24 × hourMs) === 0`. Wage settlement, the job Influence cap and walkout rolls all use these days.
- "Day N" shown to players counts from `createdAt` (`gameDay`).
- Resetting the debug offset shifts every stored timestamp back (`shiftTimes`), so the game never freezes waiting for the real clock.

## Consequences
- In real-time presets, a day boundary is midnight UTC: a player at UTC+5 has wages settle at 05:00 local. Acceptable for a prototype; the UI shows "payday in …", not a clock time.
- Changing `time.hourMs` mid-game (switching between `fast` and `default`) moves every hour and day boundary. It's a debug-only action.
- `fast` also shortens a few durations on purpose (official cooldown, recruit pool refresh, offline cap), since 72 game hours would be too long even at 60× speed.

## Related
`engine/core/time.ts`, `engine/config/presets/fast.json`, [architecture.md](../architecture.md#game-time).
