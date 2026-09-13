import { useState } from 'react'
import { View } from 'react-native'
import { baseWage, effectiveStat, formulas, RANK_NAMES, STATS, type Config, type CrewMember, type TraitId } from '../../engine'
import { Bar, Btn, BtnRow, Card, colors, Row, Screen, Section, T, Tag } from '../components/ui'
import { fmt, fmtDuration, fmtRate } from '../format'
import { store } from '../store'
import type { ScreenProps } from './types'

const STAT_LABEL = { muscle: 'Muscle', brains: 'Brains', nerve: 'Nerve' } as const

function traitText(c: Config, t: TraitId): string {
  const tr = c.crew.traits
  if (t === 'exArmy') return `ex-army: +${tr.exArmy.muscleBonus} Muscle`
  if (t === 'gambler') return `gambler: +${tr.gambler.nerveBonus} Nerve, wage ×${tr.gambler.wageMult}`
  return `drinks: wage ×${tr.alcoholic.wageMult}, −0–${tr.alcoholic.randomPenalty} on jobs`
}

// Each stat against its ceiling; for your own crew, the XP toward the next point.
function Stats({ c, m, growth }: { c: Config; m: CrewMember; growth?: boolean }) {
  return (
    <View style={{ gap: 3 }}>
      {STATS.map((stat) => {
        const eff = effectiveStat(c, m, stat)
        const capped = m[stat] >= m.potential[stat]
        const cost = formulas.statPointCost(c, m[stat])
        const bonus = eff !== m[stat] ? ` (+${eff - m[stat]})` : ''
        const xp = growth ? (capped ? ' · at its ceiling' : ` · ${fmt(m.xp[stat])}/${fmt(cost)} XP`) : ''
        return (
          <View key={stat} style={{ gap: 2 }}>
            <T small>{`${STAT_LABEL[stat]} ${eff}${bonus} of ${m.potential[stat]}${xp}`}</T>
            {growth && !capped && <Bar value={m.xp[stat]} max={cost} color={colors.accent} />}
          </View>
        )
      })}
    </View>
  )
}

