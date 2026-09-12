import { useState } from 'react'
import { View } from 'react-native'
import type { EventType } from '../../engine'
import { Btn, BtnRow, Card, colors, Screen, T } from '../components/ui'
import { describeEvent } from '../eventText'
import { fmtClock } from '../format'
import type { ScreenProps } from './types'

type Filter = 'all' | 'decisions' | 'jobs' | 'heat' | 'turf' | 'money'

const LABEL: Record<Filter, string> = { all: 'All', decisions: 'Decisions', jobs: 'Crew & jobs', heat: 'Heat', turf: 'Turf', money: 'Money' }

const GROUPS: Record<Exclude<Filter, 'all'>, readonly EventType[]> = {
  decisions: ['REPORT_FILED', 'INCIDENT_RAISED', 'INBOX_RESOLVED'],
  jobs: ['OP_STARTED', 'OP_RESOLVED', 'OFFERS_REFRESHED', 'TRAINING_DONE', 'CREW_STAT_UP', 'CREW_RANK_UP', 'PERK_CHOSEN', 'OP_RUSHED','RECRUITED', 'FIRED', 'RAISED', 'CREW_SLOT_BOUGHT', 'POOL_REFRESHED', 'ENFORCER_ASSIGNED', 'ENFORCER_REMOVED', 'WALKOUT', 'RELEASED', 'ARREST', 'WAGES_PAID', 'WAGES_MISSED'],
  heat: ['INSPECTION_STARTED', 'INSPECTION_ENDED', 'RAID', 'ARREST', 'BRIBED', 'BRIBE_EXPIRED', 'OFFICIAL_BOUGHT'],
  turf: ['TOLYA_TICK', 'TRIBUTE_PAID', 'TRIBUTE_HAGGLED', 'TRIBUTE_REFUSED', 'DISTRICT_BOUGHT', 'DISTRICT_PRESSURED', 'DISTRICT_FLIPPED', 'NOTE'],
  money: ['COLLECTED', 'DEPOSITED', 'FRONT_MODE_SET', 'UPKEEP_PAID', 'UPKEEP_MISSED', 'STOCK_OUT', 'STOCK_CAPPED', 'SHORTAGE_STARTED', 'SHORTAGE_ENDED', 'GOLD_GRANTED', 'TIME_SKIPPED', 'RACKET_BOUGHT', 'RACKET_UPGRADED', 'RACKET_REPAIRED', 'FRONT_BOUGHT', 'FRONT_UPGRADED', 'VAULT_CAPPED', 'OFFLINE_CAPPED'],
}

export function LogScreen({ game }: ScreenProps) {
  const { state: s, config: c } = game
  const [filter, setFilter] = useState<Filter>('all')
  const [showQuiet, setShowQuiet] = useState(false)

  const lines = s.log
    .slice()
    .reverse()
    .filter((e) => filter === 'all' || GROUPS[filter].includes(e.type))
    .map((e) => ({ e, line: describeEvent(e, s, c) }))
    .filter(({ line }) => showQuiet || !line.quiet)

  return (
    <Screen>
      <BtnRow>
        {(Object.keys(LABEL) as Filter[]).map((f) => (
          <Btn key={f} small kind={filter === f ? 'primary' : 'ghost'} title={LABEL[f]} onPress={() => setFilter(f)} />
        ))}
        <Btn small kind={showQuiet ? 'primary' : 'ghost'} title="Bookkeeping" onPress={() => setShowQuiet(!showQuiet)} />
      </BtnRow>
      <Card>
        {lines.length === 0 && <T small muted>Nothing here.</T>}
        {lines.map(({ e, line }, i) => (
          <View key={`${e.t}-${i}`} style={{ flexDirection: 'row', gap: 8 }}>
            <T small color={colors.faint}>
              {fmtClock(e.t, s.createdAt, c).replace('Day ', 'D')}
            </T>
            <T small color={line.color} style={{ flex: 1 }}>
              {line.text}
            </T>
          </View>
        ))}
      </Card>
      <T small color={colors.faint}>{`The latest ${s.log.length} events. The full log exports from Debug.`}</T>
    </Screen>
  )
}
