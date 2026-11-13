import { useRef, useState, type ReactNode } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { DISTRICT_IDS, FRONT_TYPES, LATER_ACTS, OFFICIAL_IDS, PERK_IDS, RACKET_TYPES, type Act, type ActGate, type Config } from '../../engine'
import { ACT_NAME, ACT_OPENS } from '../acts'
import { Glyph } from '../components/Glyph'
import { Ink, Paper, PaperCaps, PaperRows, PaperSection, PaperTitle, type PaperRow } from '../components/Notebook'
import { colors, glyph } from '../components/ui'
import { fmt, fmtClock, fmtDuration, fmtRate, pct } from '../format'
import { ACT_TITLE } from '../story'
import type { Snapshot } from '../store'
import { fonts, paper, paperInk } from '../theme'
import type { ScreenProps } from './types'

// How it works (design: How it works): a player-facing explainer written into Lyosha's notebook, not the
// engineering docs. Ink for what the player has reached, pencil for what's still ahead (readable anyway),
// their own businesses, fronts, turf and officials marked in red pencil. Every number reads live.

type Chapter = { title: string; act?: Act; body: (game: Snapshot) => ReactNode }

const CHAPTERS: Chapter[] = [
  { title: 'The loop', body: (g) => <Loop game={g} /> },
  { title: 'Vault, Dirty and Clean', body: (g) => <Money game={g} /> },
  { title: 'Businesses', body: (g) => <Businesses game={g} /> },
  { title: 'Fronts', body: (g) => <Fronts game={g} /> },
  { title: 'Crew', body: (g) => <Crew game={g} /> },
  {
    title: 'Ops',
    body: ({ config: c }) => (
      <Ink>
        {`Jobs pay Dirty, Influence or cigarettes for a chance at heat. Your team's best stat for the job, plus ${c.ops.teamBonusPerExtra} for each extra member, is weighed against the job's difficulty: clear it well for the full reward, barely for ${pct(c.ops.partialRewardPct)} of it at less heat, or fall short and get nothing while heat spikes. Training skips the roll and just teaches one crew member. The board brings better-paid, harder versions of the same jobs every ${c.offers.refreshHours}h.`}
      </Ink>
    ),
  },
  {
    title: 'Heat',
    body: ({ config: c }) => (
      <Ink>
        {`Heat drifts toward a target set by how exposed you are (hot businesses, busy fronts) against how much control you have (officials, bribes, turf). From ${c.heat.inspectThreshold}, inspections cut your income; from ${c.heat.raidThreshold}, raids take from the vault; from ${c.heat.arrestThreshold}, crew get arrested for ${c.heat.arrestHours}h. A bribe buys control for a while; an official buys it for good.`}
      </Ink>
    ),
  },
  { title: 'Turf and rivals', body: (g) => <Turf game={g} /> },
  { title: 'Acts', body: (g) => <Acts game={g} /> },
  {
    title: 'Prosperity',
    act: 3,
    body: ({ config: c }) => (
      <Ink>
        {`From Act ${ACT_NAME[c.prosperity.fromAct]}, every district has a prosperity from 0 to 100, and its joints earn with it: ×${c.prosperity.yieldMult[0]} at 0, ×${c.prosperity.yieldMult[1]} at 100. Joints lift a street, rackets sour it, and a hotel lifts it most. Inspections, a raid in the last ${c.prosperity.raidPenaltyHours} hours and running out of cigarettes drag every district down. It moves a little every hour toward where your businesses push it. The Card Club only opens on a prosperous street, and the Cooperative Bank only in a prosperous city.`}
      </Ink>
    ),
  },
  {
    title: 'Premium and the road',
    act: 4,
    body: ({ config: c }) => (
      <Ink>
        {`From Act ${ACT_NAME[c.premium.fromAct]}, the road joints sell premium imported cigarettes: a second stock that only the Combine makes. A convoy (${glyph.clean}${fmt(c.ops.list.runConvoy.costClean ?? 0)}, three crew) brings ${glyph.premium}${c.ops.list.runConvoy.premium} back from the border, and a Convoy Depot adds to every load. While the Colonel holds Zastava his men take ${pct(c.convoys.hijackChance)} of convoys that haven't paid for passage. Customs seizes ${pct(c.convoys.customsBase)} plus ${pct(c.convoys.customsPerHeat)} per point of heat, less with the Customs Chief or a Bonded Warehouse. The Import–Export Company launders at the best rate in the city, but only as much as your premium sales explain.`}
      </Ink>
    ),
  },
  {
    title: 'Politics',
    act: 5,
    body: ({ config: c }) => (
      <Ink>
        {`From Act ${ACT_NAME[c.opinion.fromAct]}, the city has an opinion of you, 0 to 100. The Newspaper, the TV Station and the Palace of Culture raise it, and so does laundering through the Development Fund; inspections and raids knock it back. Opinion multiplies your control (up to ×${1 + c.opinion.controlBonus}) and wins elections. The Ministry in the capital watches too: its attention grows with what you earn, ignores bribes, and at ${c.ministry.freezeAt} freezes your busiest front for ${c.ministry.freezeHours}h. Every ${c.elections.everyDays} days there's an election against Golovin: ${pct(c.elections.baseShare)} of the vote, plus opinion, plus campaign points. Win once and you're mayor for good: no tribute anywhere, district perks ×${c.elections.mayor.perkMult}, more control, and the Governor takes your calls. The Kombinat is a state asset: bought at auction, never pressured.`}
      </Ink>
    ),
  },
  {
    title: 'The endgame',
    act: 6,
    body: ({ config: c }) => (
      <Ink>
        {`From Act ${ACT_NAME[c.legalize.fromAct]}, once the city's opinion of you is at least ${c.legalize.minOpinion}, any joint or racket can go legal for ${c.legalize.hoursOfYield} hours of its takings in Clean. A legal business earns Clean directly, ${pct(c.legalize.cleanShare)} of what it takes (the rest is tax), draws no heat and pays no tribute. The Holding, in the hills, adds ${pct(c.rackets.types.holding.legalBonusPerTier ?? 0)} to every legal business a tier. The past keeps its books: raids, arrests, frozen fronts and missed payments build a case file, and while anything is illegal a hearing can come at the start of a day. Settle it, fight it, or lose your busiest front for a day. Two endings, both recorded, neither final: the Holding, with every business legal, and the Empire, with every district yours and ${c.reckoning.empireWins} hearings won. After either, the city carries on: joints and rackets go ${c.after.extraTiers} tiers past the book, each dearer again; the empire value (everything you own, plus a day of income) keeps a best to beat; and the council posts ${c.after.contracts.count} contracts a week that pay Clean and gold.`}
      </Ink>
    ),
  },
  { title: 'Officials', body: (g) => <Officials game={g} /> },
]

