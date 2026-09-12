import { useState } from 'react'
import { View } from 'react-native'
import {
  canPressure,
  DISTRICT_IDS,
  effectiveStat,
  influenceRoom,
  jobXp,
  opDirtyRewardFor,
  opConfigAt,
  opMinutesFor,
  opUnlocked,
  OP_TYPES,
  outcomeOdds,
  rushCost,
  STATS,
  type CrewMember,
  type DistrictId,
  type Offer,
  type OpConfig,
  type OpType,
} from '../../engine'
import { Btn, BtnRow, Card, colors, glyph, Row, Screen, Section, T, Tag } from '../components/ui'
import { fmt, fmtDuration, pct } from '../format'
import { store, type Snapshot } from '../store'
import type { ScreenProps } from './types'

const STAT_SHORT = { muscle: 'M', brains: 'B', nerve: 'N' } as const
const STAT_LONG = { muscle: 'Muscle', brains: 'Brains', nerve: 'Nerve' } as const

export function OpsScreen({ game }: ScreenProps) {
  const { state: s, config: c, now } = game
  const [selected, setSelected] = useState<string[]>([])
  const [target, setTarget] = useState<DistrictId | null>(null)
  const idle = s.crew.filter((m) => m.status === 'idle')
  const team = selected.map((id) => idle.find((m) => m.id === id)).filter((m) => m !== undefined)
  const pressurable = DISTRICT_IDS.filter((id) => !canPressure(s, c, id))
  const pressureTarget = target && pressurable.includes(target) ? target : pressurable[0]
  const board = s.offers.items.filter((o) => o.expiresAt > now && opUnlocked(s, c, o.opType))

  const toggle = (id: string) => setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))
  const start = (type: OpType, cfg: OpConfig, offerId?: string) => {
    const error = store.dispatch({
      type: 'START_OP',
      opType: type,
      crewIds: team.map((m) => m.id),
      ...(cfg.districtPressure && pressureTarget ? { districtId: pressureTarget } : {}),
      ...(offerId ? { offerId } : {}),
    })
    if (!error) setSelected([])
  }

  return (
    <Screen>
      {s.ops.length > 0 && (
        <Section title="Out on jobs">
          {s.ops.map((op) => (
            <Card key={op.id}>
              <Row label={op.name ?? c.ops.list[op.type].name} value={fmtDuration(op.completesAt - now, c)} />
              <T small muted>
                {op.crewIds.map((id) => s.crew.find((m) => m.id === id)?.name ?? '?').join(' & ')}
                {op.districtId ? ` · ${c.districts.list[op.districtId].name}` : ''}
              </T>
              <Btn
                small
                title={`Finish now ${glyph.gold}${rushCost(c, op.completesAt - now)}`}
                disabled={s.gold < rushCost(c, op.completesAt - now)}
                onPress={() => store.dispatch({ type: 'RUSH_OP', opId: op.id })}
              />
            </Card>
          ))}
        </Section>
      )}

      <Section title="Pick your crew" right={<T small muted>{`✦ today: ${fmt(c.ops.influenceDailyCap - influenceRoom(s, c, now))}/${c.ops.influenceDailyCap}`}</T>}>
        <Card>
          {idle.length === 0 && <T small muted>Nobody is free right now.</T>}
          <BtnRow>
            {idle.map((m) => (
              <Btn
                key={m.id}
                small
                kind={selected.includes(m.id) ? 'primary' : 'normal'}
                title={`${m.name} · ${STATS.map((st) => `${STAT_SHORT[st]}${effectiveStat(c, m, st)}`).join(' ')}`}
                onPress={() => toggle(m.id)}
              />
            ))}
          </BtnRow>
          <T small muted>A job uses the best stat on the team; each extra body adds +{c.ops.teamBonusPerExtra}.</T>
        </Card>
      </Section>

      <Section title="On the board" right={<T small muted>{`new work in ${fmtDuration(s.offers.refreshAt - now, c)}`}</T>}>
        {board.length === 0 && (
          <Card>
            <T small muted>Nothing on offer right now.</T>
          </Card>
        )}
        {board.map((offer) => (
          <JobCard key={offer.id} game={game} type={offer.opType} cfg={offer.cfg} team={team} offer={offer} onStart={start} />
        ))}
      </Section>

      <Section title="Training" right={<T small muted>no roll, no heat, no report</T>}>
        {OP_TYPES.filter((type) => c.ops.list[type].training).map((type) => (
          <JobCard key={type} game={game} type={type} cfg={c.ops.list[type]} team={team} onStart={start} />
        ))}
      </Section>

      <Section title="Jobs">
        {OP_TYPES.filter((type) => !c.ops.list[type].training).map((type) => {
          const op = c.ops.list[type]
          if (!opUnlocked(s, c, type)) {
            return (
              <Card key={type}>
                <T bold color={colors.faint}>{op.name}</T>
                <T small color={colors.faint}>Act II</T>
              </Card>
            )
          }
          return (
            <JobCard key={type} game={game} type={type} cfg={op} team={team} onStart={start}>
              {op.districtPressure && (
                <BtnRow>
                  {pressurable.length === 0 && <T small muted>No district left to pressure.</T>}
                  {pressurable.map((id) => {
                    const district = s.districts.find((x) => x.id === id)!
                    return (
                      <Btn
                        key={id}
                        small
                        kind={pressureTarget === id ? 'primary' : 'ghost'}
                        title={`${c.districts.list[id].name} ${district.pressureCount}/${c.districts.pressureOpsToFlip}`}
                        onPress={() => setTarget(id)}
                      />
                    )
                  })}
                </BtnRow>
              )}
            </JobCard>
          )
        })}
      </Section>
    </Screen>
  )
}

