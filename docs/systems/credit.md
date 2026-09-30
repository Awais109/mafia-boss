# Credit: loans and the loan desk

From Act III you can borrow Clean against the laundering you're already doing, and lend Dirty out through a loan desk at interest ([ADR 0042](../decisions/0042-act-iii-credit-and-consequences.md)).

**Code:** `engine/systems/credit.ts` (`creditOpen`, `loanCap`, `loanDue`, `takeLoan`, `repayLoan`, `creditDayBoundary`, `lendCap`, `defaultChance`, `lend`, `lendingDue`), the `TAKE_LOAN`, `REPAY_LOAN` and `LEND` handlers in `engine/core/apply.ts`. App: `app/components/CreditCard.tsx` on Fronts.
**Config:** `credit.*`, `lendHoursPerTier` on `rackets.types`, the `collectors` and `lendingDefault` incidents.

## Borrowing

`state.loan = { principal, owed, missed } | null`: one loan at a time, from `credit.fromAct`.

```
cap = max(credit.minCap, round(credit.maxDaysOfClean × mean daily Clean on the ledger's closed days))
```

`TAKE_LOAN { amount }` checks the act ("Nobody lends to you yet"), that there's no loan ("Pay off the loan you have first") and the cap ("They’ll lend up to N"). It adds Clean, which earns no Rep: borrowed money isn't spent. `LOAN_TAKEN { amount, owed }`.

At every day start, after wages and upkeep (`creditDayBoundary`):

```
interest = owed × credit.interestPerDay            owed += interest
due      = min(owed, principal × credit.repayPctPerDay + interest)
```

- **Clean covers it:** paid (`LOAN_PAYMENT { paid, owed }`, or `LOAN_REPAID` once nothing's left).
- **It doesn't:** missed (`LOAN_MISSED { due, missed }`). The collectors come: a `collectors` incident naming one of your joints or rackets, with `due` as its amount: let them make a point (the default: condition and heat), pay double in Clean, or show them out (a Muscle contest). At `credit.missesToRepossess` misses in a row the lender's men take the keys ([ADR 0051](../decisions/0051-rock-bottom.md)): the middle earner of your businesses by yield (a premises only if nothing earns) is gone, whoever minded it comes home, and the loan is closed (`LOAN_REPOSSESSED { racketId, racketType, districtId, owed }`, `stats.loans.repossessed`). The debt never compounds for ever. Saves from before this kept `seized`, the old vault share.

Payments only ever come from Clean. Repaying in Dirty would turn Dirty into Clean at 1:1 less interest, better than any front.

`REPAY_LOAN { amount }` pays down early from Clean. `loanDue` is what the next day start will ask for.

## Lending

A **Loan Desk** (premises, one per city) lends Dirty out. `state.lending = { id, amount, dueAt } | null`: one loan at a time.

```
cap     = floor(lendHoursPerTier × tier × condition/100 × Dirty yield per hour)     (the best working desk)
default = max(lending.minDefault, lending.defaultBase − lending.defaultPerProsperity × the desk's street prosperity)
```

`LEND { amount }` needs the act, a desk ("You need a loan desk"), nothing out ("Money is already out"), the cap and the Dirty. It emits `LENT { amount, dueAt }`, with `dueAt` `lending.termHours` ahead. That's a reconcile boundary: when it passes, `lendingDue` rolls once on `rng.derive('lend', id)`:
- **repaid:** `amount × (1 + lending.returnPct)` Dirty, `LENDING_REPAID { amount, returned }`;
- **defaulted:** `LENDING_DEFAULTED { amount }` and a `lendingDefault` incident: write it off (the default) or send someone after it (a Nerve contest; win half of it back).

Dirty goes out and Dirty comes back, so lending is a return on idle cash, never a way to launder. A prosperous street makes a better desk.

## Stats

`stats.loans { borrowed, interest, repaid, missed, seized, repossessed }` (`seized` counts only old saves' vault seizures), `stats.lending { lent, returned, defaults }`.

## The bot

It borrows only for the purchase it wants most that it can't afford, when that purchase pays for itself within 48 hours and fits the heat budget, keeps back the next payment when it spends, and repays from whatever Clean is left. It lends everything idle above its running-cost reserve whenever the desk is free, and values a desk by the expected return on the extra it could lend on that street ([sim.md](../sim.md#the-casual-bot)).

**Tests:** `tests/credit.test.ts` (borrowing opens in Act III, one at a time, within the cap, without Rep; the cap follows the ledger; interest and the morning payment; the collectors, and repossession on a second miss; lending needs a desk and stays within its cap; repaid with interest; a default files a chase that can win half back), `tests/reconcile.test.ts` (split invariance with a loan and a loan falling due mid-window), `tests/migrate.test.ts`.
