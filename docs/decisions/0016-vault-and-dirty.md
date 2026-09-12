# 0016. The vault and Dirty are separate buckets

- **Status:** Accepted
- **Date:** 2026-09-12

## Context
The plan's action notes (§7) split income in two: rackets accrue into a capped **vault**, `COLLECT` moves it into spendable, uncapped **Dirty**, raids seize the vault only, and wages draw from Dirty first, then the vault. It leaves some edges open: what happens when the cap drops below the vault's contents, where job rewards land, what happens to unpaid wages, and what Tolya's demand is a share of.

## Decision
Follow the plan's split, with these details:
- **Cap changes:** accrual stops at `vaultCap` but never shrinks the vault. If yield falls (inspections, damage) and the cap drops below the current contents, accrual just pauses.
- **Lost income:** yield that would pass the cap is counted in `stats.dirtyLostToCap`, and `VAULT_CAPPED` carries the exact moment the vault filled.
- **Job rewards** are paid straight into Dirty: cash in hand, not raidable.
- **Wage shortfalls** are forgiven after the missed-wage loyalty hit; no debt carries over ([0018](0018-crew-rules.md)).
- **Tolya's demand** is a share of the vault **cap**, not its contents, so collecting just before his visit doesn't shrink it ([0017](0017-tolya-and-zhanna.md)).

## Consequences
- Collecting often protects income from raids; the cap is what brings players back (the vault "leash" in manual §4).
- Dirty is safe from police but not from crew: a walkout takes a share of it.
- A player away long enough to fill the vault loses income. That's the intended cadence pressure, and `dirtyLostToCap` measures it.

## Related
`engine/systems/rackets.ts` (`accrueVault`), `engine/core/apply.ts` (`COLLECT`), `engine/systems/heat.ts` (`raid`), `engine/systems/crew.ts` (wage settlement), [systems/economy.md](../systems/economy.md#vault-and-dirty).
