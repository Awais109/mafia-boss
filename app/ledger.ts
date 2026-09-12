import { gameDay, ledgerDays, type Config, type PlayerState } from '../engine'

// Rows for Home's "This week" (ADR 0026): what came in and went out each game day.

export type LedgerView = {
  label: string
  dirtyIn: number // rackets and jobs, plus money from decisions and surplus sales
  costs: number // wages, upkeep, repairs, bribes, training, tribute, seizures, shipments
  cleanIn: number
  cleanOut: number // spent on businesses, crew and smuggling
  net: number // Dirty in − costs
  today: boolean
}

export function ledgerView(state: PlayerState, c: Config, now: number): LedgerView[] {
  return ledgerDays(state, now).map((d) => {
    const dirtyIn = d.dirtyEarned + Math.max(0, d.inboxDirty) + d.surplusSold
    const costs =
      d.wagesPaid + d.upkeepPaid + d.repairsPaid + d.bribesPaid + d.trainingPaid + d.tributeLost + d.seized + d.shipmentsPaid +
      Math.max(0, -d.inboxDirty)
    return {
      label: d.today ? 'Today' : `Day ${gameDay(c, state, d.startsAt)}`,
      dirtyIn,
      costs,
      cleanIn: d.cleanEarned,
      cleanOut: d.cleanSpent + d.smugglingPaid,
      net: dirtyIn - costs,
      today: d.today,
    }
  })
}
