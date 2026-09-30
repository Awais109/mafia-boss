import { StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, G, Path, Rect, Text as SvgText } from 'react-native-svg'
import { DISTRICT_IDS, type Controller, type DistrictId } from '../../engine'
import { DISTRICT_STORY, mapTitle, revealed } from '../story'
import type { Snapshot } from '../store'
import { fonts, paper } from '../theme'
import { Paper } from './Notebook'

// The map is Lyosha's notebook (ADR 0046; design: Map). The drawing is the design's, in a 390 × 440 box:
// the river, the bridge, the railway and the tram, and a sketch per district. A district is faint dashed
// pencil with his fragment until someone shows it to you, then inked with its name and who holds it; the
// river and the rest ink in once you know more than home. Your businesses are red-pencil marks, the
// district you picked is ringed in red pencil, and the line that revealed the newest page is written
// beside it.

const VIEW_W = 390
const VIEW_H = 440
const INK = paper.fountain
const PENCIL = paper.pencilLine
const RED = paper.redPencil
const RAIL_TICKS = Array.from({ length: 39 }, (_, i) => `M${6 + i * 10} 422v8`).join('')

type Stroke = { d: string; w?: number; dash?: boolean }
type Sketch = {
  strokes: Stroke[]
  circles?: { cx: number; cy: number; r: number; w?: number }[]
  name: { x: number; y: number; size: number; text: string }
  sub: { x: number; y: number }
  fragment: { x: number; y: number; width: number } // where his note sits, and how many characters a line
  marks: { x: number; y: number }
  marksAlt?: { x: number; y: number } // when the line under the name is long and would run into the marks
  hit: { x: number; y: number; w: number; h: number }
  ring: string
}

// A loose hand-drawn loop around a box, open at the end like a pencil ring.
function ring(cx: number, cy: number, rx: number, ry: number): string {
  const p = (a: number, k = 1) => `${(cx + Math.cos(a) * rx * k).toFixed(1)} ${(cy + Math.sin(a) * ry * k).toFixed(1)}`
  return `M${p(Math.PI * 0.95, 1.02)}C${p(Math.PI * 1.25, 1.12)} ${p(Math.PI * 1.75, 1.12)} ${p(0, 1.05)}S${p(Math.PI * 0.75, 1.1)} ${p(Math.PI * 0.9, 0.98)}`
}

