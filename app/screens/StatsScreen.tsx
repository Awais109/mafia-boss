import { StyleSheet, Text, View } from 'react-native'
import { ACTS, DISTRICT_IDS, RANK_NAMES, empireValue, gameCleared, gameDay, type Act } from '../../engine'
import { ACT_NAME, actProgress } from '../acts'
import { colors, glyph, Item, List, PageHead, rich, Screen, Section, SubHead } from '../components/ui'
import { fmt, fmtClock } from '../format'
import { ACT_TITLE, revealedBy } from '../story'
import { fonts } from '../theme'
import type { ScreenProps } from './types'

// Stats (design: Stats): everything tracked since the game started (`state.stats`), as ledgers with a line
// under each figure. No new counters: rows for later acts appear once the story reaches them.
export function StatsScreen({ game }: ScreenProps) {
  const { state: s, config: c, now } = game
  const t = s.stats
  const day = (at: number) => fmtClock(at, s.createdAt, c).split(' · ')[0]
  const jobsRun = t.opOutcomes.full + t.opOutcomes.partial + t.opOutcomes.fail
  const held = s.districts.filter((d) => d.controller === 'player')
  const progress = actProgress(s, c)
  const reached = ACTS.filter((a) => a <= s.act)
  const openedAt = (a: Act) => (a === 1 ? s.createdAt : t.actClearedAt[(a - 1) as Act])
  const goldSpent = t.gold.spentSkip + t.gold.spentRush
  const costs = [
    { label: 'Wages', hint: t.missedWages ? `${t.missedWages} payday${t.missedWages === 1 ? '' : 's'} missed` : `${s.crew.length} on the books now`, value: t.wagesPaid, bad: t.missedWages > 0 },
    { label: 'Upkeep', hint: t.missedUpkeep ? `${t.missedUpkeep} day${t.missedUpkeep === 1 ? '' : 's'} missed` : 'premises only; businesses pay none', value: t.upkeepPaid, bad: t.missedUpkeep > 0 },
    { label: 'Repairs', hint: 'wear and tear, and what got broken', value: t.repairsPaid },
    { label: 'Bribes', value: t.bribesPaid },
    { label: 'Training', value: t.trainingPaid },
    { label: 'Tribute', hint: 'skimmed where others hold the street, and Tolya', value: t.tributeLost },
    { label: 'Seized', hint: t.raids ? `${t.raids} raid${t.raids === 1 ? '' : 's'}` : 'never raided', value: t.seized, bad: t.seized > 0 },
  ]
  const costTotal = costs.reduce((sum, x) => sum + x.value, 0)

  return (
    <Screen>
      <PageHead title="Stats" note="The lifetime record · since Day 1" />

      <Section title="Playtime & progress">
        <List>
          <Item label="Day" hint={`Started on ${fmtClock(s.createdAt, s.createdAt, c).replace(' · ', ' at ')}`} value={String(gameDay(c, s, now))} />
          <Item label="Act" hint={`${ACT_TITLE[s.act]}${gameCleared(s, c) ? ', cleared' : ''}`} value={ACT_NAME[s.act]} />
          <Item label="Reputation" hint={progress.cleared ? 'nothing left to open' : progress.note.replace(/^\/ /, '')} value={`${glyph.rep}${fmt(s.reputation)}`} color={colors.rep} />
          <Item label="Sessions" hint={`${fmt(t.actions)} actions taken`} value={fmt(t.sessions)} />
          <SubHead>Act milestones</SubHead>
          {reached.map((a) => {
            const at = openedAt(a)
            const districts = revealedBy(c, a, DISTRICT_IDS).map((id) => c.districts.list[id].name)
            return <Item key={a} label={`Act ${ACT_NAME[a]} · ${ACT_TITLE[a]}`} hint={districts.join(', ') || undefined} value={at !== undefined ? day(at) : '—'} />
          })}
          {gameCleared(s, c) && t.actClearedAt[s.act] !== undefined && <Item label={`Act ${ACT_NAME[s.act]} cleared`} value={day(t.actClearedAt[s.act]!)} color={colors.good} />}
        </List>
      </Section>

      {gameCleared(s, c) && (
        <Section title="After the story">
          <List>
            <Item label="Empire value" hint={`best ${fmt(Math.max(s.after.best, empireValue(s, c, game.derived).total))}${t.after.bests ? ` · ${t.after.bests} new best${t.after.bests === 1 ? '' : 's'}` : ''}`} value={fmt(empireValue(s, c, game.derived).total)} />
            <Item label="Contracts done" hint={`${glyph.clean}${fmt(t.after.contractClean)} · ${glyph.gold}${fmt(t.after.contractGold)}`} value={fmt(t.after.contracts)} />
            <Item label="Tiers past the book" value={fmt(t.after.pastBook)} />
          </List>
        </Section>
      )}

      <Section title="Money" right="lifetime">
        <List>
          <Item label="Earned" hint={`businesses ${fmt(t.dirtyEarned - t.jobDirty)} · jobs ${fmt(t.jobDirty)}`} value={`${glyph.dirty}${fmt(t.dirtyEarned)}`} color={colors.dirty} />
          <Item label="Lost to a full vault" hint="what the businesses made with nowhere to put it" value={`${glyph.dirty}${fmt(t.dirtyLostToCap)}`} plain />
          <Item label="Clean earned" hint={t.legalClean ? `${glyph.clean}${fmt(t.legalClean)} of it from legal businesses` : 'laundered through fronts'} value={`${glyph.clean}${fmt(t.cleanEarned)}`} color={colors.clean} />
          <Item label="Spent" hint="businesses, upgrades, crew and turf" value={`${glyph.clean}${fmt(t.cleanSpent)}`} plain />
          <Item label="Gold earned" value={`${glyph.gold}${fmt(t.gold.granted)}`} color={colors.gold} />
          <Item label="Gold spent" hint={`${fmt(t.gold.hoursSkipped)}h skipped · ${fmt(t.gold.spentRush)} on jobs finished early`} value={`${glyph.gold}${fmt(goldSpent)}`} plain />
          <SubHead>Costs and losses</SubHead>
          {costs.map((x) => (
            <Item key={x.label} label={x.label} hint={x.hint} value={`${glyph.dirty}${fmt(x.value)}`} color={x.bad ? colors.bad : undefined} plain={!x.bad} />
          ))}
          <View style={styles.totals}>
            <View style={styles.total}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{rich(`${glyph.dirty}${fmt(costTotal)}`, 17, { plain: true })}</Text>
            </View>
            <View style={styles.doubleRule} />
          </View>
        </List>
      </Section>

      <Section title="Crew & jobs" right={s.crew.length ? `${s.crew.length} on the books` : undefined}>
        <List>
          <Item label="Jobs sent" value={fmt(jobsRun)}>
            {jobsRun > 0 && (
              <>
                <View style={styles.outcomes}>
                  <View style={{ flex: t.opOutcomes.full, backgroundColor: colors.good }} />
                  <View style={{ flex: t.opOutcomes.partial, backgroundColor: colors.accent }} />
                  <View style={{ flex: t.opOutcomes.fail, backgroundColor: '#9a3a2c' }} />
                </View>
                <View style={styles.outcomeLabels}>
                  <Text style={styles.small}>{`clean ${t.opOutcomes.full}`}</Text>
                  <Text style={styles.small}>{`partial ${t.opOutcomes.partial}`}</Text>
                  <Text style={styles.small}>{`failed ${t.opOutcomes.fail}`}</Text>
                </View>
              </>
            )}
          </Item>
          <Item
            label="By rank now"
            hint={RANK_NAMES.map((name, i) => ({ name, n: s.crew.filter((m) => m.rank === i).length })).filter((r) => r.n > 0).map((r) => `${r.n} ${r.name}`).join(' · ') || 'nobody yet'}
            value={String(s.crew.length)}
          />
          <Item label="Stat points gained" hint="from jobs, training and enforcing" value={fmt(t.statPointsGained)} />
          <Item label="Specializations" hint={`${t.specializations.greed} greed · ${t.specializations.stealth} stealth`} value={fmt(t.specializations.greed + t.specializations.stealth)} />
          <Item label="Haggles" hint="with Tolya" value={`${t.haggles.won} of ${t.haggles.won + t.haggles.lost} won`} />
          {t.missions.sent > 0 && <Item label="Boss missions" hint={`${t.missions.won} rematches won · ${t.missions.lost} lost`} value={fmt(t.missions.sent)} />}
          <Item label="Front dial changes" value={fmt(t.frontModeChanges)} />
          <Item label="Walkouts" value={fmt(t.walkouts)} color={t.walkouts > 0 ? colors.bad : undefined} />
          {t.injuries > 0 && <Item label="Injuries" hint={`${t.contests.won} contests won · ${t.contests.lost} lost`} value={fmt(t.injuries)} />}
        </List>
      </Section>

      <Section title="Heat & the law">
        <List>
          <Item label="Raids" hint={t.firstRaidAt !== null ? `the first on ${day(t.firstRaidAt)}` : `heat has stayed under ${c.heat.raidThreshold}`} value={fmt(t.raids)} color={t.raids > 0 ? colors.bad : undefined} />
          <Item label="Arrests" hint={t.arrests ? undefined : `heat has never held at ${c.heat.arrestThreshold}`} value={fmt(t.arrests)} color={t.arrests > 0 ? colors.bad : undefined} />
          <Item label="Decisions" hint={`${t.inbox.resolved} answered · ${t.inbox.auto} left to the default`} value={fmt(t.inbox.filed)} />
          {t.convoys.run > 0 && (
            <Item label="Convoys" hint={`${t.convoys.landed} landed · ${t.convoys.hijacked} taken on the road · ${t.convoys.seized} seized`} value={fmt(t.convoys.run)} color={t.convoys.hijacked + t.convoys.seized > 0 ? colors.warn : undefined} />
          )}
          {t.passagesPaid > 0 && <Item label="Paid for passage" value={`${glyph.dirty}${fmt(t.passagesPaid)}`} plain />}
          {t.elections.held > 0 && (
            <Item
              label="Elections"
              hint={`campaigns ${glyph.dirty}${fmt(t.campaignPaid.dirty)} and ${glyph.influence}${fmt(t.campaignPaid.influence)}`}
              value={`${t.elections.won} won of ${t.elections.held}`}
              color={t.elections.won > 0 ? colors.good : colors.warn}
            />
          )}
          {t.frontsFrozen > 0 && <Item label="Fronts frozen" hint="by the Ministry or a hearing" value={fmt(t.frontsFrozen)} color={colors.bad} />}
          {t.legalized > 0 && <Item label="Businesses made legal" value={fmt(t.legalized)} color={colors.clean} />}
          {t.hearings.held > 0 && <Item label="Hearings" value={`${t.hearings.won} won of ${t.hearings.held}`} />}
          {t.endings.holding !== undefined && <Item label="The Holding" value={day(t.endings.holding)} color={colors.good} />}
          {t.endings.empire !== undefined && <Item label="The Empire" value={day(t.endings.empire)} color={colors.good} />}
        </List>
        <Text style={styles.note}>More rows appear here as the story reaches them.</Text>
      </Section>

      <Section title="Territory & supply">
        <List>
          <Item label="Districts held" hint={held.map((d) => c.districts.list[d.id].name).join(', ')} value={`${held.length} of ${s.districts.length}`} />
          <Item label="Packs made" value={`${glyph.packs}${fmt(t.packsMade)}`} color={colors.packs} />
          <Item label="Packs sold" value={`${glyph.packs}${fmt(t.packsSold)}`} color={colors.packs} />
          <Item label="Packs wasted" hint="made while the stock was full" value={`${glyph.packs}${fmt(t.packsLostToCap)}`} color={colors.packs} />
          <Item label="Shortages" hint="hours the joints ran short" value={`${fmt(t.shortageHours)}h`} color={t.shortageHours > 0 ? colors.warn : undefined} />
          {t.shipmentsPaid > 0 && <Item label="Bought from Zhanna" value={`${glyph.dirty}${fmt(t.shipmentsPaid)}`} plain />}
          {t.surplusSold > 0 && <Item label="Sold to Zhanna" hint="the surplus" value={`${glyph.dirty}${fmt(t.surplusSold)}`} color={colors.dirty} />}
          {t.premiumSold > 0 && <Item label="Premium sold" hint={`${fmt(t.premiumMade)} made`} value={`${glyph.premium}${fmt(t.premiumSold)}`} color={colors.premium} />}
        </List>
      </Section>
    </Screen>
  )
}

const styles = StyleSheet.create({
  totals: { marginHorizontal: 14, marginTop: 4, marginBottom: 10, borderTopWidth: 1, borderTopColor: colors.rule, paddingTop: 6 },
  total: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 32 },
  totalLabel: { fontFamily: fonts.text600, fontSize: 14, color: colors.text },
  totalValue: { fontFamily: fonts.text600, fontSize: 17, color: colors.text, fontVariant: ['tabular-nums'] },
  doubleRule: { height: 4, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.rule, marginTop: 6 },
  outcomes: { flexDirection: 'row', height: 8, borderRadius: 1, overflow: 'hidden' },
  outcomeLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  small: { fontFamily: fonts.text400, fontSize: 12, color: colors.muted },
  note: { fontFamily: fonts.text400, fontSize: 12, color: colors.faint },
})
