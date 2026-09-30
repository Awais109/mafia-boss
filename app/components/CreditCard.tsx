import { StyleSheet, Text, View } from 'react-native'
import { creditOpen, dayMs, defaultChance, lendCap, loanCap, loanDue } from '../../engine'
import { fmt, fmtDuration, pct } from '../format'
import { store, type Snapshot } from '../store'
import { fonts } from '../theme'
import { Btn, colors, glyph, Item, List, rich, Section } from './ui'

// Credit (ADR 0042; design: Fronts · Credit), from Act III: borrow Clean against your laundering, and lend
// Dirty out through a loan desk.
export function CreditCard({ game }: { game: Snapshot }) {
  const { state: s, config: c, now } = game
  if (!creditOpen(s, c)) return null
  const cl = glyph.clean
  const d = glyph.dirty
  const cap = loanCap(s, c)
  const loan = s.loan
  const desk = lendCap(s, c)
  const lendMax = Math.min(desk, Math.floor(s.dirty))
  const cr = c.credit
  const nextMorning = (Math.floor(now / dayMs(c)) + 1) * dayMs(c)
  const due = loan ? loanDue(s, c) : 0
  return (
    <Section title="Credit" right={desk > 0 || s.lending ? 'the lender · the Loan Desk' : 'the lender'}>
      <View style={styles.card}>
        <Text style={styles.head}>Borrowing</Text>
        {loan ? (
          <>
            <List style={styles.flush}>
              <Item label="Owed" hint={`borrowed ${cl}${fmt(loan.principal)}`} value={`${cl}${fmt(loan.owed)}`} color={colors.clean} />
              <Item
                label="Next payment"
                hint={s.clean < due ? 'more than your Clean on hand' : 'each morning, from Clean'}
                value={
                  <Text style={styles.value}>
                    {rich(`${cl}${fmt(due)}`, 15)}
                    <Text style={styles.muted}>{` · in ${fmtDuration(nextMorning - now, c)}`}</Text>
                  </Text>
                }
              />
              <Item
                label="Missed payments"
                hint={`Miss two and the lender takes ${pct(cr.secondMissVaultPct)} of the vault.`}
                value={String(loan.missed)}
                color={loan.missed > 0 ? colors.bad : undefined}
              />
            </List>
            <View style={styles.pad}>
              <Btn title={`Pay it all ${cl}${fmt(loan.owed)}`} disabled={s.clean < loan.owed} onPress={() => store.dispatch({ type: 'REPAY_LOAN', amount: Math.ceil(loan.owed) })} />
              {s.clean >= 1 && s.clean < loan.owed && (
                <Btn title={`Pay what you have ${cl}${fmt(Math.floor(s.clean))}`} onPress={() => store.dispatch({ type: 'REPAY_LOAN', amount: Math.floor(s.clean) })} />
              )}
            </View>
          </>
        ) : (
          <View style={styles.pad}>
            <Text style={styles.line}>
              {'They’ll lend up to '}
              <Text style={styles.value}>{rich(`${cl}${fmt(cap)}`, 14)}</Text>
            </Text>
            <View style={styles.row}>
              {(
                [
                  [0.25, 'A quarter'],
                  [0.5, 'A half'],
                  [1, 'All of it'],
                ] as const
              ).map(([share, title]) => {
                const amount = Math.max(1, Math.floor(cap * share))
                return <Btn key={share} small title={title} sub={`${cl}${fmt(amount)}`} disabled={cap < 1} onPress={() => store.dispatch({ type: 'TAKE_LOAN', amount })} style={styles.third} />
              })}
            </View>
            <Text style={styles.note}>
              {`Up to ${cr.maxDaysOfClean} days of your Clean income. ${pct(cr.interestPerDay)} interest a day on what you owe; each morning ${pct(cr.repayPctPerDay)} of the loan plus that interest comes out of Clean. Miss it and the collectors come; miss twice and the lender takes ${pct(cr.secondMissVaultPct)} of the vault.`}
            </Text>
          </View>
        )}

        <View style={styles.rule} />
        <Text style={styles.head}>Lending · the Loan Desk</Text>
        <View style={styles.pad}>
          {desk <= 0 && !s.lending ? (
            <Text style={styles.note}>Build a Loan Desk to lend your Dirty out at interest.</Text>
          ) : s.lending ? (
            <View style={styles.box}>
              <Text style={styles.boxLine}>
                {rich(`${d}${fmt(s.lending.amount)}`, 14)}
                {' back in '}
                <Text style={styles.bold}>{fmtDuration(s.lending.dueAt - now, c)}</Text>
                {' as '}
                {rich(`${d}${fmt(s.lending.amount * (1 + cr.lending.returnPct))}`, 14)}
              </Text>
              <Text style={styles.muted}>{`${pct(defaultChance(s, c))} chance the borrower skips town`}</Text>
            </View>
          ) : (
            <>
              <Text style={styles.note}>{`Put Dirty out for ${cr.lending.termHours} hours at ${pct(cr.lending.returnPct)}. The desk’s street decides how many borrowers skip town: ${pct(defaultChance(s, c))} right now.`}</Text>
              <Btn title={`Lend ${d}${fmt(lendMax)}`} disabled={lendMax < 1} onPress={() => store.dispatch({ type: 'LEND', amount: lendMax })} />
            </>
          )}
        </View>
      </View>
    </Section>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: 6, borderWidth: 1, borderColor: colors.divider, paddingTop: 12 },
  head: { paddingHorizontal: 14, paddingBottom: 4, fontFamily: fonts.text600, fontSize: 11, letterSpacing: 1.3, textTransform: 'uppercase', color: colors.muted },
  flush: { borderWidth: 0, backgroundColor: 'transparent', paddingVertical: 0 },
  pad: { gap: 10, paddingHorizontal: 14, paddingTop: 4, paddingBottom: 14 },
  rule: { height: 1, backgroundColor: colors.cardAlt, marginBottom: 12 },
  line: { fontFamily: fonts.text400, fontSize: 14, color: colors.text },
  value: { fontFamily: fonts.text600, fontSize: 15, color: colors.text },
  bold: { fontFamily: fonts.text600, color: colors.text },
  muted: { fontFamily: fonts.text400, fontSize: 12.5, color: colors.muted },
  note: { fontFamily: fonts.text400, fontSize: 12, lineHeight: 17, color: colors.faint },
  row: { flexDirection: 'row', gap: 8 },
  third: { flex: 1, paddingHorizontal: 4 },
  box: { gap: 3, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 4, backgroundColor: colors.cardAlt },
  boxLine: { fontFamily: fonts.text400, fontSize: 14, color: colors.text },
})