const SKETCH: Record<DistrictId, Sketch> = {
  zastava: {
    strokes: [{ d: 'M6 8C30 2 72 6 88 20C96 38 74 58 46 60C22 60 4 46 4 28', w: 1.4, dash: true }, { d: 'M150 132C112 100 60 60 -6 26', w: 1.3 }, { d: 'M150 122C114 90 64 50 4 12', w: 1.3 }],
    name: { x: 96, y: 36, size: 19, text: 'Zastava' },
    sub: { x: 98, y: 52 },
    fragment: { x: 92, y: 36, width: 22 },
    marks: { x: 134, y: 48 },
    hit: { x: 0, y: 0, w: 176, h: 64 },
    ring: ring(92, 32, 88, 30),
  },
  kombinat: {
    strokes: [
      { d: 'M12 108C40 102 92 104 132 110L134 176C98 180 44 178 12 174Z', w: 1.4, dash: true },
      { d: 'M38 146V116H46V146M52 146V110H60V146M66 146V118H74V146', w: 1.3 },
      { d: 'M42 112C38 104 46 100 42 92M56 106C52 96 60 92 56 84M70 114C66 106 74 102 70 94', w: 0.9 },
      { d: 'M22 146H118', w: 0.9 },
    ],
    name: { x: 18, y: 168, size: 19, text: 'Kombinat' },
    sub: { x: 86, y: 168 },
    fragment: { x: 18, y: 164, width: 20 },
    marks: { x: 88, y: 134 },
    hit: { x: 8, y: 80, w: 134, h: 102 },
    ring: ring(72, 142, 74, 44),
  },
  nagornaya: {
    strokes: [
      { d: 'M284 104C284 70 322 44 356 52C384 60 390 94 372 108', w: 1.3 },
      { d: 'M298 100C300 78 326 62 350 68C368 74 372 92 362 102', w: 1.3 },
      { d: 'M314 96C318 84 334 78 346 84C354 88 354 96 348 100', w: 1.3 },
      { d: 'M300 40h10v8h-10zM299 40l6-5 6 5M324 30h10v8h-10zM323 30l6-5 6 5M352 34h10v8h-10zM351 34l6-5 6 5', w: 1.1 },
    ],
    name: { x: 230, y: 20, size: 19, text: 'Nagornaya' },
    sub: { x: 232, y: 36 },
    fragment: { x: 228, y: 16, width: 26 },
    marks: { x: 326, y: 92 },
    hit: { x: 222, y: 0, w: 168, h: 112 },
    ring: 'M226 23C221 9 248 2 274 2.5C298 3 318 8 318 17C318 28 292 32.5 264 31.5C242 30.5 226 28 224 20C223 14 229 9.5 238 7.5',
  },
  centre: {
    strokes: [
      { d: 'M150 134H256M150 164H256M170 124V186M228 124V186M199 124V190', w: 1.2 },
      { d: 'M178 140h42v20h-42z', w: 1.6 },
      { d: 'M190 147h18v9h-18zM188 147l11-5 11 5M236 140h12v20h-12z', w: 1.1 },
    ],
    name: { x: 176, y: 106, size: 20, text: 'The Centre' },
    sub: { x: 178, y: 121 },
    fragment: { x: 176, y: 106, width: 22 },
    marks: { x: 213, y: 117 },
    marksAlt: { x: 236, y: 176 },
    hit: { x: 146, y: 86, w: 114, h: 104 },
    ring: ring(203, 142, 64, 52),
  },
  kioskRow: {
    strokes: [
      { d: 'M14 262H84', w: 1.3 },
      { d: 'M17 252h5v6h-5zM25 252h5v6h-5zM33 252h5v6h-5zM41 252h5v6h-5zM49 252h5v6h-5zM57 252h5v6h-5zM65 252h5v6h-5zM73 252h5v6h-5z', w: 1.1 },
    ],
    circles: [{ cx: 24, cy: 282, r: 7, w: 1.3 }],
    name: { x: 10, y: 318, size: 19, text: 'Kiosk Row' },
    sub: { x: 10, y: 334 },
    fragment: { x: 10, y: 316, width: 15 },
    marks: { x: 52, y: 330 },
    hit: { x: 2, y: 240, w: 90, h: 112 },
    ring: ring(48, 300, 48, 46),
  },
  zarechye: {
    strokes: [{ d: 'M96 244h26v14h-26zM128 242h30v14h-30zM100 266h30v14h-30z', w: 1.4 }],
    name: { x: 94, y: 306, size: 19, text: 'Zarechye' },
    sub: { x: 94, y: 322 },
    fragment: { x: 94, y: 306, width: 14 },
    marks: { x: 170, y: 318 },
    hit: { x: 88, y: 236, w: 112, h: 92 },
    ring: ring(130, 284, 52, 46),
  },
  stationSquare: {
    strokes: [{ d: 'M150 362h54v34h-54zM140 404h84v14h-84z', w: 1.4 }],
    circles: [{ cx: 182, cy: 411, r: 3.5, w: 1 }],
    name: { x: 152, y: 356, size: 19, text: 'Station Sq.' },
    sub: { x: 157, y: 389 },
    fragment: { x: 152, y: 340, width: 16 },
    marks: { x: 164.5, y: 370.5 },
    hit: { x: 124, y: 330, w: 122, h: 92 },
    ring: 'M124 360C122 326 240 322 246 360C252 400 150 428 130 398C122 386 118 364 134 350',
  },
  sovietsky: {
    strokes: [{ d: 'M252 318h26v9h-26zM288 318h26v9h-26zM252 334h26v9h-26zM288 334h26v9h-26zM252 350h26v9h-26zM288 350h26v9h-26zM252 366h26v9h-26z', w: 1.2 }],
    name: { x: 250, y: 398, size: 17, text: 'Sovietsky Blocks' },
    sub: { x: 252, y: 414 },
    fragment: { x: 240, y: 398, width: 24 },
    marks: { x: 290, y: 410 },
    hit: { x: 236, y: 312, w: 94, h: 108 },
    ring: ring(290, 366, 62, 54),
  },
  portQuarter: {
    strokes: [
      { d: 'M300 224C320 226 350 230 390 228', w: 1.2 },
      { d: 'M330 292V246M318 248 364 240M318 248 310 253M356 241V258M352 262h8M362 292V262M354 264 384 258M378 259V270', w: 1.5 },
      { d: 'M334 280h14v10h-14zM350 282h14v8h-14zM340 272h14v8h-14z', w: 1 },
    ],
    name: { x: 300, y: 312, size: 18, text: 'Port Quarter' },
    sub: { x: 330, y: 328 },
    fragment: { x: 300, y: 312, width: 14 },
    marks: { x: 334, y: 343 },
    hit: { x: 292, y: 222, w: 98, h: 136 },
    ring: ring(345, 288, 48, 60),
  },
}

