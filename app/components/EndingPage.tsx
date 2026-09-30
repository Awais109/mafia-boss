import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { SvgXml } from 'react-native-svg'
import { DISTRICT_IDS, empireValue, gameDay, type Ending } from '../../engine'
import { ART, type ArtId } from '../art/scenes'
import { fmt } from '../format'
import { PEOPLE } from '../people'
import { ENDING_LINE, ENDING_NAME, LYOSHA_DATES } from '../story'
import type { Snapshot } from '../store'
import { fonts, paper } from '../theme'
import { Icon } from './Glyph'
import { glyph, rich } from './ui'

// The end of the story (ADR 0053; design: Ending · the Holding, Credits). The ending page: the city from the
// hills, the rule's last line, Vitya's "Where to?", the ending's name and Back to the city. Then the credits:
// the cast with their epithets, your numbers, and Keep going. The Empire is the same city at night.

// The Holding at dawn; the Empire the same view by night, under a wash of ink.
export function CityArt({ art, ending, style }: { art: ArtId; ending: Ending; style?: object }) {
  const a = ART[art]
  return (
    <View style={[{ width: '100%', aspectRatio: a.width / a.height }, style]} accessible accessibilityRole="image" accessibilityLabel={ending === 'empire' ? `${a.label} By night.` : a.label}>
      <SvgXml xml={a.xml} width="100%" height="100%" />
      {ending === 'empire' && <View style={styles.night} />}
    </View>
  )
}

export function EndingPage({ ending, onBack }: { ending: Ending; onBack: () => void }) {
  const insets = useSafeAreaInsets()
  return (
    <Modal visible animationType="fade" onRequestClose={onBack}>
      <ScrollView style={styles.page} contentContainerStyle={[styles.fill, { paddingBottom: insets.bottom + 22 }]}>
        <View>
          <CityArt art="holdingDawn" ending={ending} />
          <View style={[styles.caption, { top: insets.top + 18 }]}>
            <Text style={styles.captionText}>{ENDING_LINE[ending]}</Text>
          </View>
          <View style={styles.bubble}>
            <Text style={styles.bubbleText}>WHERE TO?</Text>
          </View>
        </View>
        <View style={styles.foot}>
          <Text style={styles.kicker}>ENDING</Text>
          <Text style={styles.title} adjustsFontSizeToFit numberOfLines={1}>
            {ENDING_NAME[ending].replace(/^the /, 'The ').toUpperCase()}
          </Text>
          <Text style={styles.sub}>The city runs on. So can you.</Text>
          <Pressable onPress={onBack} accessibilityRole="button" style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
            <Text style={styles.buttonText}>BACK TO THE CITY</Text>
            <Icon name="arrowRight" size={16} color={paper.paper} strokeWidth={2.2} />
          </Pressable>
        </View>
      </ScrollView>
    </Modal>
  )
}

export function CreditsPage({ game, ending, onDone }: { game: Snapshot; ending: Ending; onDone: () => void }) {
  const { state: s, config: c, derived: d, now } = game
  const insets = useSafeAreaInsets()
  const at = s.stats.endings[ending] ?? now
  const earners = s.rackets.filter((r) => c.rackets.types[r.type].kind !== 'premises')
  const legal = earners.filter((r) => r.legal).length
  const held = DISTRICT_IDS.filter((id) => s.districts.find((x) => x.id === id)?.controller === 'player')
  const notHeld = DISTRICT_IDS.filter((id) => !held.includes(id)).map((id) => c.districts.list[id].name)
  const numbers: { label: string; hint: string; value: string }[] = [
    { label: 'Days', hint: 'from the envelope to the hills', value: String(gameDay(c, s, at)) },
    { label: 'Reputation', hint: 'the city’s opinion of your money', value: `${glyph.rep}${fmt(s.reputation)}` },
    { label: 'Businesses legal', hint: 'every rouble with a story', value: `${legal} / ${earners.length}` },
    { label: 'Districts held', hint: notHeld.length ? `all but ${notHeld.join(' and ')}` : 'every one', value: `${held.length} / ${DISTRICT_IDS.length}` },
  ]
  // The family and the crew, then everyone else, as the People pages list them.
  const crew = PEOPLE.filter((p) => ['lyosha', 'vitya', 'dima', 'sasha'].includes(p.id))
  const rest = PEOPLE.filter((p) => !crew.includes(p))
  return (
    <Modal visible animationType="fade" onRequestClose={onDone}>
      <ScrollView style={styles.page} contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}>
        <CityArt art="creditsStrip" ending={ending} style={{ marginTop: insets.top }} />
        <View style={styles.credits}>
          <Text style={styles.wordmark}>SEVGOROD</Text>
          <Text style={styles.recorded}>{`${ENDING_NAME[ending].replace(/^the /, 'The ')} · recorded on day ${gameDay(c, s, at)}`.toUpperCase()}</Text>
          <Text style={styles.cast}>THE CAST</Text>
          <View style={styles.rule} />
          {crew.map((p) => (
            <CastLine key={p.id} epithet={p.epithet} name={p.name} sub={p.id === 'lyosha' ? LYOSHA_DATES : undefined} big={p.id === 'lyosha'} />
          ))}
          <View style={styles.rule} />
          {rest.map((p) => (
            <CastLine key={p.id} epithet={p.epithet} name={p.name} />
          ))}
        </View>
        <View style={styles.numbers}>
          <View style={styles.numbersHead}>
            <View style={styles.hair} />
            <Text style={styles.numbersTitle}>YOUR NUMBERS</Text>
            <View style={styles.hair} />
          </View>
          <View style={styles.box}>
            {numbers.map((n) => (
              <View key={n.label} style={styles.row}>
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>{n.label}</Text>
                  <Text style={styles.rowHint}>{n.hint}</Text>
                </View>
                <Text style={styles.rowValue}>{rich(n.value, 17, { ink: true })}</Text>
              </View>
            ))}
            <View style={[styles.row, styles.totalRow]}>
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>Empire value</Text>
                <Text style={styles.rowHint}>everything you own, plus a day of income</Text>
              </View>
              <Text style={styles.totalValue}>{fmt(empireValue(s, c, d).total)}</Text>
            </View>
            <View style={styles.doubleRule} />
          </View>
          <Text style={styles.closing}>{'The story is complete.\nThe game carries on.'}</Text>
          <Pressable onPress={onDone} accessibilityRole="button" style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
            <Text style={styles.buttonText}>KEEP GOING</Text>
            <Icon name="arrowRight" size={16} color={paper.paper} strokeWidth={2.2} />
          </Pressable>
        </View>
      </ScrollView>
    </Modal>
  )
}

