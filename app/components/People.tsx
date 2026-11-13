import { Pressable, StyleSheet, Text, View } from 'react-native'
import Svg, { Path, SvgXml } from 'react-native-svg'
import { HEADS } from '../art/heads'
import { DOSSIER_ART, PORTRAITS, SILHOUETTES, type PersonId } from '../art/people'
import { MISSION_IDS } from '../../engine'
import { ACT_NAME } from '../acts'
import { PEOPLE, type Person } from '../people'
import { SCENES, sceneLabel, type SceneId } from '../scenes'
import { store } from '../store'
import type { Snapshot } from '../store'
import { fonts, paper } from '../theme'
import { Icon } from './Glyph'
import { Paper, PaperTitle } from './Notebook'
import { Stamp } from './MissionCard'
import { colors, Title } from './ui'

// The scenes each person is in, to replay from their dossier.
const PERSON_SCENES: Partial<Record<PersonId, SceneId[]>> = {
  lyosha: ['prologue'],
  vitya: ['prologue', 'crew'],
  dima: ['crew', 'terms', 'count'],
  sasha: ['crew'],
  tolya: ['tolya', 'row'],
  zhanna: ['crate', 'terms', 'chapter-2'],
  ignatov: ['bridge', 'lunch', 'chapter-3'],
  colonel: ['truck', 'road', 'chapter-4'],
  golovin: ['auction', 'count', 'chapter-5'],
  prosecutor: ['governor', 'chapter-6'],
}

// People (design: Map · People): everyone you've met as a card on the notebook's page, and everyone not yet
// as a shape with Lyosha's fragment under it. A card opens the person's dossier.

