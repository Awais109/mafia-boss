import { fmt, fmtDuration, fmtRate } from '../format'
import type { Snapshot } from '../store'
import { Bar, Card, colors, glyph, Row, T } from './ui'

// A stock at a glance (ADR 0032): stock against its cap, made against sold, and when it runs out or fills.
// Read straight from `derive`. The premium line (ADR 0043) has no factories: convoys and Zhanna fill it.
export function SupplyCard({ game, product = 'cigarettes' }: { game: Snapshot; product?: 'cigarettes' | 'premium' }) {
  const { state: s, derived: d, config: c } = game
  const premium = product === 'premium'
  const sup = premium ? d.premium : d.supply
  const empty = premium ? s.premiumEmpty : s.stockEmpty
  const p = premium ? glyph.premium : glyph.packs
  const color = premium ? colors.premium : colors.packs
  const atCap = sup.stock >= sup.cap - 1e-6
  const hours = (h: number) => fmtDuration(h * c.time.hourMs, c)
  const refill = premium ? 'Run a convoy or buy a lot from Zhanna.' : 'Upgrade a factory, build another, or smuggle.'
  const outlook = empty
    ? { text: `Out of stock: joints are losing their ${premium ? 'premium' : 'cigarette'} trade. ${refill}`, color: colors.heat }
    : Number.isFinite(sup.hoursToEmpty)
      ? {
          text: `Runs out in ${hours(sup.hoursToEmpty)}: joints sell more than ${premium ? 'comes in' : 'the factories make'}.`,
          color: sup.hoursToEmpty < 6 ? colors.warn : colors.muted,
        }
      : atCap
        ? { text: `Full: anything more ${premium ? 'brought in' : 'made'} is wasted. A${premium ? ' bonded' : ''} warehouse holds more.`, color: colors.warn }
        : Number.isFinite(sup.hoursToFull)
          ? { text: `Full in ${hours(sup.hoursToFull)}.`, color: colors.muted }
          : { text: sup.demandPerHr > 0 || sup.stock > 0 ? 'Holding steady.' : 'No joint sells premium yet.', color: colors.muted }
  return (
    <Card>
      <Row label="Stock" value={`${p}${fmt(sup.stock)} / ${fmt(sup.cap)}`} color={color} />
      <Bar value={sup.stock} max={sup.cap} color={empty ? colors.heat : color} />
      {(!premium || sup.madePerHr > 0) && <Row label={premium ? 'Made' : 'Factories make'} value={`+${p}${fmtRate(sup.madePerHr)}`} />}
      <Row label="Joints sell" hint={empty ? `they want ${p}${fmtRate(sup.demandPerHr)}` : undefined} value={`−${p}${fmtRate(sup.soldPerHr)}`} />
      <T small color={outlook.color}>
        {outlook.text}
      </T>
    </Card>
  )
}
