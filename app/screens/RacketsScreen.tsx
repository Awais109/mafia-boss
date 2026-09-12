import { View } from 'react-native'
import {
  DISTRICT_IDS,
  formulas,
  openLots,
  openSpots,
  premisesBlocked,
  RACKET_TYPES,
  type Config,
  type DistrictId,
  type Racket,
  type RacketDerived,
  type RacketType,
  type SynergyConfig,
} from '../../engine'
import { SupplyCard } from '../components/SupplyCard'
import { Bar, Btn, BtnRow, Card, colors, glyph, Money, Row, Screen, Section, T, Tag } from '../components/ui'
import { fmt, fmtRate, pct } from '../format'
import { store, type Snapshot } from '../store'
import type { ScreenProps } from './types'

// The Business tab (ADR 0031): per district, the spots for joints and rackets and the lots for premises.

const KIND_COLOR = { joint: colors.packs, racket: colors.heat, premises: colors.influence } as const

const premisesTypes = (c: Config) => RACKET_TYPES.filter((t) => c.rackets.types[t].kind === 'premises')

// What a premises does at a tier, in a few words.
function premisesEffect(c: Config, type: RacketType, tier: number): string {
  const rt = c.rackets.types[type]
  return [
    rt.makesPerHr ? `makes ${glyph.packs}${fmtRate(formulas.factoryOutput(c, type, tier))}` : '',
    rt.capPerTier ? `holds +${glyph.packs}${fmt(formulas.warehouseCapacity(c, type, tier))}` : '',
  ]
    .filter(Boolean)
    .join(', ')
}

function synergyText(c: Config, syn: SynergyConfig): string {
  const name = (t: RacketType | 'joints') => (t === 'joints' ? 'joints' : c.rackets.types[t].name)
  const effects = [
    syn.effect.yieldMult ? `${syn.b ? name(syn.b) : 'businesses'} earn ×${syn.effect.yieldMult}` : '',
    syn.effect.servedFirst ? 'get cigarettes first in a shortage' : '',
    ...Object.entries(syn.effect.upkeepMultOf ?? {}).map(([t, m]) => `${name(t as RacketType)} upkeep ×${m}`),
    syn.effect.influenceMult ? `Influence ×${syn.effect.influenceMult}` : '',
  ].filter(Boolean)
  return `${name(syn.a)}${syn.b ? ` + ${name(syn.b)}` : ''}: ${effects.join(', ')}`
}

export function RacketsScreen({ game }: ScreenProps) {
  const { state: s, derived: d, config: c } = game
  const sp = c.rackets.specialization

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
        {d.upkeepPerHr > 0 && <Row label="Premises upkeep" hint="paid in Dirty after wages" value={`◆${fmtRate(d.upkeepPerHr)}`} />}
        <Row label="Exposure from businesses" value={`▲ ${fmt(d.racketExposure)}`} />
        <T small muted>
          {`Joints sell cigarettes, and part of their trade stops when stock runs out. Rackets earn without goods but run hotter. Premises sit on a district's lots: they earn nothing and cost upkeep, but make, store or improve. Each tier multiplies yield by ${c.rackets.tierYieldMult} and heat by ${c.rackets.tierHeatMult}. The upgrade to tier ${sp.atTier} is a choice: greed (yield ×${sp.greed.yieldMult}, heat ×${sp.greed.exposureMult}) or stealth (heat ×${sp.stealth.exposureMult}).`}
        </T>
      </Card>

      <Section title="Cigarettes">
        <SupplyCard game={game} />
      </Section>

      {DISTRICT_IDS.map((id) => (
        <DistrictSection key={id} game={game} id={id} label={controllerLabel(id)} />
      ))}
    </Screen>
  )
}

