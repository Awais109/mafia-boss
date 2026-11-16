import { StyleSheet, Text, View } from 'react-native'
import type { DoNext } from '../doNext'
import type { TabId } from '../screens/types'
import { store } from '../store'
import { fonts } from '../theme'
import { Btn, Card, colors, rich, Section } from './ui'

// Home's first card when nothing waits on you (`doNext`, app/doNext.ts, #38): one suggestion, and a button that
// does it (collect, deposit) or goes to it.
export function DoNextCard({ next, go }: { next: DoNext | null; go: (tab: TabId) => void }) {
  if (!next) return null
  const { actions, tab } = next
  const press = actions ? () => actions.forEach((a) => store.dispatch(a)) : tab ? () => go(tab) : undefined
  return (
    <Section title="Do this next">
      <Card tone="brass">
        <View style={styles.row}>
          <View style={styles.text}>
            <Text style={styles.title}>{rich(next.title, 16)}</Text>
            <Text style={styles.sub}>{rich(next.sub, 13)}</Text>
          </View>
          {next.cta && press ? <Btn small kind={actions ? 'primary' : 'outline'} chevron={!actions} title={next.cta} onPress={press} /> : null}
        </View>
      </Card>
    </Section>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  text: { flex: 1, gap: 3 },
  title: { fontFamily: fonts.text600, fontSize: 16, color: colors.text },
  sub: { fontFamily: fonts.text400, fontSize: 13, color: colors.muted },
})