// Where the newest page's line is written: north of the river beside the Centre, or south by the tram.
const NOTE_SLOT = {
  north: { x: 262, y: 126, width: 21 },
  south: { x: 180, y: 257, width: 25 },
} as const
const NORTH: DistrictId[] = ['zastava', 'kombinat', 'centre', 'nagornaya']

// The order pages are shown to you: the newest revealed one gets its line on the map.
const REVEAL_ORDER: DistrictId[] = ['zarechye', 'kioskRow', 'stationSquare', 'sovietsky', 'portQuarter', 'centre', 'zastava', 'kombinat', 'nagornaya']

const HOLDER: Record<Controller, string | null> = { player: 'yours', tolya: 'Tolya’s', zhanna: 'Zhanna’s', colonel: 'the Colonel’s', state: 'the state’s', none: null }

function wrap(text: string, width: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(' ')) {
    if (line && (line + ' ' + word).length > width) {
      lines.push(line)
      line = word
    } else line = line ? `${line} ${word}` : word
  }
  if (line) lines.push(line)
  return lines
}

export function CityMap({ game, selected, onSelect }: { game: Snapshot; selected: DistrictId | null; onSelect: (id: DistrictId) => void }) {
  const { state: s, config: c } = game
  const known = (id: DistrictId) => revealed(s, c, id)
  const cityKnown = DISTRICT_IDS.some((id) => !c.districts.list[id].home && known(id))
  const newest = [...REVEAL_ORDER].reverse().find((id) => known(id) && DISTRICT_IDS.includes(id))
  const shared = cityKnown ? { stroke: INK, width: 1 } : { stroke: PENCIL, width: 0.75 }
  const inked = DISTRICT_IDS.filter(known)
  const label = `Hand-drawn map of Sevgorod. Inked: ${inked.map((id) => c.districts.list[id].name).join(', ')}.${inked.length < DISTRICT_IDS.length ? ` Still in pencil: ${DISTRICT_IDS.filter((id) => !known(id)).map((id) => c.districts.list[id].name).join(', ')}.` : ''}${selected ? ` ${c.districts.list[selected].name} is circled.` : ''}`

  return (
    <Paper tight>
      <View style={styles.head}>
        <Text style={styles.title}>{mapTitle(s, c, DISTRICT_IDS)}</Text>
        <Text style={styles.years}>1974 – 93</Text>
      </View>
      <View style={styles.drawing} accessible accessibilityRole="image" accessibilityLabel={label}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}>
          {/* The city itself: river, bridge, railway, tram. */}
          <G fill="none" stroke={shared.stroke} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M-10 186C40 180 90 194 140 198S230 202 270 186S350 176 400 180" strokeWidth={1.6 * shared.width} />
            <Path d="M-10 222C40 216 90 230 140 234S230 238 270 222S350 212 400 216" strokeWidth={1.6 * shared.width} />
            <Path d="M193 190V244M205 190V244" strokeWidth={1.6 * shared.width} />
            <Path d="M193 197H205M193 203H205M193 209H205M193 215H205M193 221H205M193 227H205M193 233H205M193 239H205" strokeWidth={shared.width} />
            <Path d="M0 426H390" strokeWidth={1.3 * shared.width} />
            <Path d={RAIL_TICKS} strokeWidth={shared.width} />
            <Path d="M31 282C60 286 90 290 130 292C170 294 200 296 236 300C270 304 300 296 326 290" strokeWidth={1.2 * shared.width} strokeDasharray="6 4" />
          </G>
          <Path
            d="M26 204q5-3 10 0t10 0M70 212q5-3 10 0t10 0M112 216q5-3 10 0t10 0M232 214q5-3 10 0t10 0M280 200q5-3 10 0t10 0M340 198q5-3 10 0t10 0M150 222q5-3 10 0t10 0"
            fill="none"
            stroke={PENCIL}
            strokeWidth={0.9}
            strokeLinecap="round"
          />
          <Circle cx={170} cy={294} r={7} fill={paper.squared} stroke={shared.stroke} strokeWidth={1.1} />
          <SvgText x={170} y={298} fontSize={12} fontFamily={fonts.hand700} fill={cityKnown ? INK : paper.pencil} textAnchor="middle">
            4
          </SvgText>
          <SvgText x={300} y={206} fontSize={17} fontFamily={fonts.hand500} fill={cityKnown ? '#5b6a86' : paper.pencil}>
            Seva
          </SvgText>

          {DISTRICT_IDS.map((id) => (
            <District key={id} game={game} id={id} known={known(id)} onPress={() => onSelect(id)} />
          ))}

          {newest && <Note id={newest} />}

          {selected && <Path d={SKETCH[selected].ring} fill="none" stroke={RED} strokeWidth={1.8} strokeLinecap="round" />}
        </Svg>
      </View>
      <View style={styles.legend}>
        {(
          [
            ['joint', 'joint'],
            ['racket', 'racket'],
            ['premises', 'premises'],
            ['legal', 'legal'],
          ] as const
        ).map(([kind, text]) => (
          <View key={kind} style={styles.legendItem}>
            <Svg width={10} height={10} viewBox="-5 -5 10 10">
              <Mark kind={kind} x={0} y={0} />
            </Svg>
            <Text style={styles.legendText}>{text}</Text>
          </View>
        ))}
      </View>
    </Paper>
  )
}

