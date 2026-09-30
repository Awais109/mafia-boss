import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { DISTRICT_IDS, tolyaHostile, tolyaIntervalHours, type DistrictId, type RacketType } from '../../engine'
import type { PersonId } from '../art/people'
import { ACT_NAME } from '../acts'
import { CityMap } from '../components/CityMap'
import { ColonelCard } from '../components/ColonelCard'
import { DistrictSummary } from '../components/DistrictSummary'
import { Dossier, PeopleGrid } from '../components/People'
import { PoliticsCard } from '../components/PoliticsCard'
import { Head } from '../components/Portrait'
import { ReckoningCard } from '../components/ReckoningCard'
import { TributeCard } from '../components/TributeCard'
import { Btn, Card, colors, glyph, rich, Screen, Section, Segmented, Tag, Title } from '../components/ui'
import { ZhannaCard } from '../components/ZhannaCard'
import { fmt, fmtDuration, pct } from '../format'
import { PEOPLE } from '../people'
import { store } from '../store'
import { DISTRICT_STORY, revealed, tolyaMood } from '../story'
import { fonts, paper } from '../theme'
import { webParam } from '../webParams'
import type { ScreenProps } from './types'

// The Map (ADR 0046; design: Map and People). The city: Lyosha's notebook drawn as a map, the district you
// tap with who holds it and what it's worth, and the rivals, newest first. People: everyone you've met, and
// each one's dossier.

const CONTROLLER = { player: 'yours', tolya: 'Tolya’s', zhanna: 'Zhanna’s', colonel: 'the Colonel’s', state: 'the state’s', none: 'open turf' } as const
const VIEWS = [
  { key: 'city', title: 'The city' },
  { key: 'people', title: 'People' },
] as const

export function TurfScreen({ game, go }: ScreenProps) {
  const { state: s, config: c } = game
  const [view, setView] = useState<'city' | 'people'>(webParam('view') === 'people' ? 'people' : 'city')
  const [person, setPerson] = useState<PersonId | null>(() => (PEOPLE.find((p) => p.id === webParam('person'))?.id ?? null))
  const [selected, setSelected] = useState<DistrictId | null>(null)
  const home = DISTRICT_IDS.find((id) => c.districts.list[id].home)!
  const picked = selected ?? home

  return (
    <Screen>
      <Segmented label="Map view" options={VIEWS} value={view} onChange={(v) => { setView(v); setPerson(null) }} />

      {view === 'people' ? (
        person ? (
          <Dossier game={game} id={person} onBack={() => setPerson(null)} onMap={PEOPLE.find((p) => p.id === person)?.mood ? () => { setView('city'); setPerson(null) } : undefined} />
        ) : (
          <PeopleGrid game={game} onOpen={setPerson} />
        )
      ) : (
        <>
          <View style={styles.bleed}>
            <CityMap game={game} selected={picked} onSelect={setSelected} />
          </View>
          <DistrictCard game={game} go={go} id={picked} />

          {s.act >= c.reckoning.fromAct && (
            <Section title="The reckoning">
              <ReckoningCard game={game} />
            </Section>
          )}
          {s.act >= c.opinion.fromAct && (
            <Section title="Politics">
              <PoliticsCard game={game} />
            </Section>
          )}
          {s.act >= c.premium.fromAct && (
            <Section title="The Colonel">
              <ColonelCard game={game} />
            </Section>
          )}
          {s.act >= 2 && (
            <Section title="Zhanna Arkadyevna" right="the Port Quarter">
              <ZhannaCard game={game} />
            </Section>
          )}
          <Tolya game={game} go={go} />
        </>
      )}
    </Screen>
  )
}

function Tolya({ game }: ScreenProps) {
  const { state: s, config: c, now } = game
  const tol = s.rival.tolya
  const mood = tolyaMood(s, c)
  const holdsRow = s.districts.find((d) => d.id === 'kioskRow')?.controller === 'tolya'
  return (
    <Section title="Tolya" right={holdsRow ? 'Kiosk Row' : 'lost the Row'}>
      {tol.demand !== null ? (
        <TributeCard game={game} />
      ) : (
        <Card style={styles.tolya}>
          <View style={styles.tolyaHead}>
            <Head id="tolya" size={44} />
            <View style={styles.tolyaText}>
              <Text style={styles.line}>
                {'Mood '}
                <Text style={[styles.bold, tolyaHostile(s, c) ? { color: colors.bad } : null]}>{mood}</Text>
              </Text>
              <Text style={styles.muted}>{`No demand right now. Next visit in ${fmtDuration(tol.nextTickAt - now, c)}, every ${fmt(tolyaIntervalHours(s, c))}h.`}</Text>
            </View>
          </View>
          <Text style={styles.note}>{`Paying keeps him sweet. Pressuring or buying his turf sours him; below ${c.rivals.tolya.hostileBelow} he visits more often.`}</Text>
        </Card>
      )}
    </Section>
  )
}

