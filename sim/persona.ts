import {
  apply,
  baseWage,
  canAffordEffects,
  canHaggle,
  canPressure,
  colonelHolds,
  convoyLoad,
  customsChance,
  hijackChance,
  passageActive,
  passageCost,
  contestOdds,
  contractBlocked,
  creditOpen,
  lendCap,
  loanCap,
  loanDue,
  derive,
  DISTRICT_IDS,
  electionScheduled,
  legalizeBlocked,
  legalizeCost,
  ministryTarget,
  opinionTarget,
  pointCost,
  pointsRoom,
  voteShare,
  winChance,
  formulas,
  FRONT_TYPES,
  haggleOdds,
  influenceRoom,
  jobXp,
  OFFICIAL_IDS,
  openLots,
  openSpots,
  opConfigAt,
  opDirtyRewardFor,
  opUnlocked,
  OP_OUTCOMES,
  MISSION_IDS,
  missionBlocked,
  missionOp,
  OP_TYPES,
  outcomeOdds,
  frontBlocked,
  premisesBlocked,
  prosperityOn,
  prosperityYieldMult,
  racketBlocked,
  rushCost,
  surplusRoomToday,
  RACKET_TYPES,
  STATS,
  zhannaDeals,
  type Act,
  type Action,
  type Config,
  type CrewMember,
  type Derived,
  type DistrictId,
  type FrontMode,
  type GoalId,
  type InboxEffects,
  type InboxItem,
  type OpConfig,
  type OpType,
  type PerkId,
  type PlayerState,
  type RacketType,
} from '../engine'

// The bot's perk order: money first, then heat, speed, loyalty, teaching, haggling.
const PERK_PREFERENCE: readonly PerkId[] = ['earner', 'ghost', 'fixer', 'steady', 'mentor', 'bargainer']

// The "engaged casual" policy (plan §11). A persona is a policy, not a person: where
// humans diverge from it is where the design is more interesting — or more confusing —
// than it assumes (manual §7). Pure: shared by the CLI sim and the in-app Bot.

export type PersonaOptions = {
  name: string
  sessionHours: Record<Act, number[]> // hours of day (game time) the persona checks in
  reserveWageHours: number // keep this many hours of wages in Dirty, plus one bribe
  bribeAboveHeat: number
  officialAboveHeat: number
  heatBudget: number // skip purchases that push heat target past this, unless control is buyable
  districtPaybackHours: number // buy a district when tribute over this many hours exceeds the buy-out
  repairBelow: number
  raiseBelow: number
  repValue: number // Dirty-equivalents per Rep point, for valuing ops
  influenceValueHours: number // an Influence point is worth this many hours of yield while an official is left to buy
  loyaltyValue: number // Dirty-equivalents per loyalty point (×3 for someone below raiseBelow)
  pushBacklogHours: number // push a front when Dirty waiting to be washed exceeds this many hours of its throughput
  xpValue: number // Dirty-equivalents per stat point a job would earn
  haggleAbove: number // haggle with Tolya when the odds are at least this
  stockReserveHours: number // smuggle when cigarettes would run out sooner than this
  maxWageShare: number // past two crew, hire only while wages stay under this share of yield
  supplyHorizonHours: number // more factory output is worth buying only when stock would run out within this many hours
  rushJobs: boolean // spend gold bars finishing running jobs at the start of a session
  opinionValuePct: number // a point of public opinion is worth this share of yield an hour (half once mayor)
  campaignTarget: number // campaign until the chance of winning the coming election is at least this
  campaignWithinHours: number // campaign when the election is at most this far off
  hearingWinHours: number // a hearing beaten in court is worth this many hours of yield while the Empire needs it
  opinionHours: number // a point of opinion, or of the Ministry's attention saved, is worth this many hours of yield (ADR 0054)
}

export const CASUAL: PersonaOptions = {
  name: 'casual',
  // Act I checks in on the vault's 2.5 h leash through the day; Act II settles into four sessions; later
  // acts follow their longer leashes down to one visit a day (ADR 0040).
  sessionHours: { 1: [8, 10.5, 13, 15.5, 18, 20.5, 23], 2: [8, 13, 18, 22], 3: [8, 14, 20], 4: [8, 20], 5: [9, 21], 6: [9] },
  reserveWageHours: 12,
  bribeAboveHeat: 55,
  officialAboveHeat: 30,
  heatBudget: 55, // lives with inspections, stays clear of raids
  districtPaybackHours: 48,
  repairBelow: 75,
  raiseBelow: 35,
  repValue: 10,
  influenceValueHours: 3,
  loyaltyValue: 1,
  pushBacklogHours: 6,
  xpValue: 3,
  haggleAbove: 0.6,
  stockReserveHours: 12,
  maxWageShare: 0.25,
  supplyHorizonHours: 24,
  rushJobs: false, // the casual bot never spends gold: pacing is tuned without it (ADR 0034)
  opinionValuePct: 0.01,
  campaignTarget: 0.9,
  campaignWithinHours: 48,
  hearingWinHours: 6,
  opinionHours: 0.5,
}

// Spends every bar it can finishing jobs (plan (t)): how much sooner do acts clear with gold?
export const GOLD_RUSH: PersonaOptions = { ...CASUAL, name: 'goldRush', rushJobs: true }

// N sessions spread evenly between 08:00 and 22:00, for both acts.
export function withSessions(p: PersonaOptions, n: number): PersonaOptions {
  const hours = n <= 1 ? [12] : Array.from({ length: n }, (_, i) => 8 + (i * 14) / (n - 1))
  return { ...p, name: `${p.name}-${n}s`, sessionHours: { 1: hours, 2: hours, 3: hours, 4: hours, 5: hours, 6: hours } }
}

export function nextSessionAfter(state: PlayerState, c: Config, p: PersonaOptions, t: number): number {
  const H = c.time.hourMs
  const D = 24 * H
  const hours = p.sessionHours[state.act]
  for (let day = Math.floor(t / D); ; day++) {
    for (const h of hours) {
      const s = day * D + Math.round(h * H)
      if (s > t) return s
    }
  }
}

export type ActionRecord = { t: number; action: Action; error?: string }

