# Crew

The people who work jobs and mind rackets. They cost wages, their loyalty decides whether they stay, and they get better with work.

**Code:** `engine/systems/crew.ts` (`effectiveStat`, `baseWage`, `crewSlots`, `freshProgress`, `crewFromSeed`, `generateCandidates`, `regeneratePool`, `refreshPoolIfDue`, `releaseJailed`, `unassignEnforcer`, `crewDayBoundary`), `engine/systems/experience.ts` (`RANK_NAMES`, `rankFor`, `hasPerk`, `jobXp`, `grantXp`, `levelUp`, `filePerkChoice`, `accrueEnforcerXp`, `crewXpHourBoundary`), the crew handlers in `engine/core/apply.ts`.
**Config:** `crew.*`.

## A crew member

`CrewMember` in `engine/model/state.ts`:
- Stats: `muscle`, `brains`, `nerve`.
- `loyalty`, from 0 to 100.
- `traits` (zero or one).
- `status`: `idle`, `on_op`, `enforcer` or `jailed`, plus `assignedTo` (racket or op id) and `jailedUntil`.
- An optional `nephew` flag.
- Progress: `xp` and `potential` per stat, `gained` (stat points earned), `rank`, `perks`.

A new game's first recruit pool is `crew.openingPool`: Vitya; Dima, your nephew, who can't be fired and never walks out ([ADR 0018](../decisions/0018-crew-rules.md)); and Sasha. The opening hires two of the three ([ADR 0035](../decisions/0035-guided-opening.md)). Their potentials are set in config rather than rolled.

## Traits

`effectiveStat` applies stat bonuses; wages and job rolls apply the rest.

| Trait | Effect |
|---|---|
| `exArmy` | +`muscleBonus` Muscle |
| `gambler` | +`nerveBonus` Nerve, wage × `wageMult` |
| `alcoholic` | wage × `wageMult`; every job roll loses a random 0–`randomPenalty` |

## Experience

([ADR 0030](../decisions/0030-crew-experience.md)) Crew grow with work. XP is banked per stat; a stat rises by one when its XP covers the cost of the next point, and stops at the member's `potential`.

**Where XP comes from** (`crew.experience`):

| Source | XP |
|---|---|
| A job | `xpByBand[band] × outcomeMult[outcome]`, split across stats by the job's weights (`w[stat] ÷ Σw`) |
| Mentoring | × (1 + `mentorBonus`) when a teammate outranks the member; + the Mentor perk's `partnerXpBonus` when a teammate has it |
| Training | the job's `xp` to its stat ([ops.md](ops.md#training)) |
| Minding a racket | `enforcerXpPerHr` Muscle, accrued continuously |

**Stat points** (`levelUp`):

```
point cost = pointCost.base + pointCost.perAbove30 × max(0, stat − 30)
```

Leftover XP carries over. At the ceiling, banked XP for that stat is discarded. Each point increments `gained` and `stats.statPointsGained` and emits `CREW_STAT_UP { crewId, name, stat, value }`. Better stats raise the member's wage, so a veteran costs more.

Job and training XP is spent the moment it's granted. Enforcer XP is spent at whole hours (`crewXpHourBoundary`, right after condition decay), so any split of a reconcile agrees.

**Ranks.** `rankFor(gained)`: Associate, then Soldier at `ranks.soldier`, Made at `ranks.made`, Capo at `ranks.capo` (`CREW_RANK_UP { crewId, name, rank }`). Reaching Soldier and Made each files a perk choice in the inbox: `perkChoices` perks the member doesn't have, drawn on `rng.derive('perk', crewId, rank)`, the first as default, expiring after `inbox.perkHours` ([inbox.md](inbox.md#perk-choices)). Choosing one emits `PERK_CHOSEN`.

**Perks** (`crew.experience.perks`):

| Perk | Effect | Read in |
|---|---|---|
| `earner` | job Dirty × `jobDirtyMult` | `opDirtyRewardFor` |
| `ghost` | job heat spike × `jobSpikeMult` | `resolveOp` |
| `fixer` | job time × `jobMinutesMult` | `opMinutesFor` at `START_OP` |
| `mentor` | teammates earn + `partnerXpBonus` XP | `jobXp` |
| `bargainer` | + `haggleBonus` to Tolya haggles | `bestHaggler`, `haggle` ([districts-and-rivals.md](districts-and-rivals.md#answering-a-demand)) |
| `steady` | no daily loyalty drift | `crewDayBoundary` |

A team perk applies when anyone on the job has it.

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
| Each day start | `loyalty.driftPerDay` (not for a Steady member) |
| Job, clean success | `loyalty.perOpSuccess` |
| Job, partial success | `round(perOpSuccess × ops.partialRewardPct)` |
| Job, failure | `ops.failLoyalty` |
| `RAISE { crewId }` | `loyalty.perRaise`, for `raiseCostPerAct × act` Clean |
| Missed wage day | `loyalty.perMissedWageDay` |

Training jobs don't change loyalty.

**Walkouts.** At each day start, every crew member below `loyalty.lowThreshold` rolls `loyalty.lowEventChancePerDay`. The nephew is exempt, as is anyone on a job or in jail. A walkout leaves the crew, taking `floor(dirty × walkoutStealPct)` Dirty (`WALKOUT`, `stats.walkouts`).

## Recruiting

- **The pool.** A new game's is `crew.openingPool`; every refresh after that rolls `crew.poolSize` candidates. Each rolls stats uniformly in `crew.statBandByAct[act]`, a potential per stat of `stat + U(experience.potentialRoll)` capped at 100, starts at `recruitLoyalty`, and has a `traitChance` of one random trait. Names are a Russian first name with a nickname. A raw recruit with a high ceiling against a ready-made one is the choice.
- **Refresh.** The pool regenerates every `crew.poolRefreshHours` on a fixed schedule (`POOL_REFRESHED`).
- **`RECRUIT { candidateId }`** needs a free slot and `recruitCostPerAct × act` Clean. It emits `RECRUITED`.
- **`FIRE { crewId }`** refuses the nephew and anyone on a job, and clears any enforcer link (`FIRED`).

## Jail

Arrests come from heat ([heat.md](heat.md)). A jailed member keeps drawing wages, can't work, and returns to `idle` at `jailedUntil` (`RELEASED`).

## Debug

`DEBUG_REFRESH_POOL` rerolls the recruit pool and restarts its timer.

**Tests:** `tests/apply.test.ts` (missed wages cost loyalty, the nephew can't be fired), `tests/crew.test.ts` (XP split and mentor bonus, training cost and stat-ups, the ceiling, a promotion files a perk choice, enforcer stat-ups only on the hour, Fixer, Ghost and Earner on a job), `tests/reconcile.test.ts` (walkout rolls, a trainee and an enforcer near a stat point in the split-invariance check), `tests/sim.test.ts` (the bot never misses wages).