function DistrictSection({ game, id, label }: { game: Snapshot; id: DistrictId; label: string }) {
  const { state: s, derived: d, config: c } = game
  const dc = c.districts.list[id]
  if (!d.unlocked.district[id]) {
    return (
      <Section title={dc.name}>
        <Card>
          <T small muted>Opens in Act II.</T>
        </Card>
      </Section>
    )
  }
  const here = s.rackets.map((r, i) => ({ r, rd: d.perRacket[i] })).filter(({ r }) => r.districtId === id)
  const spots = here.filter(({ rd }) => rd.kind !== 'premises')
  const premises = here.filter(({ rd }) => rd.kind === 'premises')
  const open = openSpots(s, c, id)
  const lotsFree = openLots(s, c, id)
  const active = d.synergies.filter((x) => x.districtId === id).flatMap((x) => c.rackets.synergies.filter((syn) => syn.id === x.id))

  return (
    <Section title={dc.name} right={<T small muted>{`${label} · spots ${spots.length}/${dc.allows.length} · lots ${premises.length}/${dc.premisesLots}`}</T>}>
      {active.map((syn) => (
        <T key={syn.id} small color={colors.good}>
          {synergyText(c, syn)}
        </T>
      ))}
      {spots.map(({ r, rd }) => (
        <BusinessCard key={r.id} game={game} r={r} rd={rd} />
      ))}
      {premises.map(({ r, rd }) => (
        <PremisesCard key={r.id} game={game} r={r} rd={rd} />
      ))}
      {open.length > 0 && (
        <Card style={{ backgroundColor: colors.bg }}>
          {open.map((type) => {
            const rt = c.rackets.types[type]
            const cost = d.costs.racket[type]
            if (!d.unlocked.racket[type]) {
              return (
                <T key={type} small color={colors.faint}>
                  {`${rt.name}: ${rt.act > s.act ? 'Act II' : `unlocks at ★${fmt(rt.unlockRep)}`}`}
                </T>
              )
            }
            const sells = rt.kind === 'joint' ? `, sells ${glyph.packs}${fmtRate(rt.sellsPerHr ?? 0)}` : ''
            return (
              <Btn
                key={type}
                small
                title={`Open a ${rt.name} (${rt.kind}): ●${fmt(cost)} (◆${fmt(rt.baseYield)}/h, ▲${fmt(rt.baseHeat)}${sells})`}
                disabled={s.clean < cost}
                onPress={() => store.dispatch({ type: 'BUY_RACKET', racketType: type, districtId: id })}
              />
            )
          })}
        </Card>
      )}
      {lotsFree > 0 && (
        <Card style={{ backgroundColor: colors.bg }}>
          <T small muted>{`${lotsFree} free lot${lotsFree === 1 ? '' : 's'} for premises`}</T>
          {premisesTypes(c).map((type) => {
            const rt = c.rackets.types[type]
            if (s.rackets.some((x) => x.districtId === id && x.type === type)) return null
            if (!d.unlocked.racket[type]) {
              return (
                <T key={type} small color={colors.faint}>
                  {`${rt.name}: ${rt.act > s.act ? 'Act II' : `unlocks at ★${fmt(rt.unlockRep)}`}`}
                </T>
              )
            }
            const blocked = premisesBlocked(s, c, id, type)
            if (blocked) {
              return (
                <T key={type} small color={colors.faint}>
                  {`${rt.name}: ${blocked}`}
                </T>
              )
            }
            const cost = d.costs.racket[type]
            return (
              <Btn
                key={type}
                small
                title={`Build a ${rt.name}: ●${fmt(cost)} (${premisesEffect(c, type, 1)}, ◆${fmtRate(formulas.premisesUpkeep(c, type, 1))} upkeep)`}
                disabled={s.clean < cost}
                onPress={() => store.dispatch({ type: 'BUY_RACKET', racketType: type, districtId: id })}
              />
            )
          })}
        </Card>
      )}
    </Section>
  )
}

function CardHeader({ title, tags }: { title: string; tags: { text: string; color: string }[] }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
      <T bold style={{ flexShrink: 1 }}>
        {title}
      </T>
      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {tags.map((tag) => (
          <Tag key={tag.text} text={tag.text} color={tag.color} />
        ))}
      </View>
    </View>
  )
}

function Condition({ r, rd }: { r: Racket; rd: RacketDerived }) {
  return (
    <>
      <Row label="Condition" value={`${Math.round(r.condition)}%`} color={r.condition < 60 ? colors.heat : r.condition < 85 ? colors.warn : undefined} />
      <Bar value={r.condition} max={100} color={r.condition < 60 ? colors.heat : colors.good} />
      {rd.conditionMult < 1 && r.condition < 60 && <T small color={colors.heat}>Worn down: it earns and makes less until it’s repaired.</T>}
    </>
  )
}

