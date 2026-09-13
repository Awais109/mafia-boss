import { FRONT_MODES, INCIDENT_TYPES, type Config } from '../config/schema'
import { PASSIVE_ACTIONS, type Action } from '../model/actions'
import type { GameEvent } from '../model/events'
import type { CrewMember, PlayerState } from '../model/state'
import { changeLoyalty, crewSlots, regeneratePool, unassignEnforcer } from '../systems/crew'
import { canPressure, getDistrict, premisesBlocked, takeDistrict } from '../systems/districts'
import { arrest, raid } from '../systems/heat'
import { canAffordEffects, incidentNeedHolds, raiseIncident, resolveInboxItem } from '../systems/inbox'
import { regenerateOffers } from '../systems/offers'
import { opConfigAt, opMinutesFor, opUnlocked, resolveOp } from '../systems/ops'
import { checkGoals } from '../systems/goals'
import { grantGold, rushCost, skipCost } from '../systems/gold'
import { checkActs, spendClean } from '../systems/reputation'
import { bestHaggler, canHaggle, changeDisposition, changeZhanna, haggle, refuseDemand, surplusRoomToday, tolyaTick, zhannaDeals } from '../systems/rivals'
import { addStock } from '../systems/supply'
import { tutorialOnAction } from '../systems/tutorial'
import { clone, emit, newId, type Ctx } from './ctx'
import { derive } from './derive'
import * as F from './formulas'
import { advance, appendLog } from './reconcile'
import { makeRng, type RngFactory } from './rng'
import { dayIndex, hoursToMs, minutesToMs, shiftTimes } from './time'

export type ApplyResult = { state: PlayerState; events: GameEvent[]; error?: string }

const EPS = 1e-6

// Reconcile to `now`, then apply the action. Handlers validate before they mutate, so a
// rejected action leaves the reconciled state untouched.
export function apply(
  input: PlayerState,
  action: Action,
  now: number,
  c: Config,
  rng: RngFactory = makeRng(input.playerId),
): ApplyResult {
  let state = clone(input)
  const ctx: Ctx = { c, rng, events: [] }
  advance(state, ctx, now)
  const t = Math.max(now, state.updatedAt)

  let error: string | null
  if (action.type === 'DEBUG_RESET_OFFSET') {
    if (!c.debug.enabled) error = 'Debug tools are disabled'
    else {
      const offset = state.debugOffsetMs
      state = shiftTimes(state, -offset)
      state.debugOffsetMs = 0
      emit(ctx, t - offset, { type: 'DEBUG', action: action.type, detail: `${offset} ms` })
      error = null
    }
  } else {
    error = handle(state, ctx, action, t)
  }

  if (error === null) {
    if (!PASSIVE_ACTIONS.includes(action.type)) state.stats.actions++
    tutorialOnAction(state, ctx, t, action)
    checkGoals(state, ctx, t)
  }
  appendLog(state, ctx.events)
  return error === null ? { state, events: ctx.events } : { state, events: ctx.events, error }
}

