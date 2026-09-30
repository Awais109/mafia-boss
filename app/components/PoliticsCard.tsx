import { electionScheduled, ministryTarget, opinionTarget, pointCost, pointsRoom, voteShare, winChance } from '../../engine'
import { fmt, fmtDuration, pct } from '../format'
import { store, type Snapshot } from '../store'
import { Bar, Btn, BtnRow, Card, colors, glyph, Row, T } from './ui'

// Act V (ADR 0044): what the city thinks of you, what Moscow thinks, and the election in between.
export function PoliticsCard({ game }: { game: Snapshot }) {
  const { state: s, derived: d, config: c, now } = game
  const pol = s.politics
  const el = c.elections
  const mi = c.ministry
  const target = opinionTarget(s, c, now)
  const heading = ministryTarget(s, c, d)
  const room = pointsRoom(s, c)
  const dirtyEach = pointCost(s, c, 'dirty')
  const influenceEach = pointCost(s, c, 'influence')
  const step = Math.min(5, room)
  const chance = winChance(s, c)
  return (
    <Card>
      <Row label="Public opinion" hint={`heading for ${Math.round(target)}`} value={String(Math.round(pol.opinion))} color={colors.good} />
      <Bar value={pol.opinion} max={100} color={colors.good} />
      <T small muted>
        {`Control ×${(1 + (c.opinion.controlBonus * pol.opinion) / 100).toFixed(2)}. The Newspaper, the TV Station and the Palace of Culture raise it; so does whatever the Development Fund launders. Inspections and raids knock it back.`}
      </T>
      <Row
        label="The Ministry’s attention"
        hint={`heading for ${Math.round(heading)} · freezes a front at ${mi.freezeAt}`}
        value={String(Math.round(pol.attention))}
        color={pol.attention >= mi.freezeAt - 10 ? colors.heat : colors.warn}
      />
      <Bar value={pol.attention} max={100} color={pol.attention >= mi.freezeAt - 10 ? colors.heat : colors.warn} marks={[mi.freezeAt]} />
      <T small muted>
        {`It grows with what you earn and ignores bribes. At ${mi.freezeAt} Moscow freezes the front moving the most money for ${mi.freezeHours}h. Opinion brings it down; so does the Governor, who only takes calls from the mayor.`}
      </T>
      {pol.mayor ? (
        <T small color={colors.good}>
          {`You’re the mayor. No district pays tribute, district perks count ×${el.mayor.perkMult}, control +${fmt(el.mayor.control)}, and the Governor will take your call.`}
        </T>
      ) : electionScheduled(s) ? (
        <>
          <Row label="Next election" hint="against Golovin" value={fmtDuration(pol.nextElectionAt - now, c)} />
          <Row
            label="Your share"
            hint={`campaign ${pol.points}/${el.maxPoints} points · the count swings ±${pct(el.noise)}`}
            value={pct(voteShare(s, c))}
            color={chance >= 0.5 ? colors.good : colors.heat}
          />
          <T small color={chance >= 0.5 ? colors.good : colors.heat}>{`Chance of winning: ${pct(chance)}`}</T>
          {step > 0 && (
            <BtnRow>
              <Btn
                small
                kind="primary"
                title={`+${step} for ${glyph.dirty}${fmt(step * dirtyEach)}`}
                disabled={s.dirty < step * dirtyEach}
                onPress={() => store.dispatch({ type: 'CAMPAIGN', points: step, pay: 'dirty' })}
              />
              <Btn
                small
                title={`+${step} for ${glyph.influence}${fmt(step * influenceEach)}`}
                disabled={s.influence < step * influenceEach}
                onPress={() => store.dispatch({ type: 'CAMPAIGN', points: step, pay: 'influence' })}
              />
            </BtnRow>
          )}
          <T small color={colors.faint}>
            {`Each point adds ${pct(el.perPoint)} and costs ${el.pointHoursOfYield}h of Dirty yield or ${glyph.influence}${el.influencePerPoint}. Deliver the Vote brings points too. Points are spent at the count, win or lose. Win once and the office is yours for good; if you’re away, nothing is spent for you.`}
          </T>
        </>
      ) : null}
    </Card>
  )
}
