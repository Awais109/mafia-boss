import { creditOpen, defaultChance, lendCap, loanCap, loanDue } from '../../engine'
import { fmt, fmtDuration, pct } from '../format'
import { store, type Snapshot } from '../store'
import { Btn, BtnRow, Card, colors, glyph, Row, T } from './ui'

// Credit (ADR 0042), from Act III: borrow Clean against your laundering, lend Dirty out through a loan desk.
export function CreditCard({ game }: { game: Snapshot }) {
  const { state: s, config: c, now } = game
  if (!creditOpen(s, c)) return null
  const cl = glyph.clean
  const d = glyph.dirty
  const cap = loanCap(s, c)
  const loan = s.loan
  const lendMax = Math.min(lendCap(s, c), Math.floor(s.dirty))
  const cr = c.credit
  return (
    <>
      <Card>
        <T bold>Borrowing</T>
        <T small muted>
          {`Borrow Clean now against what you'll launder: up to ${cr.maxDaysOfClean} days of your Clean income. ${pct(cr.interestPerDay)} interest a day on what you owe, and each morning ${pct(cr.repayPctPerDay)} of the loan plus that interest comes out of Clean. Miss it and the collectors come; miss twice and the lender takes ${pct(cr.secondMissVaultPct)} of the vault.`}
        </T>
        {loan ? (
          <>
            <Row label="Owed" value={`${cl}${fmt(loan.owed)}`} color={colors.heat} />
            <Row label="Next payment" hint="at the start of the day" value={`${cl}${fmt(loanDue(s, c))}`} color={s.clean < loanDue(s, c) ? colors.heat : undefined} />
            {loan.missed > 0 && <T small color={colors.heat}>{`${loan.missed} payment missed: another and the lender takes from the vault.`}</T>}
            <BtnRow>
              <Btn small kind="primary" title={`Pay it all ${cl}${fmt(loan.owed)}`} disabled={s.clean < loan.owed} onPress={() => store.dispatch({ type: 'REPAY_LOAN', amount: Math.ceil(loan.owed) })} />
              <Btn small title={`Pay ${cl}${fmt(Math.floor(s.clean))}`} disabled={s.clean < 1} onPress={() => store.dispatch({ type: 'REPAY_LOAN', amount: Math.floor(s.clean) })} />
            </BtnRow>
          </>
        ) : (
          <>
            <Row label="They'll lend" value={`up to ${cl}${fmt(cap)}`} />
            <BtnRow>
              {[0.25, 0.5, 1].map((share) => {
                const amount = Math.max(1, Math.floor(cap * share))
                return <Btn key={share} small title={`Borrow ${cl}${fmt(amount)}`} onPress={() => store.dispatch({ type: 'TAKE_LOAN', amount })} />
              })}
            </BtnRow>
          </>
        )}
      </Card>
      <Card>
        <T bold>Lending</T>
        {lendCap(s, c) <= 0 && !s.lending ? (
          <T small muted>Build a Loan Desk to lend your Dirty out at interest.</T>
        ) : s.lending ? (
          <>
            <Row label="Out" hint={`back in ${fmtDuration(s.lending.dueAt - now, c)}`} value={`${d}${fmt(s.lending.amount)}`} color={colors.dirty} />
            <Row label="Comes back as" value={`${d}${fmt(s.lending.amount * (1 + cr.lending.returnPct))}`} />
            <Row label="Chance they skip town" value={pct(defaultChance(s, c))} color={colors.warn} />
          </>
        ) : (
          <>
            <T small muted>
              {`Put Dirty out for ${cr.lending.termHours} hours at ${pct(cr.lending.returnPct)}. The desk's street decides how many borrowers skip town: ${pct(defaultChance(s, c))} right now.`}
            </T>
            <Btn small kind="primary" title={`Lend ${d}${fmt(lendMax)}`} disabled={lendMax < 1} onPress={() => store.dispatch({ type: 'LEND', amount: lendMax })} />
          </>
        )}
      </Card>
    </>
  )
}
