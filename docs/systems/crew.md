# Crew

The people who work jobs and mind rackets. They cost wages, and their loyalty decides whether they stay.

**Code:** `engine/systems/crew.ts` (`effectiveStat`, `baseWage`, `crewSlots`, `generateCandidates`, `regeneratePool`, `refreshPoolIfDue`, `releaseJailed`, `unassignEnforcer`, `crewDayBoundary`), the crew handlers in `engine/core/apply.ts`.
**Config:** `crew.*`.

## A crew member

`CrewMember` in `engine/model/state.ts`:
- Stats: `muscle`, `brains`, `nerve`.
- `loyalty`, from 0 to 100.
- `traits` (zero or one).
- `status`: `idle`, `on_op`, `enforcer` or `jailed`, plus `assignedTo` (racket or op id) and `jailedUntil`.
- An optional `nephew` flag.

The game starts with `crew.starting`: Vitya, and Dima, your nephew, who can't be fired and never walks out ([ADR 0018](../decisions/0018-crew-rules.md)).

## Traits

`effectiveStat` applies stat bonuses; wages and job rolls apply the rest.

| Trait | Effect |
|---|---|
| `exArmy` | +`muscleBonus` Muscle |
| `gambler` | +`nerveBonus` Nerve, wage × `wageMult` |
| `alcoholic` | wage × `wageMult`; every job roll loses a random 0–`randomPenalty` |

## Slots

```
slots = crew.slotsByAct[act] + crewSlotsBought
```

`BUY_CREW_SLOT` adds a slot, up to `crew.extraSlotMax`. It costs `max(extraSlotMinCost, round(stats.cleanEarned × extraSlotCostPctOfBudget))` Clean, so slots get pricier as you earn more.

## Wages

```
wage per hour = (muscle + brains + nerve) / crew.wageDivisor × trait wage multipliers
                × Π mod.wageMult of districts you control
```

Wages accrue continuously into `wagesOwed` and are settled at every game day start, paid from Dirty first, then the vault. What's paid is added to `stats.wagesPaid` (the ledger's wages line):
- **Paid in full:** `WAGES_PAID`.
- **Short:** whatever is there gets paid, the rest is forgiven, `stats.missedWages` increments, and every crew member takes `crew.loyalty.perMissedWageDay` loyalty (`WAGES_MISSED`).

## Loyalty

Clamped to 0–100.

| Source | Change |
|---|---|
| Each day start | `loyalty.driftPerDay` |
| Job, clean success | `loyalty.perOpSuccess` |
| Job, partial success | `round(perOpSuccess × ops.partialRewardPct)` |
| Job, failure | `ops.failLoyalty` |
| `RAISE { crewId }` | `loyalty.perRaise`, for `raiseCostPerAct × act` Clean |
| Missed wage day | `loyalty.perMissedWageDay` |

**Walkouts.** At each day start, every crew member below `loyalty.lowThreshold` rolls `loyalty.lowEventChancePerDay`. The nephew is exempt, as is anyone on a job or in jail. A walkout leaves the crew, taking `floor(dirty × walkoutStealPct)` Dirty (`WALKOUT`, `stats.walkouts`).

## Recruiting

- **The pool.** `crew.poolSize` candidates. Each rolls stats uniformly in `crew.statBandByAct[act]`, starts at `recruitLoyalty`, and has a `traitChance` of one random trait. Names are a Russian first name with a nickname.
- **Refresh.** The pool regenerates every `crew.poolRefreshHours` on a fixed schedule (`POOL_REFRESHED`).
- **`RECRUIT { candidateId }`** needs a free slot and `recruitCostPerAct × act` Clean. It emits `RECRUITED`.
- **`FIRE { crewId }`** refuses the nephew and anyone on a job, and clears any enforcer link (`FIRED`).

## Jail

Arrests come from heat ([heat.md](heat.md)). A jailed member keeps drawing wages, can't work, and returns to `idle` at `jailedUntil` (`RELEASED`).

## Debug

`DEBUG_REFRESH_POOL` rerolls the recruit pool and restarts its timer.

**Tests:** `tests/apply.test.ts` (missed wages cost loyalty, the nephew can't be fired), `tests/reconcile.test.ts` (walkout rolls are part of the split-invariance check), `tests/sim.test.ts` (the bot never misses wages).