export function playSession(
  input: PlayerState,
  t: number,
  c: Config,
  p: PersonaOptions,
  nextSessionAt: number,
): { state: PlayerState; actions: ActionRecord[] } {
  let state = input
  const actions: ActionRecord[] = []
  const tryAct = (action: Action): boolean => {
    const r = apply(state, action, t, c)
    actions.push(r.error ? { t, action, error: r.error } : { t, action })
    if (!r.error) state = r.state
    return !r.error
  }
  const d = () => derive(state, c)

  tryAct({ type: 'SESSION_START' })
  if (!state.tutorial.done) tryAct({ type: 'TUTORIAL_SKIP' })

  // 1. Collect
  tryAct({ type: 'COLLECT' })

  // Goal-directed (ADR 0039): Act II needs every Act I goal done, and the bot's normal economic
  // logic doesn't reliably trigger three of them (they only fire on a predicted shortage or high
  // front utilization, both rare under the tuned economy) — a real player would just do these
  // deliberately once they know goals gate Act II, so the bot does too, ahead of its usual priority.
  // Runs before the deposit step below, so any new upkeep this session is already reflected in the
  // reserve it keeps back — otherwise a session's deposit can drain Dirty past what a goal purchase
  // is about to obligate it to. Gated on the same wage/upkeep reserve health the rest of the bot
  // respects: none of this should run while Dirty is already tight.
  const goalDone = (id: GoalId) => state.goals.done.includes(id)
  const dirtyHealthy = state.dirty >= (d().wagesPerHr + d().upkeepPerHr) * p.reserveWageHours

  if (dirtyHealthy && !goalDone('factoryTier2')) {
    const factory = state.rackets.find((r) => r.type === 'tobaccoFactory' && r.tier < 2)
    if (factory) {
      const cost = formulas.racketUpgradeCost(c, 'tobaccoFactory', factory.tier)
      if (state.clean >= cost) tryAct({ type: 'UPGRADE_RACKET', racketId: factory.id })
    }
  }

  if (dirtyHealthy && !goalDone('workFront')) {
    for (const f of d().perFront) {
      const level = state.fronts.find((x) => x.id === f.id)!.level
      if (level >= 2 || f.upgradeCost === null || state.clean < f.upgradeCost) continue
      tryAct({ type: 'UPGRADE_FRONT', frontId: f.id, track: 'rate' })
    }
  }

  if (dirtyHealthy && (state.stats.opsByType.smuggleCigarettes ?? 0) < 3 && opUnlocked(state, c, 'smuggleCigarettes')) {
    const op = c.ops.list.smuggleCigarettes
    const idle = state.crew.filter((m) => m.status === 'idle')
    if (idle.length >= op.crew && state.clean >= (op.costClean ?? 0)) {
      const team = [...idle].sort((a, b) => statSum(b) - statSum(a)).slice(0, op.crew)
      tryAct({ type: 'START_OP', opType: 'smuggleCigarettes', crewIds: team.map((m) => m.id) })
    }
  }

  if (dirtyHealthy && !goalDone('secondDistrict')) {
    // Complete home plus the cheapest other unlocked district: every allows-slot, every premises lot.
    const home = DISTRICT_IDS.find((id) => c.districts.list[id].home)!
    const owned = DISTRICT_IDS.filter((id) => controllerOf(state, id) === 'player')
    let targets = owned.length >= 2 ? owned.slice(0, 2) : [home]
    if (targets.length < 2) {
      const buyable = DISTRICT_IDS.filter((id) => d().unlocked.district[id] && controllerOf(state, id) !== 'player').sort(
        (a, b) => c.districts.list[a].buyout - c.districts.list[b].buyout,
      )
      const pick = buyable.find((id) => state.clean >= c.districts.list[id].buyout)
      if (pick && tryAct({ type: 'BUY_DISTRICT', districtId: pick })) targets = [home, pick]
    }
    for (const id of targets) {
      for (let guard = 0; guard < 10; guard++) {
        const now = d()
        const spot = openSpots(state, c, id).find((t) => now.unlocked.racket[t] && state.clean >= now.costs.racket[t])
        if (spot && tryAct({ type: 'BUY_RACKET', racketType: spot, districtId: id })) continue
        const lot = openLots(state, c, id) > 0
        // Cap upkeep relative to yield here too (same spirit as the wage-share guard on hiring below):
        // completing a district's premises lots is a goal requirement, not a reason to run the upkeep away.
        const premises = lot
          ? RACKET_TYPES.find((t) => {
              if (c.rackets.types[t].kind !== 'premises' || !now.unlocked.racket[t]) return false
              if (premisesBlocked(state, c, id, t) || state.clean < now.costs.racket[t]) return false
              return now.upkeepPerHr + formulas.premisesUpkeep(c, t, 1) <= p.maxWageShare * now.yieldPerHr
            })
          : undefined
        if (premises && tryAct({ type: 'BUY_RACKET', racketType: premises, districtId: id })) continue
        break
      }
    }
  }

  // Answer every pending decision with the option worth most to the bot.
  for (const item of [...state.inbox]) {
    const v = valuation(state, c, p)
    const affordable = item.options.filter((o) => canAffordEffects(state, o.effects))
    if (affordable.length === 0) continue
    const rankOf = (id: string) => {
      const i = PERK_PREFERENCE.indexOf(id as PerkId)
      return i < 0 ? PERK_PREFERENCE.length : i
    }
    const best =
      item.kind === 'perk'
        ? [...affordable].sort((a, b) => rankOf(a.id) - rankOf(b.id))[0]
        : affordable.reduce((a, b) => (valueOf(state, c, p, v, item, b.effects) > valueOf(state, c, p, v, item, a.effects) ? b : a))
    tryAct({ type: 'RESOLVE_INBOX', itemId: item.id, optionId: best.id })
  }

  // Tolya: talk him down when the odds are good, otherwise pay when it's affordable; fix what he broke.
  {
    const demand = state.rival.tolya.demand
    if (
      demand !== null &&
      canHaggle(state) &&
      haggleOdds(state, c) >= p.haggleAbove &&
      state.dirty >= demand * c.rivals.tolya.haggle.pricePct
    ) {
      tryAct({ type: 'PAY_TRIBUTE', choice: 'haggle' })
    }
    const still = state.rival.tolya.demand
    if (still !== null && state.dirty >= still) tryAct({ type: 'PAY_TRIBUTE' })
  }
  for (const id of state.rackets.map((r) => r.id)) {
    const r = state.rackets.find((x) => x.id === id)!
    if (r.condition < p.repairBelow && state.dirty >= formulas.racketRepairCost(c, r.type)) {
      tryAct({ type: 'REPAIR_RACKET', racketId: id })
    }
  }

  // Zhanna buys the surplus when stock sits near its cap and the factories outrun the joints (plan (p)).
  {
    const sup = d().supply
    if (zhannaDeals(state, c) && sup.madePerHr > sup.demandPerHr && sup.stock >= 0.9 * sup.cap) {
      const packs = Math.min(surplusRoomToday(state, c, t), Math.floor(sup.stock - 0.7 * sup.cap))
      if (packs >= 1) tryAct({ type: 'SELL_SURPLUS', packs })
    }
  }

  // Campaign in the days before the count, before any Dirty goes into a front or out on loan, until the odds look
  // good: Influence the officials still to come won't need, then Dirty above the reserve (ADR 0044).
  if (electionScheduled(state) && state.politics.nextElectionAt - t <= p.campaignWithinHours * c.time.hourMs) {
    const e = c.elections
    const neededShare = 0.5 - e.noise + 2 * e.noise * p.campaignTarget
    // Influence the officials still to come will need (the Governor, once mayor) stays back.
    const officialsDue = OFFICIAL_IDS.filter((id) => !state.officials.includes(id) && c.officials.list[id].act <= state.act).reduce(
      (sum, id) => sum + c.officials.list[id].cost,
      0,
    )
    for (const pay of ['influence', 'dirty'] as const) {
      if (winChance(state, c) >= p.campaignTarget) break
      const now = d()
      const reserve = pay === 'dirty' ? (now.wagesPerHr + now.upkeepPerHr) * p.reserveWageHours + now.costs.bribe : officialsDue
      const each = pointCost(state, c, pay)
      const afford = Math.floor(((pay === 'dirty' ? state.dirty : state.influence) - reserve) / each)
      const needed = Math.ceil((neededShare - voteShare(state, c)) / e.perPoint)
      const points = Math.min(afford, needed, pointsRoom(state, c))
      if (points >= 1) tryAct({ type: 'CAMPAIGN', points, pay })
    }
  }
  // Front dial: lie low when hot; push through a backlog when the heat budget allows it.
  {
    const now = d()
    const reserve = (now.wagesPerHr + now.upkeepPerHr) * p.reserveWageHours + now.costs.bribe
    const backlog = state.dirty - reserve + state.fronts.reduce((sum, f) => sum + f.buffer, 0)
    for (const f of now.perFront) {
      let mode: FrontMode = 'normal'
      if (state.heat > p.bribeAboveHeat) mode = 'layLow'
      else if (backlog > p.pushBacklogHours * f.baseThroughput) {
        const pushed = formulas.frontSuspicion(c, { type: f.type, capacityLevel: f.capacityLevel, mode: 'push' }, 1)
        if (formulas.heatTarget(now.exposure - f.suspicion + pushed, now.control) <= p.heatBudget) mode = 'push'
      }
      if (mode !== f.mode) tryAct({ type: 'SET_FRONT_MODE', frontId: f.id, mode })
    }
  }

  // 2. Deposit up to buffer caps, keeping a reserve of running costs × 12 h + one bribe
  {
    const now = d()
    const reserve = (now.wagesPerHr + now.upkeepPerHr) * p.reserveWageHours + now.costs.bribe
    for (const f of [...now.perFront].sort((a, b) => b.rate - a.rate)) {
      if (f.frozen) continue // the Ministry's (ADR 0044)
      const buffer = state.fronts.find((x) => x.id === f.id)!.buffer
      const amount = Math.floor(Math.min(state.dirty - reserve, f.bufferCap - buffer))
      if (amount >= 1) tryAct({ type: 'DEPOSIT', frontId: f.id, amount })
    }
  }

  // Idle Dirty goes out through the loan desk, above the running-cost reserve (ADR 0042).
  if (creditOpen(state, c) && !state.lending) {
    const now = d()
    const reserve = (now.wagesPerHr + now.upkeepPerHr) * p.reserveWageHours + now.costs.bribe
    const amount = Math.floor(Math.min(lendCap(state, c), state.dirty - reserve))
    if (amount >= 1) tryAct({ type: 'LEND', amount })
  }

  // 3. Bribe when hot
  if (state.heat > p.bribeAboveHeat && !(state.bribeControl > 0 && state.bribeUntil > t) && state.dirty >= d().costs.bribe) {
    tryAct({ type: 'BRIBE' })
  }

  // 4. Officials when affordable and heat is climbing
  for (const id of OFFICIAL_IDS) {
    const now = d()
    if (!now.unlocked.official[id] || state.officials.includes(id) || t < state.officialCooldownUntil) continue
    if (state.influence < c.officials.list[id].cost) continue
    // The Governor also answers the Ministry, which bribes and heat don't show (ADR 0044).
    const ministry =
      (c.officials.list[id].ministryRelief ?? 0) > 0 &&
      (state.politics.attention >= c.ministry.freezeAt / 2 || ministryTarget(state, c, now) >= c.ministry.freezeAt)
    if (state.heat > p.officialAboveHeat || now.heatTarget > p.officialAboveHeat || ministry) {
      tryAct({ type: 'BUY_OFFICIAL', officialId: id })
    }
  }

  // A new front opens the throttle; nothing else comes first.
  for (const type of FRONT_TYPES) {
    const now = d()
    if (!frontBlocked(state, c, type) && state.clean >= now.costs.front[type]) {
      tryAct({ type: 'BUY_FRONT', frontType: type })
    }
  }

  // Crew upkeep: fill empty slots, raise anyone close to walking.
  while (state.crew.length < d().crewSlots && state.clean >= d().costs.recruit && state.recruitPool.candidates.length) {
    const best = [...state.recruitPool.candidates].sort((a, b) => statSum(b) - statSum(a))[0]
    // Past two crew, hire only while wages stay a modest share of what the businesses make (plan (s)).
    const now = d()
    if (state.crew.length >= 2 && now.wagesPerHr + baseWage(c, best) * now.wageMult > p.maxWageShare * now.yieldPerHr) break
    if (!tryAct({ type: 'RECRUIT', candidateId: best.id })) break
  }
  for (const m of state.crew) {
    if (m.loyalty < p.raiseBelow && state.clean >= d().costs.raise) tryAct({ type: 'RAISE', crewId: m.id })
  }

  // Rock bottom (ADR 0051): open the family's envelope the moment it's there.
  if (state.rockBottom.pending) tryAct({ type: 'OPEN_ENVELOPE' })

  // Boss missions (ADR 0050), before any other job claims the crew. An overreach goes out the moment it
  // appears, since it's the only door to the next act, with the idle crew the bot values least. A rematch
  // goes with the team that gives it the best odds; lost, it comes back after the wait.
  for (const id of MISSION_IDS) {
    if (missionBlocked(state, c, id, t)) continue
    const m = c.missions.list[id]
    const idle = state.crew.filter((x) => x.status === 'idle')
    if (idle.length < m.crew) continue
    const team = m.kind === 'rematch' ? bestMissionTeam(c, missionOp(c, id), idle) : [...idle].sort((a, b) => statSum(a) - statSum(b)).slice(0, m.crew)
    tryAct({ type: 'START_MISSION', missionId: id, crewIds: team.map((x) => x.id) })
  }

  // After the story (ADR 0052): take every contract the Clean covers, with the idle crew the bot values least.
  // It always comes back done and pays more than it costs.
  for (const k of state.after.contracts.items) {
    if (contractBlocked(state, c, k, t)) continue
    const idle = state.crew.filter((x) => x.status === 'idle')
    if (idle.length < k.crew) continue
    const team = [...idle].sort((a, b) => statSum(a) - statSum(b)).slice(0, k.crew)
    tryAct({ type: 'START_CONTRACT', contractId: k.id, crewIds: team.map((x) => x.id) })
  }

  // 5. Dispatch every idle crew member to the best op they can do
  const gapMinutes = Math.max(15, ((nextSessionAt - t) / c.time.hourMs) * 60)
  const dispatchIdle = () => {
    for (let guard = 0; guard < 10; guard++) {
      const best = bestDispatch(state, c, p, t, gapMinutes)
      if (!best || !tryAct(best)) break
    }
  }
  dispatchIdle()
  // Gold: finish what just went out, soonest first, and send the crew straight back out, while the bars last.
  for (let round = 0; p.rushJobs && round < 20; round++) {
    let rushed = false
    for (const op of [...state.ops].sort((a, b) => a.completesAt - b.completesAt)) {
      if (op.type === 'contract') continue // a contract can't be rushed (ADR 0052)
      if (state.gold >= rushCost(c, op.completesAt - t)) rushed = tryAct({ type: 'RUSH_OP', opId: op.id }) || rushed
    }
    if (!rushed) break
    dispatchIdle()
  }

  // Anyone still idle trains the stat with the most room to grow, if Dirty covers it above the reserve.
  for (const m of state.crew.filter((x) => x.status === 'idle')) {
    const now = d()
    const reserve = (now.wagesPerHr + now.upkeepPerHr) * p.reserveWageHours + now.costs.bribe
    const stat = STATS.reduce((best, st) => (m.potential[st] - m[st] > m.potential[best] - m[best] ? st : best), STATS[0])
    if (m.potential[stat] <= m[stat]) continue
    const type = OP_TYPES.find((ty) => c.ops.list[ty].training === stat)
    if (!type) continue
    const cost = (c.ops.list[type].costDirty ?? 0) * state.act
    if (state.dirty - cost < reserve) continue
    tryAct({ type: 'START_OP', opType: type, crewIds: [m.id] })
  }

  // Passage before a convoy goes out, when the Colonel still holds the road and premium is running low (ADR 0043).
  {
    const now = d()
    const reserve = (now.wagesPerHr + now.upkeepPerHr) * p.reserveWageHours + now.costs.bribe
    const wantConvoy = state.act >= c.premium.fromAct && now.premium.demandPerHr > 0 && now.premium.hoursToEmpty < p.stockReserveHours * 2
    if (wantConvoy && colonelHolds(state) && !passageActive(state, t) && state.dirty - passageCost(state, c) >= reserve) {
      tryAct({ type: 'BUY_PASSAGE' })
      dispatchIdle()
    }
    // Zhanna's premium lots cover the gap between convoys.
    const price = formulas.shipmentPrice(c, state.rival.zhanna.disposition) * c.rivals.zhanna.premium.priceMult
    const premiumReady = state.act >= c.rivals.zhanna.premium.fromAct && state.rival.zhanna.nextShipmentAt <= t
    if (premiumReady && now.premium.demandPerHr > 0 && now.premium.hoursToEmpty < p.stockReserveHours && state.dirty - price >= reserve) {
      tryAct({ type: 'BUY_SHIPMENT', product: 'premium' })
    }
  }

  // A lot from Zhanna when stock would run out soon and Dirty covers it above the reserve (plan (p)).
  {
    const now = d()
    const price = formulas.shipmentPrice(c, state.rival.zhanna.disposition)
    const reserve = (now.wagesPerHr + now.upkeepPerHr) * p.reserveWageHours + now.costs.bribe
    const ready = zhannaDeals(state, c) && state.rival.zhanna.nextShipmentAt <= t
    if (ready && now.supply.hoursToEmpty < p.stockReserveHours && state.dirty - price >= reserve) tryAct({ type: 'BUY_SHIPMENT' })
  }

  // 7 (before spending, so it gets first claim on Clean). Buy a district when it's affordable and its
  // tribute over 48 h outruns the buy-out. Never save for one: that stalls every other purchase for days.
  for (const id of DISTRICT_IDS) {
    const now = d()
    if (!now.unlocked.district[id] || controllerOf(state, id) === 'player') continue
    const buyout = c.districts.list[id].buyout
    if (state.clean >= buyout && (districtTributePerHr(state, now, id) + districtPerkPerHr(state, c, now, id)) * p.districtPaybackHours > buyout) {
      tryAct({ type: 'BUY_DISTRICT', districtId: id })
    }
  }

  // A new front is worth borrowing for: laundering is the throttle, and waiting to save for one while
  // cheaper purchases drain Clean every session means it never comes (ADR 0042).
  if (creditOpen(state, c) && !state.loan) {
    const now = d()
    const front = FRONT_TYPES.find((ty) => !frontBlocked(state, c, ty) && state.clean < now.costs.front[ty])
    const short = front ? now.costs.front[front] - state.clean + loanDue(state, c) : 0
    if (front && short <= loanCap(state, c) && tryAct({ type: 'TAKE_LOAN', amount: Math.ceil(short) })) tryAct({ type: 'BUY_FRONT', frontType: front })
  }

  // Act VI (ADR 0045): every district held is half the Empire; by now they cost little.
  if (state.act >= c.legalize.fromAct) {
    for (const id of DISTRICT_IDS) {
      if (!d().unlocked.district[id] || controllerOf(state, id) === 'player' || state.clean < c.districts.list[id].buyout) continue
      tryAct({ type: 'BUY_DISTRICT', districtId: id })
    }
  }

  // The auction (ADR 0044): a state district is the act's whole catalogue, so it's bought as soon as it can
  // be, with a loan when Clean falls short.
  for (const id of DISTRICT_IDS) {
    const dc = c.districts.list[id]
    if (!dc.auction || !d().unlocked.district[id] || controllerOf(state, id) === 'player') continue
    if (state.clean >= dc.buyout) {
      tryAct({ type: 'BUY_DISTRICT', districtId: id })
    } else if (creditOpen(state, c) && !state.loan) {
      const short = dc.buyout - state.clean + loanDue(state, c)
      if (short <= loanCap(state, c) && tryAct({ type: 'TAKE_LOAN', amount: Math.ceil(short) })) tryAct({ type: 'BUY_DISTRICT', districtId: id })
    }
  }



  // 6. Spend Clean on the best yield gain ÷ cost, within the heat budget. Clean for the next loan payment
  // stays back (ADR 0042).
  let borrowed = false
  for (let guard = 0; guard < 60; guard++) {
    const now = d()
    const budget = state.clean - loanDue(state, c)
    const controlBuyable = canBuyControl(state, c, now, t)
    const options = spendOptions(state, c, now, p).filter((o) => {
      if (o.cost > budget) return false
      if (o.heatGain <= 0 || controlBuyable) return true
      return formulas.heatTarget(now.exposure + o.heatGain, now.control) <= p.heatBudget
    })
    if (options.length === 0) {
      // Borrow for one purchase that pays for itself inside two days, then spend again (ADR 0042).
      if (borrowed || state.loan || !creditOpen(state, c)) break
      const cap = loanCap(state, c)
      const wanted = spendOptions(state, c, now, p)
        .filter((o) => o.cost > budget && o.cost <= budget + cap && o.gain > 0 && o.cost / o.gain <= 48)
        .filter((o) => o.heatGain <= 0 || controlBuyable || formulas.heatTarget(now.exposure + o.heatGain, now.control) <= p.heatBudget)
        .sort((a, b) => b.gain / b.cost - a.gain / a.cost)[0]
      if (!wanted || !tryAct({ type: 'TAKE_LOAN', amount: Math.ceil(wanted.cost - budget) })) break
      borrowed = true
      continue
    }
    options.sort((a, b) => b.gain / Math.max(1, b.cost) - a.gain / Math.max(1, a.cost))
    if (!tryAct(options[0].action)) break
  }
  // Clean left over pays the loan down.
  if (state.loan && !borrowed && state.clean >= 1) tryAct({ type: 'REPAY_LOAN', amount: Math.floor(Math.min(state.clean, state.loan.owed + 1)) })

  return { state, actions }
}

