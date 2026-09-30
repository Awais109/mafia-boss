import { useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Circle, Defs, Path, Pattern, Rect, SvgXml } from 'react-native-svg'
import { bestHaggler, canHaggle, DISTRICT_IDS, haggleOdds, TUTORIAL_STEPS, type Act, type MissionId } from '../../engine'
import { HEADS } from '../art/heads'
import { PORTRAITS } from '../art/people'
import { ART, type ArtId } from '../art/scenes'
import { ACT_NAME } from '../acts'
import { fmt, pct } from '../format'
import { PEOPLE } from '../people'
import { sceneLabel, type Beat, type Crop, type Scene } from '../scenes'
import { ACT_TITLE, ENVELOPE_NOTES, OPENING_CREW, revealedBy, TOLYA_ASKS, tolyaMood } from '../story'
import { store, type Snapshot } from '../store'
import { fonts, paper } from '../theme'
import { webParam } from '../webParams'
import { ChapterPage } from './ChapterPage'
import { Icon } from './Glyph'
import { Stamp } from './MissionCard'
import { colors, glyph, rich } from './ui'

// The scene viewer (ADR 0049; design: Scene viewer, Scenes 2 and 3): a scene's beats full screen, one at a
// time. Progress along the top with Skip; tap to go on. A beat that asks something of you (hiring, Tolya's
// demand) holds until it's answered, then taps on like the rest. A chapter is its own page. Finishing or skipping records the scene as
// seen (`store.endScene`).