function JobCard({
  game,
  type,
  cfg,
  team,
  offer,
  onStart,
  children,
}: {
  game: Snapshot
  type: OpType
  cfg: OpConfig
  team: CrewMember[]
  offer?: Offer
  onStart: (type: OpType, cfg: OpConfig, offerId?: string) => void
  children?: React.ReactNode
}) {
  const { state: s, config: c, now } = game
  const ready = team.length === cfg.crew
  const training = cfg.training
  const live = opConfigAt(c, s, cfg) // smuggling gets harder with heat
  const odds = ready && !training ? outcomeOdds(c, live, team) : null
  const weights = STATS.filter((st) => cfg.w[st]).map((st) => `${STAT_SHORT[st]} ${pct(cfg.w[st]!)}`).join(' · ')
  const rewards = [
    cfg.dirty ? `◆${fmt(opDirtyRewardFor(c, s, cfg, 'full', ready ? team : []))}` : '',
    cfg.influence ? `✦${cfg.influence}` : '',
    cfg.cigarettes ? `▮${cfg.cigarettes}` : '',
    `★${fmt(c.reputation.perOpSuccess)}`,
  ].filter(Boolean)
  const minutes = opMinutesFor(c, cfg, ready ? team : [])
  const xpLine = ready
    ? team
        .map((m) => {
          const xp = jobXp(c, cfg, 'full', m, team)
          return `${m.name.split(' ')[0]} ${STATS.filter((st) => xp[st]).map((st) => `${STAT_SHORT[st]}+${fmt(xp[st]!)}`).join(' ')}`
        })
        .join(' · ')
    : null
  return (
    <Card style={offer ? { borderColor: colors.accent } : undefined}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <T bold style={{ flexShrink: 1 }}>
          {cfg.name}
        </T>
        <Tag text={`${fmtDuration((minutes / 60) * c.time.hourMs, c)} · ${cfg.crew} crew`} />
      </View>
      {offer && <T small color={colors.accent}>{`${c.ops.list[type].name}, but better paid and harder · gone in ${fmtDuration(offer.expiresAt - now, c)}`}</T>}
      {training ? (
        <T small>{`Costs ◆${fmt((cfg.costDirty ?? 0) * s.act)} · +${fmt(cfg.xp ?? 0)} ${STAT_LONG[training]} XP`}</T>
      ) : (
        <>
          <T small muted>{`Needs ${weights} · difficulty ${live.diff}${live.diff !== cfg.diff ? ` (${cfg.diff} + heat)` : ''} · +▲${fmt(cfg.spike)} heat`}</T>
          {cfg.costClean ? <T small color={colors.clean}>{`Costs ●${fmt(cfg.costClean)} up front: no Rep, and it’s gone if the run fails`}</T> : null}
          <T small>{`Pays ${rewards.join(' ')} on a clean job, ${pct(c.ops.partialRewardPct)} if partial`}</T>
        </>
      )}
      {children}
      {xpLine && !training && <T small color={colors.accent}>{`XP on a clean job: ${xpLine}`}</T>}
      {odds && (
        <T small color={colors.muted}>
          {`Odds: clean ${pct(odds.full)} · partial ${pct(odds.partial)} · `}
          <T small color={odds.fail > 0.4 ? colors.heat : colors.muted}>{`fail ${pct(odds.fail)}`}</T>
        </T>
      )}
      <Btn
        small
        kind={ready ? 'primary' : 'normal'}
        title={ready ? (offer ? 'Take it' : training ? 'Train' : 'Send them') : `Select ${cfg.crew} idle crew`}
        disabled={!ready || (cfg.costClean ?? 0) > s.clean}
        onPress={() => onStart(type, cfg, offer?.id)}
      />
    </Card>
  )
}
