import { StyleSheet, Text, View } from 'react-native'
import { bestHaggler, canHaggle, haggleOdds } from '../../engine'
import { fmt, pct } from '../format'
import { TOLYA_ASKS, tolyaMood } from '../story'
import { store, type Snapshot } from '../store'
import { fonts } from '../theme'
import { Head } from './Portrait'
import { Btn, Card, colors, glyph, rich, Title } from './ui'

// Tolya's demand, with the three answers (ADR 0029): pay, haggle once with your best talker, or refuse.
// Design: Home · Tolya's demand. His face, his mood, the demand in his words, and three buttons.
export function TributeCard({ game }: { game: Snapshot }) {
  const { state: s, config: c } = game
  const demand = s.rival.tolya.demand
  if (demand === null) return null
  const h = c.rivals.tolya.haggle
  const price = Math.max(1, Math.round(demand * h.pricePct))
  const talker = bestHaggler(s, c)
  const can = canHaggle(s)
  const mood = tolyaMood(s, c)
  const ask = TOLYA_ASKS[mood].replace('{amount}', `${glyph.dirty}${fmt(demand)}`)
  return (
    <Card tone="brass" style={styles.card}>
      <View style={styles.who}>
        <Head id="tolya" size={56} />
        <View style={styles.words}>
          <View style={styles.nameLine}>
            <Title size={18} weight={700}>
              Tolya
            </Title>
            <Text style={[styles.mood, mood === 'hostile' && { color: colors.bad }]}>{`mood · ${mood}`}</Text>
          </View>
          <Text style={styles.quote}>{rich(`“${ask}”`, 15)}</Text>
        </View>
      </View>
      <View style={styles.answers}>
        <Btn title={`Pay ${glyph.dirty}${fmt(demand)}`} disabled={s.dirty < demand} onPress={() => store.dispatch({ type: 'PAY_TRIBUTE' })} style={styles.answer} />
        <Btn
          title="Haggle"
          sub={!can ? 'he won’t hear it' : talker ? `${talker.name.split(' ')[0]} · ${pct(haggleOdds(s, c))}` : 'nobody free'}
          disabled={!talker || !can || s.dirty < price}
          onPress={() => store.dispatch({ type: 'PAY_TRIBUTE', choice: 'haggle' })}
          style={styles.answer}
        />
        <Btn kind="danger" title="Refuse" onPress={() => store.dispatch({ type: 'PAY_TRIBUTE', choice: 'refuse' })} style={styles.answer} />
      </View>
      <Text style={styles.rules}>
        {rich(
          `Haggling puts your best idle Nerve ±${h.noise} against ${h.diff}: win and he takes ${pct(h.pricePct)} (${glyph.dirty}${fmt(price)}), lose and he’s insulted. Refusing breaks a business now.`,
          12,
        )}
      </Text>
    </Card>
  )
}

const styles = StyleSheet.create({
  card: { gap: 14 },
  who: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  words: { flex: 1, gap: 4 },
  nameLine: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  mood: { fontFamily: fonts.text400, fontSize: 11, letterSpacing: 1.1, textTransform: 'uppercase', color: colors.muted },
  quote: { fontFamily: fonts.text400, fontSize: 15, lineHeight: 21, color: colors.text },
  answers: { flexDirection: 'row', gap: 8 },
  answer: { flex: 1, minHeight: 52, paddingHorizontal: 6 },
  rules: { fontFamily: fonts.text400, fontSize: 12, lineHeight: 17, color: colors.faint },
})
