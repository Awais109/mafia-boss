# Prosperity

From Act III, every district has a prosperity from 0 to 100, and its joints earn with it ([ADR 0041](../decisions/0041-act-iii-the-centre.md)). Joints lift a street; rackets sour it; a hotel lifts it a lot. The Card Club only opens on a prosperous street, and the Cooperative Bank only in a prosperous city.

**Code:** `engine/systems/prosperity.ts` (`prosperityOn`, `prosperityTarget`, `prosperityHourBoundary`, `initProsperity`, `prosperityYieldMult`, `cityProsperity`), the joint multiplier in `engine/core/derive.ts` (`RacketDerived.prosperityMult`, `Derived.cityProsperity`), the checks in `engine/systems/districts.ts` (`racketBlocked`) and `engine/systems/fronts.ts` (`frontBlocked`). App: the district header on Business and the district cards on Turf.
**Config:** `prosperity.*`; `prosperity`, `prosperityPerTier` and `minProsperity` on `rackets.types`; `minProsperity` on `fronts.types`.

## The number

`District.prosperity` is stored on each district. Before `prosperity.fromAct` it doesn't move and nothing reads it. When that act opens, every open district starts at its target, so the act doesn't open on a cliff.

```
target = prosperity.base
         + Σ businesses in the district  type.prosperity  +  type.prosperityPerTier × tier × condition/100
         − prosperity.inspectedPenalty   (while inspected)
         − prosperity.raidPenalty        (until raidPenaltyUntil: a raid sets it prosperity.raidPenaltyHours ahead)
         − prosperity.shortagePenalty    (while cigarettes are out)
clamped to [0, 100]; a shut business adds nothing
```

At every whole hour, after the inspection and shortage flags, each open district moves `prosperity.stepPerHr` of the way to its target. Because it only moves at whole hours, yield is constant inside a reconcile segment and every split of a walk agrees ([architecture.md](../architecture.md#the-reconcile-walk)). The raid penalty's end isn't a boundary: prosperity only reads it on the hour.

## What it does

- **Joints earn × `lerp(yieldMult[0], yieldMult[1], prosperity ÷ 100)`**: at the defaults, ×0.7 at 0, ×1 at 50, ×1.3 at 100. Rackets and premises don't care.
- **A business with `minProsperity`** (the Card Club) only opens where the district is at least that prosperous (`racketBlocked`: "The street needs a prosperity of N"). Once open it stays open.
- **A front with `minProsperity`** (the Cooperative Bank) needs the city's prosperity: the mean over districts where you run a joint or racket (`cityProsperity`; `frontBlocked`: "The city needs a prosperity of N").
- **Hotels** add `prosperityPerTier` per tier to their district's target, and the `hotelJoints` synergy makes every joint beside one earn more ([economy.md](economy.md#synergies)).

The heat system reaches prosperity through inspections, raids reach it through the raid penalty, and the supply chain through shortages: running hot, getting raided or running out of cigarettes costs every joint in the city.

## The bot

The bot values a hotel, or a hotel tier, by what its prosperity would add to the joints on its street, plus half a blocked business's yield when the hotel gets its street to that business's `minProsperity`, plus a share of a blocked front's value when the city's mean is short ([sim.md](../sim.md#the-casual-bot)). It never offers itself a business or front that `racketBlocked` or `frontBlocked` refuses.

**Tests:** `tests/prosperity.test.ts` (still before Act III; the target and its penalties; steps only at whole hours; joints move with it, rackets don't; the Card Club and a hotel; the hotel synergy; the Bank; a raid's penalty), `tests/reconcile.test.ts` (split invariance with prosperity stepping, a raid penalty running out and a shut business reopening), `tests/acts.test.ts` (districts start at their targets).