const statSum = (m: CrewMember) => m.muscle + m.brains + m.nerve

// The team of the job's size with the best chance of a clean or partial result: every pair (or single) of
// the idle crew, which stays small.
function bestMissionTeam(c: Config, op: OpConfig, idle: CrewMember[]): CrewMember[] {
  const teams: CrewMember[][] = op.crew === 1 ? idle.map((m) => [m]) : idle.flatMap((a, i) => idle.slice(i + 1).map((b) => [a, b]))
  const win = (team: CrewMember[]) => {
    const o = outcomeOdds(c, op, team)
    return o.full + o.partial
  }
  return teams.reduce((best, team) => (win(team) > win(best) ? team : best), teams[0]).slice(0, op.crew)
}

const controllerOf = (state: PlayerState, id: DistrictId) => state.districts.find((x) => x.id === id)?.controller

function districtTributePerHr(state: PlayerState, d: Derived, id: DistrictId): number {
  return d.perRacket.reduce((sum, r, i) => (state.rackets[i].districtId === id ? sum + r.tribute : sum), 0)
}

// What taking a district adds per hour beyond the tribute it stops: its yield perks on what you
// already run there, and cheaper wages (plan (s)).
function districtPerkPerHr(state: PlayerState, c: Config, d: Derived, id: DistrictId): number {
  if (controllerOf(state, id) === 'player') return 0
  const dc = c.districts.list[id]
  const perks = d.perRacket.reduce((sum, rd, i) => {
    const mult = state.rackets[i].districtId === id ? dc.mod.yieldMult?.[state.rackets[i].type] : undefined
    return mult ? sum + rd.grossYield * (mult - 1) : sum
  }, 0)
  return perks + (1 - (dc.mod.wageMult ?? 1)) * d.wagesPerHr
}

