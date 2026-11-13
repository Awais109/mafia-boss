import { emit, type Ctx } from '../core/ctx'
import { derive, type Derived, type SupplyDerived } from '../core/derive'
import type { PlayerState } from '../model/state'

// The tobacco chain (ADR 0032): one city-wide stock of cigarettes. Factories add to it, joints sell
// from it, warehouses raise its cap. Stock moves continuously with exact clamps, like the vault;
// the shortage flag that cuts joints' yield flips only at whole hours, like inspections.
// From Act IV a second line runs beside it the same way (ADR 0043): premium imported cigarettes,
// brought in by convoy, sold by premium joints, stored in bonded warehouses.

export type Product = 'cigarettes' | 'premium'

const EPS = 1e-9

type Flow = { stock: number; made: number; sold: number; lost: number; out?: number; capped?: number }

// One line over a segment where production, demand and the cap are constant. Returns the new stock, the
// flows, and the hours into the segment at which stock ran out or filled, so the caller can date events.
function accrueLine(stockIn: number, made: number, demand: number, cap: number, hours: number): Flow {
  const f: Flow = { stock: stockIn, made: 0, sold: 0, lost: 0 }
  let rem = hours
  let elapsed = 0
  const flow = (h: number, sold: number, lost: number) => {
    f.made += made * h
    f.sold += sold
    f.lost += lost
    rem -= h
    elapsed += h
  }
  for (let guard = 0; guard < 4 && rem > 0; guard++) {
    // Above a cap that fell (a damaged warehouse): production is lost while sales bring stock down to it.
    if (f.stock > cap + EPS) {
      if (demand <= 0) {
        flow(rem, 0, made * rem)
        break
      }
      const h = Math.min(rem, (f.stock - cap) / demand)
      f.stock = h < rem ? cap : f.stock - demand * h
      flow(h, demand * h, made * h)
      continue
    }
    const net = made - demand
    if (f.stock >= cap - EPS && net >= 0) {
      f.stock = cap
      flow(rem, demand * rem, net * rem)
      break
    }
    if (f.stock <= EPS && net <= 0) {
      // Empty: joints sell what's made as it comes off the line.
      f.stock = 0
      flow(rem, made * rem, 0)
      break
    }
    const end = f.stock + net * rem
    if (net > 0 && end >= cap - EPS) {
      const h = Math.min(rem, (cap - f.stock) / net)
      f.stock = cap
      flow(h, demand * h, 0)
      f.capped = elapsed
      continue
    }
    if (net < 0 && end <= EPS) {
      const h = Math.min(rem, f.stock / -net)
      f.stock = 0
      flow(h, demand * h, 0)
      f.out = elapsed
      continue
    }
    f.stock = end
    flow(rem, demand * rem, 0)
    break
  }
  return f
}

// Over a segment where production, demand and the caps are constant. Crossing zero or a cap emits an
// event at the exact instant, so any split of the segment tells the same story.
export function accrueStock(state: PlayerState, ctx: Ctx, t: number, hours: number, d: Derived): void {
  if (hours <= 0) return
  const at = (h: number) => t + Math.round(h * ctx.c.time.hourMs)
  const st = state.stats
  const lines: [Product, SupplyDerived][] = [['cigarettes', d.supply], ['premium', d.premium]]
  for (const [product, line] of lines) {
    if (line.madePerHr <= 0 && line.demandPerHr <= 0) continue
    const f = accrueLine(state.inventory[product], line.madePerHr, line.demandPerHr, line.cap, hours)
    state.inventory[product] = f.stock
    const tag = product === 'premium' ? { product } : {}
    if (product === 'premium') {
      st.premiumMade += f.made
      st.premiumSold += f.sold
      st.premiumLostToCap += f.lost
    } else {
      st.packsMade += f.made
      st.packsSold += f.sold
      st.packsLostToCap += f.lost
    }
    if (f.capped !== undefined) emit(ctx, at(f.capped), { type: 'STOCK_CAPPED', cap: line.cap, ...tag })
    if (f.out !== undefined) emit(ctx, at(f.out), { type: 'STOCK_OUT', ...tag })
  }
}

// Whole hour: joints are short while a stock is empty and they have customers.
export function supplyHourBoundary(state: PlayerState, ctx: Ctx, t: number): void {
  const d = derive(state, ctx.c)
  const empty = state.inventory.cigarettes <= EPS && d.supply.demandPerHr > 0
  if (empty !== state.stockEmpty) {
    state.stockEmpty = empty
    emit(ctx, t, empty ? { type: 'SHORTAGE_STARTED', demand: d.supply.demandPerHr, made: d.supply.madePerHr } : { type: 'SHORTAGE_ENDED' })
  }
  if (empty) state.stats.shortageHours++
  const premiumEmpty = state.inventory.premium <= EPS && d.premium.demandPerHr > 0
  if (premiumEmpty !== state.premiumEmpty) {
    state.premiumEmpty = premiumEmpty
    emit(
      ctx,
      t,
      premiumEmpty
        ? { type: 'SHORTAGE_STARTED', demand: d.premium.demandPerHr, made: d.premium.madePerHr, product: 'premium' }
        : { type: 'SHORTAGE_ENDED', product: 'premium' },
    )
  }
  if (premiumEmpty) state.stats.premiumShortageHours++
}

// A batch arriving at once (a smuggling run, a convoy, a decision). What fits goes in and the rest is lost;
// a negative batch takes what's there. Returns the change in stock.
export function addStock(state: PlayerState, cap: number, amount: number, product: Product = 'cigarettes'): number {
  const stock = state.inventory[product]
  if (amount < 0) {
    const taken = Math.min(stock, -amount)
    state.inventory[product] = stock - taken
    return -taken
  }
  const added = Math.min(amount, Math.max(0, cap - stock))
  state.inventory[product] = stock + added
  if (product === 'premium') state.stats.premiumLostToCap += amount - added
  else state.stats.packsLostToCap += amount - added
  return added
}
