import { StyleSheet, Text, View } from 'react-native'
import { FRONT_MODES, FRONT_TYPES, frontBlocked, type FrontDerived, type FrontMode } from '../../engine'
import { ACT_NAME } from '../acts'
import { CreditCard } from '../components/CreditCard'
import { Glyph, Icon } from '../components/Glyph'
import { Btn, BuyRow, colors, glyph, Item, List, Meter, rich, Screen, Section, Segmented, Tag, Tile } from '../components/ui'
import { fmt, fmtDuration, fmtRate, pct } from '../format'
import { store, type Snapshot } from '../store'
import { fonts } from '../theme'
import type { ScreenProps } from './types'

// Fronts (design: Fronts): what the fronts can wash against what comes in, one button that launders all
// but running costs, then each front with its dial, rate, throughput and buffer, the fronts still to open,
// and credit from Act III.

const MODES = FRONT_MODES.map((key) => ({ key, title: { push: 'Push', normal: 'Normal', layLow: 'Lay low' }[key] }))
const PACE: Record<FrontMode, string> = { push: 'pushed', normal: 'normal pace', layLow: 'laying low' }

export function FrontsScreen({ game }: ScreenProps) {
  const { state: s, derived: d, config: c } = game
  const deposit = (frontId: string, amount: number) => store.dispatch({ type: 'DEPOSIT', frontId, amount })
  // "Launder all but running costs": keep what's already owed plus reserveHours of wages and upkeep in Dirty, wash the rest best rate first.
  const keep = s.wagesOwed + s.upkeepOwed + (d.wagesPerHr + d.upkeepPerHr) * c.fronts.reserveHours
  const plan: { frontId: string; amount: number }[] = []
  {
    let available = Math.floor(s.dirty - keep)
    for (const f of [...d.perFront].sort((a, b) => b.rate - a.rate)) {
      if (f.frozen) continue // the Ministry's (ADR 0044)
      const room = f.bufferCap - (s.fronts.find((x) => x.id === f.id)?.buffer ?? 0)
      const amount = Math.floor(Math.min(available, room))
      if (amount >= 1) {
        plan.push({ frontId: f.id, amount })
        available -= amount
      }
    }
  }
  const planned = plan.reduce((sum, p) => sum + p.amount, 0)
  const washing = d.perFront.filter((f) => !f.frozen && (s.fronts.find((x) => x.id === f.id)?.buffer ?? 0) > 0)
  const frozen = d.perFront.filter((f) => f.frozen).length
  const cleanOut = washing.reduce((sum, f) => sum + f.throughput * f.rate, 0)
  const left = d.yieldPerHr - d.throughputPerHr
  const unopened = FRONT_TYPES.filter((t) => !s.fronts.some((f) => f.type === t))
  const push = c.fronts.modes.push
  const layLow = c.fronts.modes.layLow

  return (
    <Screen>
      <Section title="Laundering" right="per hour">
        <View style={styles.summary}>
          <List style={styles.flush}>
            <Item
              label="Your fronts can launder"
              hint={s.fronts.length ? `${washing.length} of ${s.fronts.length} washing · into ${glyph.clean}${fmtRate(cleanOut)}` : 'no front yet'}
              value={`${glyph.dirty}${fmtRate(d.throughputPerHr)}`}
              color={colors.dirty}
            />
            <Item label="Income" hint="businesses into the vault" value={`+${glyph.dirty}${fmtRate(d.yieldPerHr)}`} color={colors.dirty} />
          </List>
          <View style={styles.totals}>
            <View style={styles.total}>
              <Text style={styles.totalLabel}>{left > 0 ? 'Left unwashed' : 'Room to spare'}</Text>
              <Text style={[styles.totalValue, { color: left > 0 ? colors.warn : colors.good }]}>{rich(`${left > 0 ? '+' : ''}${glyph.dirty}${fmtRate(Math.abs(left))}`, 17, { plain: true })}</Text>
            </View>
            <View style={styles.doubleRule} />
            {left > 0 && (
              <View style={styles.squeeze}>
                <Icon name="warning" size={15} color={colors.warn} />
                <Text style={styles.squeezeText}>{rich(`You make more than your fronts can launder. It piles up: ${glyph.dirty}${fmt(s.dirty)} on hand.`, 13, { mono: colors.warn })}</Text>
              </View>
            )}
          </View>
        </View>
        <Btn
          kind="primary"
          title={planned >= 1 ? `Launder ${glyph.dirty}${fmt(planned)}, keep ${glyph.dirty}${fmt(Math.min(s.dirty, keep))} for costs` : `Nothing to spare: keeping ${glyph.dirty}${fmt(keep)} for costs`}
          disabled={planned < 1}
          onPress={() => plan.forEach((p) => deposit(p.frontId, p.amount))}
          style={styles.launder}
        />
        <Text style={styles.note}>
          {`Keeps what’s owed plus ${c.fronts.reserveHours}h of wages and upkeep in Dirty: they’re paid from Dirty, never Clean. Push washes ×${push.throughputMult} but draws suspicion from ${pct(push.suspicionStartUtil)} running; lay low washes ×${layLow.throughputMult} and draws none. A front running above ${pct(c.fronts.suspicionStartUtil)} for hours draws suspicion.`}
        </Text>
      </Section>

      {s.fronts.length > 0 && (
        <Section
          title={`Fronts · ${s.fronts.length}`}
          right={
            <Text style={styles.sectionNote}>
              {`${washing.length} washing`}
              {frozen ? <Text style={{ color: colors.bad }}>{` · ${frozen} frozen`}</Text> : null}
            </Text>
          }
        >
          {d.perFront.map((f) => (
            <FrontCard key={f.id} game={game} f={f} />
          ))}
        </Section>
      )}

      {unopened.length > 0 && (
        <Section title="Open a front">
          {unopened.map((t) => {
            const ft = c.fronts.types[t]
            const why = !d.unlocked.front[t] ? (ft.act > s.act ? `Opens in Act ${ACT_NAME[ft.act]}` : `Unlocks at ${glyph.rep}${fmt(ft.unlockRep)}`) : frontBlocked(s, c, t)
            const does = [
              `rate ${pct(ft.rate)}`,
              `washes ${glyph.dirty}${fmtRate(ft.throughput)}`,
              ft.coverPerPremiumPack !== undefined ? `up to ${glyph.dirty}${fmt(ft.coverPerPremiumPack)} per premium pack sold` : '',
              ft.opinionAtFullUtil !== undefined ? `up to +${fmt(ft.opinionAtFullUtil)} opinion while it runs full` : '',
              ft.minProsperity !== undefined ? `needs city prosperity ${ft.minProsperity} (now ${Math.round(d.cityProsperity)})` : '',
            ]
              .filter(Boolean)
              .join(' · ')
            return (
              <BuyRow
                key={t}
                name={why ? ft.name : `Open the ${ft.name}`}
                cost={`${glyph.clean}${fmt(ft.cost)}`}
                does={does}
                why={why}
                disabled={s.clean < ft.cost}
                onPress={() => store.dispatch({ type: 'BUY_FRONT', frontType: t })}
              />
            )
          })}
        </Section>
      )}

      <CreditCard game={game} />
    </Screen>
  )
}

