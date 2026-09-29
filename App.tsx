import { useFonts } from 'expo-font'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useState, type ReactNode } from 'react'
import { ActivityIndicator, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { gameDay } from './engine'
import { AwayModal } from './app/components/AwayModal'
import { EventNoticeModal } from './app/components/EventNoticeModal'
import { Icon, type IconName } from './app/components/Glyph'
import { Header } from './app/components/Header'
import { NoticeBar } from './app/components/NoticeBar'
import { SkipSheet } from './app/components/SkipSheet'
import { TutorialBanner } from './app/components/TutorialBanner'
import { FONT_ASSETS } from './app/fonts'
import { homeNeedsAttention } from './app/inbox'
import { CrewScreen } from './app/screens/CrewScreen'
import { DebugScreen } from './app/screens/DebugScreen'
import { FrontsScreen } from './app/screens/FrontsScreen'
import { HeatScreen } from './app/screens/HeatScreen'
import { HomeScreen } from './app/screens/HomeScreen'
import { HowItWorksScreen } from './app/screens/HowItWorksScreen'
import { LogScreen } from './app/screens/LogScreen'
import { OpsScreen } from './app/screens/OpsScreen'
import { RacketsScreen } from './app/screens/RacketsScreen'
import { StatsScreen } from './app/screens/StatsScreen'
import { TurfScreen } from './app/screens/TurfScreen'
import type { ScreenProps, TabId } from './app/screens/types'
import { store, useGame, type Snapshot } from './app/store'
import { colors, fonts } from './app/theme'

type Tab = { id: TabId; title: string; icon: IconName; debugOnly?: boolean; render: (p: ScreenProps) => ReactNode }

// Five destinations in the bottom bar; the other five (and Debug) a tap away under More (design: the shell).
const BAR: Tab[] = [
  { id: 'home', title: 'Home', icon: 'home', render: (p) => <HomeScreen {...p} /> },
  { id: 'rackets', title: 'Business', icon: 'business', render: (p) => <RacketsScreen {...p} /> },
  { id: 'fronts', title: 'Fronts', icon: 'fronts', render: (p) => <FrontsScreen {...p} /> },
  { id: 'ops', title: 'Ops', icon: 'ops', render: (p) => <OpsScreen {...p} /> },
  { id: 'turf', title: 'Map', icon: 'map', render: (p) => <TurfScreen {...p} /> },
]
const MORE: Tab[] = [
  { id: 'crew', title: 'Crew', icon: 'crew', render: (p) => <CrewScreen {...p} /> },
  { id: 'heat', title: 'Heat', icon: 'heat', render: (p) => <HeatScreen {...p} /> },
  { id: 'stats', title: 'Stats', icon: 'stats', render: (p) => <StatsScreen {...p} /> },
  { id: 'help', title: 'How it works', icon: 'help', render: (p) => <HowItWorksScreen {...p} /> },
  { id: 'log', title: 'Log', icon: 'log', render: (p) => <LogScreen {...p} /> },
  { id: 'debug', title: 'Debug', icon: 'debug', debugOnly: true, render: (p) => <DebugScreen {...p} /> },
]
const ALL = [...BAR, ...MORE]

// A dot means something there wants attention.
function badges(game: Snapshot): Partial<Record<TabId, boolean>> {
  const { state: s, derived: d, config: c } = game
  return {
    home: homeNeedsAttention(game),
    fronts: s.dirty >= 1 && d.perFront.some((f) => !f.frozen && f.bufferCap - (s.fronts.find((x) => x.id === f.id)?.buffer ?? 0) >= 1),
    ops: s.crew.some((m) => m.status === 'idle'),
    heat: s.heat >= c.heat.inspectThreshold,
  }
}

// What each More row says on its right.
function moreNote(game: Snapshot, id: TabId): { text: string; color?: string } {
  const { state: s, derived: d, config: c, now } = game
  switch (id) {
    case 'crew':
      return { text: `${s.crew.length}/${d.crewSlots} · ${s.crew.filter((m) => m.status === 'idle').length} idle` }
    case 'heat': {
      const line = s.heat >= c.heat.raidThreshold ? ' · raids' : s.heat >= c.heat.inspectThreshold ? ' · inspections' : ''
      return { text: `${Math.round(s.heat)}${line}`, color: line ? colors.warn : undefined }
    }
    case 'stats':
      return { text: `day ${gameDay(c, s, now)}` }
    case 'help':
      return { text: 'the rules' }
    case 'log':
      return { text: 'all events' }
    default:
      return { text: '' }
  }
}

// On web, `?tab=ops` opens on a tab: the screenshot rig for design checks uses it (docs/app.md).
function initialTab(): TabId {
  if (Platform.OS !== 'web') return 'home'
  const wanted = new URLSearchParams((globalThis as { location?: { search: string } }).location?.search ?? '').get('tab')
  return ALL.some((t) => t.id === wanted) ? (wanted as TabId) : 'home'
}

export default function App() {
  useEffect(() => store.start(), [])
  const [fontsLoaded, fontError] = useFonts(FONT_ASSETS)
  const game = useGame()
  const [tab, setTab] = useState<TabId>(initialTab)
  const [skipping, setSkipping] = useState(false)
  const [more, setMore] = useState(false)
  const ready = game && (fontsLoaded || fontError)
  const go = (t: TabId) => {
    setMore(false)
    setTab(t)
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
        <StatusBar style="light" />
        {!ready ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : (
          <>
            <Header game={game} onGold={() => setSkipping(true)} go={go} />
            <TutorialBanner game={game} go={go} />
            <NoticeBar notice={game.notice} realNow={game.realNow} />
            <View style={styles.body}>{ALL.find((t) => t.id === tab)?.render({ game, go })}</View>
            <BottomBar tab={tab} game={game} onChange={go} onMore={() => setMore(true)} />
            {more && <MoreSheet game={game} tab={tab} onChange={go} onClose={() => setMore(false)} />}
            {skipping && <SkipSheet game={game} onClose={() => setSkipping(false)} />}
            {game.away ? (
              <AwayModal summary={game.away} game={game} />
            ) : (
              game.notices.length > 0 && <EventNoticeModal notice={game.notices[0]} game={game} />
            )}
          </>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  )
}

function BottomBar({ tab, game, onChange, onMore }: { tab: TabId; game: Snapshot; onChange: (t: TabId) => void; onMore: () => void }) {
  const insets = useSafeAreaInsets()
  const dots = badges(game)
  const inMore = MORE.some((t) => t.id === tab)
  const moreDot = MORE.some((t) => dots[t.id])
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 6) }]}>
      {BAR.map((t) => (
        <BarItem key={t.id} title={t.title} icon={t.icon} active={tab === t.id} dot={!!dots[t.id]} onPress={() => onChange(t.id)} />
      ))}
      <BarItem title="More" icon="more" active={inMore} dot={moreDot} onPress={onMore} />
    </View>
  )
}

