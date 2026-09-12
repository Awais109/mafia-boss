# 0006. Config: defaults ← preset ← flat user overrides; unknown keys are errors

- **Status:** Accepted
- **Date:** 2026-09-12

## Context
Plan §8 and manual §2:
- every number lives in one config object;
- presets are partial overrides;
- an in-app editor writes user overrides on top, with "reset group", "reset all" and "switch preset";
- a typo in a preset must be a loud error, not a silent default.

## Decision
- **Defaults:** `engine/config/defaults.ts` is the source of truth.
- **Presets:** `engine/config/presets/*.json`, nested partial objects deep-merged over the defaults.
- **User overrides** are a flat path map (`{ "heat.baseControl": 5 }`), not a nested object. The editor can then show, change and reset one field or one group (a path prefix) at a time, and each change logs as one path and value.
- **`tryBuildConfig`** reports three kinds of error:
  - preset keys missing from the defaults (`unknownKeys`), except inside the open maps `costs.overrides`, `ops.list.*`, `ops.list.*.w`, `districts.list.*.mod`;
  - override paths whose type doesn't match;
  - `validateConfig`'s structural checks: ranges, ascending thresholds, positive durations, known ids.
- Validation rejects configs that are wrong, never ones that are badly tuned; that's the sim's job.
- **App fallback:** the app uses plain defaults and shows the errors in Debug, so a broken override never bricks a playtest.

## Consequences
- Saves never contain config, so a tester's save loads under your local overrides (manual §2).
- Adding a config field means updating the `Config` type, the defaults, and, when there's a sensible check, `validateConfig`.
- Overrides can't add new list entries such as a new job; those need a preset or a defaults change.

## Related
`engine/config/`, `app/store.ts` (settings), `app/screens/DebugScreen.tsx` (editor), [architecture.md](../architecture.md#config).
