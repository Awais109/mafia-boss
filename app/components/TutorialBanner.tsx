import { StyleSheet, Text, View } from 'react-native'
import { currentTutorialStep, formulas, type Config, type TutorialStepId } from '../../engine'
import { fmt } from '../format'
import type { TabId } from '../screens/types'
import { store, type Snapshot } from '../store'
import { Btn, colors, glyph } from './ui'

type Copy = { title: string; body: string; tab?: TabId; cta?: string }

// The opening's copy (ADR 0035). The engine only knows which step you're on and what advances it;
// numbers come from config so the words stay true when tuning moves them.
function copy(c: Config): Record<TutorialStepId, Copy> {
  const t = c.rackets.types
  const d = glyph.dirty
  const cl = glyph.clean
  const business = { tab: 'rackets' as const, cta: 'Go to Business' }
  return {
    kiosk: {
      title: '1 · Open a Kiosk',
      body: `Uncle Lyosha left you ${cl}${fmt(c.vault.startingClean)} in Clean money. Start small: a Kiosk sells cigarettes, sweets and papers. Joints like it earn Dirty money into your vault and draw a little heat. Each district runs one of each.`,
      ...business,
    },
    stall: {
      title: '2 · Open a Market Stall',
      body: 'A bigger joint: more Dirty, more heat. The vault holds a few hours of income, so the more you run, the more there is to collect.',
      ...business,
    },
    factory: {
      title: '3 · Build the Tobacco Factory',
      body: `Premises make things instead of earning. The factory rolls ${fmt(t.tobaccoFactory.makesPerHr ?? 0)} packs an hour for ${d}${fmt(t.tobaccoFactory.upkeepPerHr ?? 0)} upkeep; your joints sell ${fmt(formulas.jointSales(c, 'kiosk', 1) + formulas.jointSales(c, 'marketStall', 1))}. Out of cigarettes, joints lose part of their trade.`,
      ...business,
    },
    front: {
      title: '4 · Open the Currency Kiosk',
      body: 'Dirty money can’t buy businesses. A front launders Dirty into Clean, at its rate, so much an hour.',
      tab: 'fronts',
      cta: 'Go to Fronts',
    },
    hire: {
      title: '5 · Hire two crew',
      body: 'Three people want work. Muscle, Brains and Nerve decide jobs, and each grows toward a ceiling. Wages come out of Dirty every day. Dima is family: he never walks out.',
      tab: 'crew',
      cta: 'Go to Crew',
    },
    collect: {
      title: '6 · Collect the vault',
      body: 'Your businesses fill the vault. Once it’s full, income stops until you collect. Money flow on Home shows what comes in and what goes out.',
      tab: 'home',
      cta: 'Go to Home',
    },
    launder: {
      title: '7 · Launder, but keep running costs',
      body: `Deposit Dirty into the Currency Kiosk: this first batch is instant. Keep about ${c.fronts.reserveHours} hours of wages and upkeep back, because those are paid in Dirty. The launder-all button keeps it for you.`,
      tab: 'fronts',
      cta: 'Go to Fronts',
    },
    job: {
      title: '8 · Send a job',
      body: `Pick crew and a job: the odds come from their stats, and every job teaches them something. A running job can be finished now for ${glyph.gold}1 a started hour.`,
      tab: 'ops',
      cta: 'Go to Ops',
    },
    upgrade: {
      title: '9 · Upgrade a joint',
      body: 'Tiers earn more, sell more packs and draw more heat. Every Clean you spend earns Reputation, which opens everything else.',
      ...business,
    },
    heat: {
      title: '10 · Heat',
      body: `Everything you run draws attention, and heat drifts toward a target. Above ${c.heat.inspectThreshold}, inspectors cut yield; above ${c.heat.raidThreshold}, raids take from the vault. The Ward Cop, bought with Influence, is your first protection.`,
    },
    tolya: {
      title: '11 · Tolya comes by',
      body: 'The old boss wants his cut, in Dirty. Pay, let your best talker haggle, or refuse and see what breaks.',
      tab: 'home',
      cta: 'Go to Home',
    },
    report: {
      title: '12 · The job comes back',
      body: `Your crew report in with a choice. Answer it, or it takes its default when it expires. Still out? Finish the job now for ${glyph.gold}1.`,
      tab: 'home',
      cta: 'Go to Home',
    },
    city: {
      title: '13 · The city runs without you',
      body: 'Businesses fill the vault, fronts launder, the factory rolls and reports wait for you. Come back when the vault is full, or skip ahead with gold. Your Act I goals are on Home.',
    },
  }
}

export function TutorialBanner({ game, go }: { game: Snapshot; go: (tab: TabId) => void }) {
  const step = currentTutorialStep(game.state)
  if (!step) return null
  const text = copy(game.config)[step]
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{text.title}</Text>
      <Text style={styles.body}>{text.body}</Text>
      <View style={styles.actions}>
        {text.tab && text.cta ? (
          <Btn small kind="primary" title={text.cta} onPress={() => go(text.tab!)} />
        ) : (
          <Btn small kind="primary" title="Got it" onPress={() => store.dispatch({ type: 'TUTORIAL_ADVANCE' })} />
        )}
        <Btn small kind="ghost" title="Skip: set me up" onPress={() => store.dispatch({ type: 'TUTORIAL_SKIP' })} />
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
