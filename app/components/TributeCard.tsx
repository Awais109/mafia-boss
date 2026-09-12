import { bestHaggler, canHaggle, haggleOdds } from '../../engine'
import { fmt, fmtDuration, pct } from '../format'
import { store, type Snapshot } from '../store'
import { Btn, BtnRow, Card, colors, T } from './ui'

// Tolya's demand, with the three answers (ADR 0029): pay, haggle once with your best talker, or refuse.
export function TributeCard({ game }: { game: Snapshot }) {
  const { state: s, config: c, now } = game
  const demand = s.rival.tolya.demand
  if (demand === null) return null
  const h = c.rivals.tolya.haggle
  const price = Math.max(1, Math.round(demand * h.pricePct))
  const talker = bestHaggler(s, c)
  const can = canHaggle(s)
  return (
    <Card style={{ borderColor: colors.heat }}>
      <T bold color={colors.heat}>Tolya wants his cut</T>
      <T small muted>
        ◆{fmt(demand)} before his next visit in {fmtDuration(s.rival.tolya.nextTickAt - now, c)}, or his boys break something.
      </T>
      <BtnRow>
        <Btn small kind="primary" title={`Pay ◆${fmt(demand)}`} disabled={s.dirty < demand} onPress={() => store.dispatch({ type: 'PAY_TRIBUTE' })} />
        <Btn
          small
          title={talker ? `Haggle: ${talker.name}, ${pct(haggleOdds(s, c))} to pay ◆${fmt(price)}` : 'Haggle: nobody free'}
          disabled={!talker || !can || s.dirty < price}
          onPress={() => store.dispatch({ type: 'PAY_TRIBUTE', choice: 'haggle' })}
        />
        <Btn small kind="danger" title="Refuse" onPress={() => store.dispatch({ type: 'PAY_TRIBUTE', choice: 'refuse' })} />
      </BtnRow>
      {!can && <T small color={colors.warn}>He won’t hear another offer on this one.</T>}
      <T small color={colors.faint}>
        {`Haggling: your best idle Nerve ±${h.noise} against ${h.diff}. Win and he takes ${pct(h.pricePct)}; lose and he’s insulted (${h.dispositionOnInsult} disposition). Refusing breaks a business now.`}
      </T>
    </Card>
  )
}
