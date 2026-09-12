import type { Config, OpConfig } from '../config/schema'
import { emit, type Ctx } from '../core/ctx'
import type { Rand } from '../core/rng'
import { hoursToMs } from '../core/time'
import type { Offer, PlayerState } from '../model/state'

// The opportunities board (ADR 0025): a few generated, expiring variants of the fixed jobs.
// Refreshes on a fixed schedule like the recruit pool, so any split of a reconcile agrees.

export function generateOffers(c: Config, state: PlayerState, rand: Rand, refreshCount: number, expiresAt: number): Offer[] {
  const pool = Object.keys(c.offers.templates).filter((id) => {
    const tpl = c.offers.templates[id]
    const base = c.ops.list[tpl.base]
    return base !== undefined && !base.districtPressure && !base.training && (tpl.act ?? base.act ?? 1) <= state.act
  })
  const out: Offer[] = []
  for (let n = 0; n < c.offers.count && pool.length > 0; n++) {
    const id = pool.splice(Math.floor(rand.next() * pool.length), 1)[0]
    const tpl = c.offers.templates[id]
    const base = c.ops.list[tpl.base]
    const between = ([lo, hi]: [number, number]) => lo + rand.next() * (hi - lo)
    const diffAdd = between(tpl.diffAdd)
    const rewardMult = between(tpl.rewardMult)
    const spikeMult = between(tpl.spikeMult)
    const minutesMult = between(tpl.minutesMult)
    const cfg: OpConfig = {
      ...base,
      name: tpl.name,
      diff: base.diff + Math.round(diffAdd),
      spike: Math.round(base.spike * spikeMult * 10) / 10,
      minutes: Math.max(5, Math.round((base.minutes * minutesMult) / 5) * 5),
    }
    if (base.dirty) cfg.dirty = Math.round(base.dirty * rewardMult)
    if (base.influence) cfg.influence = Math.ceil(base.influence * rewardMult)
    if (base.cigarettes) cfg.cigarettes = Math.round(base.cigarettes * rewardMult)
    out.push({ id: `offer${refreshCount}-${n}`, opType: tpl.base, name: tpl.name, cfg, expiresAt })
  }
  return out
}

export function regenerateOffers(state: PlayerState, ctx: Ctx, t: number): void {
  const o = state.offers
  o.refreshCount++
  o.items = generateOffers(ctx.c, state, ctx.rng.derive('offers', o.refreshCount), o.refreshCount, o.refreshAt)
  emit(ctx, t, { type: 'OFFERS_REFRESHED', count: o.items.length })
}

export function refreshOffersIfDue(state: PlayerState, ctx: Ctx, t: number): void {
  const o = state.offers
  if (o.refreshAt > t) return
  const interval = hoursToMs(ctx.c, ctx.c.offers.refreshHours)
  while (o.refreshAt <= t) o.refreshAt += interval
  regenerateOffers(state, ctx, t)
}
