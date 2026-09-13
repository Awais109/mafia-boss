import {
  apply,
  baseWage,
  canAffordEffects,
  canHaggle,
  canPressure,
  derive,
  DISTRICT_IDS,
  formulas,
  FRONT_TYPES,
  haggleOdds,
  influenceRoom,
  jobXp,
  OFFICIAL_IDS,
  openSpots,
  opConfigAt,
  opDirtyRewardFor,
  opUnlocked,
  OP_OUTCOMES,
  OP_TYPES,
  outcomeOdds,
  premisesBlocked,
  rushCost,
  surplusRoomToday,
  RACKET_TYPES,
  STATS,
  zhannaDeals,
  type Action,
  type Config,
  type CrewMember,
  type Derived,
  type DistrictId,
  type FrontMode,
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
  sessionHours: { 1: number[]; 2: number[] } // hours of day (game time) the persona checks in
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
}

export const CASUAL: PersonaOptions = {
  name: 'casual',
  // Act I checks in on the vault's 2.5 h leash through the day; Act II settles into four sessions.
  sessionHours: { 1: [8, 10.5, 13, 15.5, 18, 20.5, 23], 2: [8, 13, 18, 22] },
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
}

// Spends every bar it can finishing jobs (plan (t)): how much sooner do acts clear with gold?
export const GOLD_RUSH: PersonaOptions = { ...CASUAL, name: 'goldRush', rushJobs: true }

// N sessions spread evenly between 08:00 and 22:00, for both acts.
export function withSessions(p: PersonaOptions, n: number): PersonaOptions {
  const hours = n <= 1 ? [12] : Array.from({ length: n }, (_, i) => 8 + (i * 14) / (n - 1))
  return { ...p, name: `${p.name}-${n}s`, sessionHours: { 1: hours, 2: hours } }
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
        : affordable.reduce((a, b) => (valueOf(state, p, v, item, b.effects) > valueOf(state, p, v, item, a.effects) ? b : a))
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
      const buffer = state.fronts.find((x) => x.id === f.id)!.buffer
      const amount = Math.floor(Math.min(state.dirty - reserve, f.bufferCap - buffer))
      if (amount >= 1) tryAct({ type: 'DEPOSIT', frontId: f.id, amount })
    }
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
    if (state.heat > p.officialAboveHeat || now.heatTarget > p.officialAboveHeat) {
      tryAct({ type: 'BUY_OFFICIAL', officialId: id })
    }
  }

  // A new front opens the throttle; nothing else comes first.
  for (const type of FRONT_TYPES) {
    const now = d()
    if (now.unlocked.front[type] && !state.fronts.some((f) => f.type === type) && state.clean >= now.costs.front[type]) {
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

  // 6. Spend Clean on the best yield gain ÷ cost, within the heat budget
  for (let guard = 0; guard < 60; guard++) {
    const now = d()
    const budget = state.clean
    const controlBuyable = canBuyControl(state, c, now, t)
    const options = spendOptions(state, c, now, p).filter((o) => {
      if (o.cost > budget) return false
      if (o.heatGain <= 0 || controlBuyable) return true
      return formulas.heatTarget(now.exposure + o.heatGain, now.control) <= p.heatBudget
    })
    if (options.length === 0) break
    options.sort((a, b) => b.gain / Math.max(1, b.cost) - a.gain / Math.max(1, a.cost))
    if (!tryAct(options[0].action)) break
  }

  return { state, actions }
}

const statSum = (m: CrewMember) => m.muscle + m.brains + m.nerve

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

function spendOptions(state: PlayerState, c: Config, d: Derived, p: PersonaOptions): SpendOption[] {
  const out: SpendOption[] = []

  for (const type of FRONT_TYPES) {
    if (d.unlocked.front[type] && !state.fronts.some((f) => f.type === type)) {
      out.push({ action: { type: 'BUY_FRONT', frontType: type }, cost: d.costs.front[type], gain: 1e6, heatGain: 0 })
    }
  }
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
        if (!d.unlocked.district[id] || premisesBlocked(state, c, id, type)) continue
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
      if (!d.unlocked.district[id] || !openSpots(state, c, id).includes(type)) continue
      const dc = c.districts.list[id]
      const ours = controllerOf(state, id) === 'player'
      const mult = ours ? (dc.mod.yieldMult?.[type] ?? 1) : controllerOf(state, id) === 'none' ? 1 : 1 - dc.tribute
      if (mult > bestMult) {
        bestMult = mult
        bestDistrict = id
      }
    }
    if (!bestDistrict) continue
    const risk = rt.kind === 'joint' ? jointRisk(d, rt.cigaretteShare ?? 0, formulas.jointSales(c, type, 1)) : 1
    out.push({
      action: { type: 'BUY_RACKET', racketType: type, districtId: bestDistrict },
      cost: d.costs.racket[type],
      gain: rt.baseYield * bestMult * d.inspectionMult * risk,
      heatGain: rt.baseHeat,
    })
  }

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
      if (gain > 0) {
        out.push({ action: { type: 'UPGRADE_RACKET', racketId: r.id }, cost: rd.upgradeCost, gain, heatGain: rd.exposure * (c.rackets.tierHeatMult - 1) })
      }
      return
    }
    // A bigger joint sells more packs, and loses more when they run short.
    const risk = rd.kind === 'joint' ? jointRisk(d, rt.cigaretteShare ?? 0, rd.packsPerHr * (c.rackets.tierYieldMult - 1)) : 1
    const spec = c.rackets.specialization
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
      gain: rd.yield * (c.rackets.tierYieldMult - 1) * risk,
      heatGain: rd.exposure * (c.rackets.tierHeatMult - 1),
    })
  })
  return out
}

type Valuation = { influenceValue: number; heatCost: number; packValue: number }

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
  }
}

function valueOf(state: PlayerState, p: PersonaOptions, v: Valuation, item: InboxItem, e: InboxEffects): number {
  let loyalty = 0
  for (const id of item.crewIds ?? []) {
    const m = state.crew.find((x) => x.id === id)
    if (m) loyalty += (e.loyalty ?? 0) * p.loyaltyValue * (m.loyalty < p.raiseBelow ? 3 : 1)
  }
  return (
    (e.dirty ?? 0) + (e.clean ?? 0) * 2 + (e.cigarettes ?? 0) * v.packValue + (e.rep ?? 0) * p.repValue + (e.influence ?? 0) * v.influenceValue - (e.heat ?? 0) * v.heatCost + loyalty
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
  let plannedCost: number | null = null

  for (const { type, op: listed, offerId } of jobs) {
    const op = opConfigAt(c, state, listed)
    // Smuggle only when stock is running out, and never with Clean the next purchase needs (plan (o)).
    if (op.costClean) {
      if (sup.hoursToEmpty >= p.stockReserveHours || state.clean < op.costClean) continue
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
      const goods = Math.min(packs, Math.max(0, sup.cap - sup.stock)) * perPack - (op.costClean ?? 0) * 2
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
