import { emit, type Ctx } from '../core/ctx'
import { derive, type Derived } from '../core/derive'
import type { PlayerState } from '../model/state'

// The tobacco chain (ADR 0032): one city-wide stock of cigarettes. Factories add to it, joints sell
// from it, warehouses raise its cap. Stock moves continuously with exact clamps, like the vault;
// the shortage flag that cuts joints' yield flips only at whole hours, like inspections.

const EPS = 1e-9

// Over a segment where production, demand and the cap are constant. Crossing zero or the cap emits
// an event at the exact instant, so any split of the segment tells the same story.
export function accrueStock(state: PlayerState, ctx: Ctx, t: number, hours: number, d: Derived): void {
  const { madePerHr: made, demandPerHr: demand, cap } = d.supply
  if (hours <= 0 || (made <= 0 && demand <= 0)) return
  const st = state.stats
  let stock = state.inventory.cigarettes
  let rem = hours
  let elapsed = 0
  const at = () => t + Math.round(elapsed * ctx.c.time.hourMs)
  const flow = (h: number, sold: number, lost: number) => {
    st.packsMade += made * h
    st.packsSold += sold
    st.packsLostToCap += lost
    rem -= h
    elapsed += h
  }

  for (let guard = 0; guard < 4 && rem > 0; guard++) {
    // Above a cap that fell (a damaged warehouse): production is lost while sales bring stock down to it.
    if (stock > cap + EPS) {
      if (demand <= 0) {
        flow(rem, 0, made * rem)
        break
      }
      const h = Math.min(rem, (stock - cap) / demand)
      stock = h < rem ? cap : stock - demand * h
      flow(h, demand * h, made * h)
      continue
    }
    const net = made - demand
    if (stock >= cap - EPS && net >= 0) {
      stock = cap
      flow(rem, demand * rem, net * rem)
      break
    }
    if (stock <= EPS && net <= 0) {
      // Empty: joints sell what the factories make as it comes off the line.
      stock = 0
      flow(rem, made * rem, 0)
      break
    }
    const end = stock + net * rem
    if (net > 0 && end >= cap - EPS) {
      const h = Math.min(rem, (cap - stock) / net)
      stock = cap
      flow(h, demand * h, 0)
      emit(ctx, at(), { type: 'STOCK_CAPPED', cap })
      continue
    }
    if (net < 0 && end <= EPS) {
      const h = Math.min(rem, stock / -net)
      stock = 0
      flow(h, demand * h, 0)
      emit(ctx, at(), { type: 'STOCK_OUT' })
      continue
    }
    stock = end
    flow(rem, demand * rem, 0)
    break
  }
  state.inventory.cigarettes = stock
}

// Whole hour: joints are short while stock is empty and they have customers.
export function supplyHourBoundary(state: PlayerState, ctx: Ctx, t: number): void {
  const d = derive(state, ctx.c)
  const empty = state.inventory.cigarettes <= EPS && d.supply.demandPerHr > 0
  if (empty !== state.stockEmpty) {
    state.stockEmpty = empty
    emit(ctx, t, empty ? { type: 'SHORTAGE_STARTED', demand: d.supply.demandPerHr, made: d.supply.madePerHr } : { type: 'SHORTAGE_ENDED' })
  }
  if (empty) state.stats.shortageHours++
}

// A batch arriving at once (a smuggling run, a decision). What fits goes in and the rest is lost;
// a negative batch takes what's there. Returns the change in stock.
export function addStock(state: PlayerState, cap: number, amount: number): number {
  const stock = state.inventory.cigarettes
  if (amount < 0) {
    const taken = Math.min(stock, -amount)
    state.inventory.cigarettes = stock - taken
    return -taken
  }
  const added = Math.min(amount, Math.max(0, cap - stock))
  state.inventory.cigarettes = stock + added
  state.stats.packsLostToCap += amount - added
  return added
}
