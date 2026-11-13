# Politics: opinion, the Ministry and elections

From Act V three tracks run beside heat: what the city thinks of you, what the capital thinks of you, and a weekly election that decides whether you run the city outright ([ADR 0044](../decisions/0044-act-v-kombinat.md)).

**Code:** `engine/systems/politics.ts` (`politicsOn`, `opinionTarget`, `ministryTarget`, `opinionControlMult`, `politicsHourBoundary`, `thawFronts`, `initPolitics`, `electionScheduled`, `voteShare`, `winChance`, `pointCost`, `pointsRoom`, `campaign`, `addVotes`, `electionDue`); opinion and the mayor in `engine/core/derive.ts` (control, tribute, district perks, the Construction Trust, frozen fronts); the `CAMPAIGN` and `DEBUG_HOLD_ELECTION` handlers and the Governor's check in `BUY_OFFICIAL` in `engine/core/apply.ts`. App: `app/components/PoliticsCard.tsx` on the Map.
**Config:** `opinion.*`, `ministry.*`, `elections.*`; on `rackets.types`: `opinionPerTier`, `opinionYield`; on `fronts.types`: `opinionAtFullUtil`; on `officials.list`: `ministryRelief`, `needsMayor`; `ops.list.deliverVote.votes`; `progression.acts[6].mayor`.

State: `politics = { opinion, attention, nextElectionAt, elections, points, mayor }`. Everything switches on at `opinion.fromAct`; `initPolitics` runs when that act opens: opinion starts at its target, attention at 0, and the first election is `elections.everyDays` away.

## Public opinion

0–100, city-wide. At each whole hour, after the fronts' utilization and the inspection flag, it moves `opinion.stepPerHr` of the way to its target:

```
target = opinion.base
       + Σ businesses   opinionPerTier × tier × condition/100        (Newspaper, TV Station, Palace of Culture; not while shut)
       + Σ fronts       opinionAtFullUtil × util                      (the Development Fund)
       − opinion.inspectedPenalty   while inspected
       − opinion.raidPenalty        while the raid penalty runs (prosperity's raidPenaltyUntil)
```

What it does:
- **Control** × `1 + opinion.controlBonus × opinion/100` (`Derived.controlParts.opinionMult`, [heat.md](heat.md)).
- **The Construction Trust** earns × `lerp(opinionYield[0], opinionYield[1], opinion/100)` (`RacketDerived.opinionMult`).
- **The Ministry**: opinion takes `ministry.opinionRelief × opinion/100` off its target.
- **Elections**: `elections.perOpinion` of vote share per point above 50.

Stepping only at whole hours keeps it constant inside a reconcile segment, like prosperity ([prosperity.md](prosperity.md)).

A decision can also move opinion, or the Ministry's attention, at once: the front pages, the workers at the gate, the school's roof ([inbox.md](inbox.md#the-citys-story), [ADR 0054](../decisions/0054-the-city-story.md)). The bump drifts back toward the target like any other difference.

## The Ministry

The capital's attention, 0–100. It steps toward its target at whole hours (`ministry.stepPerHr`), after opinion:

```
target = ministry.perYield × (yield + tribute + legal gross per hour)      (legal businesses still count, endgame.md)
       − Σ officials ministryRelief            (the Governor)
       − ministry.opinionRelief × opinion/100
```

Bribes and ordinary officials don't touch it. On a whole hour with attention at or above `ministry.freezeAt` and no front frozen, it freezes the front with the most throughput (ties to the older one): `Front.frozenUntil = t + ministry.freezeHours`, `FRONT_FROZEN { frontId, until }`, `stats.frontsFrozen`, and attention falls to `ministry.afterFreeze`. A frozen front has throughput 0 (`FrontDerived.frozen`), so its buffer waits, its utilization falls, and `DEPOSIT` is refused ("The Ministry has frozen it"). `frozenUntil` is a reconcile boundary; `thawFronts` clears it and emits `FRONT_THAWED`.

## Elections

While `electionScheduled` (Act V open, not yet mayor), `politics.nextElectionAt` is a reconcile boundary.

```
share  = elections.baseShare + elections.perOpinion × (opinion − 50) + elections.perPoint × points
count  = share + U(−noise, +noise)                on rng.derive('election', index)
win    ⇔ count ≥ ½                                 winChance = clamp((share + noise − ½) ÷ 2·noise, 0, 1)
```

- **Campaigning:** `CAMPAIGN { points, pay }` buys points for the coming election: `pay: 'dirty'` costs `round(elections.pointHoursOfYield × yield per hour)` Dirty a point (`pointCost`), `pay: 'influence'` costs `elections.influencePerPoint`. At most `elections.maxPoints` (`pointsRoom`). Refused before Act V, once mayor, or with nothing scheduled. `CAMPAIGNED { points, cost, pay, total }` (quiet), `stats.campaignPaid`.
- **Deliver the Vote** ([ops.md](ops.md)) adds `votes × reward share` points on success, within the same cap (`addVotes`; `OP_RESOLVED.votes`).
- **The count** (`electionDue`): `ELECTION_HELD { index, share, won }`, `stats.elections`, and the points are spent either way. A loss schedules the next one `everyDays` later. Nothing is spent for an absent player, and absence never costs an office already won.
- **The mayor** (`politics.mayor`, for good; no more elections): no district takes tribute; every district's `mod.yieldMult` bonus counts × `elections.mayor.perkMult` (1.1 becomes 1.2 at ×2); `elections.mayor.control` is added to control; and the Governor (`needsMayor`) will take your call ("He only takes calls from the mayor" before then).
- `DEBUG_HOLD_ELECTION` counts the coming election now.

## The gate

`progression.acts[6]` asks for Rep and `mayor: true`; with `progression.finalAct` at 5 it clears Act V ([progression.md](progression.md)).

## The bot

It campaigns in the two days before a count, before depositing or lending, until its win chance reaches `campaignTarget`: Influence first, keeping back what officials still to come will cost, then Dirty above its reserve. Deliver the Vote is worth the Dirty its points would cost while the election still needs them. A point of opinion is worth `opinionValuePct` of yield an hour (half once mayor) plus what it adds to the Construction Trust. It buys the Governor when attention reaches half the freeze line or its target reaches the line ([sim.md](../sim.md#the-casual-bot)).

**Tests:** `tests/kombinat.test.ts`, `tests/reconcile.test.ts` (an Act V game: opinion stepping, attention crossing the line and freezing a front, a front thawing, an election counted mid-window), `tests/migrate.test.ts`.
