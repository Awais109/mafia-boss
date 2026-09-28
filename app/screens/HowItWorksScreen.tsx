import { DISTRICT_IDS, FRONT_TYPES, LATER_ACTS, OFFICIAL_IDS, PERK_IDS, RACKET_TYPES, type ActGate, type Config, type LaterAct } from '../../engine'
import { ACT_NAME, ACT_OPENS } from '../acts'
import { Card, Row, Screen, Section, T, colors, glyph } from '../components/ui'
import { fmt, pct } from '../format'
import type { ScreenProps } from './types'

// A player-facing explainer, not the engineering docs: what each system does and why it matters,
// in plain language. Numbers are read live from config so this never goes stale.
export function HowItWorksScreen({ game }: ScreenProps) {
  const { config: c } = game

  return (
    <Screen>
      <Section title="The loop">
        <Card>
          <T small muted>
            {`Your businesses earn Dirty money, which piles up in the vault until you Collect it. Dirty is real cash, but it's hot — spend it on wages, upkeep and repairs, or launder it through a front into Clean. Clean buys new businesses, upgrades, crew and turf, and every bit of it spent earns you Reputation. Reputation is what unlocks everything else in the city.`}
          </T>
        </Card>
      </Section>

      <Section title="Vault, Dirty, Clean">
        <Card>
          <Row label={`${glyph.dirty} Vault`} value="Where yield piles up, capped, until you Collect it" />
          <Row label={`${glyph.dirty} Dirty`} value="Cash on hand: pays wages/upkeep, safe from raids" />
          <Row label={`${glyph.clean} Clean`} value="Laundered money: buys everything, earns Reputation" />
          <T small muted style={{ marginTop: 6 }}>
            {`A raid only ever seizes from the vault — never from Dirty you're already holding. A crew member who walks out steals from Dirty on hand instead, so neither pile is ever fully safe.`}
          </T>
        </Card>
      </Section>

      <Section title="Businesses">
        <Card>
          <T small muted style={{ marginBottom: 6 }}>
            Joints sell cigarettes alongside their main earner; rackets earn Dirty outright but run hotter; premises earn nothing
            themselves and instead make, hold, or protect something. Every business decays a little every day — repair it before
            it drags your yield down, and upgrading past tier {c.rackets.specialization.atTier} locks in Greed (more money, more
            heat) or Stealth (same money, less heat) for good. From Act III joints and rackets go to tier {c.rackets.specialization6.atTier}, with a second
            choice on the way.
          </T>
          {RACKET_TYPES.map((t) => {
            const rt = c.rackets.types[t]
            return <Row key={t} label={rt.name} value={rt.description} />
          })}
        </Card>
      </Section>

      <Section title="Fronts">
        <Card>
          <T small muted style={{ marginBottom: 6 }}>
            A front turns Dirty into Clean: deposit Dirty into its buffer and it launders continuously, even while you’re away.
            Push it for {pct(c.fronts.modes.push.throughputMult - 1)} more speed at the cost of drawing suspicion sooner, or lay
            low for {pct(1 - c.fronts.modes.layLow.throughputMult)} less speed and no suspicion at all. A front running hot for
            hours adds to the same heat that gets your businesses raided.
          </T>
          {FRONT_TYPES.map((t) => {
            const ft = c.fronts.types[t]
            return <Row key={t} label={ft.name} value={ft.description} />
          })}
        </Card>
      </Section>

      <Section title="Crew">
        <Card>
          <T small muted style={{ marginBottom: 6 }}>
            Crew work jobs and mind rackets, earning experience toward Muscle, Brains or Nerve. Enough points in those stats
            promotes them — Associate, Soldier, Made, Capo — and reaching Soldier or Made offers a choice of a permanent perk.
            Wages are paid daily from Dirty and rise with a member’s stats, so a veteran always costs more than a rookie. Keep
            loyalty up with raises and clean jobs: a member who drops below {c.crew.loyalty.lowThreshold} loyalty can walk out
            for good, taking a cut of your Dirty with them.
          </T>
          {PERK_IDS.map((id) => {
            const p = c.crew.experience.perks[id]
            return <Row key={id} label={p.name} value={p.text} />
          })}
        </Card>
      </Section>

      <Section title="Ops">
        <Card>
          <T small muted>
            Jobs pay Dirty, Influence or cigarettes for a chance at heat. Your team’s best stat for the job, plus a small bonus
            per extra member, is weighed against the job’s difficulty: clear it well for a full reward, clear it barely for a
            partial one at less heat, or fall short and pay nothing while heat spikes hard. Training jobs skip the roll entirely
            and just hand one crew member experience. The opportunities board refreshes every {c.offers.refreshHours}h with
            randomized versions of the same jobs, for a bit of variance on top.
          </T>
        </Card>
      </Section>

      <Section title="Heat">
        <Card>
          <T small muted>
            Heat drifts toward a target set by how exposed your operation is (hot businesses, suspicious fronts) versus how much
            control you have (officials, bribes, turf). Cross {c.heat.inspectThreshold} and inspections cut your yield; cross{' '}
            {c.heat.raidThreshold} and raids can seize from the vault; cross {c.heat.arrestThreshold} and arrests can jail a crew
            member for {c.heat.arrestHours}h. A bribe buys temporary control; an official buys it permanently.
          </T>
        </Card>
      </Section>

      <Section title="Turf & rivals">
        <Card>
          <T small muted style={{ marginBottom: 6 }}>
            Every district you take — by buyout or by pressuring it with jobs — adds to your control and often a yield or wage
            perk. Tolya and Zhanna each start holding one district and skim tribute from it until you take it back; both also
            deal with you directly (Tolya demands tribute or roughs up a business, Zhanna trades cigarettes), and taking their
            turf by force angers them more than simply buying it out.
          </T>
          {DISTRICT_IDS.map((id) => {
            const dc = c.districts.list[id]
            return <Row key={id} label={dc.name} value={dc.description} />
          })}
        </Card>
      </Section>

      <Section title="Acts">
        <Card>
          <T small muted style={{ marginBottom: 6 }}>
            {`The city opens in acts. Each one needs something of you before it opens, and brings new districts, businesses and bigger money. Acts I–${ACT_NAME[c.progression.finalAct]} are built.`}
          </T>
          {LATER_ACTS.filter((a) => a <= c.progression.finalAct).map((a) => {
            const g = c.progression.acts[a]
            return <Row key={a} label={`Act ${ACT_NAME[a]}`} value={`${ACT_OPENS[a]} — needs ${gateText(c, g)}`} />
          })}
          {c.progression.finalAct < 6 && (
            <Row
              label={`Clearing Act ${ACT_NAME[c.progression.finalAct]}`}
              value={`needs ${gateText(c, c.progression.acts[(c.progression.finalAct + 1) as LaterAct])}`}
            />
          )}
        </Card>
      </Section>

      <Section title="Prosperity">
        <Card>
          <T small muted>
            {`From Act ${ACT_NAME[c.prosperity.fromAct]}, every district has a prosperity from 0 to 100, and its joints earn with it: ×${c.prosperity.yieldMult[0]} at 0, ×${c.prosperity.yieldMult[1]} at 100. Joints lift a street, rackets sour it, and a hotel lifts it most. Inspections, a raid in the last ${c.prosperity.raidPenaltyHours} hours and running out of cigarettes drag every district down. It moves a little every hour toward where your businesses are pushing it. The Card Club only opens on a prosperous street, and the Cooperative Bank only in a prosperous city.`}
          </T>
        </Card>
      </Section>

      {c.progression.finalAct >= c.premium.fromAct && (
        <Section title="Premium and the road">
          <Card>
            <T small muted>
              {`From Act ${ACT_NAME[c.premium.fromAct]}, the road joints sell premium imported cigarettes: a second stock, with its own cap, that no factory makes. A convoy (●${fmt(c.ops.list.runConvoy.costClean ?? 0)}, three crew) brings ${glyph.premium}${c.ops.list.runConvoy.premium} back from the border, and a Convoy Depot adds to every load. While the Colonel holds Zastava his men take ${pct(c.convoys.hijackChance)} of convoys that haven't paid for passage. Customs seizes ${pct(c.convoys.customsBase)} plus ${pct(c.convoys.customsPerHeat)} per point of heat, less with the Customs Chief or a Bonded Warehouse in Zastava. The Import–Export Company launders at the best rate in the city, but only as much as your premium sales would explain.`}
            </T>
          </Card>
        </Section>
      )}

      <Section title="Officials">
        <Card>
          {OFFICIAL_IDS.map((id) => {
            const oc = c.officials.list[id]
            return <Row key={id} label={oc.name} value={oc.description} />
          })}
        </Card>
      </Section>

      <T small color={colors.faint}>{`Every number here reads live from today's config, so it never falls out of date with what you're actually playing.`}</T>
    </Screen>
  )
}

// What a gate asks for, in words: "every Act I goal", "★9,000 and hold Zastava".
function gateText(c: Config, g: ActGate): string {
  return [
    g.goals ? 'every Act I goal' : '',
    g.rep !== undefined ? `★${fmt(g.rep)}` : '',
    ...(g.holds ?? []).map((id) => `hold ${c.districts.list[id].name}`),
    ...(g.fronts ?? []).map((f) => `own the ${c.fronts.types[f].name}`),
  ]
    .filter(Boolean)
    .join(' and ')
}