function BusinessCard({ game, r, rd }: { game: Snapshot; r: Racket; rd: RacketDerived }) {
  const { state: s, config: c } = game
  const rt = c.rackets.types[r.type]
  const sp = c.rackets.specialization
  const specMult = r.specialization ? sp[r.specialization] : { yieldMult: 1, exposureMult: 1 }
  const nextYield = (formulas.tierYield(c, r.type, r.tier + 1) - formulas.tierYield(c, r.type, r.tier)) * specMult.yieldMult
  const nextHeat = (formulas.tierHeat(c, r.type, r.tier + 1) - formulas.tierHeat(c, r.type, r.tier)) * specMult.exposureMult
  const choosing = rd.upgradeCost !== null && r.tier + 1 === sp.atTier
  const enforcer = s.crew.find((m) => m.id === r.enforcerId)
  const tags = [
    { text: rt.kind, color: KIND_COLOR[rt.kind] },
    ...(r.specialization ? [{ text: r.specialization, color: r.specialization === 'greed' ? colors.warn : colors.influence }] : []),
    ...(enforcer ? [{ text: `enforcer: ${enforcer.name}`, color: colors.accent }] : []),
  ]
  return (
    <Card>
      <CardHeader title={`${rt.name} · tier ${r.tier}`} tags={tags} />
      <Row label="Yield" hint={rd.tribute > 0 ? `−◆${fmt(rd.tribute)} tribute` : undefined} value={<Money kind="dirty" value={fmtRate(rd.yield)} />} />
      {rd.kind === 'joint' && (
        <Row
          label="Cigarettes"
          hint={`${pct(rt.cigaretteShare ?? 0)} of its trade${rd.synergyMult > 1 ? ` · ×${rd.synergyMult.toFixed(2)} beside a factory` : ''}`}
          value={`${glyph.packs}${fmtRate(rd.packsPerHr)}`}
          color={rd.served < 1 ? colors.heat : colors.packs}
        />
      )}
      {rd.served < 1 && <T small color={colors.heat}>{`Short of cigarettes: only ${pct(rd.served)} of its cigarette trade is supplied.`}</T>}
      <Row label="Exposure" value={`▲ ${fmt(rd.exposure)}`} />
      <Condition r={r} rd={rd} />
      <BtnRow>
        {rd.upgradeCost === null ? (
          <Tag text="max tier" />
        ) : choosing ? (
          (['greed', 'stealth'] as const).map((choice) => {
            const m = sp[choice]
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
          <Btn small title={`Repair ◆${fmt(rd.repairCost)}`} disabled={s.dirty < rd.repairCost} onPress={() => store.dispatch({ type: 'REPAIR_RACKET', racketId: r.id })} />
        )}
      </BtnRow>
    </Card>
  )
}

function PremisesCard({ game, r, rd }: { game: Snapshot; r: Racket; rd: RacketDerived }) {
  const { state: s, config: c } = game
  const rt = c.rackets.types[r.type]
  const upkeepNow = formulas.premisesUpkeep(c, r.type, r.tier)
  const synergyUpkeep = upkeepNow > 0 ? rd.upkeep / upkeepNow : 1
  const nextUpkeep = (formulas.premisesUpkeep(c, r.type, r.tier + 1) - upkeepNow) * synergyUpkeep
  return (
    <Card>
      <CardHeader title={`${rt.name} · tier ${r.tier}`} tags={[{ text: 'premises', color: KIND_COLOR.premises }]} />
      <Row label="Does" hint={r.condition < 100 ? `at ${Math.round(r.condition)}% condition` : undefined} value={premisesEffect(c, r.type, r.tier)} />
      {rt.makesPerHr ? <Row label="Making now" value={`${glyph.packs}${fmtRate(rd.packsPerHr)}`} color={colors.packs} /> : null}
      <Row label="Upkeep" hint={synergyUpkeep < 1 ? `×${synergyUpkeep} beside its partner` : 'Dirty, after wages'} value={`◆${fmtRate(rd.upkeep)}`} />
      <Row label="Exposure" value={`▲ ${fmt(rd.exposure)}`} />
      <Condition r={r} rd={rd} />
      <BtnRow>
        {rd.upgradeCost === null ? (
          <Tag text="max tier" />
        ) : (
          <Btn
            small
            kind="primary"
            title={`Tier ${r.tier + 1}: ●${fmt(rd.upgradeCost)} (${premisesEffect(c, r.type, r.tier + 1)}, +◆${fmtRate(nextUpkeep)} upkeep)`}
            disabled={s.clean < rd.upgradeCost}
            onPress={() => store.dispatch({ type: 'UPGRADE_RACKET', racketId: r.id })}
          />
        )}
        {r.condition < 100 && (
          <Btn small title={`Repair ◆${fmt(rd.repairCost)}`} disabled={s.dirty < rd.repairCost} onPress={() => store.dispatch({ type: 'REPAIR_RACKET', racketId: r.id })} />
        )}
      </BtnRow>
    </Card>
  )
}