type MarkKind = 'joint' | 'racket' | 'premises' | 'legal'

// A red-pencil mark: ● joint, × racket, ■ premises, ○ legal.
function Mark({ kind, x, y }: { kind: MarkKind; x: number; y: number }) {
  if (kind === 'joint') return <Circle cx={x} cy={y} r={2.6} fill={RED} />
  if (kind === 'legal') return <Circle cx={x} cy={y} r={2.4} fill="none" stroke={RED} strokeWidth={1.3} />
  if (kind === 'premises') return <Rect x={x - 2.5} y={y - 2.5} width={5} height={5} fill={RED} />
  return <Path d={`M${x - 2.5} ${y - 2.5}l5 5M${x + 2.5} ${y - 2.5}l-5 5`} stroke={RED} strokeWidth={1.6} strokeLinecap="round" fill="none" />
}

function District({ game, id, known, onPress }: { game: Snapshot; id: DistrictId; known: boolean; onPress: () => void }) {
  const { state: s, config: c } = game
  const k = SKETCH[id]
  const dc = c.districts.list[id]
  const holder = s.districts.find((x) => x.id === id)?.controller ?? 'none'
  const color = known ? INK : PENCIL
  const here = s.rackets.filter((r) => r.districtId === id)
  const sub = dc.home ? 'home · yours' : HOLDER[holder] ?? (id === 'centre' ? 'Ignatov’s licences' : null)
  const ours = holder === 'player'
  const fragment = wrap(DISTRICT_STORY[id].fragment, k.fragment.width)
  return (
    <G onPress={onPress}>
      <Rect x={k.hit.x} y={k.hit.y} width={k.hit.w} height={k.hit.h} fill="#000" fillOpacity={0.001} />
      <G fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round">
        {k.strokes.map((st, i) => (
          <Path key={i} d={st.d} strokeWidth={known ? (st.w ?? 1.2) : Math.min(1.1, (st.w ?? 1.2) * 0.8)} strokeDasharray={st.dash && !known ? '5 3' : undefined} />
        ))}
        {k.circles?.map((ci, i) => (
          <Circle key={i} cx={ci.cx} cy={ci.cy} r={ci.r} strokeWidth={ci.w ?? 1.2} />
        ))}
      </G>
      {known ? (
        <>
          <SvgText x={k.name.x} y={k.name.y} fontSize={k.name.size} fontFamily={fonts.hand700} fill={INK}>
            {k.name.text}
          </SvgText>
          {sub && (
            <SvgText x={k.sub.x} y={k.sub.y} fontSize={14} fontFamily={ours ? fonts.hand700 : fonts.hand500} fill={ours ? RED : INK}>
              {sub}
            </SvgText>
          )}
          {here.map((r, i) => {
            const kind = c.rackets.types[r.type].kind
            const at = sub && sub.length > 8 && k.marksAlt ? k.marksAlt : k.marks
            return <Mark key={r.id} kind={r.legal ? 'legal' : kind === 'joint' ? 'joint' : kind === 'racket' ? 'racket' : 'premises'} x={at.x + i * 8} y={at.y} />
          })}
        </>
      ) : (
        fragment.map((line, i) => (
          <SvgText key={i} x={k.fragment.x} y={k.fragment.y + i * 16} fontSize={15} fontFamily={fonts.hand500} fill={paper.pencil}>
            {line}
          </SvgText>
        ))
      )}
    </G>
  )
}

