import { formulas, surplusRoomToday, zhannaHoldsPort, zhannaHostile } from '../../engine'
import { fmt, fmtDuration, pct } from '../format'
import { store, type Snapshot } from '../store'
import { Btn, BtnRow, Card, colors, glyph, Row, T } from './ui'

// Zhanna (ADR 0036): lots of cigarettes for Dirty, and a buyer for what the joints can't sell. From Act II.
export function ZhannaCard({ game }: { game: Snapshot }) {
  const { state: s, config: c, now } = game
  const z = s.rival.zhanna
  const zc = c.rivals.zhanna
  const hostile = zhannaHostile(s, c)
  const mood = hostile ? 'hostile' : z.disposition < 0 ? 'cool' : z.disposition >= 20 ? 'friendly' : 'businesslike'
  const price = formulas.shipmentPrice(c, z.disposition)
  const wait = z.nextShipmentAt - now
  const room = surplusRoomToday(s, c, now)
  const spare = Math.floor(Math.min(room, s.inventory.cigarettes))
  const p = glyph.packs
  const d = glyph.dirty
  return (
    <Card>
      <T small muted>
        {`Runs the Port Quarter${zhannaHoldsPort(s, c) ? ` and takes ${pct(c.districts.list.portQuarter.tribute)} of what you run on her docks` : ''}. She sells cigarettes by the lot and buys what your joints can't sell.`}
      </T>
      <Row label="Mood" hint={`disposition ${fmt(z.disposition)}`} value={mood} color={hostile ? colors.heat : z.disposition < 0 ? colors.warn : colors.good} />
      <Row label="Her next lot" hint={wait > 0 ? `in ${fmtDuration(wait, c)}` : 'ready now'} value={`${p}${zc.shipment.cigarettes} for ${d}${fmt(price)}`} />
      <Btn
        small
        kind="primary"
        title={`Buy ${p}${zc.shipment.cigarettes} for ${d}${fmt(price)}`}
        disabled={wait > 0 || s.dirty < price}
        onPress={() => store.dispatch({ type: 'BUY_SHIPMENT' })}
      />
      <Row label="Surplus" hint={`she'll take ${room} more today`} value={`${d}${fmt(zc.surplus.pricePerPack)} a pack`} />
      <BtnRow>
        <Btn small title={`Sell ${p}10`} disabled={spare < 10} onPress={() => store.dispatch({ type: 'SELL_SURPLUS', packs: 10 })} />
        <Btn small title={`Sell ${p}${spare}`} disabled={spare < 1} onPress={() => store.dispatch({ type: 'SELL_SURPLUS', packs: spare })} />
      </BtnRow>
      <T small color={colors.faint}>
        {`Buying from her warms her; smuggling past her cools her. While she holds the Port, smuggling runs are ${zc.seizureDiff} harder. Below ${zc.hostileBelow} her lots cost ×${zc.shipment.hostileMarkup}.`}
      </T>
    </Card>
  )
}
