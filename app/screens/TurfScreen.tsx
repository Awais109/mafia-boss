import { useState } from 'react'
import { View } from 'react-native'
import { DISTRICT_IDS, prosperityOn, prosperityTarget, tolyaHostile, tolyaIntervalHours, type DistrictId, type RacketType } from '../../engine'
import { ACT_NAME } from '../acts'
import { CityMap } from '../components/CityMap'
import { ColonelCard } from '../components/ColonelCard'
import { PoliticsCard } from '../components/PoliticsCard'
import { ReckoningCard } from '../components/ReckoningCard'
import { TributeCard } from '../components/TributeCard'
import { ZhannaCard } from '../components/ZhannaCard'
import { Btn, BtnRow, Card, colors, Row, Screen, Section, T, Tag } from '../components/ui'
import { fmt, fmtDuration, fmtRate, pct } from '../format'
import { store } from '../store'
import { DISTRICT_STORY, revealed, tolyaMood } from '../story'
import type { ScreenProps } from './types'

const CONTROLLER = { player: 'yours', tolya: 'Tolya’s', zhanna: 'Zhanna’s', colonel: 'the Colonel’s', state: 'the state’s', none: 'nobody’s' } as const

export function TurfScreen({ game, go }: ScreenProps) {
  const { state: s, config: c, now } = game
  const tol = s.rival.tolya
  const hostile = tolyaHostile(s, c)
  const mood = tolyaMood(s, c)
  const [selected, setSelected] = useState<DistrictId | null>(null)
  const home = DISTRICT_IDS.find((id) => c.districts.list[id].home)!
  const picked = selected ?? home

  return (
    <Screen>
      <Section title="The map">
        <CityMap game={game} selected={picked} onSelect={setSelected} />
        <DistrictCard game={game} go={go} id={picked} />
        {revealed(s, c, picked) && (
          <Card>
            <T small style={{ fontStyle: 'italic' }}>{DISTRICT_STORY[picked].reveal}</T>
            <T small color={colors.faint}>{`Shown to you by ${DISTRICT_STORY[picked].by}.`}</T>
          </Card>
        )}
      </Section>

      <Section title="Tolya">
        <TributeCard game={game} />
        <Card>
          <T small muted>
            The old boss of these streets. Every few hours he sends his boys: to break something, to ask for a cut, or just to be seen.
          </T>
          <Row label="Mood" hint={`disposition ${fmt(tol.disposition)}`} value={mood} color={hostile ? colors.heat : tol.disposition < 0 ? colors.warn : colors.good} />
          <Row label="Next visit" hint={`every ${fmt(tolyaIntervalHours(s, c))}h`} value={fmtDuration(tol.nextTickAt - now, c)} />
          {tol.demand === null && <T small muted>No demands right now.</T>}
          <T small color={colors.faint}>
            Paying keeps him sweet. Pressuring or buying his turf sours him; below {c.rivals.tolya.hostileBelow} he visits more often.
          </T>
        </Card>
      </Section>

      {s.act >= 2 && (
        <Section title="Zhanna">
          <ZhannaCard game={game} />
        </Section>
      )}

      {s.act >= c.reckoning.fromAct && (
        <Section title="The reckoning">
          <ReckoningCard game={game} />
        </Section>
      )}

      {s.act >= c.opinion.fromAct && (
        <Section title="Politics">
          <PoliticsCard game={game} />
        </Section>
      )}

      {s.act >= c.premium.fromAct && (
        <Section title="The Colonel">
          <ColonelCard game={game} />
        </Section>
      )}
    </Screen>
  )
}

// One district, as the map shows it when you tap it: who holds it, what it hosts and what it's worth.
function DistrictCard({ game, go, id }: ScreenProps & { id: DistrictId }) {
  const { state: s, derived: d, config: c, now } = game
  const story = DISTRICT_STORY[id]
  if (!revealed(s, c, id)) {
    return (
      <Card>
        <T bold color={colors.faint}>A page you can’t read yet</T>
        <T small muted style={{ fontStyle: 'italic' }}>{`Lyosha’s note: ${story.fragment}`}</T>
        <T small color={colors.faint}>Someone will show it to you.</T>
      </Card>
    )
  }
  const dc = c.districts.list[id]
  const district = s.districts.find((x) => x.id === id)!
  const ours = district.controller === 'player'
  const count = s.rackets.filter((r) => r.districtId === id && c.rackets.types[r.type].kind !== 'premises').length
  const lotsUsed = s.rackets.filter((r) => r.districtId === id && c.rackets.types[r.type].kind === 'premises').length
  const tributeHere = d.perRacket.reduce((sum, rd, i) => (s.rackets[i].districtId === id ? sum + rd.tribute : sum), 0)
  const perks = [
    ...Object.entries(dc.mod.yieldMult ?? {}).map(([t, m]) => `${c.rackets.types[t as RacketType].name} yield ×${m}`),
    dc.mod.wageMult ? `crew wages ×${dc.mod.wageMult}` : '',
    dc.home ? '' : `control +${pct(c.heat.districtControlPct)}`,
  ].filter(Boolean)
  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <T bold>{dc.name}</T>
        <Tag text={dc.home ? 'home turf' : CONTROLLER[district.controller]} color={ours ? colors.good : colors.muted} />
      </View>
      {!d.unlocked.district[id] ? (
        <T small muted>{`Opens in Act ${ACT_NAME[dc.act]}.`}</T>
      ) : (
        <>
          {prosperityOn(s, c) && (
            <Row
              label="Prosperity"
              hint={`heading for ${Math.round(prosperityTarget(s, c, id, now))}`}
              value={String(Math.round(district.prosperity))}
              color={colors.good}
            />
          )}
          <T small muted>
            {dc.allows.length
              ? `Hosts ${dc.allows.map((t) => c.rackets.types[t].name).join(', ')} · ${count}/${dc.allows.length} running · premises lots ${lotsUsed}/${dc.premisesLots}`
              : `Nothing earns here · ${dc.lotsFor?.map((t) => c.rackets.types[t].name).join(', ') ?? 'premises'} lots ${lotsUsed}/${dc.premisesLots}`}
          </T>
          {dc.auction && !ours && <T small color={colors.warn}>A state asset: it sells at auction, can’t be pressured, and nothing goes in until it’s yours.</T>}
          {!ours && dc.tribute > 0 && (
            <Row label="Tribute" hint={`${pct(dc.tribute)} of yield here`} value={`◆${fmtRate(tributeHere)}`} color={colors.warn} />
          )}
          {perks.length > 0 && (
            <T small>{`${ours ? 'You get' : 'Take it for'}: ${perks.join(' · ')}${ours ? '' : ` · ★${c.reputation.perDistrict}`}`}</T>
          )}
          {!ours && (
            <BtnRow>
              <Btn
                small
                kind="primary"
                title={dc.auction ? `Buy at auction ●${fmt(dc.buyout)}` : `Buy out ●${fmt(dc.buyout)}`}
                disabled={s.clean < dc.buyout}
                onPress={() => store.dispatch({ type: 'BUY_DISTRICT', districtId: id })}
              />
              {!dc.auction && (
                <Btn small title={`Pressure ${district.pressureCount}/${c.districts.pressureOpsToFlip} → Ops`} onPress={() => go('ops')} />
              )}
            </BtnRow>
          )}
        </>
      )}
    </Card>
  )
}