// The newest page's line, in his ink, in the note slot on its side of the river.
function Note({ id }: { id: DistrictId }) {
  const slot = NORTH.includes(id) ? NOTE_SLOT.north : NOTE_SLOT.south
  const text = DISTRICT_STORY[id].reveal.replace(/^“|”$/g, '')
  const lines = wrap(text, slot.width).slice(0, 5)
  return (
    <G>
      {lines.map((line, i) => (
        <SvgText key={i} x={slot.x} y={slot.y + i * 15} fontSize={14.5} fontFamily={fonts.hand500} fill={INK}>
          {line}
        </SvgText>
      ))}
      {slot === NOTE_SLOT.south ? (
        <Path d="M177 251C171 250 167 251 163 254" fill="none" stroke={INK} strokeWidth={1} strokeLinecap="round" />
      ) : (
        <Path d="M258 122C250 122 246 124 250 130" fill="none" stroke={INK} strokeWidth={1} strokeLinecap="round" />
      )}
    </G>
  )
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, paddingHorizontal: 8 },
  title: { fontFamily: fonts.hand700, fontSize: 30, lineHeight: 34, color: INK },
  years: { fontFamily: fonts.hand500, fontSize: 17, color: paper.pencil },
  drawing: { width: '100%', aspectRatio: VIEW_W / VIEW_H },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, paddingHorizontal: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendText: { fontFamily: fonts.hand700, fontSize: 16, color: RED },
})