export function HowItWorksScreen({ game }: ScreenProps) {
  const { state: s, config: c, now } = game
  const [open, setOpen] = useState<Record<number, boolean>>({ 0: true })
  const scroll = useRef<ScrollView>(null)
  const paperY = useRef(0)
  const sectionY = useRef<Record<number, number>>({})
  const ahead = (ch: Chapter) => ch.act !== undefined && ch.act > s.act
  const jump = (i: number) => {
    setOpen((o) => ({ ...o, [i]: true }))
    scroll.current?.scrollTo({ y: paperY.current + 16 + (sectionY.current[i] ?? 0) - 8, animated: true })
  }

  return (
    <ScrollView ref={scroll} style={styles.screen} contentContainerStyle={styles.content}>
      <View onLayout={(e) => (paperY.current = e.nativeEvent.layout.y)}>
        <Paper>
          <View style={styles.intro}>
            <PaperTitle title="How it works" note={`${CHAPTERS.length} sections`} />
            <Text style={styles.introText}>
              {'Ink for what you know, '}
              <Text style={styles.pencilUnderline}>pencil for what’s still ahead</Text>
              {`; you can read it anyway. Your numbers are filled in as of ${fmtClock(now, s.createdAt, c).replace(' · ', ', ')}, and what you run is marked in `}
              <Text style={styles.red}>red pencil</Text>.
            </Text>
          </View>

          <View>
            <PaperCaps>Contents</PaperCaps>
            <View style={styles.contents}>
              {[CHAPTERS.slice(0, Math.ceil(CHAPTERS.length / 2)), CHAPTERS.slice(Math.ceil(CHAPTERS.length / 2))].map((column, col) => (
                <View key={col} style={styles.column}>
                  {column.map((ch) => {
                    const i = CHAPTERS.indexOf(ch)
                    return (
                      <Pressable key={ch.title} onPress={() => jump(i)} accessibilityRole="link" style={styles.entry}>
                        <Text style={styles.entryNo}>{i + 1}</Text>
                        <View style={styles.entryText}>
                          <Text style={[styles.entryTitle, ahead(ch) && styles.entryAhead]}>{ch.title}</Text>
                          {ahead(ch) && <Text style={styles.entryNote}>{`Act ${ACT_NAME[ch.act!]} · not yet`}</Text>}
                        </View>
                      </Pressable>
                    )
                  })}
                </View>
              ))}
            </View>
          </View>

          {CHAPTERS.map((ch, i) => (
            <View key={ch.title} onLayout={(e) => (sectionY.current[i] = e.nativeEvent.layout.y)}>
              <PaperSection
                n={i + 1}
                title={ch.title}
                open={!!open[i]}
                onToggle={() => setOpen((o) => ({ ...o, [i]: !o[i] }))}
                pencil={ahead(ch)}
                note={ahead(ch) ? `Act ${ACT_NAME[ch.act!]}` : undefined}
              >
                {ch.body(game)}
              </PaperSection>
            </View>
          ))}

          <Text style={styles.foot}>Every number here reads live from today’s config, so it never falls out of date with what you’re playing.</Text>
        </Paper>
      </View>
    </ScrollView>
  )
}

