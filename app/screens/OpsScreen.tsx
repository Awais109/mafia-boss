import { useState } from 'react'
import { View } from 'react-native'
import {
  canPressure,
  DISTRICT_IDS,
  effectiveStat,
  influenceRoom,
  opDirtyReward,
  opUnlocked,
  OP_TYPES,
  outcomeOdds,
  STATS,
  type DistrictId,
  type OpType,
} from '../../engine'
import { Btn, BtnRow, Card, colors, Row, Screen, Section, T, Tag } from '../components/ui'
import { fmt, fmtDuration, pct } from '../format'
import { store } from '../store'
import type { ScreenProps } from './types'

const STAT_SHORT = { muscle: 'M', brains: 'B', nerve: 'N' } as const

export function OpsScreen({ game }: ScreenProps) {
  const { state: s, config: c, now } = game
  const [selected, setSelected] = useState<string[]>([])
  const [target, setTarget] = useState<DistrictId | null>(null)
  const idle = s.crew.filter((m) => m.status === 'idle')
  const team = selected.map((id) => idle.find((m) => m.id === id)).filter((m) => m !== undefined)
  const pressurable = DISTRICT_IDS.filter((id) => !canPressure(s, c, id))
  const pressureTarget = target && pressurable.includes(target) ? target : pressurable[0]

  const toggle = (id: string) => setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))
  const start = (type: OpType) => {
    const error = store.dispatch({
      type: 'START_OP',
      opType: type,
      crewIds: team.map((m) => m.id),
      ...(c.ops.list[type].districtPressure && pressureTarget ? { districtId: pressureTarget } : {}),
    })
    if (!error) setSelected([])
  }

  return (
    <Screen>
      {s.ops.length > 0 && (
        <Section title="Out on jobs">
          {s.ops.map((op) => (
            <Card key={op.id}>
              <Row label={c.ops.list[op.type].name} value={fmtDuration(op.completesAt - now, c)} />
              <T small muted>
                {op.crewIds.map((id) => s.crew.find((m) => m.id === id)?.name ?? '?').join(' & ')}
                {op.districtId ? ` · ${c.districts.list[op.districtId].name}` : ''}
              </T>
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

      <Section title="Jobs">
        {OP_TYPES.map((type) => {
          const op = c.ops.list[type]
          if (!opUnlocked(s, c, type)) {
            return (
              <Card key={type}>
                <T bold color={colors.faint}>{op.name}</T>
                <T small color={colors.faint}>Act II</T>
              </Card>
            )
          }
          const ready = team.length === op.crew
          const odds = ready ? outcomeOdds(c, op, team) : null
          const weights = STATS.filter((st) => op.w[st]).map((st) => `${STAT_SHORT[st]} ${pct(op.w[st]!)}`).join(' · ')
          const rewards = [
            op.dirty ? `◆${fmt(opDirtyReward(c, s, type, 'full'))}` : '',
            op.influence ? `✦${op.influence}` : '',
            `★${fmt(c.reputation.perOpSuccess)}`,
          ].filter(Boolean)
          return (
            <Card key={type}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <T bold>{op.name}</T>
                <Tag text={`${fmtDuration((op.minutes / 60) * c.time.hourMs, c)} · ${op.crew} crew`} />
              </View>
              <T small muted>{`Needs ${weights} · difficulty ${op.diff} · +▲${op.spike} heat`}</T>
              <T small>{`Pays ${rewards.join(' ')} on a clean job, ${pct(c.ops.partialRewardPct)} if partial`}</T>
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
              {odds && (
                <T small color={colors.muted}>
                  {`Odds: clean ${pct(odds.full)} · partial ${pct(odds.partial)} · `}
                  <T small color={odds.fail > 0.4 ? colors.heat : colors.muted}>{`fail ${pct(odds.fail)}`}</T>
                </T>
              )}
              <Btn
                small
                kind={ready ? 'primary' : 'normal'}
                title={ready ? 'Send them' : `Select ${op.crew} idle crew`}
                disabled={!ready || (op.districtPressure === true && !pressureTarget)}
                onPress={() => start(type)}
              />
            </Card>
          )
        })}
      </Section>
    </Screen>
  )
}
