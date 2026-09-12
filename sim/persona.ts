import {
  apply,
  canAffordEffects,
  canPressure,
  derive,
  DISTRICT_IDS,
  formulas,
  FRONT_TYPES,
  influenceRoom,
  OFFICIAL_IDS,
  openSpots,
  opDirtyRewardFor,
  opUnlocked,
  OP_TYPES,
  outcomeOdds,
  RACKET_TYPES,
  type Action,
  type Config,
  type CrewMember,
  type Derived,
  type DistrictId,
  type InboxEffects,
  type InboxItem,
  type OpConfig,
  type OpType,
  type PlayerState,
} from '../engine'

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
}

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
    const best = affordable.reduce((a, b) => (valueOf(state, p, v, item, b.effects) > valueOf(state, p, v, item, a.effects) ? b : a))
    tryAct({ type: 'RESOLVE_INBOX', itemId: item.id, optionId: best.id })
  }

  // Keep Tolya sweet when it's cheap; fix what he broke.
  const demand = state.rival.tolya.demand
  if (demand !== null && state.dirty >= demand) tryAct({ type: 'PAY_TRIBUTE' })
  for (const id of state.rackets.map((r) => r.id)) {
    const r = state.rackets.find((x) => x.id === id)!
    if (r.condition < p.repairBelow && state.dirty >= formulas.racketRepairCost(c, r.type)) {
      tryAct({ type: 'REPAIR_RACKET', racketId: id })
    }
  }

  // 2. Deposit up to buffer caps, keeping a reserve of wages × 12 h + one bribe
  {
    const now = d()
    const reserve = now.wagesPerHr * p.reserveWageHours + now.costs.bribe
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
    if (!tryAct({ type: 'RECRUIT', candidateId: best.id })) break
  }
  for (const m of state.crew) {
    if (m.loyalty < p.raiseBelow && state.clean >= d().costs.raise) tryAct({ type: 'RAISE', crewId: m.id })
  }

  // 5. Dispatch every idle crew member to the best op they can do
  const gapMinutes = Math.max(15, ((nextSessionAt - t) / c.time.hourMs) * 60)
  for (let guard = 0; guard < 10; guard++) {
    const best = bestDispatch(state, c, p, t, gapMinutes)
    if (!best || !tryAct(best)) break
  }

  // 7 (before spending, so it gets first claim on Clean). Buy a district when it's affordable and its
  // tribute over 48 h outruns the buy-out. Never save for one: that stalls every other purchase for days.
  for (const id of DISTRICT_IDS) {
    const now = d()
    if (!now.unlocked.district[id] || controllerOf(state, id) === 'player') continue
    const buyout = c.districts.list[id].buyout
    if (state.clean >= buyout && districtTributePerHr(state, now, id) * p.districtPaybackHours > buyout) {
      tryAct({ type: 'BUY_DISTRICT', districtId: id })
    }
  }

  // 6. Spend Clean on the best yield gain ÷ cost, within the heat budget
  for (let guard = 0; guard < 60; guard++) {
    const now = d()
    const budget = state.clean
    const controlBuyable = canBuyControl(state, c, now, t)
    const options = spendOptions(state, c, now).filter((o) => {
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

type SpendOption = { action: Action; cost: number; gain: number; heatGain: number }

function spendOptions(state: PlayerState, c: Config, d: Derived): SpendOption[] {
  const out: SpendOption[] = []

  for (const type of FRONT_TYPES) {
    if (d.unlocked.front[type] && !state.fronts.some((f) => f.type === type)) {
      out.push({ action: { type: 'BUY_FRONT', frontType: type }, cost: d.costs.front[type], gain: 1e6, heatGain: 0 })
    }
  }
  for (const f of d.perFront) {
    if (f.upgradeCost === null || f.util < c.fronts.suspicionStartUtil) continue
    const gain = (f.throughput * f.util * c.fronts.upgrade.rateStep) / f.rate // Dirty-equivalent per hour
    out.push({ action: { type: 'UPGRADE_FRONT', frontId: f.id }, cost: f.upgradeCost, gain, heatGain: 0 })
  }

  for (const type of RACKET_TYPES) {
    if (!d.unlocked.racket[type]) continue
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
    out.push({
      action: { type: 'BUY_RACKET', racketType: type, districtId: bestDistrict },
      cost: d.costs.racket[type],
      gain: c.rackets.types[type].baseYield * bestMult * d.inspectionMult,
      heatGain: c.rackets.types[type].baseHeat,
    })
  }

  state.rackets.forEach((r, i) => {
    const rd = d.perRacket[i]
    if (rd.upgradeCost === null) return
    out.push({
      action: { type: 'UPGRADE_RACKET', racketId: r.id },
      cost: rd.upgradeCost,
      gain: rd.yield * (c.rackets.tierYieldMult - 1),
      heatGain: rd.exposure * (c.rackets.tierHeatMult - 1),
    })
  })
  return out
}

type Valuation = { influenceValue: number; heatCost: number }

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
  }
}

function valueOf(state: PlayerState, p: PersonaOptions, v: Valuation, item: InboxItem, e: InboxEffects): number {
  let loyalty = 0
  for (const id of item.crewIds ?? []) {
    const m = state.crew.find((x) => x.id === id)
    if (m) loyalty += (e.loyalty ?? 0) * p.loyaltyValue * (m.loyalty < p.raiseBelow ? 3 : 1)
  }
  return (
    (e.dirty ?? 0) + (e.clean ?? 0) * 2 + (e.rep ?? 0) * p.repValue + (e.influence ?? 0) * v.influenceValue - (e.heat ?? 0) * v.heatCost + loyalty
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
    ...OP_TYPES.filter((type) => opUnlocked(state, c, type)).map((type) => ({ type, op: c.ops.list[type] })),
    ...state.offers.items
      .filter((o) => o.expiresAt > t && opUnlocked(state, c, o.opType))
      .map((o) => ({ type: o.opType, op: o.cfg, offerId: o.id })),
  ]

  for (const { type, op, offerId } of jobs) {
    let districtId: DistrictId | undefined
    let flipValue = 0
    if (op.districtPressure) {
      for (const id of DISTRICT_IDS) {
        if (canPressure(state, c, id)) continue
        const wageSave = (1 - (c.districts.list[id].mod.wageMult ?? 1)) * d.wagesPerHr
        const value =
          ((districtTributePerHr(state, d, id) + wageSave) * p.districtPaybackHours + c.reputation.perDistrict * p.repValue) /
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
      const dirty = odds.full * opDirtyRewardFor(c, state, op, 'full') + odds.partial * opDirtyRewardFor(c, state, op, 'partial')
      const rep = (odds.full + odds.partial * c.ops.partialRewardPct) * c.reputation.perOpSuccess
      let influence = 0
      if (op.influence && influenceValue > 0) {
        const partialInfluence = Math.max(1, Math.round(op.influence * c.ops.partialRewardPct))
        influence = Math.min(influenceRoom(state, c, t), odds.full * op.influence + odds.partial * partialInfluence)
      }
      const spike = op.spike * (odds.full + odds.partial * c.ops.partialSpikePct + odds.fail * c.ops.failSpikePct)
      const sessionsBlocked = Math.max(1, Math.ceil(op.minutes / gapMinutes))
      const value =
        (dirty + rep * p.repValue + influence * influenceValue + success * flipValue - spike * heatCost) / sessionsBlocked
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