function handle(state: PlayerState, ctx: Ctx, a: Action, t: number): string | null {
  const { c } = ctx
  const crewById = (id: string): CrewMember | undefined => state.crew.find((m) => m.id === id)

  switch (a.type) {
    case 'COLLECT': {
      const amount = state.vault
      state.vault = 0
      state.dirty += amount
      emit(ctx, t, { type: 'COLLECTED', amount })
      return null
    }

    case 'DEPOSIT': {
      const f = state.fronts.find((x) => x.id === a.frontId)
      if (!f) return 'No such front'
      if (!(a.amount > 0)) return 'Nothing to deposit'
      if (a.amount > state.dirty + EPS) return 'Not enough Dirty'
      const cap = F.frontBufferCap(c, f)
      if (f.buffer + a.amount > cap + EPS) return `The buffer only holds ${Math.floor(cap)}`
      const amount = Math.min(a.amount, state.dirty)
      state.dirty -= amount
      if (c.tutorial.firstConversionInstant && !state.firstConversionDone) {
        // spec §3.2: the first conversion is instant, so the first session never waits 72 minutes.
        const clean = amount * F.frontRate(c, f.type, f.level)
        state.clean += clean
        state.stats.cleanEarned += clean
        emit(ctx, t, { type: 'DEPOSITED', frontId: f.id, amount, instantClean: clean })
      } else {
        f.buffer += amount
        emit(ctx, t, { type: 'DEPOSITED', frontId: f.id, amount })
      }
      state.firstConversionDone = true
      return null
    }

    case 'BUY_RACKET': {
      const d = derive(state, c)
      if (!c.rackets.types[a.racketType]) return 'Unknown racket'
      if (!d.unlocked.racket[a.racketType]) return 'Not unlocked yet'
      if (!c.districts.list[a.districtId] || !d.unlocked.district[a.districtId]) return 'That district is not open yet'
      if (F.isPremises(c, a.racketType)) {
        // Premises go on a free lot in any open district (ADR 0031).
        const blocked = premisesBlocked(state, c, a.districtId, a.racketType)
        if (blocked) return blocked
      } else {
        if (!c.districts.list[a.districtId].allows.includes(a.racketType)) return "That kind of business doesn't fit there"
        if (state.rackets.some((r) => r.districtId === a.districtId && r.type === a.racketType)) {
          return `You already run a ${c.rackets.types[a.racketType].name} there`
        }
      }
      const cost = d.costs.racket[a.racketType]
      if (state.clean < cost - EPS) return 'Not enough Clean'
      const racketId = newId(state, 'r')
      state.rackets.push({ id: racketId, type: a.racketType, districtId: a.districtId, tier: 1, condition: 100, enforcerId: null })
      emit(ctx, t, { type: 'RACKET_BOUGHT', racketId, racketType: a.racketType, districtId: a.districtId, cost })
      spendClean(state, ctx, t, cost)
      return null
    }

    case 'UPGRADE_RACKET': {
      const r = state.rackets.find((x) => x.id === a.racketId)
      if (!r) return 'No such racket'
      if (r.tier >= F.racketMaxTier(c, r.type, state.act)) return 'Already at max tier'
      const atTier = c.rackets.specialization.atTier
      if (F.isPremises(c, r.type)) {
        if (a.specialization) return 'Premises don’t specialize'
      } else if (r.tier + 1 === atTier) {
        if (a.specialization !== 'greed' && a.specialization !== 'stealth') return 'Pick greed or stealth'
      } else if (a.specialization) {
        return `Businesses specialize on the way to tier ${atTier}`
      }
      const cost = F.racketUpgradeCost(c, r.type, r.tier)
      if (state.clean < cost - EPS) return 'Not enough Clean'
      r.tier++
      if (a.specialization) {
        r.specialization = a.specialization
        state.stats.specializations[a.specialization]++
      }
      emit(ctx, t, { type: 'RACKET_UPGRADED', racketId: r.id, tier: r.tier, cost, ...(a.specialization ? { specialization: a.specialization } : {}) })
      spendClean(state, ctx, t, cost)
      return null
    }

    case 'REPAIR_RACKET': {
      const r = state.rackets.find((x) => x.id === a.racketId)
      if (!r) return 'No such racket'
      if (r.condition >= 100) return 'Nothing to repair'
      const cost = F.racketRepairCost(c, r.type)
      if (state.dirty < cost - EPS) return 'Not enough Dirty'
      state.dirty -= cost
      state.stats.repairsPaid += cost
      r.condition = 100
      emit(ctx, t, { type: 'RACKET_REPAIRED', racketId: r.id, cost })
      return null
    }

    case 'ASSIGN_ENFORCER': {
      const m = crewById(a.crewId)
      if (!m) return 'No such crew member'
      if (a.racketId === null) {
        if (m.status !== 'enforcer') return 'Not an enforcer'
        const racketId = m.assignedTo ?? ''
        unassignEnforcer(state, m)
        m.status = 'idle'
        emit(ctx, t, { type: 'ENFORCER_REMOVED', crewId: m.id, racketId })
        return null
      }
      if (m.status !== 'idle') return `${m.name} is busy`
      const r = state.rackets.find((x) => x.id === a.racketId)
      if (!r) return 'No such racket'
      if (F.isPremises(c, r.type)) return 'Premises don’t need minding'
      if (r.enforcerId) return 'That racket already has an enforcer'
      r.enforcerId = m.id
      m.status = 'enforcer'
      m.assignedTo = r.id
      emit(ctx, t, { type: 'ENFORCER_ASSIGNED', crewId: m.id, racketId: r.id })
      return null
    }

    case 'START_OP': {
      const offer = a.offerId ? state.offers.items.find((o) => o.id === a.offerId) : undefined
      if (a.offerId) {
        if (!offer) return 'That offer is gone'
        if (offer.expiresAt <= t) return 'That offer has expired'
        if (offer.opType !== a.opType) return 'That offer is for a different job'
      }
      const listed = offer ? offer.cfg : c.ops.list[a.opType]
      if (!listed) return 'Unknown op'
      const cfg = opConfigAt(c, state, listed)
      if (!opUnlocked(state, c, a.opType)) return 'Not unlocked yet'
      const ids = [...new Set(a.crewIds)]
      if (ids.length !== cfg.crew) return `Needs ${cfg.crew} crew`
      const team = ids.map(crewById)
      if (team.some((m) => !m || m.status !== 'idle')) return 'Everyone on the job must be idle'
      if (cfg.districtPressure) {
        if (!a.districtId) return 'Pick a district to pressure'
        const err = canPressure(state, c, a.districtId)
        if (err) return err
      }
      if (cfg.costDirty && state.dirty < cfg.costDirty * state.act - EPS) return 'Not enough Dirty'
      if (cfg.costClean && state.clean < cfg.costClean - EPS) return 'Not enough Clean'
      if (cfg.costDirty) {
        const cost = cfg.costDirty * state.act
        state.dirty -= cost
        if (cfg.training) state.stats.trainingPaid += cost
      }
      // Smuggling's Clean buys goods, not standing: it earns no Rep and isn't Clean spent (plan (o)).
      if (cfg.costClean) {
        state.clean -= cfg.costClean
        state.stats.smugglingPaid += cfg.costClean
      }
      // Every run past her Port sours Zhanna (ADR 0036).
      if (cfg.cigarettes && zhannaDeals(state, c)) changeZhanna(state, c.rivals.zhanna.dispositionPerSmuggle)
      const minutes = opMinutesFor(c, cfg, team as CrewMember[])
      const opId = newId(state, 'op')
      state.ops.push({
        id: opId,
        type: a.opType,
        crewIds: ids,
        startedAt: t,
        completesAt: t + minutesToMs(c, minutes),
        ...(cfg.districtPressure && a.districtId ? { districtId: a.districtId } : {}),
        ...(offer ? { offerId: offer.id, name: offer.name } : {}),
        ...(offer || cfg !== listed ? { cfg } : {}),
      })
      if (offer) state.offers.items = state.offers.items.filter((o) => o.id !== offer.id)
      for (const m of team as CrewMember[]) {
        m.status = 'on_op'
        m.assignedTo = opId
        state.stats.opsByCrew[m.id] = (state.stats.opsByCrew[m.id] ?? 0) + 1
      }
      state.stats.opsByType[a.opType] = (state.stats.opsByType[a.opType] ?? 0) + 1
      emit(ctx, t, {
        type: 'OP_STARTED',
        opId,
        opType: a.opType,
        crewIds: ids,
        districtId: a.districtId,
        ...(offer ? { name: offer.name, offerId: offer.id } : {}),
      })
      return null
    }

    case 'RESOLVE_INBOX': {
      const item = state.inbox.find((x) => x.id === a.itemId)
      if (!item) return 'That’s already been dealt with'
      const option = item.options.find((o) => o.id === a.optionId)
      if (!option) return 'No such option'
      if (!canAffordEffects(state, option.effects)) return 'You can’t cover that'
      resolveInboxItem(state, ctx, t, item, option, false)
      return null
    }

    case 'RECRUIT': {
      const cand = state.recruitPool.candidates.find((x) => x.id === a.candidateId)
      if (!cand) return 'That candidate is gone'
      if (state.crew.length >= crewSlots(c, state)) return 'No free crew slot'
      const cost = F.recruitCost(c, state.act)
      if (state.clean < cost - EPS) return 'Not enough Clean'
      state.recruitPool.candidates = state.recruitPool.candidates.filter((x) => x.id !== cand.id)
      const member: CrewMember = { ...cand, id: newId(state, 'crew'), status: 'idle' }
      state.crew.push(member)
      emit(ctx, t, { type: 'RECRUITED', crewId: member.id, name: member.name, cost })
      spendClean(state, ctx, t, cost)
      return null
    }

    case 'FIRE': {
      const m = crewById(a.crewId)
      if (!m) return 'No such crew member'
      if (m.nephew) return "He's family. You can't fire family."
      if (m.status === 'on_op') return `${m.name} is out on a job`
      unassignEnforcer(state, m)
      state.crew = state.crew.filter((x) => x.id !== m.id)
      emit(ctx, t, { type: 'FIRED', crewId: m.id, name: m.name })
      return null
    }

    case 'RAISE': {
      const m = crewById(a.crewId)
      if (!m) return 'No such crew member'
      if (m.loyalty >= 100) return 'Already as loyal as they get'
      const cost = F.raiseCost(c, state.act)
      if (state.clean < cost - EPS) return 'Not enough Clean'
      changeLoyalty(m, c.crew.loyalty.perRaise)
      emit(ctx, t, { type: 'RAISED', crewId: m.id, cost, loyalty: m.loyalty })
      spendClean(state, ctx, t, cost)
      return null
    }

    case 'BUY_CREW_SLOT': {
      if (state.crewSlotsBought >= c.crew.extraSlotMax) return 'No more slots to buy'
      const cost = F.crewSlotCost(c, state.stats.cleanEarned)
      if (state.clean < cost - EPS) return 'Not enough Clean'
      state.crewSlotsBought++
      emit(ctx, t, { type: 'CREW_SLOT_BOUGHT', cost, slots: crewSlots(c, state) })
      spendClean(state, ctx, t, cost)
      return null
    }

    case 'BUY_OFFICIAL': {
      const o = c.officials.list[a.officialId]
      if (!o) return 'No such official'
      if (o.act > state.act) return 'Not available yet'
      if (state.officials.includes(a.officialId)) return 'Already on the payroll'
      if (t < state.officialCooldownUntil) return 'Too soon after the last official'
      if (state.influence < o.cost - EPS) return 'Not enough Influence'
      state.influence -= o.cost
      state.officials.push(a.officialId)
      state.officialCooldownUntil = t + hoursToMs(c, c.officials.cooldownDays * 24)
      state.stats.officialBoughtAt[a.officialId] = t
      emit(ctx, t, { type: 'OFFICIAL_BOUGHT', officialId: a.officialId, cost: o.cost })
      return null
    }

    case 'BRIBE': {
      if (state.bribeControl > 0 && state.bribeUntil > t) return 'A bribe is already working'
      const d = derive(state, c)
      const cost = d.costs.bribe
      if (state.dirty < cost - EPS) return 'Not enough Dirty'
      state.dirty -= cost
      state.stats.bribesPaid += cost
      const control = c.heat.bribe.controlPct * (d.controlParts.base + d.controlParts.officials) * d.controlParts.districtMult
      state.bribeControl = control
      state.bribeUntil = t + hoursToMs(c, c.heat.bribe.hours)
      emit(ctx, t, { type: 'BRIBED', cost, control, until: state.bribeUntil })
      return null
    }

    case 'BUY_DISTRICT': {
      const dc = c.districts.list[a.districtId]
      if (!dc) return 'No such district'
      if (dc.act > state.act) return 'That district is not open yet'
      if (getDistrict(state, a.districtId).controller === 'player') return 'Already yours'
      if (state.clean < dc.buyout - EPS) return 'Not enough Clean'
      emit(ctx, t, { type: 'DISTRICT_BOUGHT', districtId: a.districtId, cost: dc.buyout })
      spendClean(state, ctx, t, dc.buyout)
      takeDistrict(state, ctx, t, a.districtId, 'buyout')
      return null
    }

    case 'BUY_FRONT': {
      const ft = c.fronts.types[a.frontType]
      if (!ft) return 'No such front'
      if (state.fronts.some((f) => f.type === a.frontType)) return 'You already run one'
      if (state.reputation < ft.unlockRep) return 'Not unlocked yet'
      if (state.clean < ft.cost - EPS) return 'Not enough Clean'
      const frontId = newId(state, 'f')
      state.fronts.push({ id: frontId, type: a.frontType, level: 0, capacityLevel: 0, mode: 'normal', buffer: 0, convertedThisHour: 0, util: 0 })
      emit(ctx, t, { type: 'FRONT_BOUGHT', frontId, frontType: a.frontType, cost: ft.cost })
      spendClean(state, ctx, t, ft.cost)
      return null
    }

    case 'UPGRADE_FRONT': {
      const f = state.fronts.find((x) => x.id === a.frontId)
      if (!f) return 'No such front'
      if (a.track === 'capacity') {
        if (f.capacityLevel >= c.fronts.upgrade.capacity.levels) return 'No room left to expand'
        const cost = F.frontCapacityUpgradeCost(c, f.type, f.capacityLevel)
        if (state.clean < cost - EPS) return 'Not enough Clean'
        f.capacityLevel++
        emit(ctx, t, { type: 'FRONT_UPGRADED', frontId: f.id, level: f.capacityLevel, cost, track: 'capacity' })
        spendClean(state, ctx, t, cost)
        return null
      }
      if (f.level >= c.fronts.upgrade.levels) return 'Fully upgraded'
      const cost = F.frontUpgradeCost(c, f.type, f.level)
      if (state.clean < cost - EPS) return 'Not enough Clean'
      f.level++
      emit(ctx, t, { type: 'FRONT_UPGRADED', frontId: f.id, level: f.level, cost, track: 'rate' })
      spendClean(state, ctx, t, cost)
      return null
    }

    case 'SET_FRONT_MODE': {
      const f = state.fronts.find((x) => x.id === a.frontId)
      if (!f) return 'No such front'
      if (!FRONT_MODES.includes(a.mode)) return 'No such mode'
      if (f.mode === a.mode) return 'Already running that way'
      f.mode = a.mode
      state.stats.frontModeChanges++
      emit(ctx, t, { type: 'FRONT_MODE_SET', frontId: f.id, mode: a.mode })
      return null
    }

    case 'PAY_TRIBUTE': {
      const tol = state.rival.tolya
      const demand = tol.demand
      if (demand === null) return 'Nobody is asking'
      const choice = a.choice ?? 'pay'
      if (choice === 'refuse') {
        refuseDemand(state, ctx, t, ctx.rng.derive('refuse', tol.tickCount), true)
        return null
      }
      if (choice === 'haggle') {
        if (!canHaggle(state)) return 'He won’t hear it twice'
        const m = bestHaggler(state, c)
        if (!m) return 'Nobody free to talk to him'
        const price = Math.max(1, Math.round(demand * c.rivals.tolya.haggle.pricePct))
        if (state.dirty < price - EPS) return 'Not enough Dirty'
        haggle(state, ctx, t, m)
        return null
      }
      if (state.dirty < demand - EPS) return 'Not enough Dirty'
      state.dirty -= demand
      tol.demand = null
      tol.haggledTick = null
      state.stats.tributeLost += demand
      changeDisposition(state, c.rivals.tolya.dispositionPerTribute)
      emit(ctx, t, { type: 'TRIBUTE_PAID', amount: demand })
      return null
    }

    case 'SKIP_TIME': {
      if (!Number.isInteger(a.hours) || a.hours < 1) return 'Skip a whole number of hours'
      if (a.hours > c.gold.maxSkipHours) return `At most ${c.gold.maxSkipHours} hours at a time`
      const bars = skipCost(c, a.hours)
      if (state.gold < bars) return 'Not enough gold'
      state.gold -= bars
      state.stats.gold.spentSkip += bars
      state.stats.gold.hoursSkipped += a.hours
      emit(ctx, t, { type: 'TIME_SKIPPED', hours: a.hours, bars })
      // Skipping is waiting, bought: the ordinary walk runs over those hours, rolls and all (ADR 0034).
      const ms = a.hours * c.time.hourMs
      advance(state, ctx, t + ms)
      state.skippedMs += ms
      return null
    }

    case 'RUSH_OP': {
      const op = state.ops.find((o) => o.id === a.opId)
      if (!op) return 'That job is already done'
      const bars = rushCost(c, op.completesAt - t)
      if (state.gold < bars) return 'Not enough gold'
      state.gold -= bars
      state.stats.gold.spentRush += bars
      emit(ctx, t, { type: 'OP_RUSHED', opId: op.id, opType: op.type, bars, ...(op.name ? { name: op.name } : {}) })
      // The roll it was always going to get: resolution is seeded by the job's id, not the time.
      op.completesAt = t
      resolveOp(state, ctx, op, t)
      return null
    }

    case 'BUY_SHIPMENT': {
      const z = state.rival.zhanna
      const zc = c.rivals.zhanna
      if (!zhannaDeals(state, c)) return 'Zhanna deals from Act II'
      if (z.nextShipmentAt > t) return 'Her next lot isn’t in yet'
      const price = F.shipmentPrice(c, z.disposition)
      if (state.dirty < price - EPS) return 'Not enough Dirty'
      state.dirty -= price
      state.stats.shipmentsPaid += price
      const packs = addStock(state, derive(state, c).supply.cap, zc.shipment.cigarettes)
      z.shipmentsBought++
      z.nextShipmentAt = t + hoursToMs(c, zc.shipment.cooldownHours)
      changeZhanna(state, zc.dispositionPerShipment)
      emit(ctx, t, { type: 'SHIPMENT_BOUGHT', packs, cost: price })
      return null
    }

    case 'SELL_SURPLUS': {
      const z = state.rival.zhanna
      const zc = c.rivals.zhanna
      if (!zhannaDeals(state, c)) return 'Zhanna deals from Act II'
      if (!Number.isInteger(a.packs) || a.packs < 1) return 'Sell whole packs'
      const room = surplusRoomToday(state, c, t)
      if (room <= 0) return 'She’s bought all she wants today'
      if (a.packs > room) return `She’ll take ${room} more today`
      if (state.inventory.cigarettes < a.packs - EPS) return 'Not that many in stock'
      const day = dayIndex(c, t)
      const before = z.surplusToday.day === day ? z.surplusToday.packs : 0
      state.inventory.cigarettes -= a.packs
      const dirty = a.packs * zc.surplus.pricePerPack
      state.dirty += dirty
      state.stats.surplusSold += dirty
      z.surplusToday = { day, packs: before + a.packs }
      changeZhanna(state, zc.surplus.dispositionPer10 * (Math.floor((before + a.packs) / 10) - Math.floor(before / 10)))
      emit(ctx, t, { type: 'SURPLUS_SOLD', packs: a.packs, dirty })
      return null
    }

    case 'TUTORIAL_ADVANCE':
      return null

    case 'TUTORIAL_SKIP':
      if (!state.tutorial.done) applyQuickStart(state, ctx, t)
      return null

    case 'SESSION_START':
      state.stats.sessions++
      state.stats.lastSessionAt = t
      emit(ctx, t, { type: 'SESSION_START' })
      return null

    case 'SESSION_END':
      emit(ctx, t, { type: 'SESSION_END', durationMs: a.durationMs, actions: a.actions })
      return null

    default:
      return handleDebug(state, ctx, a, t)
  }
}

