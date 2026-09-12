# 0007. Save, settings and a JSON-lines log on the local file system

- **Status:** Accepted
- **Date:** 2026-09-12

## Context
Plan §1–3: fully local, no server. Plan §3 picks `expo-file-system` over AsyncStorage because the event log grows past AsyncStorage's Android size limits. Testers' playtest data has to reach the team through the share sheet (plan §5, M5).

## Decision
- **Three files** in `Paths.document`, via the SDK 57 class API (`new File(Paths.document, name)`; the legacy functional API throws in SDK 57):
  - `sevgorod-save.json`: the whole `PlayerState`;
  - `sevgorod-settings.json`: preset and overrides;
  - `sevgorod-log.jsonl`: the log.
- **The save** is rewritten after every committed change. The 1 s display tick writes nothing unless reconciling produced events.
- **The log** is append-only JSON lines: `meta` (the game-start snapshot and config), `action` (every dispatched action with its game time), `config`, `event`. The in-save `state.log` keeps only the latest 200 events for the Log screen.
- **Export** writes a JSON file and opens the share sheet (`expo-sharing`). **Import** takes pasted save JSON.
- **An unreadable save** is copied aside and a new game starts, with a visible error.
- **Web** falls back to `localStorage`, and sharing is disabled there.

## Consequences
- The action log plus the `meta` snapshot is enough to replay a tester's game exactly in the sim (`npm run sim -- --replay`).
- A shape change to `PlayerState` needs a `SCHEMA_VERSION` bump and a `migrate` step, or testers' saves become unreadable.
- Web storage is limited in size; web is only for quick looks.

## Related
`app/storage.ts`, `app/store.ts`, `sim/replay.ts`, `engine/model/migrate.ts`, [app.md](../app.md#storage).