function BarItem({ title, icon, active, dot, onPress }: { title: string; icon: IconName; active: boolean; dot: boolean; onPress: () => void }) {
  const color = active ? colors.accent : colors.muted
  return (
    <Pressable style={[styles.barItem, active && styles.barItemActive]} onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected: active }}>
      <View>
        <Icon name={icon} size={24} color={color} />
        {dot && <View style={styles.dot} />}
      </View>
      <Text style={[styles.barText, { color, fontFamily: active ? fonts.text600 : fonts.text500 }]}>{title}</Text>
    </Pressable>
  )
}

function MoreSheet({ game, tab, onChange, onClose }: { game: Snapshot; tab: TabId; onChange: (t: TabId) => void; onClose: () => void }) {
  const insets = useSafeAreaInsets()
  const dots = badges(game)
  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close More" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 8 }]}>
        <View style={styles.grabber} />
        <View style={styles.sheetHead}>
          <Text style={styles.sheetTitle}>More</Text>
          <Pressable onPress={onClose} style={styles.close} accessibilityLabel="Close">
            <Icon name="close" size={16} color={colors.muted} />
          </Pressable>
        </View>
        {MORE.filter((t) => !t.debugOnly || game.config.debug.enabled).map((t) => {
          const note = moreNote(game, t.id)
          return (
            <Pressable key={t.id} style={styles.sheetRow} onPress={() => onChange(t.id)} accessibilityRole="button">
              <Icon name={t.icon} size={22} color={tab === t.id ? colors.accent : colors.muted} />
              <View style={styles.sheetLabel}>
                <Text style={[styles.sheetText, tab === t.id && { color: colors.accent }]}>{t.title}</Text>
                {dots[t.id] && <View style={styles.inlineDot} />}
              </View>
              <Text style={[styles.sheetNote, note.color ? { color: note.color } : null]}>{note.text}</Text>
            </Pressable>
          )
        })}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
  bar: { flexDirection: 'row', backgroundColor: colors.shell, borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: 4 },
  barItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, paddingTop: 8, minHeight: 56, borderTopWidth: 2, borderTopColor: 'transparent', marginTop: -1 },
  barItemActive: { borderTopColor: colors.accent },
  barText: { fontSize: 11 },
  dot: { position: 'absolute', top: -2, right: -6, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.dot, borderWidth: 2, borderColor: colors.shell },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(8,6,4,0.6)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.control, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.control, marginTop: 8, marginBottom: 6 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 16, paddingRight: 8, paddingVertical: 4 },
  sheetTitle: { fontFamily: fonts.text600, fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase', color: colors.accent },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 52, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: colors.cardAlt },
  sheetLabel: { flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  sheetText: { fontFamily: fonts.text400, fontSize: 15, color: colors.text },
  inlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.dot },
  sheetNote: { fontFamily: fonts.text400, fontSize: 13, color: colors.muted },
})