function FrontCard({ game, f }: { game: Snapshot; f: FrontDerived }) {
  const { state: s, derived: d, config: c, now } = game
  const front = s.fronts.find((x) => x.id === f.id)!
  const ft = c.fronts.types[f.type]
  const max = Math.floor(Math.min(s.dirty, f.bufferCap - front.buffer))
  const half = Math.floor(max / 2)
  const frozenFor = f.frozen && front.frozenUntil !== undefined ? fmtDuration(front.frozenUntil - now, c) : null
  const cover = ft.coverPerPremiumPack !== undefined ? ft.coverPerPremiumPack * d.premium.soldPerHr : null
  const modeMult = f.mode === 'normal' ? 1 : c.fronts.modes[f.mode].throughputMult
  const coverLimits = cover !== null && cover < f.baseThroughput * modeMult
  const hot = f.util > c.fronts.suspicionStartUtil
  return (
    <View style={[styles.card, f.frozen && styles.cardFrozen]}>
      <View style={styles.head}>
        <View style={styles.headLeft}>
          <Text style={styles.name}>{ft.name}</Text>
          <Text style={styles.sub}>{`rate level ${front.level} · capacity ${front.capacityLevel}`}</Text>
        </View>
        {frozenFor ? <Tag text={`frozen ${frozenFor}`} color={colors.bad} /> : f.suspicion > 0 ? <Tag text="suspicious" color={colors.bad} /> : null}
      </View>

      {frozenFor && (
        <View style={styles.frozen} accessibilityRole="alert">
          <Icon name="frozen" size={16} color={colors.bad} />
          <View style={styles.frozenText}>
            <Text style={styles.frozenTitle}>Frozen by the Ministry</Text>
            <Text style={styles.frozenBody}>{`Launders nothing for ${frozenFor}. No deposits.`}</Text>
            <Text style={styles.frozenWhy}>The Ministry picks your busiest front.</Text>
          </View>
        </View>
      )}
      {f.suspicion > 0 && !frozenFor && <Text style={styles.suspicion}>{rich(`Running hot: +${glyph.heat}${fmt(f.suspicion)} exposure until it cools.`, 12.5, { plain: true })}</Text>}

      <Segmented label={`Pace, ${ft.name}`} options={MODES} value={f.mode} onChange={(mode) => store.dispatch({ type: 'SET_FRONT_MODE', frontId: f.id, mode })} />

      <View style={styles.tiles}>
        <Tile label="Rate" value={pct(f.rate)} sub={`${glyph.dirty}100 → ${glyph.clean}${fmt(f.rate * 100)}`} />
        <Tile
          label="Throughput"
          value={`${glyph.dirty}${fmtRate(f.throughput)}`}
          color={colors.dirty}
          sub={f.frozen ? `was ${glyph.dirty}${fmtRate(f.baseThroughput)}` : f.throughput < f.baseThroughput - 1e-6 || f.mode !== 'normal' ? `of ${glyph.dirty}${fmtRate(f.baseThroughput)}` : 'full speed'}
        />
        <Tile
          label="Running"
          value={pct(f.util)}
          color={f.frozen ? colors.bad : hot ? colors.warn : undefined}
          sub={f.frozen ? 'frozen' : coverLimits ? 'premium’s limit' : PACE[f.mode]}
        />
      </View>

      {cover !== null && (
        <View style={styles.cover}>
          <Glyph kind="premium" size={12} />
          <View style={styles.coverText}>
            <Text style={styles.coverTitle}>It only washes what premium sales explain.</Text>
            <Text style={styles.sub}>{rich(`${glyph.premium}${fmtRate(d.premium.soldPerHr)} sold explains ${glyph.dirty}${fmtRate(cover)}`, 12.5, { plain: true })}</Text>
          </View>
        </View>
      )}

      <View style={styles.buffer}>
        <View style={styles.bufferLine}>
          <Text style={styles.label}>Buffer</Text>
          <Text style={styles.bufferValue}>
            {rich(`${glyph.dirty}${fmt(front.buffer)}`, 14)}
            <Text style={styles.faint}>{` / ${fmt(f.bufferCap)}`}</Text>
            <Text style={styles.sub}>{frozenFor ? ` · held for ${frozenFor}` : front.buffer > 0 ? ` · empty in ${fmtDuration(f.hoursToEmpty * c.time.hourMs, c)}` : ' · idle'}</Text>
          </Text>
        </View>
        <Meter value={front.buffer} max={f.bufferCap} color={f.frozen ? '#6a5634' : colors.dirty} />
      </View>

      <View style={styles.grid}>
        <Btn title={half >= 1 ? `+${glyph.dirty}${fmt(half)} half` : 'Half'} disabled={half < 1 || half >= max || f.frozen} onPress={() => store.dispatch({ type: 'DEPOSIT', frontId: f.id, amount: half })} style={styles.cell} />
        <Btn title={max >= 1 ? `Deposit ${glyph.dirty}${fmt(max)}` : 'Deposit'} disabled={max < 1 || f.frozen} onPress={() => store.dispatch({ type: 'DEPOSIT', frontId: f.id, amount: max })} style={styles.cell} />
        {f.upgradeCost !== null && (
          <Btn
            title={`Rate +${pct(c.fronts.upgrade.rateStep)}`}
            sub={`${glyph.clean}${fmt(f.upgradeCost)}`}
            disabled={s.clean < f.upgradeCost}
            onPress={() => store.dispatch({ type: 'UPGRADE_FRONT', frontId: f.id })}
            style={styles.cell}
          />
        )}
        {f.capacityUpgradeCost !== null && (
          <Btn
            title={`Capacity +${pct(c.fronts.upgrade.capacity.step)}`}
            sub={`${glyph.clean}${fmt(f.capacityUpgradeCost)}`}
            disabled={s.clean < f.capacityUpgradeCost}
            onPress={() => store.dispatch({ type: 'UPGRADE_FRONT', frontId: f.id, track: 'capacity' })}
            style={styles.cell}
          />
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  summary: { backgroundColor: colors.card, borderRadius: 6, borderWidth: 1, borderColor: colors.divider, paddingTop: 2, paddingBottom: 12 },
  flush: { borderWidth: 0, backgroundColor: 'transparent', paddingVertical: 0 },
  totals: { marginHorizontal: 14, marginTop: 4, borderTopWidth: 1, borderTopColor: colors.rule, paddingTop: 6, gap: 2 },
  total: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 32 },
  totalLabel: { fontFamily: fonts.text600, fontSize: 14, color: colors.text },
  totalValue: { fontFamily: fonts.text600, fontSize: 17, fontVariant: ['tabular-nums'] },
  doubleRule: { height: 4, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.rule, marginTop: 6 },
  squeeze: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 10, paddingVertical: 9, paddingHorizontal: 10, borderRadius: 4, backgroundColor: '#2a1f12' },
  squeezeText: { flex: 1, fontFamily: fonts.text400, fontSize: 13, lineHeight: 18, color: colors.warn },
  launder: { minHeight: 52 },
  note: { fontFamily: fonts.text400, fontSize: 12, lineHeight: 17, color: colors.faint },
  sectionNote: { fontFamily: fonts.text400, fontSize: 12, color: colors.muted },
  card: { gap: 12, padding: 14, backgroundColor: colors.card, borderRadius: 6, borderWidth: 1, borderColor: colors.divider },
  cardFrozen: { borderColor: '#5a2a22' },
  head: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  headLeft: { flexShrink: 1, gap: 2 },
  name: { fontFamily: fonts.text600, fontSize: 16, color: colors.text },
  sub: { fontFamily: fonts.text400, fontSize: 12.5, color: colors.muted },
  faint: { fontFamily: fonts.text400, color: colors.faint },
  label: { fontFamily: fonts.text400, fontSize: 14, color: colors.text },
  frozen: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: '#6b3127', borderRadius: 4, backgroundColor: '#2a1712' },
  frozenText: { flex: 1, gap: 2 },
  frozenTitle: { fontFamily: fonts.text600, fontSize: 14, color: colors.bad },
  frozenBody: { fontFamily: fonts.text400, fontSize: 14, color: colors.text },
  frozenWhy: { fontFamily: fonts.text400, fontSize: 12.5, color: colors.muted },
  suspicion: { fontFamily: fonts.text400, fontSize: 12.5, color: colors.bad, marginTop: -4 },
  tiles: { flexDirection: 'row', gap: 8 },
  cover: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 4, backgroundColor: colors.cardAlt },
  coverText: { flex: 1, gap: 2 },
  coverTitle: { fontFamily: fonts.text400, fontSize: 14, color: colors.text },
  buffer: { gap: 8 },
  bufferLine: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  bufferValue: { flexShrink: 1, textAlign: 'right', fontFamily: fonts.text600, fontSize: 14, color: colors.dirty },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: { flexBasis: '47%', flexGrow: 1, minHeight: 44 },
})