export function SceneViewer({ game, scene }: { game: Snapshot; scene: Scene }) {
  const insets = useSafeAreaInsets()
  // On web, `?beat=3` starts a scene at that beat, for the screenshot rig.
  const [at, setAt] = useState(() => Math.min(scene.beats.length - 1, Math.max(0, Number(webParam('beat')) || 0)))
  const beat = scene.beats[at]
  const done = () => store.endScene(scene.id)
  const next = () => (at + 1 < scene.beats.length ? setAt(at + 1) : done())
  const waiting = beatWaits(game, beat)

  if (beat.kind === 'chapter') return <ChapterPage game={game} act={beat.act} onTurn={done} />

  return (
    <Modal visible animationType="fade" onRequestClose={done}>
      <View style={[styles.frame, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}>
        <View style={styles.top}>
          <View style={styles.pips}>
            {scene.beats.map((_, i) => (
              <View key={i} style={[styles.pip, i <= at && styles.pipOn]} />
            ))}
          </View>
          <View style={styles.topLine}>
            <Text style={styles.label}>{sceneLabel(scene)}</Text>
            <Pressable onPress={done} accessibilityRole="button" hitSlop={10} style={styles.skip}>
              <Text style={styles.skipText}>Skip</Text>
              <Icon name="chevronRight" size={12} color={paper.paper} strokeWidth={2.4} />
              <Icon name="chevronRight" size={12} color={paper.paper} strokeWidth={2.4} />
            </Pressable>
          </View>
        </View>
        <Pressable style={styles.body} onPress={waiting ? undefined : next} disabled={waiting} accessibilityRole={waiting ? undefined : 'button'} accessibilityLabel="Continue">
          <BeatView game={game} beat={beat} />
        </Pressable>
        {!waiting && (
          <Pressable onPress={next} accessibilityRole="button" style={styles.cta}>
            <Text style={styles.ctaText}>{at + 1 < scene.beats.length ? 'TAP TO CONTINUE' : 'CLOSE THE PAGE'}</Text>
            <Icon name="chevronRight" size={13} color={colors.muted} strokeWidth={2} />
          </Pressable>
        )}
      </View>
    </Modal>
  )
}

// Hiring waits for two hires; Tolya's demand waits for an answer.
function beatWaits(game: Snapshot, beat: Beat): boolean {
  if (beat.kind === 'hire' || beat.kind === 'tribute') return !answered(game, beat)
  return false
}

function answered(game: Snapshot, beat: Beat): boolean {
  const s = game.state
  if (beat.kind === 'hire') return s.tutorial.done || s.tutorial.step > TUTORIAL_STEPS.findIndex((st) => st.id === 'hire')
  if (beat.kind === 'tribute') return s.rival.tolya.demand === null
  return true
}

function BeatView({ game, beat }: { game: Snapshot; beat: Beat }) {
  switch (beat.kind) {
    case 'art':
      return <ArtPanel art={beat.art} crop={beat.crop} caption={beat.caption} speech={beat.speech} />
    case 'portrait':
      return <PortraitPanel person={beat.person} caption={beat.caption} />
    case 'intro':
      return <IntroPanel game={game} art={beat.art} person={beat.person} speech={beat.speech} caption={beat.caption} />
    case 'face':
      return <FacePanel person={beat.person} speech={beat.speech} caption={beat.caption} />
    case 'slug':
      return <SlugPanel caption={beat.caption} />
    case 'result':
      return <ResultPanel game={game} mission={beat.mission} />
    case 'envelope':
      return <EnvelopePanel game={game} />
    case 'hire':
      return <HirePanel game={game} />
    case 'tribute':
      return <TributePanel game={game} art={beat.art} caption={beat.caption} />
    case 'title':
      return <TitlePanel act={beat.act} />
    case 'chapter':
      return null
  }
}

// A panel of art, cropped if asked, with a caption box and a speech bubble over it.
function ArtPanel({ art, crop, caption, speech, fill }: { art: ArtId; crop?: Crop; caption?: string; speech?: string; fill?: boolean }) {
  const a = ART[art]
  const c = crop ?? { top: 0, height: 1 }
  return (
    <View style={[styles.panel, fill && styles.grow]} accessible accessibilityRole="image" accessibilityLabel={a.label}>
      <View style={{ aspectRatio: a.width / (a.height * c.height), overflow: 'hidden', width: '100%' }}>
        <View style={{ position: 'absolute', left: 0, right: 0, top: `${(-c.top / c.height) * 100}%`, aspectRatio: a.width / a.height }}>
          <SvgXml xml={a.xml} width="100%" height="100%" />
        </View>
      </View>
      {speech ? (
        <View style={styles.bubble}>
          <Text style={styles.bubbleText}>{speech}</Text>
        </View>
      ) : null}
      {caption ? (
        <View style={speech ? styles.captionLow : styles.caption}>
          <Text style={styles.captionText}>{rich(caption, 14.5, { ink: true })}</Text>
        </View>
      ) : null}
    </View>
  )
}

// A photograph on paper, black ribbon across its corner (Lyosha's).
function PortraitPanel({ person, caption }: { person: 'lyosha' | string; caption: string }) {
  const xml = PORTRAITS[person as keyof typeof PORTRAITS]
  return (
    <View style={[styles.panel, styles.paperPanel]}>
      <View style={styles.photo}>
        {xml ? <SvgXml xml={xml} width="100%" height="100%" /> : null}
        <Svg style={StyleSheet.absoluteFill} viewBox="0 0 60 60">
          <Path d="M44 0H60V16Z" fill={paper.ink} />
        </Svg>
      </View>
      <View style={styles.captionInline}>
        <Text style={styles.captionText}>{caption}</Text>
      </View>
    </View>
  )
}

// A person's portrait for a panel: the crew's full portraits, else the People page's, else their headshot.
function portraitOf(person: string): { xml: string; aspect: number } | null {
  if (person === 'vitya' || person === 'dima' || person === 'sasha') return { xml: ART[person].xml, aspect: ART[person].width / ART[person].height }
  const p = PEOPLE.find((x) => x.id === person)
  const xml = PORTRAITS[person as keyof typeof PORTRAITS] ?? (p?.head ? HEADS[p.head] : undefined)
  return xml ? { xml, aspect: 1 } : null
}

// A face on screentone, with their line in a bubble or a caption under it.
function FacePanel({ person, speech, caption }: { person: string; speech?: string; caption?: string }) {
  const art = portraitOf(person)
  return (
    <View style={[styles.panel, styles.tonePanel]}>
      <Tone />
      {art ? (
        <View style={[styles.face, { aspectRatio: art.aspect, width: art.aspect < 1 ? '46%' : '64%' }]}>
          <SvgXml xml={art.xml} width="100%" height="100%" />
        </View>
      ) : null}
      {speech ? (
        <View style={styles.bubble}>
          <Text style={styles.bubbleText}>{speech}</Text>
        </View>
      ) : null}
      {caption ? (
        <View style={speech ? styles.captionLow : styles.caption}>
          <Text style={styles.captionText}>{caption}</Text>
        </View>
      ) : null}
    </View>
  )
}

// Words alone on the dark page: a place and a time, or what nobody says.
function SlugPanel({ caption }: { caption: string }) {
  return (
    <View style={[styles.panel, styles.slug]}>
      <Tone dark />
      <View style={styles.captionInline}>
        <Text style={styles.captionText}>{caption}</Text>
      </View>
    </View>
  )
}

// The stamp: an overreach FAILED in red ink with what it cost and what it opened; a rematch WON in brass.
function ResultPanel({ game, mission }: { game: Snapshot; mission: MissionId }) {
  const { state: s, config: c } = game
  const m = c.missions.list[mission]
  const record = s.missions[mission]
  const failed = m.kind === 'overreach'
  const costs = [record?.stake ? `−${glyph.dirty}${fmt(record.stake)}` : '', m.injureHours ? `someone hurt ${m.injureHours}h` : '', m.heat ? `+${glyph.heat}${m.heat}` : ''].filter(Boolean)
  const opened = (m.act + 1) as Act
  const districts = revealedBy(c, opened, DISTRICT_IDS).map((id) => c.districts.list[id].name)
  const reward = m.reward ?? {}
  const gains = [reward.rep ? `+${glyph.rep}${fmt(reward.rep)}` : '', reward.influence ? `+${glyph.influence}${reward.influence}` : '', reward.disposition?.zhanna ? 'Zhanna warmer, her lots cheaper' : ''].filter(Boolean)
  return (
    <View style={[styles.panel, styles.paperPanel, styles.result]}>
      <Text style={styles.resultName}>{m.name.toUpperCase()}</Text>
      {failed ? (
        <View style={styles.resultStamp}>
          <SvgXml xml={ART.stampFailed.xml} width="100%" height="100%" />
        </View>
      ) : (
        <Stamp text="Won" color={paper.brassInk} big />
      )}
      {failed ? (
        <>
          <Text style={styles.resultLine}>{rich(costs.join(' · ') || 'It cost little.', 15, { ink: true })}</Text>
          <Text style={styles.resultOpened}>{`Act ${ACT_NAME[opened]}${districts.length ? ` · ${districts.join(', ')}` : ''}`}</Text>
        </>
      ) : (
        <Text style={styles.resultLine}>{rich(gains.join(' · ') || 'Paid off.', 15, { ink: true })}</Text>
      )}
    </View>
  )
}

// A screentone ground: ink dots on paper, or (dark) paper dots on ink for a night or a silence.
// Lyosha's second envelope on the table, this act's note in his hand, and what it held.
function EnvelopePanel({ game }: { game: Snapshot }) {
  const { state: s, config: c } = game
  const opened = [...s.log].reverse().find((e) => e.type === 'ENVELOPE_OPENED')
  const stake = opened?.type === 'ENVELOPE_OPENED' ? opened.stake : c.rockBottom.minStake
  const a = ART.envelope
  return (
    <View style={[styles.panel, { backgroundColor: paper.paper }]}>
      <View style={{ width: '100%', aspectRatio: a.width / a.height }} accessible accessibilityRole="image" accessibilityLabel={a.label}>
        <SvgXml xml={a.xml} width="100%" height="100%" />
      </View>
      <View style={styles.envelopeText}>
        <Text style={styles.envelopeNote}>{ENVELOPE_NOTES[s.act]}</Text>
        <View style={styles.captionInline}>
          <Text style={styles.captionText}>{rich(`It isn’t much. It’s enough. ${glyph.dirty}${fmt(stake)}`, 14.5, { ink: true })}</Text>
        </View>
      </View>
    </View>
  )
}

function Tone({ dark }: { dark?: boolean }) {
  const id = dark ? 'slugTone' : 'faceTone'
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
      <Defs>
        <Pattern id={id} width={5} height={5} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <Circle cx={2.5} cy={2.5} r={dark ? 0.55 : 0.7} fill={dark ? '#3a332a' : paper.ink} />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill={dark ? paper.ink : paper.paper} />
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  )
}

