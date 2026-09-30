import { StyleSheet, Text, View } from 'react-native'
import { formulas, surplusRoomToday, zhannaHoldsPort, zhannaHostile } from '../../engine'
import { fmt, fmtDuration, pct } from '../format'
import { FRIENDLY_FROM } from '../story'
import { store, type Snapshot } from '../store'
import { fonts } from '../theme'
import { Head } from './Portrait'
import { Btn, Card, colors, glyph, rich, Title } from './ui'

// Zhanna (ADR 0036; design: Map · Zhanna): lots of cigarettes for Dirty, and a buyer for what the joints
// can't sell. From Act II.
export function ZhannaCard({ game }: { game: Snapshot }) {
  const { state: s, config: c, now } = game
  const z = s.rival.zhanna
  const zc = c.rivals.zhanna
  const hostile = zhannaHostile(s, c)
  const mood = hostile ? 'hostile' : z.disposition < 0 ? 'cool' : z.disposition >= FRIENDLY_FROM ? 'friendly' : 'businesslike'
  const price = formulas.shipmentPrice(c, z.disposition)
  const wait = z.nextShipmentAt - now
  const room = surplusRoomToday(s, c, now)
  const spare = Math.floor(Math.min(room, s.inventory.cigarettes))
  const premium = s.act >= zc.premium.fromAct
  const premiumPrice = price * zc.premium.priceMult
  const p = glyph.packs
  const d = glyph.dirty
  return (
    <Card style={styles.card}>
      <View style={styles.who}>
        <Head id="zhanna" size={44} />
        <View style={styles.whoText}>
          <Title size={18} weight={700}>
            Zhanna Arkadyevna
          </Title>
          <Text style={styles.sub}>
            {'The trader · mood '}
            <Text style={[styles.mood, hostile ? { color: colors.bad } : z.disposition < 0 ? { color: colors.warn } : null]}>{mood}</Text>
          </Text>
        </View>
      </View>
      <Text style={styles.note}>
        {`Runs the Port Quarter${zhannaHoldsPort(s, c) ? ` and takes ${pct(c.districts.list.portQuarter.tribute)} of what you run on her docks` : ''}. She sells cigarettes by the lot and buys what your joints can't sell.`}
      </Text>
      <View style={styles.lot}>
        <View style={styles.lotText}>
          <Text style={styles.caps}>{`Her next lot · ${wait > 0 ? fmtDuration(wait, c) : 'ready'}`}</Text>
          <Text style={styles.lotValue}>{rich(`${p}${zc.shipment.cigarettes} for ${d}${fmt(price)}`, 16)}</Text>
          {premium && <Text style={styles.sub}>{rich(`or ${glyph.premium}${zc.premium.packs} for ${d}${fmt(premiumPrice)}`, 12.5)}</Text>}
        </View>
        <View style={styles.lotButtons}>
          <Btn small title="Buy" disabled={wait > 0 || s.dirty < price} onPress={() => store.dispatch({ type: 'BUY_SHIPMENT' })} />
          {premium && <Btn small title={`Buy ${glyph.premium}`} disabled={wait > 0 || s.dirty < premiumPrice} onPress={() => store.dispatch({ type: 'BUY_SHIPMENT', product: 'premium' })} />}
        </View>
      </View>
      <View style={styles.row}>
        <Btn
          title="Sell her the surplus"
          sub={spare >= 1 ? `${p}${spare} at ${d}${fmt(zc.surplus.pricePerPack)} each` : room < 1 ? 'she’s full today' : 'none spare'}
          disabled={spare < 1}
          onPress={() => store.dispatch({ type: 'SELL_SURPLUS', packs: spare })}
          style={styles.grow}
        />
        <Btn title={`Sell ${p}10`} disabled={spare < 10} onPress={() => store.dispatch({ type: 'SELL_SURPLUS', packs: 10 })} />
      </View>
      <Text style={styles.note}>
        {`${premium ? 'Her premium lots share the wait. ' : ''}Buying from her warms her; smuggling past her cools her. While she holds the Port, smuggling runs are ${zc.seizureDiff} harder. Below ${zc.hostileBelow} her lots cost ×${zc.shipment.hostileMarkup}. She takes ${room} more packs today.`}
      </Text>
    </Card>
  )
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  who: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  whoText: { flex: 1, gap: 2 },
  sub: { fontFamily: fonts.text400, fontSize: 13, color: colors.muted },
  mood: { fontFamily: fonts.text600, color: colors.text },
  note: { fontFamily: fonts.text400, fontSize: 12, lineHeight: 17, color: colors.faint },
  lot: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 4, backgroundColor: colors.cardAlt },
  lotText: { flex: 1, gap: 3 },
  caps: { fontFamily: fonts.text400, fontSize: 11, letterSpacing: 1.1, textTransform: 'uppercase', color: colors.muted },
  lotValue: { fontFamily: fonts.text600, fontSize: 16, color: colors.text },
  lotButtons: { gap: 6 },
  row: { flexDirection: 'row', gap: 8 },
  grow: { flex: 1 },
})
