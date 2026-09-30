# Convoys and the road to the border

From Act IV, premium imported cigarettes come over the border by convoy. A convoy costs Clean and three crew for a long job. When it comes home it can be taken on the highway by the Colonel's men or seized by customs at the crossing; what gets through lands in premium stock ([ADR 0043](../decisions/0043-act-iv-zastava.md)).

**Code:** `engine/systems/convoys.ts` (`colonelHolds`, `passageActive`, `colonelHostile`, `passageCost`, `changeColonel`, `convoyLoad`, `hijackChance`, `customsChance`, `buyPassage`, `landConvoy`), called from `resolveOp` in `engine/systems/ops.ts`; the `BUY_PASSAGE` handler in `engine/core/apply.ts`. App: `app/components/ColonelCard.tsx` on the Map; convoy odds on Ops.
**Config:** `ops.list.runConvoy` (`costClean`, `premium`), `convoys.*`, `rivals.colonel.*`, `officials.list.customsChief.seizureMult`, and on `rackets.types`: `convoyBonusPerTier`, `hijackMult` (Convoy Depot), `premiumCapPerTier`, `seizureMult` (Bonded Warehouse).

## A convoy

`runConvoy` is an ordinary job ([ops.md](ops.md)): three crew, weighted on Nerve and Muscle, `costClean` charged at the start without Rep (`stats.smugglingPaid`), a heat spike, and a roll for full, partial or fail. A failed convoy never reaches the border and the Clean is gone. One that succeeds (fully or partly) comes to the crossing, where `landConvoy` rolls twice on `rng.derive('convoy', opId)`, once per convoy, so the timing of a reconcile can't reroll it:

1. **The road.** Taken with `hijackChance`; the load is lost (`OP_RESOLVED.hijacked`, `stats.convoys.hijacked`).
2. **Customs.** Seized with `customsChance`; the load is lost (`OP_RESOLVED.seized`, `stats.convoys.seized`).
3. **Landed.** `round(convoyLoad × reward share)` packs go into premium stock through `addStock`, up to the cap; `OP_RESOLVED.premium` is what went in (`stats.convoys.landed`).

```
convoyLoad    = premium × (1 + convoyBonusPerTier × tier × condition/100)          (the best working Convoy Depot)
hijackChance  = 0                                   while you hold Zastava, or passage is paid
              = convoys.hijackChance × depot hijackMult × (convoys.hijackHostileMult while the Colonel is hostile)
customsChance = (convoys.customsBase + convoys.customsPerHeat × heat)
                × Π officials' seizureMult (the Customs Chief)
                × seizureMult of a working Bonded Warehouse in Zastava
```

Every convoy counts in `stats.convoys.run`.

## Passage

While the Colonel holds Zastava, `BUY_PASSAGE` pays him `passage.hoursOfYield` hours of your Dirty yield for `passage.hours` of a clear road (`passageCost`, `rival.colonel.passageUntil`). The chance is read when the convoy lands, so passage has to cover the landing, not the departure. Passage stacks from when the current one ends. Taking Zastava ends the need for it. The Colonel himself is in [districts-and-rivals.md](districts-and-rivals.md#the-colonel).

## The premises

- **Bonded Warehouse:** premium stock cap (`premiumCapPerTier × tier`); in Zastava it also scales customs by `seizureMult`. One per district.
- **Convoy Depot:** one per city; adds to every load and scales road losses by `hijackMult`.

## Events and stats

`OP_RESOLVED { premium?, hijacked?, seized? }`, `PASSAGE_BOUGHT { cost, until }`; `stats.convoys { run, landed, hijacked, seized }`, `stats.passagesPaid`.

## The bot

It sends a convoy when premium would run out within a day, pays for passage first while the Colonel holds the road, and values convoys, premium joints and the two premises as in [sim.md](../sim.md#the-casual-bot).

**Tests:** `tests/zastava.test.ts`, `tests/reconcile.test.ts` (a convoy landing mid-window, passage running out), `tests/migrate.test.ts`.
