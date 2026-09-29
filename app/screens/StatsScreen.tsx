import { RANK_NAMES, gameCleared, gameDay } from '../../engine'
import { ACT_NAME, actMilestones } from '../acts'
import { Card, Row, Screen, Section, T, colors, glyph } from '../components/ui'
import { fmt, fmtClock } from '../format'
import type { ScreenProps } from './types'

// Everything tracked since the game started (`state.stats`), read straight off it — no new
// counters, just a place to see the numbers that already accrue quietly in the background.
export function StatsScreen({ game }: ScreenProps) {
  const { state: s, config: c, now } = game
  const t = s.stats
  const day = gameDay(c, s, now)
  const jobsRun = t.opOutcomes.full + t.opOutcomes.partial + t.opOutcomes.fail
  const districtsHeld = s.districts.filter((d) => d.controller === 'player').length
  const rankCounts = [0, 0, 0, 0]
  for (const m of s.crew) rankCounts[m.rank]++

  return (
    <Screen>
      <Section title="Playtime & progress">
        <Card>
          <Row label="Day" value={String(day)} />
          <Row label="Act" value={`${ACT_NAME[s.act]}${gameCleared(s, c) ? ' (cleared)' : ''}`} />
          <Row label="Reputation" value={`${glyph.rep}${fmt(s.reputation)}`} color={colors.rep} />
          <Row label="Sessions played" value={fmt(t.sessions)} />
          <Row label="Actions taken" value={fmt(t.actions)} />
          {actMilestones(s, c).map((m) => (
            <Row key={m.label} label={m.label} value={fmtClock(m.t, s.createdAt, c)} />
          ))}
        </Card>
      </Section>

      <Section title="Money">
        <Card>
          <Row label="Dirty earned (lifetime)" value={`${glyph.dirty}${fmt(t.dirtyEarned)}`} color={colors.dirty} />
          <Row label="Lost to a full vault" value={`${glyph.dirty}${fmt(t.dirtyLostToCap)}`} />
          <Row label="Clean earned" value={`${glyph.clean}${fmt(t.cleanEarned)}`} color={colors.clean} />
          <Row label="Clean spent" value={`${glyph.clean}${fmt(t.cleanSpent)}`} />
          <Row label="Wages paid" hint={t.missedWages > 0 ? `${t.missedWages} payday${t.missedWages === 1 ? '' : 's'} missed` : undefined} value={`${glyph.dirty}${fmt(t.wagesPaid)}`} color={t.missedWages > 0 ? colors.heat : undefined} />
          <Row label="Upkeep paid" hint={t.missedUpkeep > 0 ? `${t.missedUpkeep} day${t.missedUpkeep === 1 ? '' : 's'} missed` : undefined} value={`${glyph.dirty}${fmt(t.upkeepPaid)}`} color={t.missedUpkeep > 0 ? colors.heat : undefined} />
          <Row label="Repairs paid" value={`${glyph.dirty}${fmt(t.repairsPaid)}`} />
          <Row label="Bribes paid" value={`${glyph.dirty}${fmt(t.bribesPaid)}`} />
          <Row label="Tribute lost" value={`${glyph.dirty}${fmt(t.tributeLost)}`} />
          <Row label="Seized in raids" value={`${glyph.dirty}${fmt(t.seized)}`} color={t.seized > 0 ? colors.heat : undefined} />
          <Row label="Gold granted" value={`${glyph.gold}${fmt(t.gold.granted)}`} color={colors.gold} />
          <Row label="Gold spent" hint={`${fmt(t.gold.hoursSkipped)}h skipped`} value={`${glyph.gold}${fmt(t.gold.spentSkip + t.gold.spentRush)}`} />
        </Card>
      </Section>

      <Section title="Crew & jobs">
        <Card>
          <Row label="Crew now" value={`${s.crew.length}`} />
          <Row
            label="By rank"
            value={RANK_NAMES.map((name, i) => `${rankCounts[i]} ${name}`)
              .filter((_, i) => rankCounts[i] > 0)
              .join(' · ') || '—'}
          />
          <Row label="Jobs run" hint={`${t.opOutcomes.full} full · ${t.opOutcomes.partial} partial · ${t.opOutcomes.fail} failed`} value={fmt(jobsRun)} />
          <Row label="Stat points gained" value={fmt(t.statPointsGained)} />
          <Row label="Training paid" value={`${glyph.dirty}${fmt(t.trainingPaid)}`} />
          <Row label="Specializations chosen" hint={`${t.specializations.greed} greed · ${t.specializations.stealth} stealth`} value={fmt(t.specializations.greed + t.specializations.stealth)} />
          <Row label="Front mode changes" value={fmt(t.frontModeChanges)} />
          <Row label="Tolya haggles" hint={`${t.haggles.won} won · ${t.haggles.lost} lost`} value={fmt(t.haggles.won + t.haggles.lost)} />
          <Row label="Crew walkouts" value={fmt(t.walkouts)} color={t.walkouts > 0 ? colors.heat : undefined} />
        </Card>
      </Section>

      <Section title="Heat & the law">
        <Card>
          <Row label="Heat now" value={String(Math.round(s.heat))} color={s.heat >= c.heat.raidThreshold ? colors.heat : s.heat >= c.heat.inspectThreshold ? colors.warn : undefined} />
          <Row label="Raids" hint={t.firstRaidAt !== undefined && t.firstRaidAt !== null ? `first ${fmtClock(t.firstRaidAt, s.createdAt, c)}` : undefined} value={fmt(t.raids)} color={t.raids > 0 ? colors.heat : undefined} />
          <Row label="Arrests" value={fmt(t.arrests)} color={t.arrests > 0 ? colors.heat : undefined} />
          <Row label="Decisions" hint={`${t.inbox.resolved} answered · ${t.inbox.auto} auto`} value={fmt(t.inbox.filed)} />
          {t.convoys.run > 0 && (
            <Row
              label="Convoys"
              hint={`${t.convoys.landed} landed · ${t.convoys.hijacked} taken on the road · ${t.convoys.seized} seized`}
              value={fmt(t.convoys.run)}
              color={t.convoys.hijacked + t.convoys.seized > 0 ? colors.warn : undefined}
            />
          )}
          {t.passagesPaid > 0 && <Row label="Paid for passage" value={`${glyph.dirty}${fmt(t.passagesPaid)}`} />}
          {t.elections.held > 0 && (
            <Row
              label="Elections"
              hint={`campaigns ${glyph.dirty}${fmt(t.campaignPaid.dirty)} ${glyph.influence}${fmt(t.campaignPaid.influence)}`}
              value={`${t.elections.won} won of ${t.elections.held}`}
              color={t.elections.won > 0 ? colors.good : colors.warn}
            />
          )}
          {t.frontsFrozen > 0 && <Row label="Fronts frozen" hint="by the Ministry or a hearing" value={fmt(t.frontsFrozen)} color={colors.heat} />}
          {t.legalized > 0 && <Row label="Businesses made legal" hint={`${glyph.clean}${fmt(t.legalClean)} earned legally`} value={fmt(t.legalized)} color={colors.clean} />}
          {t.hearings.held > 0 && <Row label="Hearings" value={`${t.hearings.won} won of ${t.hearings.held}`} />}
          {t.endings.holding !== undefined && <Row label="The Holding" value={fmtClock(t.endings.holding, s.createdAt, c)} color={colors.good} />}
          {t.endings.empire !== undefined && <Row label="The Empire" value={fmtClock(t.endings.empire, s.createdAt, c)} color={colors.good} />}
        </Card>
      </Section>

      <Section title="Territory & supply">
        <Card>
          <Row label="Districts held" value={`${districtsHeld} of ${s.districts.length}`} color={colors.rep} />
          <Row label="Cigarettes made" value={`${glyph.packs}${fmt(t.packsMade)}`} />
          <Row label="Cigarettes sold" value={`${glyph.packs}${fmt(t.packsSold)}`} />
          <Row label="Wasted (over cap)" value={`${glyph.packs}${fmt(t.packsLostToCap)}`} />
          <Row label="Hours out of stock" value={`${fmt(t.shortageHours)}h`} color={t.shortageHours > 0 ? colors.warn : undefined} />
          <Row label="Shipments from Zhanna" value={`${glyph.dirty}${fmt(t.shipmentsPaid)}`} />
          <Row label="Surplus sold to Zhanna" value={`${glyph.dirty}${fmt(t.surplusSold)}`} />
        </Card>
      </Section>

      <T small color={colors.faint}>{`Since the game started on Day 1. "Now" figures (crew, districts, heat) read live state; everything else is a lifetime total.`}</T>
    </Screen>
  )
}
