import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Circle, Defs, Pattern, Rect, SvgXml } from 'react-native-svg'
import { DISTRICT_IDS, type Act, type LaterAct } from '../../engine'
import { HEADS } from '../art/heads'
import { CHAPTER_ART } from '../art/chapters'
import { DOSSIER_ART, PORTRAITS, type PersonId } from '../art/people'
import { ACT_NAME, ACT_OPENS } from '../acts'
import { PEOPLE } from '../people'
import { ACT_TITLE, ACT_TURN, DISTRICT_STORY, revealedBy } from '../story'
import type { Snapshot } from '../store'
import { fonts, paper } from '../theme'
import { MapDrawing } from './CityMap'
import { Icon } from './Glyph'
import { rich } from './ui'

// An act opens as a chapter (ADR 0046's act page; design: Chapter · Act IV): the volume and its title over
// the act's panel, the turn that brought you here in a caption, the boss who holds the new ground, each
// district newly on the map with the line that inked it in, what the act opens, and Turn the page.

const BOSS: Record<LaterAct, PersonId> = { 2: 'zhanna', 3: 'ignatov', 4: 'colonel', 5: 'golovin', 6: 'prosecutor' }

export function ChapterPage({ game, act, onTurn }: { game: Snapshot; act: Act; onTurn: () => void }) {
  const { state: s, config: c } = game
  const insets = useSafeAreaInsets()
  const later = act as LaterAct
  const boss = PEOPLE.find((p) => p.id === BOSS[later])
  const drawn = CHAPTER_ART[act]
  const panel = drawn?.xml ?? (boss ? DOSSIER_ART[boss.id] : undefined)
  const head = boss ? (PORTRAITS[boss.id] ?? (boss.head ? HEADS[boss.head] : undefined)) : undefined
  const holds = boss?.holds?.(s, c)
  const ids = revealedBy(c, act, DISTRICT_IDS)
  const opens = ACT_OPENS[act]
  return (
    <Modal visible animationType="fade" onRequestClose={onTurn}>
      <ScrollView style={styles.page} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        <View style={[styles.art, !drawn && styles.artPlain]}>
          {panel ? (
            <SvgXml xml={panel} width="100%" height="100%" />
          ) : (
            <View style={StyleSheet.absoluteFill}>
              <Screentone />
              {head ? (
                <View style={styles.headWrap}>
                  <SvgXml xml={head} width="100%" height="100%" />
                </View>
              ) : null}
            </View>
          )}
          {drawn ? (
            <View style={[styles.volume, { top: insets.top + 18 }]}>
              <Text style={styles.volumeLabel}>{`VOLUME ${ACT_NAME[act]}`}</Text>
              <Text style={styles.volumeTitle}>{ACT_TITLE[act].toUpperCase()}</Text>
            </View>
          ) : null}
          <View style={styles.caption}>
            <Text style={styles.captionText}>{(ACT_TURN[later] ?? '').replace(/^“|”$/g, '')}</Text>
          </View>
        </View>
        {!drawn && (
          <View style={styles.band}>
            <Text style={[styles.volumeLabel, styles.bandLabel]}>{`VOLUME ${ACT_NAME[act]}`}</Text>
            <Text style={[styles.volumeTitle, styles.bandTitle]}>{ACT_TITLE[act].toUpperCase()}</Text>
          </View>
        )}

        <View style={styles.body}>
          {boss && (
            <View style={styles.bossBlock}>
              <Text style={styles.bossName}>{boss.name.toUpperCase()}</Text>
              <View style={styles.boss}>
                <Text style={[styles.caps, styles.bossText]}>{boss.epithet}</Text>
                {holds ? (
                <View style={styles.holds}>
                  <Text style={styles.holdsLabel}>HOLDS</Text>
                    <Text style={styles.holdsValue}>{holds}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          )}

          {ids.map((id) => (
            <View key={id} style={styles.newOnMap}>
              <View style={styles.miniMap}>
                <MapDrawing game={game} crop={id} selected={id} />
              </View>
              <View style={styles.newText}>
                <Text style={styles.caps}>New on the map</Text>
                <Text style={styles.district}>{c.districts.list[id].name}</Text>
                <Text style={styles.hand}>{DISTRICT_STORY[id].reveal}</Text>
              </View>
            </View>
          ))}

          <View style={styles.opens}>
            <Text style={styles.caps}>What opens</Text>
            <Text style={styles.opensText}>{rich(`${opens.charAt(0).toUpperCase()}${opens.slice(1)}.`, 14, { ink: true })}</Text>
          </View>

          <Pressable onPress={onTurn} accessibilityRole="button" style={({ pressed }) => [styles.turn, pressed && styles.pressed]}>
            <Text style={styles.turnText}>TURN THE PAGE</Text>
            <Icon name="page" size={18} color={paper.paper} />
          </Pressable>
        </View>
      </ScrollView>
    </Modal>
  )
}

// A dotted screentone ground for a panel the design didn't draw.
function Screentone() {
  return (
    <Svg width="100%" height="100%">
      <Defs>
        <Pattern id="chapterTone" width={5} height={5} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <Circle cx={2.5} cy={2.5} r={0.8} fill={paper.ink} />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill={paper.paper} />
      <Rect width="100%" height="100%" fill="url(#chapterTone)" />
    </Svg>
  )
}

const INK = paper.ink

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: paper.paper },
  art: { aspectRatio: 390 / 432, backgroundColor: INK, overflow: 'hidden' },
  artPlain: { aspectRatio: 390 / 330 },
  headWrap: { position: 'absolute', left: '26%', right: '26%', top: '5%', aspectRatio: 1 },
  volume: { position: 'absolute', left: 22, gap: 6 },
  volumeLabel: { fontFamily: fonts.display700, fontSize: 13, letterSpacing: 5.5, color: paper.paper },
  volumeTitle: { fontFamily: fonts.display900, fontSize: 50, lineHeight: 46, color: paper.paper },
  band: { gap: 6, paddingHorizontal: 22, paddingVertical: 18, backgroundColor: INK },
  bandLabel: {},
  bandTitle: { fontSize: 44, lineHeight: 42 },
  caption: { position: 'absolute', left: 16, right: 74, bottom: 16, paddingTop: 10, paddingBottom: 11, paddingHorizontal: 12, backgroundColor: paper.paperLight, borderWidth: 1.5, borderColor: INK },
  captionText: { fontFamily: fonts.caption, fontSize: 14, lineHeight: 19, color: INK },
  body: { gap: 20, padding: 18 },
  bossBlock: { gap: 6 },
  boss: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  bossText: { flex: 1 },
  bossName: { fontFamily: fonts.display900, fontSize: 40, lineHeight: 40, color: INK },
  caps: { fontFamily: fonts.text600, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: '#5a5144' },
  holds: { alignItems: 'flex-end', gap: 2, paddingVertical: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: INK, maxWidth: '45%' },
  holdsLabel: { fontFamily: fonts.text600, fontSize: 10, letterSpacing: 1.2, color: '#5a5144' },
  holdsValue: { fontFamily: fonts.text600, fontSize: 13.5, color: INK, textAlign: 'right' },
  newOnMap: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  miniMap: { width: 140, aspectRatio: 150 / 134, backgroundColor: paper.squared, borderWidth: 1, borderColor: '#cfc5ad', transform: [{ rotate: '-2deg' }] },
  newText: { flex: 1, gap: 4 },
  district: { fontFamily: fonts.display800, fontSize: 24, color: INK },
  hand: { fontFamily: fonts.hand500, fontSize: 19, lineHeight: 22, color: paper.fountain },
  opens: { gap: 6 },
  opensText: { fontFamily: fonts.text400, fontSize: 14, lineHeight: 20, color: '#3d372e' },
  turn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, minHeight: 56, backgroundColor: INK, borderRadius: 2 },
  turnText: { fontFamily: fonts.display800, fontSize: 16, letterSpacing: 4, color: paper.paper },
  pressed: { opacity: 0.85 },
})