const shortfall = (made: number, demand: number) => (demand > 0 ? Math.max(0, 1 - made / demand) : 0)

// Dirty per pack sold: the cigarette share of joints' yield over what they sell.
function packValue(d: Derived): number {
  return d.supply.demandPerHr > 0 ? d.perRacket.reduce((sum, r) => sum + r.atStake, 0) / d.supply.demandPerHr : 0
}

// Dirty per premium pack sold: the premium share of joints' yield over what they sell (ADR 0043).
function premiumPackValue(d: Derived): number {
  return d.premium.demandPerHr > 0 ? d.perRacket.reduce((sum, r) => sum + r.premiumAtStake, 0) / d.premium.demandPerHr : 0
}

// A premium pack sold also covers an importer's washing: `cover` Dirty through it at its rate, Clean worth 2.
function premiumCoverValue(state: PlayerState, c: Config, d: Derived): number {
  let v = 0
  state.fronts.forEach((f, i) => {
    const cover = c.fronts.types[f.type].coverPerPremiumPack
    if (cover !== undefined) v += cover * d.perFront[i].rate * 2
  })
  return v
}

// Premium supply comes only in convoy loads and Zhanna's lots, so a premium joint is discounted by how
// likely its stock is to be out: little while there's a day's stock, a lot when there isn't.
const premiumRisk = (d: Derived) => (d.premium.hoursToEmpty >= 24 ? 0.2 : 0.6)