// One district, as the map shows it when you tap it: who holds it, what it hosts and what it's worth, how to
// take it, and the line that showed it to you.
function DistrictCard({ game, go, id }: ScreenProps & { id: DistrictId }) {
  const { state: s, derived: d, config: c } = game
  const story = DISTRICT_STORY[id]
  const dc = c.districts.list[id]
  if (!revealed(s, c, id)) {
    return (
      <View style={styles.card}>
        <View style={styles.head}>
          <Title size={22} weight={700} color={colors.muted}>
            A page you can’t read yet
          </Title>
        </View>
        <View style={styles.paperNote}>
          <Text style={styles.hand}>{story.fragment}</Text>
          <Text style={styles.shown}>Lyosha’s note · someone will show it to you</Text>
        </View>
      </View>
    )
  }
  const district = s.districts.find((x) => x.id === id)!
  const ours = district.controller === 'player'
  const open = d.unlocked.district[id]
  const perks = [
    ...Object.entries(dc.mod.yieldMult ?? {}).map(([t, m]) => `${c.rackets.types[t as RacketType].name} yield ×${m}`),
    dc.mod.wageMult ? `crew wages ×${dc.mod.wageMult}` : '',
    dc.home ? '' : `control +${pct(c.heat.districtControlPct)}`,
    ours || dc.home ? '' : `${glyph.rep}${c.reputation.perDistrict}`,
  ].filter(Boolean)
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Title size={22} weight={700}>
          {dc.name}
        </Title>
        <Tag text={dc.home ? 'home turf' : CONTROLLER[district.controller]} color={ours ? colors.good : undefined} />
      </View>
      {!open ? (
        <Text style={[styles.muted, styles.pad]}>{`Opens in Act ${ACT_NAME[dc.act]}.`}</Text>
      ) : (
        <>
          <DistrictSummary game={game} id={id} tribute style={styles.flush} />
          {dc.auction && !ours && <Text style={[styles.warn, styles.pad]}>A state asset: it sells at auction, can’t be pressured, and nothing goes in until it’s yours.</Text>}
          {perks.length > 0 && (
            <View style={styles.perks}>
              <Text style={styles.perksLabel}>{ours ? 'You get' : 'Take it for'}</Text>
              <View style={styles.chips}>
                {perks.map((p) => (
                  <View key={p} style={styles.chip}>
                    <Text style={styles.chipText}>{rich(p, 12.5)}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          {!ours && (
            <View style={styles.actions}>
              <Btn
                kind="primary"
                title={`${dc.auction ? 'Buy at auction' : 'Buy out'} ${glyph.clean}${fmt(dc.buyout)}`}
                disabled={s.clean < dc.buyout}
                onPress={() => store.dispatch({ type: 'BUY_DISTRICT', districtId: id })}
                style={styles.grow}
              />
              {!dc.auction && <Btn kind="outline" chevron title={`Pressure ${district.pressureCount}/${c.districts.pressureOpsToFlip}`} onPress={() => go('ops')} style={styles.grow} />}
            </View>
          )}
        </>
      )}
      <View style={styles.paperNote}>
        <Text style={styles.hand}>{story.reveal.replace(/^“|”$/g, '')}</Text>
        <Text style={styles.shown}>{`Shown to you by ${story.by} · Act ${ACT_NAME[dc.act]}`}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  bleed: { marginHorizontal: -6 },
  card: { backgroundColor: colors.card, borderRadius: 6, borderWidth: 1, borderColor: colors.divider, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: 14 },
  pad: { paddingHorizontal: 14, paddingBottom: 12 },
  flush: { borderWidth: 0, borderTopWidth: 1, borderTopColor: colors.cardAlt, borderRadius: 0, backgroundColor: 'transparent', paddingVertical: 0 },
  muted: { fontFamily: fonts.text400, fontSize: 13, lineHeight: 18, color: colors.muted },
  warn: { fontFamily: fonts.text400, fontSize: 12.5, lineHeight: 18, color: colors.warn },
  note: { fontFamily: fonts.text400, fontSize: 12, lineHeight: 17, color: colors.faint },
  line: { fontFamily: fonts.text400, fontSize: 14, color: colors.text },
  bold: { fontFamily: fonts.text600 },
  perks: { gap: 8, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4, borderTopWidth: 1, borderTopColor: colors.cardAlt },
  perksLabel: { fontFamily: fonts.text400, fontSize: 14, color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingVertical: 5, paddingHorizontal: 8, borderRadius: 3, backgroundColor: colors.cardAlt },
  chipText: { fontFamily: fonts.text400, fontSize: 12.5, color: colors.text },
  actions: { flexDirection: 'row', gap: 8, padding: 14 },
  grow: { flex: 1 },
  paperNote: { gap: 4, margin: 14, marginTop: 4, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: paper.squared, borderRadius: 2 },
  hand: { fontFamily: fonts.hand700, fontSize: 19, lineHeight: 22, color: paper.fountain },
  shown: { fontFamily: fonts.text500, fontSize: 10.5, letterSpacing: 1, textTransform: 'uppercase', color: '#5a5144' },
  tolya: { gap: 10 },
  tolyaHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tolyaText: { flex: 1, gap: 2 },
})
