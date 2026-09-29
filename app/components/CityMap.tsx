import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { DISTRICT_IDS, type Controller, type DistrictId } from '../../engine'
import { DISTRICT_STORY, mapTitle, revealed } from '../story'
import type { Snapshot } from '../store'
import { colors } from './ui'

// The map is Lyosha's notebook (ADR 0046): the city drawn schematically, with each district a pencil
// outline and a fragment in his hand until someone shows it to you, then inked in with its name, who holds
// it, and a mark for each business you run there. Shapes follow the story bible's map; they're a sketch,
// not a layout. Plain Views, no drawing library.

const W = 680
const H = 500

type Box = { x: number; y: number; w: number; h: number }
const BOX: Record<DistrictId, Box> = {
  zastava: { x: 0, y: 12, w: 232, h: 36 },
  kombinat: { x: 40, y: 70, w: 170, h: 110 },
  centre: { x: 250, y: 55, w: 180, h: 125 },
  nagornaya: { x: 470, y: 40, w: 190, h: 125 },
  zarechye: { x: 40, y: 290, w: 150, h: 95 },
  kioskRow: { x: 205, y: 285, w: 130, h: 60 },
  stationSquare: { x: 205, y: 360, w: 130, h: 70 },
  sovietsky: { x: 350, y: 300, w: 150, h: 130 },
  portQuarter: { x: 515, y: 262, w: 140, h: 105 },
}

const HOLDER: Record<Controller, string> = { player: 'yours', tolya: 'Tolya', zhanna: 'Zhanna', colonel: 'the Colonel', state: 'the state', none: 'nobody' }
const FILL: Record<Controller, string> = {
  player: colors.accent,
  tolya: colors.warn,
  zhanna: colors.warn,
  colonel: colors.warn,
  state: colors.influence,
  none: colors.faint,
}

export function CityMap({ game, selected, onSelect }: { game: Snapshot; selected: DistrictId | null; onSelect: (id: DistrictId) => void }) {
  const { state: s, config: c } = game
  const [width, setWidth] = useState(0)
  const k = width / W
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{mapTitle(s, c, DISTRICT_IDS)}</Text>
      <View style={styles.paper} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && (
          <>
            <View style={[styles.river, { top: 204 * k, height: 36 * k, width }]} />
            <Text style={[styles.riverLabel, { left: 24 * k, top: 184 * k }]}>the Seva</Text>
            <View style={[styles.rail, { top: 452 * k, width }]} />
            <Text style={[styles.railLabel, { left: 20 * k, top: 460 * k }]}>railway · east to the junction, west to the capital</Text>
            <View style={[styles.bridge, { left: 292 * k, top: 180 * k, width: 16 * k, height: 105 * k }]} />
            {DISTRICT_IDS.map((id) => {
              const b = BOX[id]
              const known = revealed(s, c, id)
              const district = s.districts.find((x) => x.id === id)!
              const dc = c.districts.list[id]
              const here = s.rackets.filter((r) => r.districtId === id)
              const box = { left: b.x * k, top: b.y * k, width: b.w * k, height: b.h * k }
              return (
                <Pressable
                  key={id}
                  onPress={() => onSelect(id)}
                  accessibilityRole="button"
                  accessibilityLabel={known ? `${dc.name}, ${HOLDER[district.controller]}` : 'A district you don’t know yet'}
                  style={[
                    styles.district,
                    box,
                    known
                      ? { borderStyle: 'solid', borderColor: FILL[district.controller], backgroundColor: FILL[district.controller] + (district.controller === 'player' ? '40' : '22') }
                      : styles.unknown,
                    selected === id && styles.selected,
                  ]}
                >
                  {known ? (
                    <>
                      <Text style={[styles.name, { fontSize: Math.max(9, 13 * k) }]} numberOfLines={1}>
                        {dc.name}
                      </Text>
                      <Text style={[styles.sub, { fontSize: Math.max(8, 10 * k) }]} numberOfLines={1}>
                        {dc.home ? 'home' : HOLDER[district.controller]}
                      </Text>
                      <View style={styles.marks}>
                        {here.map((r) => {
                          const kind = c.rackets.types[r.type].kind
                          const color = r.legal ? colors.clean : kind === 'joint' ? colors.packs : kind === 'racket' ? colors.heat : colors.influence
                          return <View key={r.id} style={[styles.mark, { backgroundColor: color, width: Math.max(4, 7 * k), height: Math.max(4, 7 * k) }]} />
                        })}
                      </View>
                    </>
                  ) : (
                    <Text style={[styles.fragment, { fontSize: Math.max(8, 10 * k) }]} numberOfLines={2}>
                      {DISTRICT_STORY[id].fragment}
                    </Text>
                  )}
                </Pressable>
              )
            })}
          </>
        )}
      </View>
      <View style={styles.legend}>
        {(
          [
            ['joint', colors.packs],
            ['racket', colors.heat],
            ['premises', colors.influence],
            ['legal', colors.clean],
          ] as const
        ).map(([label, color]) => (
          <View key={label} style={styles.legendItem}>
            <View style={[styles.mark, { backgroundColor: color, width: 7, height: 7 }]} />
            <Text style={styles.legendText}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  title: { color: colors.accent, fontWeight: '700', letterSpacing: 2, fontSize: 13, textTransform: 'uppercase' },
  paper: { width: '100%', aspectRatio: W / H, backgroundColor: colors.card, borderRadius: 6, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  river: { position: 'absolute', left: 0, backgroundColor: colors.influence, opacity: 0.16, transform: [{ rotate: '-1.5deg' }] },
  riverLabel: { position: 'absolute', color: colors.influence, fontStyle: 'italic', fontSize: 11, opacity: 0.8 },
  rail: { position: 'absolute', left: 0, height: 0, borderTopWidth: 2, borderStyle: 'dashed', borderColor: colors.faint },
  railLabel: { position: 'absolute', color: colors.faint, fontSize: 9 },
  bridge: { position: 'absolute', backgroundColor: colors.faint, opacity: 0.5 },
  district: { position: 'absolute', borderWidth: 1, borderRadius: 4, padding: 4, overflow: 'hidden', justifyContent: 'flex-start' },
  unknown: { borderStyle: 'dashed', borderColor: colors.faint, backgroundColor: 'transparent', justifyContent: 'center' },
  selected: { borderWidth: 2, borderColor: colors.text },
  name: { color: colors.text, fontWeight: '700' },
  sub: { color: colors.muted },
  fragment: { color: colors.faint, fontStyle: 'italic', textAlign: 'center' },
  marks: { flexDirection: 'row', flexWrap: 'wrap', gap: 2, marginTop: 2 },
  mark: { borderRadius: 2 },
  legend: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendText: { color: colors.muted, fontSize: 11 },
})