// A joint's income, discounted for running short once it sells `extraDemand` more packs an hour.
function jointRisk(d: Derived, share: number, extraDemand: number): number {
  return 1 - share * shortfall(d.supply.madePerHr, d.supply.demandPerHr + extraDemand)
}

// The upkeep multiplier a new premises of this type would get in this district.
function upkeepMultIf(state: PlayerState, c: Config, id: DistrictId, type: RacketType): number {
  const here = [...state.rackets.filter((r) => r.districtId === id).map((r) => r.type), type]
  let mult = 1
  for (const syn of c.rackets.synergies) {
    const m = syn.effect.upkeepMultOf?.[type]
    if (m === undefined || (syn.district !== undefined && syn.district !== id) || !here.includes(syn.a)) continue
    const hasB = syn.b === undefined || (syn.b === 'joints' ? here.some((t) => c.rackets.types[t].kind === 'joint') : here.includes(syn.b))
    if (hasB) mult *= m
  }
  return mult
}

// Yield a new premises would add through a synergy it switches on in this district.
function synergyYieldIf(state: PlayerState, c: Config, d: Derived, id: DistrictId, type: RacketType): number {
  let gain = 0
  for (const syn of c.rackets.synergies) {
    if (syn.a !== type || syn.effect.yieldMult === undefined) continue
    if ((syn.district !== undefined && syn.district !== id) || d.synergies.some((x) => x.districtId === id && x.id === syn.id)) continue
    const mult = syn.effect.yieldMult
    d.perRacket.forEach((rd, i) => {
      const r = state.rackets[i]
      if (r.districtId === id && (syn.b === 'joints' ? rd.kind === 'joint' : syn.b === r.type)) gain += rd.yield * (mult - 1)
    })
  }
  return gain
}

// Permanent control only. A bribe is the emergency lever, not a licence to keep tiering.
function canBuyControl(state: PlayerState, c: Config, d: Derived, t: number): boolean {
  return OFFICIAL_IDS.some(
    (id) =>
      d.unlocked.official[id] &&
      !state.officials.includes(id) &&
      t >= state.officialCooldownUntil &&
      state.influence >= c.officials.list[id].cost,
  )
}

// The Influence multiplier a premises of this type would get in this district (the Union office in Sovietsky).
function influenceMultIf(c: Config, id: DistrictId, type: RacketType): number {
  return c.rackets.synergies.reduce(
    (m, syn) => (syn.a === type && syn.effect.influenceMult !== undefined && (syn.district === undefined || syn.district === id) ? m * syn.effect.influenceMult : m),
    1,
  )
}

const prosperityOf = (state: PlayerState, id: DistrictId) => state.districts.find((x) => x.id === id)?.prosperity ?? 0

// What raising a district's prosperity is worth, per purchase (ADR 0041): its joints' extra income, plus
// half of a business the street is too poor for or a front the city is too poor for, when it gets there.
function prosperityValues(state: PlayerState, c: Config, d: Derived) {
  const on = prosperityOn(state, c)
  const slope = (c.prosperity.yieldMult[1] - c.prosperity.yieldMult[0]) / 100
  const run = new Set(state.rackets.filter((r) => c.rackets.types[r.type].kind !== 'premises').map((r) => r.districtId))
  const blockedFronts = FRONT_TYPES.filter((t) => {
    const ft = c.fronts.types[t]
    return d.unlocked.front[t] && !state.fronts.some((f) => f.type === t) && ft.minProsperity !== undefined && d.cityProsperity < ft.minProsperity
  })
  const jointYield = (id: DistrictId) =>
    d.perRacket.reduce((sum, rd, i) => (rd.kind === 'joint' && state.rackets[i].districtId === id ? sum + rd.yield / Math.max(0.01, rd.prosperityMult) : sum), 0)
  return {
    // `points` is what this purchase adds; `reach` is what it could add over the tiers still to come, so a
    // hotel that gets its street there in two tiers still counts, at half the credit per tier needed.
    gainOf(id: DistrictId, points: number, reach = points): number {
      if (!on || points <= 0) return 0
      let gain = jointYield(id) * slope * points
      const p = prosperityOf(state, id)
      for (const t of c.districts.list[id].allows) {
        const rt = c.rackets.types[t]
        if (rt.minProsperity === undefined || p >= rt.minProsperity || p + reach < rt.minProsperity) continue
        if (!d.unlocked.racket[t] || state.rackets.some((r) => r.districtId === id && r.type === t)) continue
        gain += (rt.baseYield * 0.5) / Math.max(1, Math.ceil((rt.minProsperity - p) / points))
      }
      if (run.has(id)) {
        for (const t of blockedFronts) {
          const ft = c.fronts.types[t]
          const gap = Math.max(1, ft.minProsperity! - d.cityProsperity)
          gain += Math.min(1, points / run.size / gap) * ft.throughput * ft.rate * 0.5
        }
      }
      return gain
    },
  }
}

// Dirty an hour a loan desk (or a tier of one) earns on the extra it can lend: the return, less what borrowers
// who skip town take, over the loan's term.
function lendingValue(state: PlayerState, c: Config, d: Derived, hoursPerTier: number, id: DistrictId): number {
  const l = c.credit.lending
  const amount = hoursPerTier * d.yieldPerHr
  // The desk's street sets the risk: a new desk goes where borrowers are likeliest to pay.
  const p = Math.max(l.minDefault, l.defaultBase - l.defaultPerProsperity * prosperityOf(state, id))
  return (amount * ((1 - p) * (1 + l.returnPct) - 1)) / l.termHours
}

// What a tier of a bonded warehouse or a convoy depot is worth per hour to the premium line (ADR 0043), with a
// convoy every six hours: packs a full stock would have wasted, packs customs or the Colonel would have taken,
// and a depot's bigger loads.
function premiumPremisesValue(state: PlayerState, c: Config, d: Derived, rt: Config['rackets']['types'][RacketType], cond: number, id: DistrictId): number {
  if (d.premium.demandPerHr <= 0 && state.act < c.premium.fromAct) return 0
  const perPremium = premiumPackValue(d) || 30
  const load = convoyLoad(state, c, c.ops.list.runConvoy)
  let packsPerConvoy = 0
  if (rt.premiumCapPerTier) packsPerConvoy += Math.min(rt.premiumCapPerTier * cond, Math.max(0, load - (d.premium.cap - d.premium.stock)))
  if (rt.seizureMult !== undefined && id === 'zastava') packsPerConvoy += customsChance(state, c) * (1 - rt.seizureMult) * load
  if (rt.convoyBonusPerTier) packsPerConvoy += rt.convoyBonusPerTier * cond * (c.ops.list.runConvoy.premium ?? 0)
  if (rt.hijackMult !== undefined) packsPerConvoy += hijackChance(state, c, 0) * (1 - rt.hijackMult) * load
  // The Combine makes premium on its own line (ADR 0044): worth the shortage it saves, since convoys also come.
  const made = Math.min((rt.premiumMakesPerHr ?? 0) * cond, d.premium.demandPerHr) * premiumRisk(d) * perPremium
  return (packsPerConvoy * perPremium) / 6 + made
}

