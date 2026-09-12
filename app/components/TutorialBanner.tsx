import { StyleSheet, Text, View } from 'react-native'
import { currentTutorialStep, type TutorialStepId } from '../../engine'
import type { TabId } from '../screens/types'
import { store, type Snapshot } from '../store'
import { Btn, colors } from './ui'

// The tutorial's copy. The engine only knows which step you're on and what advances it.
const COPY: Record<TutorialStepId, { title: string; body: string; tab?: TabId; cta?: string }> = {
  collect: {
    title: '1 · Collect',
    body: 'Your rackets fill the vault with Dirty money. The vault has a cap: once it’s full, income stops until you collect.',
    tab: 'home',
    cta: 'Go to Home',
  },
  deposit: {
    title: '2 · Launder',
    body: 'Dirty money can’t buy anything legitimate. Deposit it into the Currency Kiosk to turn it into Clean. This first batch is instant; after that, fronts launder at a fixed rate per hour.',
    tab: 'fronts',
    cta: 'Go to Fronts',
  },
  spend: {
    title: '3 · Invest',
    body: 'Clean buys and upgrades businesses, and every Clean you spend earns Reputation. Upgrade a racket or open a new one.',
    tab: 'rackets',
    cta: 'Go to Rackets',
  },
  op: {
    title: '4 · Put the crew to work',
    body: 'Jobs pay quick cash and Reputation. Send Vitya to shake down a vendor.',
    tab: 'ops',
    cta: 'Go to Ops',
  },
  heat: {
    title: '5 · Heat',
    body: 'Every racket and job draws attention. Heat drifts toward a target set by your exposure against your control. Above 40, inspections cut yield; above 65, raids take from the vault. Officials and bribes buy control.',
  },
}

export function TutorialBanner({ game, go }: { game: Snapshot; go: (tab: TabId) => void }) {
  const step = currentTutorialStep(game.state)
  if (!step) return null
  const copy = COPY[step]
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{copy.title}</Text>
      <Text style={styles.body}>{copy.body}</Text>
      <View style={styles.actions}>
        {copy.tab && copy.cta ? (
          <Btn small kind="primary" title={copy.cta} onPress={() => go(copy.tab!)} />
        ) : (
          <Btn small kind="primary" title="Got it" onPress={() => store.dispatch({ type: 'TUTORIAL_ADVANCE' })} />
        )}
        <Btn small kind="ghost" title="Skip tutorial" onPress={() => store.dispatch({ type: 'TUTORIAL_SKIP' })} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: 12, marginTop: 8, padding: 10, borderRadius: 8, backgroundColor: '#2a2519', borderWidth: 1, borderColor: '#5c4d2c', gap: 6 },
  title: { color: colors.accent, fontWeight: '700', fontSize: 13 },
  body: { color: colors.text, fontSize: 13, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 8 },
})
