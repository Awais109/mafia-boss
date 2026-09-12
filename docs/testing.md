# Testing

Vitest, over `engine/` and `sim/` only; the UI has no automated tests. `vitest.config.mts` runs `tests/**/*.test.ts` in Node.

```sh
npm test            # all tests
npm run check       # typecheck + lint + tests; required before every commit
npx vitest run tests/ops.test.ts   # one file
```

## Files

| File | Guards |
|---|---|
| `tests/helpers.ts` | Shared setup: default `config`, `H` (one game hour), `T0` (a start time off the hour, so boundaries fall mid-segment), `fresh()`, `act()` (apply actions, throw on rejection), `crewNamed()`, `expectClose()` (deep equality with relative float tolerance) |
| `tests/config.test.ts` | Defaults validate; every preset builds; `fast` changes only time; a preset typo is an error; structurally wrong values are rejected; overrides layer on presets; overrides with an unknown path or wrong type are rejected; `tierHeatMult > tierYieldMult` |
| `tests/reconcile.test.ts` | No-op when time hasn't moved; **split invariance over 1,000 random splits**, comparing states and event streams for a fresh game and a busy one (jobs out, bribe active, tribute, fronts converting, heat high enough to raid and arrest, a pending demand, a disloyal crew member); the offline cap; the vault stops at its cap; the same window rolls the same raids |
| `tests/ops.test.ts` | Partial success is the most common outcome (40–60%) for the crew the game gives you; `outcomeOdds` matches rolled frequencies; scoring uses the best stat per weight plus the team bonus; traits change stats and odds |
| `tests/apply.test.ts` | The first-session path; front buffering and throughput; reaching Act II; one business of each kind per district; job lifecycle; three pressure jobs flip a district; bribe duration; heat convergence; official cooldown; missed wages cost loyalty; the nephew can't be fired; enforcer multipliers; Tolya's refused and paid demands |
| `tests/replay.test.ts` | A bot game rebuilt as an exported log replays to the same state, with the same sessions; a log with no game start is rejected |
| `tests/sim.test.ts` | **Pacing guard**: the casual bot over seeds 42–46 for 8 days keeps Act I at a mean of ≤ 2.1 days, Act II 3–5 days after Act I, heat 25–35, at most one raid, no missed wages, partial outcomes 40–60% |
| `tests/report.test.ts` | A bot run over a save that already cleared Act I measures the clear from game start, prints it as `before this run` without scoring it, and scores the Act II clear that happens inside the run |
| `tests/away.test.ts` | The away summary lists each finished job with its crew and reward, splits Dirty between rackets and jobs, accounts for what the full vault lost, reports per-front laundering that sums to the Clean earned, drops bookkeeping events, and merges a second gap |

## Writing tests

- Test the engine through `apply`, `reconcile` and `derive`, the way the app uses it. Reach into `engine/systems/` only for pure helpers like `rollOp`.
- Derive expected numbers from `config` instead of hard-coding them, so tuning doesn't break unrelated tests (for example, Rep after an upgrade is `formulas.racketUpgradeCost(...) × reputation.perCleanSpent`).
- Use seeded RNG (`makeRng('some-seed')`) for anything random.
- If `tests/sim.test.ts` fails after a config change, the change moved pacing. Check [TUNING.md](../TUNING.md) and the sim report before loosening the test.