export function PeopleGrid({ game, onOpen }: { game: Snapshot; onOpen: (id: PersonId) => void }) {
  const { state: s, config: c } = game
  const met = PEOPLE.filter((p) => p.met(s, c))
  const notYet = PEOPLE.filter((p) => !p.met(s, c))
  return (
    <Paper>
      <PaperTitle title="People" note={`${met.length} met, ${notYet.length} not yet`} />
      <View style={styles.grid}>
        {met.map((p) => (
          <Pressable key={p.id} onPress={() => onOpen(p.id)} accessibilityRole="button" accessibilityLabel={`${p.name}, ${p.epithet}`} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
            <View style={styles.portrait}>
              <Portrait person={p} />
              {p.id === 'lyosha' && <Ribbon />}
            </View>
            <View style={styles.caption}>
              <Text style={styles.name}>{p.name}</Text>
              <Text style={styles.epithet}>{p.epithet}</Text>
              {p.id === 'lyosha' && <Text style={styles.epithet}>1938–1993</Text>}
            </View>
          </Pressable>
        ))}
      </View>
      {notYet.length > 0 && (
        <View style={styles.notYet}>
          <View style={styles.notYetHead}>
            <Text style={styles.notYetTitle}>Not met yet</Text>
            <View style={styles.notYetRule} />
          </View>
          <View style={styles.grid}>
            {notYet.map((p) => (
              <View key={p.id} style={[styles.card, styles.cardUnknown]} accessible accessibilityLabel={`Someone you haven’t met. ${p.fragment}`}>
                <View style={styles.silhouette}>{SILHOUETTES[p.id] ? <SvgXml xml={SILHOUETTES[p.id]!} width="100%" height="100%" /> : null}</View>
                <Text style={styles.fragment}>{p.fragment}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </Paper>
  )
}

function Portrait({ person }: { person: Person }) {
  const xml = PORTRAITS[person.id] ?? (person.head ? HEADS[person.head] : SILHOUETTES[person.id])
  return xml ? <SvgXml xml={xml} width="100%" height="100%" /> : null
}

// A black mourning ribbon across the photograph's corner.
function Ribbon() {
  return (
    <Svg style={StyleSheet.absoluteFill} viewBox="0 0 60 60">
      <Path d="M44 0H60V16Z" fill={paper.ink} />
    </Svg>
  )
}

// A person's dossier: their panel (or their portrait large), who they are, what they hold, their mood.
export function Dossier({ game, id, onBack, onMap }: { game: Snapshot; id: PersonId; onBack: () => void; onMap?: () => void }) {
  const { state: s, config: c } = game
  const p = PEOPLE.find((x) => x.id === id)!
  const holds = p.holds?.(s, c)
  const mood = p.mood?.(s, c)
  const art = DOSSIER_ART[p.id]
  const arc = c.missions.enabled ? MISSION_IDS.filter((id) => c.missions.list[id].boss === p.id) : []
  const seen = (PERSON_SCENES[p.id] ?? []).filter((id) => s.story.seen.includes(id))
  return (
    <View style={styles.dossier}>
      <View style={styles.back}>
        <Pressable onPress={onBack} accessibilityRole="link" hitSlop={8} style={styles.backLink}>
          <Icon name="chevronLeft" size={14} color={colors.link} strokeWidth={2} />
          <Text style={styles.backText}>People</Text>
        </Pressable>
        <Text style={styles.since}>{p.since(s, c)}</Text>
      </View>
      <View style={styles.sheet}>
        <View style={[styles.panel, art ? styles.panelArt : null]}>
          {art ? (
            <SvgXml xml={art} width="100%" height="100%" />
          ) : (
            <View style={styles.panelPortrait}>
              <Portrait person={p} />
            </View>
          )}
          <View style={styles.bubble}>
            <Text style={styles.bubbleText}>{p.line}</Text>
          </View>
        </View>
        <View style={styles.info}>
          <Text style={styles.infoEpithet}>{p.epithet}</Text>
          <Title size={40} weight={900} color={paper.ink} style={styles.infoName}>
            {p.name}
          </Title>
          <Text style={styles.about}>{p.about}</Text>
          <View style={styles.tiles}>
            <View style={styles.tile}>
              <Text style={styles.tileLabel}>Role</Text>
              <Text style={styles.tileValue}>{p.role}</Text>
            </View>
            {holds ? (
              <View style={styles.tile}>
                <Text style={styles.tileLabel}>Holds</Text>
                <Text style={styles.tileValue}>{holds}</Text>
              </View>
            ) : null}
          </View>
          {mood && (
            <View style={styles.moodBlock}>
              <Text style={styles.tileLabel}>Mood</Text>
              <View style={styles.moods}>
                {mood.words.map((w) => (
                  <View key={w} style={[styles.mood, w === mood.at && styles.moodOn]}>
                    <Text style={[styles.moodText, w === mood.at && styles.moodTextOn]}>{w === mood.at ? `▲ ${w}` : w}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          {arc.length > 0 && (
            <View style={styles.moodBlock}>
              <Text style={styles.tileLabel}>Their arc</Text>
              {arc.map((id) => {
                const m = c.missions.list[id]
                const r = s.missions[id]
                const out = s.ops.some((o) => o.missionId === id)
                const stamp = r?.result === 'failed' ? { text: 'Failed', color: paper.redPencil } : r?.result === 'won' ? { text: 'Won', color: paper.brassInk } : null
                return (
                  <View key={id} style={styles.arcRow}>
                    <View style={styles.arcText}>
                      <Text style={styles.arcKind}>{`${m.kind} · Act ${ACT_NAME[m.act]}`}</Text>
                      <Text style={styles.arcName}>{m.name}</Text>
                      <Text style={styles.arcState}>{stamp ? '' : out ? 'Out now' : r?.result === 'lost' ? 'Lost: it can be tried again' : 'Not yet'}</Text>
                    </View>
                    {stamp && <Stamp text={stamp.text} color={stamp.color} />}
                  </View>
                )
              })}
            </View>
          )}
          {seen.length > 0 && (
            <View style={styles.moodBlock}>
              <Text style={styles.tileLabel}>Their scenes</Text>
              {seen.map((sceneId) => (
                <View key={sceneId} style={styles.arcRow}>
                  <Text style={[styles.arcName, styles.grow]}>{sceneLabel(SCENES[sceneId])}</Text>
                  <Pressable onPress={() => store.playScene(sceneId)} accessibilityRole="button" style={styles.replay}>
                    <Text style={styles.replayText}>Replay</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
          {onMap && (
            <Pressable onPress={onMap} accessibilityRole="link" style={styles.mapLink}>
              <Text style={styles.mapLinkText}>Their card on the Map</Text>
              <Icon name="chevronRight" size={14} color={paper.fountain} strokeWidth={2} />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  )
}

const INK_LINE = paper.ink

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: { width: '31%', flexGrow: 1, maxWidth: '32%', backgroundColor: paper.paperLight, borderWidth: 1, borderColor: INK_LINE },
  cardUnknown: { backgroundColor: 'transparent', borderStyle: 'dashed', borderColor: paper.pencilLine, paddingBottom: 8 },
  pressed: { opacity: 0.8 },
  portrait: { aspectRatio: 1, borderBottomWidth: 1, borderColor: INK_LINE },
  caption: { gap: 2, paddingHorizontal: 7, paddingTop: 6, paddingBottom: 8 },
  name: { fontFamily: fonts.display800, fontSize: 15, lineHeight: 16, textTransform: 'uppercase', color: paper.ink },
  epithet: { fontFamily: fonts.text500, fontSize: 9.5, letterSpacing: 0.8, textTransform: 'uppercase', color: '#5a5144' },
  notYet: { gap: 12 },
  notYetHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  notYetTitle: { fontFamily: fonts.display800, fontSize: 20, textTransform: 'uppercase', color: paper.pencil },
  notYetRule: { flex: 1, height: 1, backgroundColor: paper.pencil },
  silhouette: { aspectRatio: 60 / 51, marginHorizontal: 8, marginTop: 8 },
  fragment: { paddingHorizontal: 8, paddingTop: 4, fontFamily: fonts.hand500, fontSize: 15, lineHeight: 17, color: paper.pencil },
  dossier: { gap: 12 },
  back: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 32 },
  backText: { fontFamily: fonts.text600, fontSize: 14, color: colors.link },
  since: { fontFamily: fonts.text400, fontSize: 12.5, color: colors.muted },
  sheet: { backgroundColor: paper.paper, borderRadius: 2, overflow: 'hidden' },
  panel: { aspectRatio: 346 / 296, backgroundColor: paper.paper, borderBottomWidth: 1.5, borderColor: INK_LINE },
  panelArt: {},
  panelPortrait: { position: 'absolute', left: '22%', right: '22%', top: '8%', bottom: 0 },
  bubble: { position: 'absolute', left: 10, top: 10, maxWidth: '50%', paddingVertical: 8, paddingHorizontal: 10, backgroundColor: paper.paperLight, borderWidth: 1.5, borderColor: INK_LINE },
  bubbleText: { fontFamily: fonts.caption, fontSize: 14, lineHeight: 18, color: paper.ink },
  info: { gap: 10, padding: 16 },
  infoEpithet: { fontFamily: fonts.text600, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: '#5a5144' },
  infoName: { lineHeight: 40 },
  about: { fontFamily: fonts.text400, fontSize: 14, lineHeight: 20, color: '#3d372e' },
  tiles: { flexDirection: 'row', gap: 8, marginTop: 4 },
  tile: { flex: 1, gap: 3, paddingVertical: 8, paddingHorizontal: 10, borderWidth: 1, borderColor: INK_LINE },
  tileLabel: { fontFamily: fonts.text600, fontSize: 10.5, letterSpacing: 1.2, textTransform: 'uppercase', color: '#5a5144' },
  tileValue: { fontFamily: fonts.text600, fontSize: 13.5, lineHeight: 18, color: paper.ink },
  moodBlock: { gap: 6, marginTop: 4 },
  moods: { flexDirection: 'row', borderWidth: 1, borderColor: INK_LINE },
  mood: { flex: 1, minHeight: 34, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderColor: INK_LINE },
  moodOn: { backgroundColor: paper.ink },
  moodText: { fontFamily: fonts.text400, fontSize: 12, color: paper.ink },
  moodTextOn: { fontFamily: fonts.text600, color: paper.paper },
  arcRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: 'rgba(21, 18, 15, 0.2)' },
  arcText: { flex: 1, gap: 1 },
  arcKind: { fontFamily: fonts.text600, fontSize: 10.5, letterSpacing: 1.2, textTransform: 'uppercase', color: '#5a5144' },
  arcName: { fontFamily: fonts.text600, fontSize: 15, color: paper.ink },
  arcState: { fontFamily: fonts.text400, fontSize: 12, color: '#5a5144' },
  grow: { flex: 1 },
  replay: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 14, borderWidth: 1, borderColor: paper.ink },
  replayText: { fontFamily: fonts.text600, fontSize: 13, color: paper.ink },
  mapLink: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', minHeight: 36 },
  mapLinkText: { fontFamily: fonts.text600, fontSize: 14, color: paper.fountain },
})