function CastLine({ epithet, name, sub, big }: { epithet: string; name: string; sub?: string; big?: boolean }) {
  return (
    <View style={styles.castLine}>
      <Text style={styles.epithet}>{epithet.toUpperCase()}</Text>
      <Text style={[styles.name, big && styles.nameBig]}>{name.toUpperCase()}</Text>
      {sub ? <Text style={styles.castSub}>{sub}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: paper.paper },
  fill: { flexGrow: 1 },
  night: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(12, 16, 34, 0.58)' },
  caption: { position: 'absolute', left: 16, width: 226, paddingTop: 10, paddingBottom: 11, paddingHorizontal: 12, backgroundColor: paper.paperLight, borderWidth: 1.5, borderColor: paper.ink },
  captionText: { fontFamily: fonts.caption, fontSize: 14, lineHeight: 19, color: paper.ink },
  bubble: {
    position: 'absolute',
    left: '50.8%',
    top: '48%',
    width: 82,
    height: 62,
    borderRadius: 41,
    borderWidth: 2,
    borderColor: paper.ink,
    backgroundColor: '#fbf8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleText: { fontFamily: fonts.speech, fontSize: 21, lineHeight: 20, textAlign: 'center', color: paper.ink },
  foot: { flexGrow: 1, paddingTop: 22, paddingHorizontal: 18, gap: 6 },
  kicker: { fontFamily: fonts.display700, fontSize: 13, letterSpacing: 5.5, color: '#5a5144' },
  title: { fontFamily: fonts.display900, fontSize: 64, lineHeight: 58, paddingTop: 6, color: paper.ink },
  sub: { marginTop: 6, fontFamily: fonts.caption, fontSize: 17, lineHeight: 22, color: paper.ink },
  button: { marginTop: 24, height: 52, borderRadius: 2, backgroundColor: paper.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  buttonText: { fontFamily: fonts.display800, fontSize: 17, letterSpacing: 3.7, color: paper.paper },
  pressed: { opacity: 0.85 },
  credits: { alignItems: 'center', paddingTop: 30, paddingHorizontal: 18 },
  wordmark: { fontFamily: fonts.display800, fontSize: 17, letterSpacing: 5, color: paper.ink },
  recorded: { marginTop: 8, fontFamily: fonts.text600, fontSize: 11, letterSpacing: 1.6, color: '#5a5144', textAlign: 'center' },
  cast: { marginTop: 34, fontFamily: fonts.display900, fontSize: 44, lineHeight: 44, color: paper.ink },
  rule: { width: 38, height: 2, backgroundColor: paper.ink, marginVertical: 20 },
  castLine: { alignItems: 'center', marginBottom: 16 },
  epithet: { fontFamily: fonts.text600, fontSize: 11, letterSpacing: 1.8, color: '#5a5144', textAlign: 'center' },
  name: { marginTop: 3, fontFamily: fonts.display900, fontSize: 28, lineHeight: 30, color: paper.ink, textAlign: 'center' },
  nameBig: { fontSize: 38, lineHeight: 40 },
  castSub: { marginTop: 4, fontFamily: fonts.text400, fontSize: 12.5, color: '#3d372e' },
  numbers: { paddingHorizontal: 20, paddingTop: 20 },
  numbersHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  hair: { flex: 1, height: 1, backgroundColor: paper.pencilLine },
  numbersTitle: { fontFamily: fonts.text600, fontSize: 11, letterSpacing: 1.8, color: paper.ink },
  box: { borderWidth: 1, borderColor: paper.ink, backgroundColor: paper.paperLight, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 14 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#d8d0bf' },
  rowText: { flex: 1, gap: 2 },
  rowLabel: { fontFamily: fonts.text600, fontSize: 14, color: paper.ink },
  rowHint: { fontFamily: fonts.text400, fontSize: 11.5, color: '#5a5144' },
  rowValue: { fontFamily: fonts.text600, fontSize: 17, color: paper.ink, fontVariant: ['tabular-nums'] },
  totalRow: { borderBottomWidth: 0, borderTopWidth: 1, borderTopColor: paper.ink },
  totalValue: { fontFamily: fonts.display800, fontSize: 24, color: paper.ink, fontVariant: ['tabular-nums'] },
  doubleRule: { height: 4, borderTopWidth: 1, borderBottomWidth: 1, borderColor: paper.ink },
  closing: { marginTop: 30, fontFamily: fonts.caption, fontSize: 16, lineHeight: 22, textAlign: 'center', color: paper.ink },
})
