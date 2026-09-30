import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { SvgXml } from 'react-native-svg'
import { empireValue, gameCleared, gameDay } from '../../engine'
import { ART } from '../art/scenes'
import { ACT_NAME } from '../acts'
import { fmtShort } from '../format'
import { ACT_TITLE, ENDING_NAME } from '../story'
import { firstEnding } from './AfterStory'
import { store, type Snapshot } from '../store'
import { fonts, paper } from '../theme'
import { colors, glyph, rich } from './ui'

// The cover (ADR 0049; design: Cover): the title over the window on the tram and Lyosha's notebook on the
// table, shown when the app opens. Continue says where you are; New game asks first, because it overwrites.
// A save that hasn't started offers only Begin. After the story (ADR 0053; design: Cover · after the Holding) it's
// the city from the hills, at dawn for the Holding and by night for the Empire, with the ending, the day it
// came and the empire value.

export function Cover({ game, onContinue }: { game: Snapshot; onContinue: () => void }) {
  const { state: s, config: c, now } = game
  const insets = useSafeAreaInsets()
  const [confirm, setConfirm] = useState(false)
  const fresh = s.stats.actions === 0 && !s.tutorial.done && s.tutorial.step === 0
  const day = gameDay(c, s, now)
  const ending = gameCleared(s, c) ? firstEnding(game) : null
  const where = ending ? `After the story · Day ${day}` : `Day ${day} · Act ${ACT_NAME[s.act]} · ${ACT_TITLE[s.act]}`
  const art = ending ? ART.coverHolding : ART.cover
  return (
    <View style={[styles.cover, ending && styles.coverAfter]}>
      <View style={StyleSheet.absoluteFill} accessible accessibilityRole="image" accessibilityLabel={art.label}>
        <SvgXml xml={art.xml} width="100%" height="100%" preserveAspectRatio="xMidYMin slice" />
        {ending?.id === 'empire' && <View style={styles.night} />}
      </View>
      {ending && (
        <View style={[styles.titleBlock, { paddingTop: insets.top + 36 }]}>
          <Text style={[styles.title, ending.id === 'empire' && styles.onNight]}>SEVGOROD</Text>
          <Text style={[styles.reached, ending.id === 'empire' && styles.onNight]}>{`${ENDING_NAME[ending.id].replace(/^the /, 'The ')} · reached on day ${gameDay(c, s, ending.t)}`.toUpperCase()}</Text>
        </View>
      )}
      <View style={[styles.actions, { paddingBottom: insets.bottom + 20 }]}>
        {ending && (
          <View style={styles.empire}>
            <Text style={styles.empireLabel}>EMPIRE VALUE</Text>
            <Text style={styles.empireValue}>{rich(`${glyph.clean}${fmtShort(empireValue(s, c, game.derived).total)}`, 28)}</Text>
          </View>
        )}
        <Pressable onPress={onContinue} accessibilityRole="button" style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
          <Text style={styles.primaryText}>{fresh ? 'Begin' : 'Continue'}</Text>
          {!fresh && <Text style={styles.primarySub}>{where}</Text>}
        </Pressable>
        {!fresh && (
          <Pressable onPress={() => setConfirm(true)} accessibilityRole="button" style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
            <Text style={styles.secondaryText}>New game</Text>
          </Pressable>
        )}
      </View>
      {confirm && (
        <View style={styles.scrim}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>START A NEW GAME?</Text>
            <Text style={styles.dialogBody}>
              {'You start again from the envelope. '}
              <Text style={styles.bold}>{`Day ${day} and everything since is gone`}</Text>
              {', and the save is overwritten.'}
            </Text>
            <View style={styles.dialogActions}>
              <Pressable onPress={() => setConfirm(false)} accessibilityRole="button" style={[styles.dialogBtn]}>
                <Text style={styles.dialogBtnText}>Keep playing</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setConfirm(false)
                  store.resetGame()
                  onContinue()
                }}
                accessibilityRole="button"
                style={[styles.dialogBtn, styles.dialogDanger]}
              >
                <Text style={[styles.dialogBtnText, { color: colors.bad }]}>Start again</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  cover: { flex: 1, backgroundColor: paper.ink },
  coverAfter: { backgroundColor: paper.paper },
  night: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(12, 16, 34, 0.58)' },
  titleBlock: { alignItems: 'center', gap: 10 },
  title: { fontFamily: fonts.display900, fontSize: 80, lineHeight: 70, paddingTop: 8, letterSpacing: 1.6, color: paper.ink },
  reached: { fontFamily: fonts.text600, fontSize: 12, letterSpacing: 2.4, color: '#3d372e' },
  onNight: { color: paper.paper },
  empire: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 2, paddingBottom: 6 },
  empireLabel: { fontFamily: fonts.text600, fontSize: 11, letterSpacing: 1.8, color: colors.muted },
  empireValue: { fontFamily: fonts.text600, fontSize: 28, lineHeight: 30, color: colors.clean },
  actions: { position: 'absolute', left: 16, right: 16, bottom: 0, gap: 10 },
  primary: { minHeight: 64, alignItems: 'center', justifyContent: 'center', gap: 2, borderRadius: 4, backgroundColor: colors.accent },
  primaryText: { fontFamily: fonts.text600, fontSize: 17, color: '#16130f' },
  primarySub: { fontFamily: fonts.text400, fontSize: 12.5, color: '#3a2e18' },
  secondary: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 4, borderWidth: 1, borderColor: colors.control, backgroundColor: 'rgba(22, 19, 15, 0.9)' },
  secondaryText: { fontFamily: fonts.text600, fontSize: 15, color: colors.text },
  pressed: { opacity: 0.8 },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(8, 6, 4, 0.72)', justifyContent: 'center', padding: 16 },
  dialog: { gap: 14, padding: 16, borderRadius: 8, borderWidth: 1, borderColor: colors.control, backgroundColor: colors.card },
  dialogTitle: { fontFamily: fonts.display800, fontSize: 24, color: colors.text },
  dialogBody: { fontFamily: fonts.text400, fontSize: 14, lineHeight: 20, color: colors.muted },
  bold: { fontFamily: fonts.text600, color: colors.text },
  dialogActions: { flexDirection: 'row', gap: 8 },
  dialogBtn: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 4, borderWidth: 1, borderColor: colors.control, backgroundColor: colors.cardAlt },
  dialogDanger: { borderColor: '#6b3127', backgroundColor: '#231511' },
  dialogBtnText: { fontFamily: fonts.text600, fontSize: 15, color: colors.text },
})
