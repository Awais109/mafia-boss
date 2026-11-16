import { StyleSheet, Text, View } from 'react-native'
import { dailyOffer } from '../../engine'
import { store, type Snapshot } from '../store'
import { fonts } from '../theme'
import { Btn, Card, colors, glyph, rich } from './ui'
import { spoken } from '../a11y'

// Today's gold (ADR 0069): at the top of Home until it's claimed, with the streak it makes.
export function DailyCard({ game }: { game: Snapshot }) {
  const { state: s, config: c, now } = game
  const offer = dailyOffer(s, c, now)
  if (!offer) return null
  const broke = s.daily.lastAt !== null && offer.streak <= s.daily.streak
  const sub =
    offer.streak === 1 && s.daily.lastAt === null
      ? 'Come by each day: the gold grows over the week'
      : broke
        ? `Day ${offer.streak}: a missed day took ${c.daily.dropPerMissedDay} off the streak`
        : `Day ${offer.streak} in a row`
  return (
    <Card tone="brass" style={styles.card}>
      <View style={styles.row}>
        <View style={styles.text}>
          <Text style={styles.title}>Today’s gold</Text>
          <Text style={styles.sub} accessibilityLabel={spoken(sub)}>{rich(sub, 13)}</Text>
        </View>
        <Btn small kind="primary" title={`Claim ${glyph.gold}${offer.gold}`} onPress={() => store.dispatch({ type: 'CLAIM_DAILY' })} />
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  card: { marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  text: { flex: 1, gap: 3 },
  title: { fontFamily: fonts.text600, fontSize: 16, color: colors.text },
  sub: { fontFamily: fonts.text400, fontSize: 13, color: colors.muted },
})
