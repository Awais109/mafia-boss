# 0067. Every act has goals: four from Act II on, guiding and paying gold, gating nothing

- **Status:** Accepted
- **Date:** 2026-11-16
- **Issue:** #37

## Context
Act I has seven goals on Home, and Act II opens once they're done (ADR 0039). From Act II, Home showed only what the next act asks for: a Rep figure, then a mission or a district. A tester in Act II with ★1,200 found "no goal" and didn't know what to do. #36 named the missing mission. The game review (2026-11-14) asked for three or four small goals in each act, each paying gold. The owner chose goals that guide and pay, with every gate left as it is.

## Decision
- **Four goals for each act from II** (`goals.byAct`), each teaching something the act brings, and none of them something its gate asks for (Home already shows those under Next):
  - **II:** the Precinct Captain, a Stash House, the Port Quarter or the Sovietsky Blocks, a lot from Zhanna;
  - **III:** the Big Score, the Cooperative Bank (it needs a prosperous street), a Loan Desk, the Centre;
  - **IV:** the Customs Chief, a convoy landed, a Foreign Goods Shop, 300 premium packs sold;
  - **V:** the Newspaper, a campaign, a tender fixed, the Governor;
  - **VI:** a business legalized, fifteen legal, the Holding, three hearings won.
  - Picked with the casual bot's timings: each act's four land at different points through it, not all on its first day. City Hall, a tier-6 business and five legal businesses were tried and dropped, because the bot met them within hours of the act opening (TUNING.md).
- **They pay `goals.rewardGoldByAct`:** 2 bars each in Acts II–III, 3 in IV–VI (Act I's pay 1). A later act's hour is worth less to its pace, and there's more to skip.
- **They gate nothing.** Every gate in `progression.acts` stays.
- **Only the act you're in counts.** A goal met early waits for its act. One left when the act moves on stays undone and is no longer shown, so the list on Home is always the act's own.
- **The counts are config** (`goals.need.premiumSold`, `legalBusinesses`, `hearingsWon`), and validation keeps each goal in at most one act's list.
- **Home shows the act's goals** in Act I's place (`goalsView` returns the act, its gold and its rows), with a line under later acts' lists: "For gold, and to learn the act. The next act asks only for what's under Next." Each open goal's hint says how far along it is, or where to go: an official's price against your Influence, a business's price or the Rep it opens at, the cheapest district to take, or Ops, the Map or Business.
- **The same list holds every goal** (`state.goals.done`), so saves don't change and there's no migration. Readers that meant Act I's count now count Act I's list (`actOneGoalsDone`) rather than the list's length. The notice reads "Goal", not "Act I goal".

## Consequences
- **The bot** (10 seeds, 60 days) meets 18 of the 20 on most seeds, without chasing any:
  - Zhanna's lot: 0/10. It buys only when stock runs short, and in Act II it rarely does. A player has the goal to try her.
  - The campaign: 4/10.
  - The third hearing won: 8/10.
  - `tests/sim.test.ts` checks it meets at least three of each act's four on average.
- **Pacing doesn't move:** the casual bot never spends gold, and nothing is gated.
- **A save already in a later act** is paid, at its next check, for that act's goals it has already met.
- **Gold:** a player who meets every goal gets 52 more bars over Acts II–VI (2 × 4 × 2 + 3 × 4 × 3), beside the 45 the acts already grant on opening.

## Related
`engine/systems/goals.ts` (`GOAL_CHECKS`, `goalProgress`, `actGoals`, `allGoals`, `checkGoals`), `engine/config/schema.ts` (`GoalId`, `LaterGoalId`, `goals.byAct`, `goals.rewardGoldByAct`), `engine/config/defaults.ts`, `app/goals.ts`, `app/screens/HomeScreen.tsx`, `app/acts.ts` (`actOneGoalsDone`), `tests/goals.test.ts`, `tests/sim.test.ts`, [progression.md](../systems/progression.md#later-acts-goals), [gold.md](../systems/gold.md), [ADR 0035](0035-guided-opening.md), [ADR 0039](0039-goals-gate-act-two.md), [ADR 0066](0066-act-one-in-two-days.md).