// What a Holding tier is worth an hour (ADR 0045): its bonus on the legal Clean, counting what's about to go legal.
function holdingValue(state: PlayerState, c: Config, d: Derived, bonus: number): number {
  const legalGross = d.perRacket.reduce((sum, rd) => sum + rd.grossYield * (rd.legal ? 1 : 0.5), 0)
  return bonus * legalGross * c.legalize.cleanShare * 2
}

// What a point of public opinion is worth an hour (ADR 0044): it wins elections, eases heat and the
// Ministry, and pays the Construction Trust. Nothing once the target is already at the top.
function opinionPointValue(state: PlayerState, c: Config, d: Derived, p: PersonaOptions): number {
  if (state.act < c.opinion.fromAct || opinionTarget(state, c, state.updatedAt) >= 100) return 0
  const trust = d.perRacket.reduce((sum, rd, i) => {
    const oy = c.rackets.types[state.rackets[i].type].opinionYield
    return oy ? sum + ((rd.grossYield / rd.opinionMult) * (oy[1] - oy[0])) / 100 : sum
  }, 0)
  return d.yieldPerHr * p.opinionValuePct * (state.politics.mayor ? 0.5 : 1) + trust
}

type SpendOption = { action: Action; cost: number; gain: number; heatGain: number }

// What the spend loop would buy next, affordable or not: a smuggling run won't eat into it.
function plannedPurchaseCost(state: PlayerState, c: Config, d: Derived, p: PersonaOptions, t: number): number {
  const controlBuyable = canBuyControl(state, c, d, t)
  const options = spendOptions(state, c, d, p).filter(
    (o) => o.heatGain <= 0 || controlBuyable || formulas.heatTarget(d.exposure + o.heatGain, d.control) <= p.heatBudget,
  )
  options.sort((a, b) => b.gain / Math.max(1, b.cost) - a.gain / Math.max(1, a.cost))
  return options[0]?.cost ?? 0
}