// The splash: the art (or their portrait) with their line, then their card: epithet, name, holds, mood.
function IntroPanel({ game, art, person, speech, caption }: { game: Snapshot; art?: ArtId; person: string; speech?: string; caption?: string }) {
  const { state: s, config: c } = game
  const p = PEOPLE.find((x) => x.id === person)!
  const holds = p.holds?.(s, c)
  const mood = p.mood?.(s, c)
  return (
    <ScrollView contentContainerStyle={styles.introScroll}>
      {art ? <ArtPanel art={art} speech={speech} caption={caption} /> : <FacePanel person={person} speech={speech} caption={caption} />}
      <View style={styles.card}>
        <Text style={styles.cardEpithet}>{p.epithet}</Text>
        <View style={styles.cardRow}>
          <Text style={[styles.cardName, p.name.length > 10 && styles.cardNameLong]}>{p.name.toUpperCase()}</Text>
          {holds ? (
            <View style={styles.holds}>
              <Text style={styles.holdsLabel}>HOLDS</Text>
              <Text style={styles.holdsValue}>{holds}</Text>
            </View>
          ) : null}
        </View>
        {mood && (
          <View style={styles.moodBlock}>
            <Text style={styles.cardEpithet}>Mood</Text>
            <View style={styles.moods}>
              {mood.words.map((w) => (
                <View key={w} style={[styles.mood, w === mood.at && styles.moodOn]}>
                  <Text style={[styles.moodText, w === mood.at && styles.moodTextOn]}>{w === mood.at ? `▲ ${w}` : w}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  )
}

// Scene 2: the opening's three as cards, each with Hire. Two are enough.
function HirePanel({ game }: { game: Snapshot }) {
  const { state: s, derived: d, config: c } = game
  const hired = c.crew.openingPool.filter((p) => s.crew.some((m) => m.name === p.name)).length
  return (
    <ScrollView contentContainerStyle={styles.hire}>
      {c.crew.openingPool.slice(0, OPENING_CREW.length).map((p, i) => {
        const story = OPENING_CREW[i]
        const person = PEOPLE.find((x) => x.id === story.head)!
        const member = s.crew.find((m) => m.name === p.name)
        const candidate = s.recruitPool.candidates.find((m) => m.name === p.name)
        const who = member ?? candidate
        const stats = who ? { muscle: who.muscle, brains: who.brains, nerve: who.nerve } : { muscle: p.muscle, brains: p.brains, nerve: p.nerve }
        const best = (['muscle', 'brains', 'nerve'] as const).reduce((a, b) => (stats[b] > stats[a] ? b : a))
        const note = p.nephew ? 'Family. Can’t be fired.' : i === 0 ? 'Lyosha’s driver since 1979.' : `Loyalty starts at ${p.loyalty}.`
        const [first, ...rest] = p.name.split(' ')
        return (
          <View key={p.name} style={styles.crewCard}>
            <View style={styles.crewArt}>
              <SvgXml xml={ART[story.head].xml} width="100%" height="100%" />
            </View>
            <View style={styles.crewInfo}>
              <Text style={styles.cardEpithet}>{story.epithet}</Text>
              <Text style={styles.crewName}>
                {first.toUpperCase()}
                {rest.length ? <Text style={styles.crewNick}>{` ${rest.join(' ').toUpperCase()}`}</Text> : null}
              </Text>
              <View style={styles.crewBubble}>
                <Text style={styles.crewBubbleText}>{person.line}</Text>
              </View>
              <View style={styles.stats}>
                {(['muscle', 'brains', 'nerve'] as const).map((st) => (
                  <View key={st} style={[styles.stat, st === best && styles.statBest]}>
                    <Text style={[styles.statLabel, st === best && styles.statBestText]}>{st.toUpperCase()}</Text>
                    <Text style={[styles.statValue, st === best && styles.statBestText]}>{stats[st]}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.crewFoot}>
                <Text style={styles.crewNote}>{note}</Text>
                {member ? (
                  <View style={styles.hired}>
                    <Icon name="check" size={14} color={paper.ink} strokeWidth={2.4} />
                    <Text style={styles.hiredText}>HIRED</Text>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => candidate && store.dispatch({ type: 'RECRUIT', candidateId: candidate.id })}
                    disabled={!candidate || s.clean < d.costs.recruit || s.crew.length >= d.crewSlots}
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.hireBtn, pressed && styles.pressed, (!candidate || s.clean < d.costs.recruit) && styles.off]}
                  >
                    <Text style={styles.hireText}>HIRE</Text>
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        )
      })}
      <Text style={styles.hireCount}>{`CHOOSE TWO · ${Math.min(2, hired)} OF 2 · ${glyph.clean}${fmt(d.costs.recruit)} EACH`}</Text>
    </ScrollView>
  )
}

// Scene 3's stare, with Tolya's demand under it: pay, haggle or refuse. It goes on once answered.
function TributePanel({ game, art, caption }: { game: Snapshot; art: ArtId; caption: string }) {
  const { state: s, config: c } = game
  const demand = s.rival.tolya.demand
  const h = c.rivals.tolya.haggle
  const talker = bestHaggler(s, c)
  const mood = tolyaMood(s, c)
  return (
    <View style={styles.grow}>
      <ArtPanel art={art} caption={caption} crop={{ top: 0, height: 0.72 }} fill />
      {demand !== null && (
        <View style={styles.demand}>
          <View style={styles.demandHead}>
            <Text style={styles.demandTitle}>TOLYA’S DEMAND</Text>
            <View style={styles.demandRule} />
            <Text style={styles.demandMood}>{`mood · ${mood}`}</Text>
          </View>
          <Text style={styles.demandAsk}>{rich(`“${TOLYA_ASKS[mood].replace('{amount}', `${glyph.dirty}${fmt(demand)}`)}”`, 15)}</Text>
          <Answer title={`Pay ${glyph.dirty}${fmt(demand)}`} sub="He goes, and remembers you paid." right={`−${glyph.dirty}${fmt(demand)}`} disabled={s.dirty < demand} onPress={() => store.dispatch({ type: 'PAY_TRIBUTE' })} />
          <Answer
            title={talker ? `Haggle · ${talker.name.split(' ')[0]} talks` : 'Haggle · nobody free'}
            sub={`Win: pay ${glyph.dirty}${fmt(Math.max(1, Math.round(demand * h.pricePct)))} · lose: pay ${glyph.dirty}${fmt(demand)}, and he’s insulted`}
            right={talker ? pct(haggleOdds(s, c)) : '—'}
            disabled={!talker || !canHaggle(s) || s.dirty < Math.max(1, Math.round(demand * h.pricePct))}
            onPress={() => store.dispatch({ type: 'PAY_TRIBUTE', choice: 'haggle' })}
          />
          <Answer title="Refuse" sub="His boys break one of your businesses tonight." right="hostile" danger onPress={() => store.dispatch({ type: 'PAY_TRIBUTE', choice: 'refuse' })} />
        </View>
      )}
    </View>
  )
}

function Answer({ title, sub, right, danger, disabled, onPress }: { title: string; sub: string; right: string; danger?: boolean; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" style={({ pressed }) => [styles.answer, danger && styles.answerDanger, disabled && styles.off, pressed && styles.pressed]}>
      <View style={styles.answerText}>
        <Text style={[styles.answerTitle, danger && { color: colors.bad }]}>{rich(title, 15)}</Text>
        <Text style={styles.answerSub}>{rich(sub, 12.5)}</Text>
      </View>
      <Text style={[styles.answerRight, danger && { color: colors.bad }]}>{rich(right, 14)}</Text>
    </Pressable>
  )
}

// VOLUME I · THE STREETS, on the dark page.
function TitlePanel({ act }: { act: Act }) {
  return (
    <View style={styles.titlePage}>
      <Text style={styles.volume}>{`VOLUME ${ACT_NAME[act]}`}</Text>
      <Text style={styles.volumeTitle}>{ACT_TITLE[act].toUpperCase()}</Text>
    </View>
  )
}

const INK = paper.ink

const styles = StyleSheet.create({
  frame: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 10, gap: 10 },
  top: { gap: 8, paddingHorizontal: 4 },
  pips: { flexDirection: 'row', gap: 4 },
  pip: { flex: 1, height: 3, borderRadius: 1, backgroundColor: colors.control },
  pipOn: { backgroundColor: paper.paper },
  topLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontFamily: fonts.text400, fontSize: 12.5, color: colors.muted },
  skip: { flexDirection: 'row', alignItems: 'center', minHeight: 32 },
  skipText: { fontFamily: fonts.text600, fontSize: 14, color: paper.paper, marginRight: 4 },
  body: { flex: 1 },
  grow: { flex: 1 },
  panel: { borderWidth: 1.5, borderColor: paper.paper, backgroundColor: INK, overflow: 'hidden' },
  paperPanel: { backgroundColor: paper.paper, alignItems: 'center', paddingVertical: 28, gap: 22 },
  photo: { width: '62%', aspectRatio: 1, borderWidth: 6, borderColor: INK, backgroundColor: paper.paper },
  bubble: { position: 'absolute', left: 12, top: 12, maxWidth: '70%', paddingVertical: 12, paddingHorizontal: 18, borderRadius: 100, backgroundColor: paper.paperLight, borderWidth: 1.5, borderColor: INK },
  bubbleText: { fontFamily: fonts.speech, fontSize: 18, lineHeight: 22, color: INK, textAlign: 'center', textTransform: 'uppercase' },
  caption: { position: 'absolute', left: 12, top: 12, maxWidth: '78%', paddingVertical: 9, paddingHorizontal: 12, backgroundColor: paper.paperLight, borderWidth: 1.5, borderColor: INK },
  captionLow: { position: 'absolute', left: 12, bottom: 12, maxWidth: '78%', paddingVertical: 9, paddingHorizontal: 12, backgroundColor: paper.paperLight, borderWidth: 1.5, borderColor: INK },
  captionInline: { marginHorizontal: 16, paddingVertical: 9, paddingHorizontal: 12, backgroundColor: paper.paperLight, borderWidth: 1.5, borderColor: INK },
  captionText: { fontFamily: fonts.caption, fontSize: 14.5, lineHeight: 20, color: INK },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 40 },
  ctaText: { fontFamily: fonts.text600, fontSize: 12, letterSpacing: 2.2, color: colors.muted },
  introScroll: { gap: 0 },
  card: { gap: 10, padding: 16, backgroundColor: paper.paper, borderWidth: 1.5, borderTopWidth: 0, borderColor: paper.paper },
  cardEpithet: { fontFamily: fonts.text600, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: '#5a5144' },
  cardRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  cardName: { flex: 1, fontFamily: fonts.display900, fontSize: 54, lineHeight: 52, color: INK },
  cardNameLong: { fontSize: 36, lineHeight: 36 },
  holds: { maxWidth: '42%', alignItems: 'flex-end', gap: 2, paddingVertical: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: INK },
  holdsLabel: { fontFamily: fonts.text600, fontSize: 10, letterSpacing: 1.2, color: '#5a5144' },
  holdsValue: { fontFamily: fonts.text600, fontSize: 13.5, color: INK, textAlign: 'right' },
  moodBlock: { gap: 6 },
  moods: { flexDirection: 'row', borderWidth: 1, borderColor: INK },
  mood: { flex: 1, minHeight: 32, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderColor: INK },
  moodOn: { backgroundColor: INK },
  moodText: { fontFamily: fonts.text400, fontSize: 12, color: INK },
  moodTextOn: { fontFamily: fonts.text600, color: paper.paper },
  hire: { gap: 10, paddingBottom: 8 },
  crewCard: { flexDirection: 'row', borderWidth: 1.5, borderColor: paper.paper, backgroundColor: paper.paper },
  crewArt: { width: '34%', aspectRatio: 124 / 235, backgroundColor: INK },
  crewInfo: { flex: 1, gap: 8, padding: 12 },
  crewName: { fontFamily: fonts.display900, fontSize: 32, lineHeight: 32, color: INK },
  crewNick: { fontSize: 18 },
  crewBubble: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 100, borderWidth: 1.5, borderColor: INK, backgroundColor: paper.paperLight },
  crewBubbleText: { fontFamily: fonts.speech, fontSize: 14, lineHeight: 17, color: INK, textAlign: 'center', textTransform: 'uppercase' },
  stats: { flexDirection: 'row', borderWidth: 1, borderColor: INK },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 4, borderRightWidth: 1, borderColor: INK },
  statBest: { backgroundColor: INK },
  statLabel: { fontFamily: fonts.text600, fontSize: 9, letterSpacing: 0.8, color: '#5a5144' },
  statValue: { fontFamily: fonts.display800, fontSize: 18, color: INK },
  statBestText: { color: paper.paper },
  crewFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  crewNote: { flex: 1, fontFamily: fonts.text400, fontSize: 12, lineHeight: 16, color: '#3d372e' },
  hireBtn: { minHeight: 44, minWidth: 92, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, backgroundColor: INK },
  hireText: { fontFamily: fonts.display800, fontSize: 15, letterSpacing: 3, color: paper.paper },
  hired: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 14, borderWidth: 1.5, borderColor: INK },
  hiredText: { fontFamily: fonts.display800, fontSize: 15, letterSpacing: 3, color: INK },
  hireCount: { textAlign: 'center', fontFamily: fonts.text600, fontSize: 12, letterSpacing: 2, color: colors.text, paddingVertical: 6 },
  demand: { gap: 8, marginTop: 10, padding: 14, backgroundColor: colors.card, borderRadius: 8, borderWidth: 1, borderColor: colors.control },
  demandHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  demandTitle: { fontFamily: fonts.text600, fontSize: 11, letterSpacing: 1.8, color: colors.accent },
  demandRule: { flex: 1, height: 1, backgroundColor: colors.border },
  demandMood: { fontFamily: fonts.text400, fontSize: 12, color: colors.muted },
  demandAsk: { fontFamily: fonts.text400, fontSize: 15, lineHeight: 21, color: colors.text },
  answer: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.control, borderRadius: 4, backgroundColor: colors.cardAlt },
  answerDanger: { borderColor: '#6b3127', backgroundColor: '#231511' },
  answerText: { flex: 1, gap: 2 },
  answerTitle: { fontFamily: fonts.text600, fontSize: 15, color: colors.text },
  answerSub: { fontFamily: fonts.text400, fontSize: 12.5, color: colors.muted },
  answerRight: { fontFamily: fonts.text600, fontSize: 14, color: colors.text },
  envelopeText: { gap: 12, paddingVertical: 16 },
  envelopeNote: { fontFamily: fonts.hand700, fontSize: 26, lineHeight: 28, color: paper.fountain, textAlign: 'center', paddingHorizontal: 16 },
  tonePanel: { aspectRatio: 366 / 440, alignItems: 'center', justifyContent: 'flex-end' },
  face: { marginBottom: 0 },
  slug: { aspectRatio: 366 / 440, justifyContent: 'center' },
  result: { gap: 16, paddingHorizontal: 16 },
  resultName: { fontFamily: fonts.display900, fontSize: 30, lineHeight: 30, color: INK, textAlign: 'center' },
  resultStamp: { width: '86%', aspectRatio: 340 / 150 },
  resultLine: { fontFamily: fonts.text600, fontSize: 15, color: INK, textAlign: 'center' },
  resultOpened: { fontFamily: fonts.text600, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: '#5a5144' },
  titlePage: { flex: 1, justifyContent: 'center', gap: 10, paddingHorizontal: 22, borderWidth: 1.5, borderColor: paper.paper, backgroundColor: INK },
  volume: { fontFamily: fonts.display700, fontSize: 14, letterSpacing: 6, color: paper.paper },
  volumeTitle: { fontFamily: fonts.display900, fontSize: 56, lineHeight: 52, color: paper.paper },
  pressed: { opacity: 0.8 },
  off: { opacity: 0.45 },
})