// What Skip buys (ADR 0035): the quick-start setup, through the ordinary handlers, so Clean, Rep and
// events match buying it by hand. Anything already owned is skipped; anything Clean can't cover is
// placed directly, so skipping never leaves a player worse off than the old fixed start.
function applyQuickStart(state: PlayerState, ctx: Ctx, t: number): void {
  const q = ctx.c.opening.quickStart
  for (const { type, districtId } of q.rackets) {
    if (state.rackets.some((r) => r.type === type && r.districtId === districtId)) continue
    if (handle(state, ctx, { type: 'BUY_RACKET', racketType: type, districtId }, t) === null) continue
    state.rackets.push({ id: newId(state, 'r'), type, districtId, tier: 1, condition: 100, enforcerId: null })
  }
  for (const type of q.fronts) {
    if (state.fronts.some((f) => f.type === type)) continue
    if (handle(state, ctx, { type: 'BUY_FRONT', frontType: type }, t) === null) continue
    state.fronts.push({ id: newId(state, 'f'), type, level: 0, capacityLevel: 0, mode: 'normal', buffer: 0, convertedThisHour: 0, util: 0 })
  }
  for (const id of q.recruits) {
    if (state.crew.length >= q.recruits.length) break
    const cand = state.recruitPool.candidates.find((x) => x.id === id)
    if (!cand) continue
    if (handle(state, ctx, { type: 'RECRUIT', candidateId: id }, t) === null) continue
    state.recruitPool.candidates = state.recruitPool.candidates.filter((x) => x.id !== id)
    state.crew.push({ ...cand, id: newId(state, 'crew'), status: 'idle' })
  }
}