function Loop({ game }: { game: Snapshot }) {
  const { state: s, derived: d, config: c } = game
  const joints = d.perRacket.filter((r) => r.kind === 'joint').length
  const hours = (h: number) => fmtDuration(h * c.time.hourMs, c)
  const limits: PaperRow[] = [
    {
      key: 'vault',
      label: 'The vault',
      text: d.yieldPerHr > 0 ? `Holds ${glyph.dirty}${fmt(d.vaultCap)}, about ${hours(d.vaultCap / d.yieldPerHr)} of your ${glyph.dirty}${fmtRate(d.yieldPerHr)}. When it's full, earning stops until you collect.` : `Holds ${glyph.dirty}${fmt(d.vaultCap)}. When it's full, earning stops until you collect.`,
    },
    {
      key: 'launder',
      label: 'Laundering',
      text: s.fronts.length ? `A front only washes so much an hour. Yours manage ${glyph.dirty}${fmtRate(d.throughputPerHr)} between them; you earn ${glyph.dirty}${fmtRate(d.yieldPerHr)}.` : 'A front only washes so much an hour, and you have none yet.',
    },
    {
      key: 'packs',
      label: 'Cigarettes',
      text: `Joints need packs from factories. Yours make ${glyph.packs}${fmtRate(d.supply.madePerHr)} and your ${joints} joint${joints === 1 ? '' : 's'} sell ${glyph.packs}${fmtRate(d.supply.soldPerHr)}${Number.isFinite(d.supply.hoursToEmpty) ? `, so you're out in ${hours(d.supply.hoursToEmpty)} unless you buy` : ''}. Run out and part of their income stops.`,
    },
    {
      key: 'heat',
      label: 'Heat',
      text: `Police attention, 0 to 100; yours is ${glyph.heat}${Math.round(s.heat)}. From ${c.heat.inspectThreshold}, inspections cut income. From ${c.heat.raidThreshold}, raids take part of the vault. From ${c.heat.arrestThreshold}, crew get arrested.`,
    },
  ]
  return (
    <>
      <Ink>{`Your businesses earn ${glyph.dirty}Dirty. Dirty pays the running costs (wages, upkeep, repairs, bribes) but it can't buy anything. A front launders it into ${glyph.clean}Clean, and Clean buys growth: businesses, upgrades, crew, districts. Spending Clean earns ${glyph.rep}Reputation, and Reputation opens the story.`}</Ink>
      <Diagram />
      <Ink>A visit takes a few minutes. Collect the vault, answer what’s waiting, keep enough Dirty back for wages, launder the rest, spend the Clean, send the crew out, leave. The city keeps running while you’re away, and a summary tells you what happened when you’re back.</Ink>
      <PaperRows title="Four limits" rows={limits} />
    </>
  )
}

