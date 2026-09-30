import { StyleSheet, Text, View } from 'react-native'
import { fmt, fmtRate, pct } from '../format'
import type { Snapshot } from '../store'
import { fonts } from '../theme'
import { colors, glyph, Item, List, rich, Strip } from './ui'

// The Dirty/Clean rule as a ledger (ADR 0026; design: Home · Money flow): what comes in, what running the
// operation costs, what the fronts are washing, and what's on hand under a brass rule. Read from `derive`.
export function MoneyFlow({ game }: { game: Snapshot }) {
  const { state: s, derived: d, config: c } = game
  const d$ = glyph.dirty
  const cl = glyph.clean
  const running = d.wagesPerHr + d.upkeepPerHr
  const washing = d.perFront.filter((f) => (s.fronts.find((x) => x.id === f.id)?.buffer ?? 0) > 0 && !f.frozen)
  const washIn = washing.reduce((sum, f) => sum + f.throughput, 0)
  const washOut = washing.reduce((sum, f) => sum + f.throughput * f.rate, 0)
  const reserve = s.wagesOwed + s.upkeepOwed + running * c.fronts.reserveHours
  const short = running > 0 && s.dirty + s.vault < reserve
  const earners = d.perRacket.filter((r) => r.kind !== 'premises')
  const legal = earners.filter((r) => r.legal)
  const intoVault = earners.filter((r) => !r.legal && !r.closed)
  const showVault = d.yieldPerHr > 0 || legal.length < earners.length || earners.length === 0

  const vaultHint = (() => {
    if (!intoVault.length) return 'none yet'
    const joints = intoVault.filter((r) => r.kind === 'joint').length
    const rackets = intoVault.length - joints
    const parts = [joints ? `${joints} joint${joints === 1 ? '' : 's'}` : '', rackets ? `${rackets} racket${rackets === 1 ? '' : 's'}` : ''].filter(Boolean).join(', ')
    const drags = [s.stockEmpty ? 'no cigarettes' : '', s.inspected ? 'inspected' : ''].filter(Boolean).join(', ')
    return drags ? `${parts} · ${drags}` : parts
  })()
  const washHint = (() => {
    if (!s.fronts.length) return 'no front yet'
    if (!washing.length) return `${s.fronts.map((f) => c.fronts.types[f.type].name).join(', ')} · nothing in them`
    if (washing.length === 1) return `${c.fronts.types[s.fronts.find((f) => f.id === washing[0].id)!.type].name} · rate ${pct(washing[0].rate)}`
    return `${washing.length} fronts · ${d$}${fmtRate(washIn)} at ${pct(washIn > 0 ? washOut / washIn : 0)}`
  })()

  return (
    <View style={styles.card}>
      <List style={styles.list}>
        {showVault && <Item label="Businesses into the vault" hint={vaultHint} value={`+${d$}${fmtRate(d.yieldPerHr)}`} color={colors.dirty} />}
        {legal.length > 0 && (
          <Item label="Legal businesses" hint={`${legal.length} of ${earners.length} · Clean direct, after tax`} value={`+${cl}${fmtRate(d.legalCleanPerHr)}`} color={colors.clean} />
        )}
        {legal.length > 0 && (
          <Item label="Tax" hint={`${pct(1 - c.legalize.cleanShare)}, taken before it reaches you`} value={`${cl}${fmtRate(d.legalGrossPerHr * (1 - c.legalize.cleanShare))}`} plain />
        )}
        <Item label="Running costs" hint={running > 0 ? `wages ${fmt(d.wagesPerHr)} · upkeep ${fmt(d.upkeepPerHr)}` : 'no wages, no upkeep'} value={`−${d$}${fmtRate(running)}`} plain />
        <Item label="Fronts washing" hint={washHint} value={`+${cl}${fmtRate(washOut)}`} color={washing.length ? colors.clean : colors.faint} />
      </List>
      <View style={styles.totals}>
        <View style={styles.total}>
          <View style={styles.totalLeft}>
            <Text style={styles.totalLabel}>Dirty on hand</Text>
            {legal.length === earners.length && earners.length > 0 && <Text style={styles.totalHint}>sitting idle · pays the running costs</Text>}
          </View>
          <Text style={[styles.totalValue, { color: colors.dirty }]}>{rich(`${d$}${fmt(s.dirty)}`, 17)}</Text>
        </View>
        <View style={styles.total}>
          <Text style={styles.totalLabel}>Clean on hand</Text>
          <Text style={[styles.totalValue, { color: colors.clean }]}>{rich(`${cl}${fmt(s.clean)}`, 17)}</Text>
        </View>
        <View style={styles.doubleRule} />
        {short && <Strip>{`Dirty on hand won’t cover what’s owed plus ${c.fronts.reserveHours}h of running costs (${d$}${fmt(reserve)}). Keep some back when you launder.`}</Strip>}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: 6, borderWidth: 1, borderColor: colors.divider, paddingTop: 2, paddingBottom: 12 },
  list: { borderWidth: 0, backgroundColor: 'transparent', paddingVertical: 0 },
  totals: { marginHorizontal: 14, marginTop: 4, borderTopWidth: 1, borderTopColor: colors.rule, paddingTop: 6, gap: 2 },
  total: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 32 },
  totalLeft: { flexShrink: 1, gap: 1 },
  totalLabel: { fontFamily: fonts.text600, fontSize: 14, color: colors.text },
  totalHint: { fontFamily: fonts.text400, fontSize: 12, color: colors.muted },
  totalValue: { fontFamily: fonts.text600, fontSize: 17, fontVariant: ['tabular-nums'] },
  doubleRule: { height: 4, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.rule, marginTop: 6, marginBottom: 4 },
})
