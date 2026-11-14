import type { Config, IncidentType, InboxItem, OpType } from '../engine'

// A decision's title, as Home's card and a notification both show it. Pure, so the notification planner can
// use it (app/notify/plan.ts).
export function itemTitle(item: Pick<InboxItem, 'kind' | 'ref'>, c: Config): string {
  if (item.kind === 'incident') return c.incidents.types[item.ref as IncidentType]?.name ?? 'An incident'
  if (item.kind === 'report') return `${c.ops.list[item.ref as OpType]?.name ?? 'A job'}: the crew reports`
  return 'A promotion'
}