// businesses → ◆ Dirty → ● Clean → ★ Rep, in his hand.
function Diagram() {
  const node = (kind: 'dirty' | 'clean' | 'rep', label: string) => (
    <View style={styles.node}>
      <Glyph kind={kind} size={20} color={paperInk[kind]} />
      <Text style={styles.nodeLabel}>{label}</Text>
    </View>
  )
  const arrow = (label: string) => (
    <View style={styles.arrow}>
      <Text style={styles.arrowLabel}>{label}</Text>
      <Text style={styles.arrowLine}>→</Text>
    </View>
  )
  return (
    <View style={styles.diagram} accessible accessibilityLabel="Businesses earn Dirty. A front launders Dirty into Clean. Spending Clean earns Reputation.">
      <Text style={styles.nodeLabel}>businesses</Text>
      {arrow('earn')}
      {node('dirty', 'Dirty')}
      {arrow('launder')}
      {node('clean', 'Clean')}
      {arrow('spend')}
      {node('rep', 'Rep')}
    </View>
  )
}

function Money({ game }: { game: Snapshot }) {
  const { state: s, derived: d, config: c } = game
  const rate = (f: (typeof d.perFront)[number]) => `the ${c.fronts.types[f.type].name} gives ${glyph.clean}${fmt(f.rate * 100)} for every ${glyph.dirty}100`
  const nextRep = LATER_ACTS.find((a) => a > s.act && c.progression.acts[a].rep !== undefined)
  const hold: PaperRow[] = [
    { key: 'dirty', glyph: 'dirty', label: 'Dirty', value: fmt(s.dirty), text: 'Cash from businesses and jobs. Pays running costs; can’t buy anything.' },
    { key: 'clean', glyph: 'clean', label: 'Clean', value: fmt(s.clean), text: 'Laundered money. Buys businesses, upgrades, crew and districts; spending it earns Rep.' },
    { key: 'influence', glyph: 'influence', label: 'Influence', value: fmt(s.influence), text: 'Political capital. Buys officials.' },
    {
      key: 'rep',
      glyph: 'rep',
      label: 'Reputation',
      value: fmt(s.reputation),
      text: `The progress score. Opens acts and businesses; never falls.${nextRep ? ` Act ${ACT_NAME[nextRep]} opens at ${fmt(c.progression.acts[nextRep].rep!)}.` : ''}`,
    },
    { key: 'heat', glyph: 'heat', label: 'Heat', value: String(Math.round(s.heat)), text: 'Police attention, 0 to 100.' },
    { key: 'packs', glyph: 'packs', label: 'Packs', value: fmt(s.inventory.cigarettes), text: 'Cigarettes, made by factories and sold by joints.' },
    {
      key: 'premium',
      glyph: 'premium',
      label: 'Premium',
      value: fmt(s.inventory.premium),
      text: 'Imported cigarettes, brought by convoy.',
      pencil: s.act < c.premium.fromAct ? `Act ${ACT_NAME[c.premium.fromAct]}` : undefined,
    },
    { key: 'gold', glyph: 'gold', label: 'Gold', value: fmt(s.gold), text: 'Buys time only: skip ahead, or finish a job now.' },
  ]
  return (
    <>
      <Ink>
        {`Everything your businesses earn goes into the vault. Yours holds ${glyph.dirty}${fmt(s.vault)} of ${glyph.dirty}${fmt(d.vaultCap)}. Once it's full, earning stops, and whatever your businesses would have made is lost. Collect it and it joins the Dirty you hold: ${glyph.dirty}${fmt(s.dirty)}.`}
      </Ink>
      <Ink>
        {`Dirty pays wages and upkeep, ${glyph.dirty}${fmtRate(d.wagesPerHr + d.upkeepPerHr)} for you, and repairs and bribes. Nothing else. A front turns it into Clean at its rate${d.perFront.length ? `: ${d.perFront.map(rate).join(', ')}` : ''}. Clean buys everything that grows, and spending it earns Reputation, which never falls. A raid only ever takes from the vault; a crew member who walks out takes from the Dirty you hold. There’s no game over: miss a payday with no Clean to fall back on, and the family sends an envelope, once an act; miss ${c.credit.missesToRepossess} loan payments in a row and the lender takes a business and closes the loan.`}
      </Ink>
      <PaperRows title="What you hold" rows={hold} />
    </>
  )
}

