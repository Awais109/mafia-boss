import { View } from 'react-native'
import { DISTRICT_IDS, formulas, openSpots, type DistrictId } from '../../engine'
import { Bar, Btn, BtnRow, Card, colors, Money, Row, Screen, Section, T, Tag } from '../components/ui'
import { fmt, fmtRate, pct } from '../format'
import { store } from '../store'
import type { ScreenProps } from './types'

export function RacketsScreen({ game }: ScreenProps) {
  const { state: s, derived: d, config: c } = game

  const controllerLabel = (id: DistrictId) => {
    const controller = s.districts.find((x) => x.id === id)?.controller
    const dc = c.districts.list[id]
    if (controller === 'player') return dc.home ? 'home turf' : 'yours'
    if (controller === 'none') return 'nobody’s'
    return `${controller === 'tolya' ? 'Tolya' : 'Zhanna'} takes ${pct(dc.tribute)}`
  }

  return (
    <Screen>
      <Card>
        <Row label="Yield" value={<Money kind="dirty" value={fmtRate(d.yieldPerHr)} />} />
        {d.tributePerHr > 0 && <Row label="Lost to tribute" value={`◆${fmtRate(d.tributePerHr)}`} color={colors.warn} />}
        <Row label="Exposure from rackets" value={`▲ ${fmt(d.racketExposure)}`} />
        <Row label="Max tier" value={String(d.maxTier)} />
        <T small muted>
          Each district runs one of each business it allows. Each tier multiplies yield by {c.rackets.tierYieldMult} and heat by{' '}
          {c.rackets.tierHeatMult}: heat always grows faster. {`The upgrade to tier ${c.rackets.specialization.atTier} is a choice: greed (yield ×${c.rackets.specialization.greed.yieldMult}, heat ×${c.rackets.specialization.greed.exposureMult}) or stealth (heat ×${c.rackets.specialization.stealth.exposureMult}).`}
        </T>
      </Card>

      {DISTRICT_IDS.map((id) => {
        const dc = c.districts.list[id]
        if (!d.unlocked.district[id]) {
          return (
            <Section key={id} title={dc.name}>
              <Card>
                <T small muted>Opens in Act II.</T>
              </Card>
            </Section>
          )
        }
        const rackets = s.rackets.map((r, i) => ({ r, rd: d.perRacket[i] })).filter(({ r }) => r.districtId === id)
        const open = openSpots(s, c, id)
        return (
          <Section key={id} title={dc.name} right={<T small muted>{`${controllerLabel(id)} · ${rackets.length}/${dc.allows.length}`}</T>}>
            {rackets.map(({ r, rd }) => {
              const rt = c.rackets.types[r.type]
              const specMult = r.specialization ? c.rackets.specialization[r.specialization] : { yieldMult: 1, exposureMult: 1 }
              const nextYield = (formulas.tierYield(c, r.type, r.tier + 1) - formulas.tierYield(c, r.type, r.tier)) * specMult.yieldMult
              const nextHeat = (formulas.tierHeat(c, r.type, r.tier + 1) - formulas.tierHeat(c, r.type, r.tier)) * specMult.exposureMult
              const choosing = rd.upgradeCost !== null && r.tier + 1 === c.rackets.specialization.atTier
              const enforcer = s.crew.find((m) => m.id === r.enforcerId)
              return (
                <Card key={r.id}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                    <T bold>{`${rt.name} · tier ${r.tier}`}</T>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {r.specialization && <Tag text={r.specialization} color={r.specialization === 'greed' ? colors.warn : colors.influence} />}
                      {enforcer && <Tag text={`enforcer: ${enforcer.name}`} color={colors.accent} />}
                    </View>
                  </View>
                  <Row label="Yield" hint={rd.tribute > 0 ? `−◆${fmt(rd.tribute)} tribute` : undefined} value={<Money kind="dirty" value={fmtRate(rd.yield)} />} />
                  <Row label="Exposure" value={`▲ ${fmt(rd.exposure)}`} />
                  <Row label="Condition" value={`${Math.round(r.condition)}%`} color={r.condition < 60 ? colors.heat : r.condition < 85 ? colors.warn : undefined} />
                  <Bar value={r.condition} max={100} color={r.condition < 60 ? colors.heat : colors.good} />
                  <BtnRow>
                    {rd.upgradeCost === null ? (
                      <Tag text="max tier" />
                    ) : choosing ? (
                      (['greed', 'stealth'] as const).map((choice) => {
                        const m = c.rackets.specialization[choice]
                        const dy = formulas.tierYield(c, r.type, r.tier + 1) * m.yieldMult - formulas.tierYield(c, r.type, r.tier)
                        const dh = formulas.tierHeat(c, r.type, r.tier + 1) * m.exposureMult - formulas.tierHeat(c, r.type, r.tier)
                        const cost = rd.upgradeCost!
                        return (
                          <Btn
                            key={choice}
                            small
                            kind="primary"
                            title={`Tier ${r.tier + 1}, ${choice}: ●${fmt(cost)} (+◆${fmt(dy)}/h, +▲${fmt(dh)})`}
                            disabled={s.clean < cost}
                            onPress={() => store.dispatch({ type: 'UPGRADE_RACKET', racketId: r.id, specialization: choice })}
                          />
                        )
                      })
                    ) : (
                      <Btn
                        small
                        kind="primary"
                        title={`Tier ${r.tier + 1}: ●${fmt(rd.upgradeCost)} (+◆${fmt(nextYield)}/h, +▲${fmt(nextHeat)})`}
                        disabled={s.clean < rd.upgradeCost}
                        onPress={() => store.dispatch({ type: 'UPGRADE_RACKET', racketId: r.id })}
                      />
                    )}
                    {r.condition < 100 && (
                      <Btn
                        small
                        title={`Repair ◆${fmt(rd.repairCost)}`}
                        disabled={s.dirty < rd.repairCost}
                        onPress={() => store.dispatch({ type: 'REPAIR_RACKET', racketId: r.id })}
                      />
                    )}
                  </BtnRow>
                </Card>
              )
            })}
            {open.length > 0 && (
              <Card style={{ backgroundColor: colors.bg }}>
                {open.map((type) => {
                  const rt = c.rackets.types[type]
                  const cost = d.costs.racket[type]
                  if (!d.unlocked.racket[type]) {
                    return (
                      <T key={type} small color={colors.faint}>
                        {rt.name}: {rt.act > s.act ? 'Act II' : `unlocks at ★${fmt(rt.unlockRep)}`}
                      </T>
                    )
                  }
                  return (
                    <Btn
                      key={type}
                      small
                      title={`Open a ${rt.name}: ●${fmt(cost)} (◆${fmt(rt.baseYield)}/h, ▲${fmt(rt.baseHeat)})`}
                      disabled={s.clean < cost}
                      onPress={() => store.dispatch({ type: 'BUY_RACKET', racketType: type, districtId: id })}
                    />
                  )
                })}
              </Card>
            )}
          </Section>
        )
      })}
    </Screen>
  )
}
