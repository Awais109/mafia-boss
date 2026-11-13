import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { prosperityOn, prosperityTarget, type Config, type DistrictId, type RacketType, type SynergyConfig } from '../../engine'
import { fmtRate, pct } from '../format'
import type { Snapshot } from '../store'
import { fonts } from '../theme'
import { colors, glyph, Item, List } from './ui'

const nameOf = (c: Config, t: RacketType | 'joints') => (t === 'joints' ? 'joints' : c.rackets.types[t].name)

function synergyText(c: Config, syn: SynergyConfig): string {
  const effects = [
    syn.effect.yieldMult ? `${syn.b ? nameOf(c, syn.b) : 'businesses'} earn ×${syn.effect.yieldMult}` : '',
    syn.effect.servedFirst ? 'get cigarettes first in a shortage' : '',
    ...Object.entries(syn.effect.upkeepMultOf ?? {}).map(([t, m]) => `${nameOf(c, t as RacketType)} upkeep ×${m}`),
    syn.effect.influenceMult ? `Influence ×${syn.effect.influenceMult}` : '',
  ].filter(Boolean)
  return `${nameOf(c, syn.a)}${syn.b ? ` beside ${nameOf(c, syn.b)}` : ''}: ${effects.join(', ')}`
}

// A district at a glance (Business and the Map): what it hosts and how full it is, its prosperity from Act III
// with a brass mark at the next business that waits on it, the tribute if someone else holds it, and its
// pairings, or one within reach.
export function DistrictSummary({ game, id, tribute, style }: { game: Snapshot; id: DistrictId; tribute?: boolean; style?: StyleProp<ViewStyle> }) {
  const { state: s, derived: d, config: c, now } = game
  const here = s.rackets.filter((r) => r.districtId === id)
  const running = here.filter((r) => c.rackets.types[r.type].kind !== 'premises').length
  const lots = here.length - running
  const holder = s.districts.find((x) => x.id === id)?.controller
  const tributeHere = d.perRacket.reduce((sum, rd, i) => (s.rackets[i].districtId === id ? sum + rd.tribute : sum), 0)
  const dc = c.districts.list[id]
  const prosperity = s.districts.find((x) => x.id === id)?.prosperity ?? 0
  const target = prosperityTarget(s, c, id, now)
  // The next business on this street that waits on prosperity: the brass mark on the bar.
  const next = [...dc.allows, ...(dc.lotsFor ?? [])]
    .map((t) => ({ t, at: c.rackets.types[t].minProsperity }))
    .filter((x): x is { t: RacketType; at: number } => x.at !== undefined && x.at > prosperity)
    .sort((a, b) => a.at - b.at)[0]
  const active = d.synergies.filter((x) => x.districtId === id).flatMap((x) => c.rackets.synergies.filter((syn) => syn.id === x.id))
  const typesHere = new Set(s.rackets.filter((r) => r.districtId === id).map((r) => r.type))
  const jointsHere = s.rackets.some((r) => r.districtId === id && c.rackets.types[r.type].kind === 'joint')
  const has = (t: RacketType | 'joints') => (t === 'joints' ? jointsHere : typesHere.has(t))
  const couldBuild = (t: RacketType | 'joints') => t === 'joints' || dc.allows.includes(t) || (dc.premisesLots > 0 && c.rackets.types[t].kind === 'premises')
  const potential = c.rackets.synergies.find(
    (syn) => (!syn.district || syn.district === id) && syn.b && !active.includes(syn) && (has(syn.a) || has(syn.b)) && couldBuild(syn.a) && couldBuild(syn.b),
  )
  return (
    <List style={style}>
      <Item
        label="Hosts"
        hint={dc.allows.map((t) => c.rackets.types[t].name).join(', ') || 'premises only'}
        value={
          <View style={styles.hosts}>
            <Text style={styles.hostsValue}>{`${running}/${dc.allows.length} running`}</Text>
            <Text style={styles.hostsLots}>{`lots ${lots}/${dc.premisesLots}`}</Text>
          </View>
        }
      />
      {prosperityOn(s, c) && (
        <View style={styles.prosperity}>
          <View style={styles.prosperityLine}>
            <Text style={styles.label}>Prosperity</Text>
            <Text style={styles.prosperityValue}>
              {Math.round(prosperity)}
              <Text style={styles.muted}>{` heading for ${Math.round(target)}`}</Text>
            </Text>
          </View>
          <View style={styles.prosperityTrack}>
            <View style={[styles.prosperityFill, { width: `${Math.min(100, prosperity)}%` }]} />
            {target > prosperity && <View style={[styles.prosperityToward, { left: `${prosperity}%`, width: `${Math.min(100, target) - prosperity}%` }]} />}
            {next && <View style={[styles.prosperityMark, { left: `${next.at}%` }]} />}
          </View>
          {next && <Text style={styles.faintNote}>{`Brass mark: ${next.at}, where the ${c.rackets.types[next.t].name} opens`}</Text>}
        </View>
      )}
      {tribute && holder !== 'player' && (
        <Item
          label="Tribute"
          hint={c.districts.list[id].tribute > 0 ? `${pct(c.districts.list[id].tribute)} of yield here` : undefined}
          value={c.districts.list[id].tribute > 0 ? `${glyph.dirty}${fmtRate(tributeHere)}` : <Text style={styles.muted}>none</Text>}
          color={colors.warn}
        />
      )}
      {active.map((syn) => (
        <Item key={syn.id} label="Pairing" hint={synergyText(c, syn)} value={syn.effect.yieldMult ? `×${syn.effect.yieldMult}` : 'on'} color={colors.good} />
      ))}
      {active.length === 0 && potential && <Item label="Pairing" hint={`None yet. ${synergyText(c, potential)}`} value={<Text style={styles.muted}>none</Text>} />}
    </List>
  )
}


const styles = StyleSheet.create({
  hosts: { alignItems: 'flex-end' },
  hostsValue: { fontFamily: fonts.text600, fontSize: 14, color: colors.text },
  hostsLots: { fontFamily: fonts.text400, fontSize: 14, color: colors.muted },
  label: { fontFamily: fonts.text400, fontSize: 14, color: colors.text },
  muted: { fontFamily: fonts.text400, color: colors.muted },
  prosperity: { gap: 6, paddingTop: 8, paddingBottom: 12, paddingHorizontal: 14 },
  prosperityLine: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  prosperityValue: { fontFamily: fonts.text600, fontSize: 15, color: colors.text },
  prosperityTrack: { height: 8, borderRadius: 1, backgroundColor: colors.cardAlt },
  prosperityFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#a2957c', borderRadius: 1 },
  prosperityToward: { position: 'absolute', top: 0, bottom: 0, backgroundColor: '#6a5f4d', opacity: 0.6 },
  prosperityMark: { position: 'absolute', top: -3, bottom: -3, width: 1, backgroundColor: colors.accent },
  faintNote: { fontFamily: fonts.text400, fontSize: 12, lineHeight: 17, color: colors.faint },
})