export function spendOptions(state: PlayerState, c: Config, d: Derived, p: PersonaOptions): SpendOption[] {
  const out: SpendOption[] = []

  for (const type of FRONT_TYPES) {
    if (!frontBlocked(state, c, type)) {
      out.push({ action: { type: 'BUY_FRONT', frontType: type }, cost: d.costs.front[type], gain: 1e6, heatGain: 0 })
    }
  }
  const prosperity = prosperityValues(state, c, d)
  for (const f of d.perFront) {
    if (f.util < c.fronts.suspicionStartUtil) continue
    if (f.upgradeCost !== null) {
      const gain = (f.throughput * f.util * c.fronts.upgrade.rateStep) / f.rate // Dirty-equivalent per hour
      out.push({ action: { type: 'UPGRADE_FRONT', frontId: f.id, track: 'rate' }, cost: f.upgradeCost, gain, heatGain: 0 })
    }
    if (f.capacityUpgradeCost !== null) {
      const extra = c.fronts.types[f.type].throughput * c.fronts.upgrade.capacity.step
      out.push({
        action: { type: 'UPGRADE_FRONT', frontId: f.id, track: 'capacity' },
        cost: f.capacityUpgradeCost,
        gain: extra * f.util,
        heatGain: c.fronts.suspicionFactor * extra * Math.max(0, f.util - c.fronts.suspicionStartUtil),
      })
    }
  }

  const sup = d.supply
  const atStake = d.perRacket.reduce((sum, r) => sum + r.atStake, 0)
  const v = valuation(state, c, p)
  const opinionPoint = opinionPointValue(state, c, d, p)
  // Vault hours past the act's target are worth the overnight loss they save, up to a ten-hour leash (plan (k)).
  const leashRoom = Math.max(0, 10 - c.vault.targetHoursByAct[state.act] - d.stashHours)
  const stashValue = (extraHours: number) => (Math.min(Math.max(0, extraHours), leashRoom) * d.yieldPerHr) / 24
  const yieldShare = (id: DistrictId) =>
    d.yieldPerHr > 0 ? d.perRacket.reduce((sum, rd, i) => (rd.kind !== 'premises' && state.rackets[i].districtId === id ? sum + rd.yield : sum), 0) / d.yieldPerHr : 0
  // A casual player adds output when the Supply card warns, not days ahead.
  const urgent = sup.hoursToEmpty < p.supplyHorizonHours ? 1 : 0
  const perPack = packValue(d)
  // Packs that would otherwise be wasted at the cap, valued at half their trade spread over a day.
  const surplusValue = (extraCap: number) =>
    sup.madePerHr > sup.demandPerHr && sup.stock >= 0.9 * sup.cap
      ? ((Math.min(extraCap, (sup.madePerHr - sup.demandPerHr) * 24) * perPack) / 24) * 0.5
      : 0

  for (const type of RACKET_TYPES) {
    if (!d.unlocked.racket[type]) continue
    const rt = c.rackets.types[type]
    if (rt.kind === 'premises') {
      // The lot where it helps most: a factory beside joints, a warehouse beside a factory.
      let best: { id: DistrictId; gain: number } | null = null
      for (const id of DISTRICT_IDS) {
        // racketBlocked covers lots, the auction and `onlyIn` (ADR 0044), so the bot never picks a lot it can't use.
        if (!d.unlocked.district[id] || racketBlocked(state, c, type, id)) continue
        let gain = -formulas.premisesUpkeep(c, type, 1) * upkeepMultIf(state, c, id, type)
        if (rt.makesPerHr) {
          const made = formulas.factoryOutput(c, type, 1)
          gain += urgent * 0.6 * atStake * (shortfall(sup.madePerHr, sup.demandPerHr) - shortfall(sup.madePerHr + made, sup.demandPerHr))
          gain += synergyYieldIf(state, c, d, id, type)
        }
        if (rt.capPerTier) gain += surplusValue(formulas.warehouseCapacity(c, type, 1))
        // A stash where the money is: raids are rare, so its shield only breaks ties between lots.
        if (rt.leashHoursPerTier) gain += stashValue(rt.leashHoursPerTier - d.stashHours) + yieldShare(id) * (rt.shieldPerTier ?? 0) * d.yieldPerHr * 0.02
        if (rt.influencePerHrPerTier) gain += rt.influencePerHrPerTier * influenceMultIf(c, id, type) * v.influenceValue
        if (rt.prosperityPerTier) gain += prosperity.gainOf(id, rt.prosperityPerTier, rt.prosperityPerTier * c.rackets.premises.maxTier)
        // A Clinic keeps the crew working and loyal; a loan desk earns on idle Dirty (ADR 0042).
        if (rt.injuryMult) gain += state.crew.length * 2
        if (rt.lendHoursPerTier) gain += lendingValue(state, c, d, rt.lendHoursPerTier, id)
        if (rt.opinionPerTier) gain += rt.opinionPerTier * opinionPoint
        if (rt.legalBonusPerTier) gain += holdingValue(state, c, d, rt.legalBonusPerTier)
        gain += premiumPremisesValue(state, c, d, rt, 1, id)
        if (!best || gain > best.gain) best = { id, gain }
      }
      if (best && best.gain > 0) {
        out.push({ action: { type: 'BUY_RACKET', racketType: type, districtId: best.id }, cost: d.costs.racket[type], gain: best.gain, heatGain: rt.baseHeat })
      }
      continue
    }
    let bestMult = 0
    let bestDistrict: DistrictId | null = null
    for (const id of DISTRICT_IDS) {
      if (racketBlocked(state, c, type, id)) continue
      const dc = c.districts.list[id]
      const ours = controllerOf(state, id) === 'player'
      // Joints follow their street's prosperity from Act III (ADR 0041).
      const street = rt.kind === 'joint' && prosperityOn(state, c) ? prosperityYieldMult(c, prosperityOf(state, id)) : 1
      const mult = (ours ? (dc.mod.yieldMult?.[type] ?? 1) : controllerOf(state, id) === 'none' ? 1 : 1 - dc.tribute) * street
      if (mult > bestMult) {
        bestMult = mult
        bestDistrict = id
      }
    }
    if (!bestDistrict) continue
    const risk = rt.kind === 'joint' ? jointRisk(d, rt.cigaretteShare ?? 0, formulas.jointSales(c, type, 1)) * (1 - (rt.premiumShare ?? 0) * premiumRisk(d)) : 1
    const oy = state.act >= c.opinion.fromAct ? rt.opinionYield : undefined
    const opinionMult = oy ? oy[0] + ((oy[1] - oy[0]) * state.politics.opinion) / 100 : 1
    out.push({
      action: { type: 'BUY_RACKET', racketType: type, districtId: bestDistrict },
      cost: d.costs.racket[type],
      gain: rt.baseYield * bestMult * d.inspectionMult * risk * opinionMult + (rt.opinionPerTier ?? 0) * opinionPoint,
      heatGain: rt.baseHeat,
    })
  }

  // Act VI (ADR 0045): a legal business earns Clean with no front and no heat. Its Dirty mostly sat idle anyway.
  state.rackets.forEach((r, i) => {
    const rd = d.perRacket[i]
    if (legalizeBlocked(state, c, r.id)) return
    const legalClean = rd.grossYield * c.legalize.cleanShare * d.holdingMult
    out.push({ action: { type: 'LEGALIZE', racketId: r.id }, cost: legalizeCost(state, c, r.id), gain: legalClean * 2, heatGain: -rd.exposure })
  })

  state.rackets.forEach((r, i) => {
    const rd = d.perRacket[i]
    if (rd.upgradeCost === null) return
    const rt = c.rackets.types[r.type]
    if (rd.kind === 'premises') {
      const cond = r.condition / 100
      const upkeepNow = formulas.premisesUpkeep(c, r.type, r.tier)
      const synergyUpkeep = upkeepNow > 0 ? rd.upkeep / upkeepNow : 1
      let gain = -(formulas.premisesUpkeep(c, r.type, r.tier + 1) - upkeepNow) * synergyUpkeep
      if (rt.makesPerHr) {
        const extra = (formulas.factoryOutput(c, r.type, r.tier + 1) - formulas.factoryOutput(c, r.type, r.tier)) * cond
        gain += urgent * 0.6 * atStake * (shortfall(sup.madePerHr, sup.demandPerHr) - shortfall(sup.madePerHr + extra, sup.demandPerHr))
      }
      if (rt.capPerTier) gain += surplusValue(rt.capPerTier * cond)
      if (rt.leashHoursPerTier) gain += stashValue(rt.leashHoursPerTier * (r.tier + 1) * cond - d.stashHours)
      if (rt.influencePerHrPerTier) gain += rt.influencePerHrPerTier * cond * influenceMultIf(c, r.districtId, r.type) * v.influenceValue
      if (rt.prosperityPerTier) gain += prosperity.gainOf(r.districtId, rt.prosperityPerTier * cond, rt.prosperityPerTier * cond * (c.rackets.premises.maxTier - r.tier))
      if (rt.lendHoursPerTier) gain += lendingValue(state, c, d, rt.lendHoursPerTier * cond, r.districtId)
      if (rt.opinionPerTier) gain += rt.opinionPerTier * cond * opinionPoint
      if (rt.legalBonusPerTier) gain += holdingValue(state, c, d, rt.legalBonusPerTier * cond)
      if (rt.premiumMakesPerHr) {
        const extra = (formulas.premiumOutput(c, r.type, r.tier + 1) - formulas.premiumOutput(c, r.type, r.tier)) * cond
        const room = Math.max(0, d.premium.demandPerHr - formulas.premiumOutput(c, r.type, r.tier) * cond)
        gain += Math.min(extra, room) * premiumRisk(d) * (premiumPackValue(d) || 30)
      }
      gain += premiumPremisesValue(state, c, d, { ...rt, premiumMakesPerHr: 0 }, cond, r.districtId)
      if (gain > 0) {
        out.push({ action: { type: 'UPGRADE_RACKET', racketId: r.id }, cost: rd.upgradeCost, gain, heatGain: rd.exposure * (c.rackets.tierHeatMult - 1) })
      }
      return
    }
    // A bigger joint sells more packs, and loses more when they run short.
    const risk =
      rd.kind === 'joint' ? jointRisk(d, rt.cigaretteShare ?? 0, rd.packsPerHr * (c.rackets.tierYieldMult - 1)) * (1 - (rt.premiumShare ?? 0) * premiumRisk(d)) : 1
    // Tier 3 and tier 6 are each a choice (ADRs 0027, 0041).
    const spec = r.tier + 1 === c.rackets.specialization6.atTier ? c.rackets.specialization6 : c.rackets.specialization
    if (r.tier + 1 === spec.atTier) {
      // Both choices compete on gain ÷ cost; the heat-budget filter falls back to stealth when greed runs hot.
      for (const choice of ['greed', 'stealth'] as const) {
        out.push({
          action: { type: 'UPGRADE_RACKET', racketId: r.id, specialization: choice },
          cost: rd.upgradeCost,
          gain: rd.yield * (c.rackets.tierYieldMult * spec[choice].yieldMult - 1) * risk,
          heatGain: rd.exposure * (c.rackets.tierHeatMult * spec[choice].exposureMult - 1),
        })
      }
      return
    }
    out.push({
      action: { type: 'UPGRADE_RACKET', racketId: r.id },
      cost: rd.upgradeCost,
      gain: rd.yield * (c.rackets.tierYieldMult - 1) * risk + (rt.opinionPerTier ?? 0) * opinionPoint,
      heatGain: rd.exposure * (c.rackets.tierHeatMult - 1),
    })
  })
  return out
}

type Valuation = {
  influenceValue: number
  heatCost: number
  packValue: number
  racketYield: Record<string, number>
  injuryHourCost: number
  busiestFrontClean: number // Clean an hour the busiest front washes
  hourOfYield: number
}

// What the bot thinks Influence and heat are worth right now, shared by dispatch and decisions.
function valuation(state: PlayerState, c: Config, p: PersonaOptions): Valuation {
  const d = derive(state, c)
  // Influence buys officials, and it matters more the hotter things are getting.
  const officialsLeft = OFFICIAL_IDS.some((id) => !state.officials.includes(id))
  const urgency = 1 + Math.max(0, Math.max(state.heat, d.heatTarget) - p.officialAboveHeat) / 10
  const hourOfYield = Math.max(d.yieldPerHr, c.vault.floorCap / c.vault.targetHoursByAct[state.act])
  return {
    influenceValue: officialsLeft ? p.influenceValueHours * hourOfYield * urgency : 0,
    heatCost: state.heat >= c.heat.inspectThreshold - 5 ? 8 : 2,
    // Packs matter when stock is running out; a surplus is worth little.
    packValue: packValue(d) * (d.supply.hoursToEmpty < p.stockReserveHours ? 1 : 0.2),
    racketYield: Object.fromEntries(state.rackets.map((r, i) => [r.id, d.perRacket[i].yield])),
    // A crew member out hurt: roughly their share of a day's jobs.
    injuryHourCost: 5 + d.yieldPerHr * 0.02,
    busiestFrontClean: Math.max(0, ...d.perFront.map((f) => f.throughput * f.rate * Math.min(1, f.util + 0.1))),
    hourOfYield,
  }
}

