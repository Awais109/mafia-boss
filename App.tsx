import { StatusBar } from 'expo-status-bar'
import { useEffect, useState, type ReactNode } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { AwayModal } from './app/components/AwayModal'
import { Header } from './app/components/Header'
import { NoticeBar } from './app/components/NoticeBar'
import { TutorialBanner } from './app/components/TutorialBanner'
import { colors } from './app/components/ui'
import { CrewScreen } from './app/screens/CrewScreen'
import { DebugScreen } from './app/screens/DebugScreen'
import { FrontsScreen } from './app/screens/FrontsScreen'
import { HeatScreen } from './app/screens/HeatScreen'
import { HomeScreen } from './app/screens/HomeScreen'
import { LogScreen } from './app/screens/LogScreen'
import { OpsScreen } from './app/screens/OpsScreen'
import { RacketsScreen } from './app/screens/RacketsScreen'
import { TurfScreen } from './app/screens/TurfScreen'
import type { ScreenProps, TabId } from './app/screens/types'
import { store, useGame, type Snapshot } from './app/store'

const TABS: { id: TabId; title: string; debugOnly?: boolean; render: (p: ScreenProps) => ReactNode }[] = [
  { id: 'home', title: 'Home', render: (p) => <HomeScreen {...p} /> },
  { id: 'rackets', title: 'Rackets', render: (p) => <RacketsScreen {...p} /> },
  { id: 'fronts', title: 'Fronts', render: (p) => <FrontsScreen {...p} /> },
  { id: 'ops', title: 'Ops', render: (p) => <OpsScreen {...p} /> },
  { id: 'crew', title: 'Crew', render: (p) => <CrewScreen {...p} /> },
  { id: 'heat', title: 'Heat', render: (p) => <HeatScreen {...p} /> },
  { id: 'turf', title: 'Turf', render: (p) => <TurfScreen {...p} /> },
  { id: 'log', title: 'Log', render: (p) => <LogScreen {...p} /> },
  { id: 'debug', title: 'Debug', debugOnly: true, render: (p) => <DebugScreen {...p} /> },
]

// A dot on a tab means something there wants attention.
function badges(game: Snapshot): Partial<Record<TabId, boolean>> {
  const { state: s, derived: d, config: c } = game
  return {
    home: s.vault >= d.vaultCap - 1e-6 || s.rival.tolya.demand !== null,
    fronts: s.dirty >= 1 && d.perFront.some((f) => f.bufferCap - (s.fronts.find((x) => x.id === f.id)?.buffer ?? 0) >= 1),
    ops: s.crew.some((m) => m.status === 'idle'),
    heat: s.heat >= c.heat.inspectThreshold,
  }
}

export default function App() {
  useEffect(() => store.start(), [])
  const game = useGame()
  const [tab, setTab] = useState<TabId>('home')

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
        <StatusBar style="light" />
        {!game ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : (
          <>
            <Header game={game} />
            <TabBar tab={tab} onChange={setTab} game={game} />
            <TutorialBanner game={game} go={setTab} />
            <NoticeBar notice={game.notice} realNow={game.realNow} />
            <View style={styles.body}>{TABS.find((t) => t.id === tab)?.render({ game, go: setTab })}</View>
            {game.away && <AwayModal summary={game.away} game={game} />}
          </>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  )
}

function TabBar({ tab, onChange, game }: { tab: TabId; onChange: (t: TabId) => void; game: Snapshot }) {
  const dots = badges(game)
  return (
    <View style={styles.tabBar}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {TABS.filter((t) => !t.debugOnly || game.config.debug.enabled).map((t) => (
          <Pressable key={t.id} onPress={() => onChange(t.id)} style={[styles.tab, tab === t.id && styles.tabActive]}>
            <Text style={[styles.tabText, tab === t.id && styles.tabTextActive]}>
              {t.title}
              {dots[t.id] ? <Text style={styles.dot}> •</Text> : null}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
  tabBar: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  tabs: { paddingHorizontal: 8, gap: 4 },
  tab: { paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: colors.accent },
  tabText: { color: colors.muted, fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: colors.text },
  dot: { color: colors.dirty },
})