function Businesses({ game }: { game: Snapshot }) {
  const { state: s, config: c } = game
  return (
    <>
      <Ink>
        {`Joints sell cigarettes alongside their main trade; rackets earn Dirty outright but run hotter; premises earn nothing themselves and make, hold or protect something instead. Every business wears down a little each day, and earns less until it's repaired. The upgrade to tier ${c.rackets.specialization.atTier} is a choice for good: greed (more money, more heat) or stealth (the same money, less heat). From Act III joints and rackets go to tier ${c.rackets.specialization6.atTier}, with a second choice on the way.`}
      </Ink>
      <PaperRows
        rows={RACKET_TYPES.map((t) => {
          const rt = c.rackets.types[t]
          return { key: t, label: `${rt.name} (${rt.kind})`, text: rt.description, yours: s.rackets.some((r) => r.type === t), pencil: rt.act > s.act ? `Act ${ACT_NAME[rt.act]}` : undefined }
        })}
      />
    </>
  )
}

function Fronts({ game }: { game: Snapshot }) {
  const { state: s, config: c } = game
  return (
    <>
      <Ink>
        {`A front turns Dirty into Clean: deposit Dirty into its buffer and it launders all the time, even while you're away. Push it for ${pct(c.fronts.modes.push.throughputMult - 1)} more speed and draw suspicion sooner, or lay low for ${pct(1 - c.fronts.modes.layLow.throughputMult)} less and draw none. A front running hot for hours adds to the same heat that gets your businesses raided.`}
      </Ink>
      <PaperRows
        rows={FRONT_TYPES.map((t) => {
          const ft = c.fronts.types[t]
          return { key: t, label: ft.name, value: `${pct(ft.rate)}`, text: ft.description, yours: s.fronts.some((f) => f.type === t), pencil: ft.act > s.act ? `Act ${ACT_NAME[ft.act]}` : undefined }
        })}
      />
    </>
  )
}

function Crew({ game }: { game: Snapshot }) {
  const { config: c } = game
  return (
    <>
      <Ink>
        {`Crew work jobs and mind businesses, and earn experience toward Muscle, Brains and Nerve, each up to its own ceiling. Enough points earned promotes them (Associate, Soldier, Made, Capo), and Soldier and Made each bring a choice of a perk for good. Wages are paid daily from Dirty and rise with their stats, so a veteran costs more than a rookie. Keep loyalty up with raises: below ${c.crew.loyalty.lowThreshold}, someone can walk out for good and take a cut of your Dirty with them. Vitya and your nephew never do.`}
      </Ink>
      <PaperRows title="Perks" rows={PERK_IDS.map((id) => ({ key: id, label: c.crew.experience.perks[id].name, text: c.crew.experience.perks[id].text }))} />
    </>
  )
}

