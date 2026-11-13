# 0040. Six acts, each opened by a gate

- **Status:** Accepted
- **Date:** 2026-09-29

## Context
The prototype had two acts: Act II opened on the Act I goals ([ADR 0039](0039-goals-gate-act-two.md)) and was "cleared" at a Reputation threshold that ended the game ([ADR 0022](0022-end-of-prototype-state.md)). The owner approved a six-act arc — the economy note and the story bible — and asked for the rest of the game to be built: the Centre (Act III, already designed in the expansion plan), then the road out, the Combine and the hills. The code assumed two acts everywhere: `Act = 1 | 2`, per-act records with two keys, a special function for each transition, the app's "Act II cleared" copy.

## Decision
- **`Act` runs from 1 to 6.** Every per-act record (`vault.targetHoursByAct`, `rackets.maxTierByAct`, `costs.paybackHoursByAct`, `crew.slotsByAct`, `crew.statBandByAct`, `gold.perActUnlocked`) has all six keys, including acts not yet built.
- **Each later act has a gate** in `progression.acts`: any mix of the Act I goals, a Reputation, districts held and fronts owned. Every condition must hold. Gates are open maps in presets, so a preset can add conditions.
- **One function opens acts**, `checkActs` (`engine/systems/acts.ts`), called after every Rep gain, at the end of every goal check (so after every action and reconcile boundary) and from Debug. It opens every act whose gate holds, in order, replacing ADR 0039's `checkActII` and the old Act II "cleared" check. Opening act *n* dates `stats.actClearedAt[n − 1]`, emits `ACT_UNLOCKED`, grants that act's gold, and runs that act's hooks.
- **`progression.finalAct`** is the last act with content. When the gate after it holds, that act is cleared (`ACT_CLEARED`, `actClearedAt[finalAct]`), once, and play continues, which keeps ADR 0022's end state for whatever the last built act is.
- **Fronts and officials carry an `act`** like businesses do. The `workFront` goal counts Act I fronts only, so later fronts don't reach back into Act I.
- **Later acts ask for fewer, longer visits**: the vault leash grows by act, and the sim's casual player checks in to match (three sessions a day in Act III, down to one in Act VI).
- **Act III's gate moves from ★610 to ★1,200.** ★610 used to end the game; as a door to Act III it left Act II only 1.9 days on the bot, against the manual's 3–5. At ★1,200 Act II takes 3.3 days.
- **Old saves:** a save in Act II that "cleared" it under the old rule loses that date in migration (schema v9); it now has Act III ahead and gets a real date when it opens.

## Consequences
- The pacing guard in `tests/sim.test.ts` now runs 22 days and checks Act II against the manual's 3–5 days again (it had been re-measured to 1–2.2 under ADR 0039) and Act III against 6–8.
- The sim report scores every built act's clear against a target window (`ACT_TARGETS` in `sim/report.ts`).
- Acts IV–VI exist as numbers and types only until their milestones land; until then Act III's gate is where the built game ends.

## Related
`engine/systems/acts.ts`, `engine/config/schema.ts` (`Act`, `ActGate`, `progression`), `engine/config/defaults.ts`, `engine/model/migrate.ts` (`v8to9`), `app/acts.ts`, `sim/report.ts`, `sim/persona.ts` (`sessionHours`), [progression.md](../systems/progression.md#acts), [ADR 0039](0039-goals-gate-act-two.md), [ADR 0022](0022-end-of-prototype-state.md).
