import { fmt, fmtDuration, fmtRate } from '../format'
import type { Snapshot } from '../store'
import { Bar, Card, colors, glyph, Row, T } from './ui'

// The tobacco chain at a glance (ADR 0032): stock against its cap, made against sold, and when it
// runs out or fills. Read straight from `derive`.
export function SupplyCard({ game }: { game: Snapshot }) {
  const { state: s, derived: d, config: c } = game
  const sup = d.supply
  const p = glyph.packs
  const atCap = sup.stock >= sup.cap - 1e-6
  const hours = (h: number) => fmtDuration(h * c.time.hourMs, c)
  const outlook = s.stockEmpty
    ? { text: 'Out of stock: joints are losing their cigarette trade. Upgrade a factory, build another, or smuggle.', color: colors.heat }
    : Number.isFinite(sup.hoursToEmpty)
      ? { text: `Runs out in ${hours(sup.hoursToEmpty)}: joints sell more than the factories make.`, color: sup.hoursToEmpty < 6 ? colors.warn : colors.muted }
      : atCap
        ? { text: 'Full: anything more made is wasted. A warehouse holds more.', color: colors.warn }
        : Number.isFinite(sup.hoursToFull)
          ? { text: `Full in ${hours(sup.hoursToFull)}.`, color: colors.muted }
          : { text: 'Holding steady.', color: colors.muted }
  return (
    <Card>
      <Row label="Stock" value={`${p}${fmt(sup.stock)} / ${fmt(sup.cap)}`} color={colors.packs} />
      <Bar value={sup.stock} max={sup.cap} color={s.stockEmpty ? colors.heat : colors.packs} />
      <Row label="Factories make" value={`+${p}${fmtRate(sup.madePerHr)}`} />
      <Row label="Joints sell" hint={s.stockEmpty ? `they want ${p}${fmtRate(sup.demandPerHr)}` : undefined} value={`−${p}${fmtRate(sup.soldPerHr)}`} />
      <T small color={outlook.color}>
        {outlook.text}
      </T>
    </Card>
  )
}