function handleDebug(state: PlayerState, ctx: Ctx, a: Action, t: number): string | null {
  const { c } = ctx
  if (!c.debug.enabled) return 'Debug tools are disabled'
  const note = (detail?: string) => emit(ctx, t, { type: 'DEBUG', action: a.type, detail })

  switch (a.type) {
    case 'DEBUG_ADD_OFFSET':
      if (!(a.ms > 0)) return 'Offset must be positive'
      state.debugOffsetMs += a.ms
      note(`+${a.ms} ms`)
      return null
    case 'DEBUG_GRANT':
      state.dirty += a.dirty ?? 0
      state.clean += a.clean ?? 0
      state.influence += a.influence ?? 0
      if (a.cigarettes) state.inventory.cigarettes = Math.max(0, state.inventory.cigarettes + a.cigarettes)
      if (a.gold) grantGold(state, ctx, t, a.gold, 'debug')
      note(JSON.stringify({ dirty: a.dirty, clean: a.clean, influence: a.influence, cigarettes: a.cigarettes, gold: a.gold }))
      return null
    case 'DEBUG_SET_HEAT':
      state.heat = Math.max(0, Math.min(100, a.heat))
      note(String(state.heat))
      return null
    case 'DEBUG_SET_REP':
      state.reputation = Math.max(0, a.reputation)
      note(String(state.reputation))
      checkActs(state, ctx, t)
      return null
    case 'DEBUG_FORCE_RAID':
      note()
      raid(state, ctx, t)
      return null
    case 'DEBUG_FORCE_ARREST':
      note()
      arrest(state, ctx, t, ctx.rng.derive('debug-arrest', state.nextId++))
      return null
    case 'DEBUG_FORCE_TOLYA':
      note()
      tolyaTick(state, ctx, t)
      return null
    case 'DEBUG_COMPLETE_OPS': {
      note(`${state.ops.length} ops`)
      for (const op of [...state.ops].sort((x, y) => x.completesAt - y.completesAt)) resolveOp(state, ctx, op, t)
      return null
    }
    case 'DEBUG_REFRESH_POOL':
      note()
      regeneratePool(state, ctx, t)
      state.recruitPool.refreshAt = t + hoursToMs(c, c.crew.poolRefreshHours)
      return null
    case 'DEBUG_FORCE_INCIDENT': {
      const rand = ctx.rng.derive('debug-incident', state.nextId)
      const eligible = INCIDENT_TYPES.filter((type) => incidentNeedHolds(state, c, c.incidents.types[type].needs))
      const type = a.incidentType ?? (eligible.length ? rand.pick(eligible) : 'copFavour')
      note(type)
      raiseIncident(state, ctx, t, type, rand.next)
      return null
    }
    case 'DEBUG_REFRESH_OFFERS':
      note()
      state.offers.refreshAt = t + hoursToMs(c, c.offers.refreshHours)
      regenerateOffers(state, ctx, t)
      return null
    default:
      return `Unknown action ${(a as { type: string }).type}`
  }
}