export function CrewScreen({ game }: ScreenProps) {
  const { state: s, derived: d, config: c, now } = game
  const [assigning, setAssigning] = useState<string | null>(null)
  const [firing, setFiring] = useState<string | null>(null)
  const slotsFree = d.crewSlots - s.crew.length
  const low = c.crew.loyalty.lowThreshold

  const status = (m: CrewMember): { text: string; color: string } => {
    switch (m.status) {
      case 'idle':
        return { text: 'idle', color: colors.dirty }
      case 'on_op': {
        const op = s.ops.find((o) => o.id === m.assignedTo)
        return { text: op ? `${c.ops.list[op.type].name} · ${fmtDuration(op.completesAt - now, c)}` : 'on a job', color: colors.muted }
      }
      case 'enforcer': {
        const r = s.rackets.find((x) => x.id === m.assignedTo)
        return { text: `minding the ${r ? c.rackets.types[r.type].name : 'racket'}`, color: colors.accent }
      }
      case 'jailed':
        return { text: `jailed · out in ${fmtDuration((m.jailedUntil ?? now) - now, c)}`, color: colors.heat }
    }
  }

  return (
    <Screen>
      <Card>
        <Row label="Crew" value={`${s.crew.length} / ${d.crewSlots}`} />
        <Row label="Wages" hint="paid daily from Dirty" value={`◆${fmtRate(d.wagesPerHr)}`} />
        {d.wageMult !== 1 && <Row label="District discount" value={`×${d.wageMult}`} color={colors.good} />}
        <T small muted>
          Wage = (Muscle + Brains + Nerve) ÷ {c.crew.wageDivisor} per hour. A missed payday costs everyone{' '}
          {Math.abs(c.crew.loyalty.perMissedWageDay)} loyalty; below {low}, people walk.
        </T>
        <T small muted>
          {`Crew grow with work: jobs, training and enforcing earn XP, each stat stops at its ceiling, and ${c.crew.experience.ranks.soldier} and ${c.crew.experience.ranks.made} points earned bring a promotion with a perk. Better stats mean higher wages.`}
        </T>
        {s.crewSlotsBought < c.crew.extraSlotMax && (
          <Btn
            small
            title={`Room for one more: ●${fmt(d.costs.crewSlot)}`}
            disabled={s.clean < d.costs.crewSlot}
            onPress={() => store.dispatch({ type: 'BUY_CREW_SLOT' })}
          />
        )}
      </Card>

      <Section title="Your crew">
        {s.crew.length === 0 && (
          <Card>
            <T small muted>Nobody yet. Hire from the people looking for work below.</T>
          </Card>
        )}
        {s.crew.map((m) => {
          const st = status(m)
          return (
            <Card key={m.id}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <T bold>{m.name}</T>
                <T small color={st.color} style={{ flexShrink: 1, textAlign: 'right' }}>
                  {st.text}
                </T>
              </View>
              <BtnRow>
                <Tag text={RANK_NAMES[m.rank] ?? 'Associate'} color={colors.rep} />
                {m.nephew && <Tag text="your nephew" color={colors.rep} />}
                {m.traits.map((t) => (
                  <Tag key={t} text={traitText(c, t)} color={colors.accent} />
                ))}
                {m.perks.map((p) => (
                  <Tag key={p} text={`${c.crew.experience.perks[p].name}: ${c.crew.experience.perks[p].text}`} color={colors.good} />
                ))}
              </BtnRow>
              <Stats c={c} m={m} growth />
              <Row
                label="Loyalty"
                hint={m.loyalty < low ? 'might walk out' : undefined}
                value={String(Math.round(m.loyalty))}
                color={m.loyalty < low ? colors.heat : undefined}
              />
              <Bar value={m.loyalty} max={100} color={m.loyalty < low ? colors.heat : colors.good} marks={[low]} />
              <Row label="Wage" value={`◆${fmtRate(baseWage(c, m) * d.wageMult)}`} />
              <BtnRow>
                <Btn
                  small
                  title={`Raise ●${fmt(d.costs.raise)} (+${c.crew.loyalty.perRaise})`}
                  disabled={s.clean < d.costs.raise || m.loyalty >= 100}
                  onPress={() => store.dispatch({ type: 'RAISE', crewId: m.id })}
                />
                {m.status === 'enforcer' && (
                  <Btn small title="Stop enforcing" onPress={() => store.dispatch({ type: 'ASSIGN_ENFORCER', crewId: m.id, racketId: null })} />
                )}
                {m.status === 'idle' && <Btn small title="Enforcer…" onPress={() => setAssigning(assigning === m.id ? null : m.id)} />}
                {!m.nephew && m.status !== 'on_op' &&
                  (firing === m.id ? (
                    <Btn
                      small
                      kind="danger"
                      title="Confirm: fire"
                      onPress={() => {
                        store.dispatch({ type: 'FIRE', crewId: m.id })
                        setFiring(null)
                      }}
                    />
                  ) : (
                    <Btn small kind="ghost" title="Fire" onPress={() => setFiring(m.id)} />
                  ))}
              </BtnRow>
              {assigning === m.id && (
                <View style={{ gap: 6 }}>
                  <T small muted>
                    An enforcer minds one racket: yield ×{c.rackets.enforcer.yieldMult}, heat ×{c.rackets.enforcer.heatMult}. They can’t work jobs.
                  </T>
                  <BtnRow>
                    {s.rackets
                      .map((r, i) => ({ r, rd: d.perRacket[i] }))
                      .filter(({ r, rd }) => !r.enforcerId && rd.kind !== 'premises')
                      .map(({ r, rd }) => (
                        <Btn
                          key={r.id}
                          small
                          title={`${c.rackets.types[r.type].name} T${r.tier} · ◆${fmt(rd.yield)}/h`}
                          onPress={() => {
                            store.dispatch({ type: 'ASSIGN_ENFORCER', crewId: m.id, racketId: r.id })
                            setAssigning(null)
                          }}
                        />
                      ))}
                  </BtnRow>
                </View>
              )}
            </Card>
          )
        })}
      </Section>

      <Section title="Looking for work" right={<T small muted>{`new faces in ${fmtDuration(s.recruitPool.refreshAt - now, c)}`}</T>}>
        {s.recruitPool.candidates.length === 0 && (
          <Card>
            <T small muted>Nobody right now.</T>
          </Card>
        )}
        {s.recruitPool.candidates.map((m) => (
          <Card key={m.id}>
            <T bold>{m.name}</T>
            {m.traits.length > 0 && (
              <BtnRow>
                {m.traits.map((t) => (
                  <Tag key={t} text={traitText(c, t)} color={colors.accent} />
                ))}
              </BtnRow>
            )}
            <Stats c={c} m={m} />
            <Row label="Wage" value={`◆${fmtRate(baseWage(c, m) * d.wageMult)}`} />
            <Btn
              small
              kind="primary"
              title={slotsFree > 0 ? `Recruit ●${fmt(d.costs.recruit)}` : 'No free slot'}
              disabled={slotsFree <= 0 || s.clean < d.costs.recruit}
              onPress={() => store.dispatch({ type: 'RECRUIT', candidateId: m.id })}
            />
          </Card>
        ))}
      </Section>
    </Screen>
  )
}