function Turf({ game }: { game: Snapshot }) {
  const { state: s, config: c } = game
  return (
    <>
      <Ink>
        Every district you take, by buyout or by pressuring it with jobs, adds to your control and often a yield or wage perk. Tolya and Zhanna each hold a district and skim tribute from it until you take it; both deal with you directly (Tolya demands his cut, Zhanna trades cigarettes), and taking their turf by force angers them more than buying it.
      </Ink>
      <PaperRows
        rows={DISTRICT_IDS.map((id) => {
          const dc = c.districts.list[id]
          return { key: id, label: dc.name, text: dc.description, yours: s.districts.find((x) => x.id === id)?.controller === 'player', pencil: dc.act > s.act ? `Act ${ACT_NAME[dc.act]}` : undefined }
        })}
      />
    </>
  )
}

function Acts({ game }: { game: Snapshot }) {
  const { state: s, config: c } = game
  return (
    <>
      <Ink>{`The city opens in acts. Each asks something of you before it opens, and brings new districts, businesses and bigger money. Acts I–${ACT_NAME[c.progression.finalAct]} are built.`}</Ink>
      <PaperRows
        rows={LATER_ACTS.filter((a) => a <= c.progression.finalAct).map((a) => ({
          key: String(a),
          label: `Act ${ACT_NAME[a]} · ${ACT_TITLE[a]}`,
          text: `Opens ${ACT_OPENS[a]}. Needs ${gateText(c, c.progression.acts[a])}.`,
          pencil: a > s.act ? `Act ${ACT_NAME[a]}` : undefined,
        }))}
      />
    </>
  )
}

function Officials({ game }: { game: Snapshot }) {
  const { state: s, config: c } = game
  return (
    <PaperRows
      rows={OFFICIAL_IDS.map((id) => {
        const o = c.officials.list[id]
        return { key: id, label: o.name, value: `${glyph.influence}${fmt(o.cost)}`, text: o.description, yours: s.officials.includes(id), pencil: o.act > s.act ? `Act ${ACT_NAME[o.act]}` : undefined }
      })}
    />
  )
}

// What a gate asks for, in words: "every Act I goal", "★9,000 and hold Zastava".
function gateText(c: Config, g: ActGate): string {
  return [
    g.goals ? 'every Act I goal' : '',
    g.rep !== undefined ? `${glyph.rep}${fmt(g.rep)}` : '',
    ...(g.holds ?? []).map((id) => `hold ${c.districts.list[id].name}`),
    ...(g.fronts ?? []).map((f) => `own the ${c.fronts.types[f].name}`),
    g.mayor ? 'win an election' : '',
  ]
    .filter(Boolean)
    .join(' and ')
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingTop: 14, paddingBottom: 30, paddingHorizontal: 10 },
  intro: { gap: 10 },
  introText: { fontFamily: fonts.text400, fontSize: 13.5, lineHeight: 20, color: '#3d372e' },
  pencilUnderline: { color: paper.pencil, textDecorationLine: 'underline', textDecorationStyle: 'dashed', textDecorationColor: paper.pencilLine },
  red: { fontFamily: fonts.text600, color: paper.redPencil },
  contents: { flexDirection: 'row', gap: 8 },
  column: { flex: 1 },
  entry: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6 },
  entryNo: { width: 16, fontFamily: fonts.text600, fontSize: 12, color: '#5b6a86' },
  entryText: { flexShrink: 1 },
  entryTitle: { fontFamily: fonts.text500, fontSize: 14, color: paper.fountain },
  entryAhead: { color: paper.pencil, textDecorationLine: 'underline', textDecorationStyle: 'dashed', textDecorationColor: paper.pencilLine },
  entryNote: { fontFamily: fonts.text400, fontSize: 11, color: paper.pencil },
  diagram: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  node: { alignItems: 'center', gap: 2 },
  nodeLabel: { fontFamily: fonts.hand700, fontSize: 17, color: paper.ink },
  arrow: { alignItems: 'center', marginHorizontal: 2 },
  arrowLabel: { fontFamily: fonts.hand500, fontSize: 14, lineHeight: 14, color: paper.pencil },
  arrowLine: { fontSize: 18, lineHeight: 20, color: paper.ink },
  foot: { fontFamily: fonts.text400, fontSize: 12, lineHeight: 17, color: paper.pencil },
})