function valueOf(state: PlayerState, c: Config, p: PersonaOptions, v: Valuation, item: InboxItem, e: InboxEffects): number {
  // A contest is worth its odds of each branch (ADR 0042).
  const contest = e.contest
    ? (() => {
        const odds = contestOdds(state, c, e.contest)
        return odds * valueOf(state, c, p, v, item, e.contest.win) + (1 - odds) * valueOf(state, c, p, v, item, e.contest.lose)
      })()
    : 0
  const racketYield = item.racketId ? (v.racketYield[item.racketId] ?? 0) : 0
  // A point of condition is about a day of a percent of that business's income.
  const damage = (e.condition ?? 0) * racketYield * 0.24
  const hurt = (e.injureHours ?? 0) * v.injuryHourCost
  let loyalty = 0
  for (const id of item.crewIds ?? []) {
    const m = state.crew.find((x) => x.id === id)
    if (m) loyalty += (e.loyalty ?? 0) * p.loyaltyValue * (m.loyalty < p.raiseBelow ? 3 : 1)
  }
  // Shutting a business costs what it would have earned while it's shut.
  const closed = (e.closeHours ?? 0) * racketYield
  // A frozen front costs the Clean it would have washed (ADR 0045); a hearing won is a step toward the Empire.
  const frozen = (e.freezeHours ?? 0) * v.busiestFrontClean * 2
  const hearing = e.hearingWon && state.stats.hearings.won < c.reckoning.empireWins ? p.hearingWinHours * v.hourOfYield : 0
  // The city's story (ADR 0054): opinion helps, the Ministry's attention hurts, and someone sent is out of work.
  const city = ((e.opinion ?? 0) - (e.attention ?? 0)) * p.opinionHours * v.hourOfYield
  const busy = (e.busyHours ?? 0) * v.injuryHourCost
  return (
    (e.dirty ?? 0) +
    (e.clean ?? 0) * 2 +
    (e.cigarettes ?? 0) * v.packValue +
    (e.rep ?? 0) * p.repValue +
    (e.influence ?? 0) * v.influenceValue -
    (e.heat ?? 0) * v.heatCost +
    loyalty -
    closed -
    frozen +
    hearing +
    city -
    busy +
    damage -
    hurt +
    contest
  )
}

function bestDispatch(state: PlayerState, c: Config, p: PersonaOptions, t: number, gapMinutes: number): Action | null {
  const idle = state.crew.filter((m) => m.status === 'idle')
  if (idle.length === 0) return null
  const d = derive(state, c)
  const { influenceValue, heatCost } = valuation(state, c, p)
  let best: { action: Action; score: number } | null = null

  // The fixed jobs, plus whatever's on the board.
  const jobs: { type: OpType; op: OpConfig; offerId?: string }[] = [
    ...OP_TYPES.filter((type) => opUnlocked(state, c, type) && !c.ops.list[type].training).map((type) => ({ type, op: c.ops.list[type] })),
    ...state.offers.items
      .filter((o) => o.expiresAt > t && opUnlocked(state, c, o.opType))
      .map((o) => ({ type: o.opType, op: o.cfg, offerId: o.id })),
  ]

  const sup = d.supply
  const perPack = packValue(d)
  const prem = d.premium
  const perPremium = premiumPackValue(d) + premiumCoverValue(state, c, d)
  const votesWanted = electionScheduled(state) && winChance(state, c) < p.campaignTarget
  const votePrice = votesWanted ? pointCost(state, c, 'dirty') : 0
  let plannedCost: number | null = null

  for (const { type, op: listed, offerId } of jobs) {
    const op = opConfigAt(c, state, listed)
    // Smuggle only when stock is running out, and never with Clean the next purchase needs (plan (o)).
    // A convoy answers the premium stock instead, which only ever arrives in loads (ADR 0043).
    if (op.costClean) {
      const short = op.premium ? prem.demandPerHr > 0 && prem.hoursToEmpty < p.stockReserveHours * 2 : sup.hoursToEmpty < p.stockReserveHours
      if (!short || state.clean < op.costClean) continue
      plannedCost ??= plannedPurchaseCost(state, c, d, p, t)
      if (state.clean - op.costClean < plannedCost) continue
    }
    let districtId: DistrictId | undefined
    let flipValue = 0
    if (op.districtPressure) {
      for (const id of DISTRICT_IDS) {
        if (canPressure(state, c, id)) continue
        const value =
          ((districtTributePerHr(state, d, id) + districtPerkPerHr(state, c, d, id)) * p.districtPaybackHours +
            c.reputation.perDistrict * p.repValue) /
          c.districts.pressureOpsToFlip
        if (value > flipValue) {
          flipValue = value
          districtId = id
        }
      }
      if (!districtId) continue
    }

    for (const team of combinations(idle, op.crew)) {
      const odds = outcomeOdds(c, op, team)
      const success = odds.full + odds.partial
      const dirty = odds.full * opDirtyRewardFor(c, state, op, 'full', team) + odds.partial * opDirtyRewardFor(c, state, op, 'partial', team)
      // Growth: expected XP, priced per stat point it buys (nothing for a stat at its ceiling).
      let growth = 0
      for (const m of team) {
        for (const outcome of OP_OUTCOMES) {
          const xp = jobXp(c, op, outcome, m, team)
          for (const st of STATS) {
            if (!xp[st] || m[st] >= m.potential[st]) continue
            growth += (odds[outcome] * xp[st]! * p.xpValue) / formulas.statPointCost(c, m[st])
          }
        }
      }
      const rep = (odds.full + odds.partial * c.ops.partialRewardPct) * c.reputation.perOpSuccess
      let influence = 0
      if (op.influence && influenceValue > 0) {
        const partialInfluence = Math.max(1, Math.round(op.influence * c.ops.partialRewardPct))
        influence = Math.min(influenceRoom(state, c, t), odds.full * op.influence + odds.partial * partialInfluence)
      }
      const spike = op.spike * (odds.full + odds.partial * c.ops.partialSpikePct + odds.fail * c.ops.failSpikePct)
      const packs = op.cigarettes ? (odds.full + odds.partial * c.ops.partialRewardPct) * op.cigarettes : 0
      // A convoy's expected landing: through the highway and the crossing, into whatever room there is.
      const landed = op.premium
        ? (odds.full + odds.partial * c.ops.partialRewardPct) * convoyLoad(state, c, op) * (1 - hijackChance(state, c, t)) * (1 - customsChance(state, c))
        : 0
      // Votes are worth what the same points would cost in Dirty, while the election still needs them (ADR 0044).
      const votes = op.votes && votesWanted ? Math.min(pointsRoom(state, c), (odds.full + odds.partial * c.ops.partialRewardPct) * op.votes) : 0
      const goods =
        Math.min(packs, Math.max(0, sup.cap - sup.stock)) * perPack +
        Math.min(landed, Math.max(0, prem.cap - prem.stock)) * perPremium +
        votes * votePrice -
        (op.costClean ?? 0) * 2
      const sessionsBlocked = Math.max(1, Math.ceil(op.minutes / gapMinutes))
      const value =
        (dirty + rep * p.repValue + influence * influenceValue + success * flipValue + growth + goods - spike * heatCost) /
        sessionsBlocked
      const score = value / team.length
      if (value > 0 && (!best || score > best.score)) {
        best = {
          score,
          action: {
            type: 'START_OP',
            opType: type,
            crewIds: team.map((m) => m.id),
            ...(districtId ? { districtId } : {}),
            ...(offerId ? { offerId } : {}),
          },
        }
      }
    }
  }
  return best?.action ?? null
}

function combinations<T>(items: T[], k: number): T[][] {
  if (k === 0) return [[]]
  if (items.length < k) return []
  const [head, ...rest] = items
  return [...combinations(rest, k - 1).map((combo) => [head, ...combo]), ...combinations(rest, k)]
}
