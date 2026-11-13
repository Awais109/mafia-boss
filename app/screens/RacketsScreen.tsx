import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import {
  DISTRICT_IDS,
  formulas,
  openLots,
  openSpots,
  RACKET_TYPES,
  legalizeBlocked,
  legalizeCost,
  legalOn,
  racketBlocked,
  type Config,
  type Controller,
  type DistrictId,
  type Racket,
  type RacketDerived,
  type RacketType,
} from '../../engine'
import { ACT_NAME } from '../acts'
import { DistrictSummary } from '../components/DistrictSummary'
import { Icon } from '../components/Glyph'
import { SupplyCard, supplyNote } from '../components/SupplyCard'
import { Btn, BuyRow, colors, glyph, Item, List, Note, rich, Screen, Section, Strip, Tag } from '../components/ui'
import { fmt, fmtDuration, fmtRate, pct } from '../format'
import { store, type Snapshot } from '../store'
import { fonts } from '../theme'
import type { ScreenProps } from './types'

// The Business tab (ADR 0031; design: Business): what everything earns and costs, the stock, then each
// district as a section you can fold: what it hosts, its prosperity and pairings, a card per business,
// and the spots and lots still open.

// Below this, a business reads as "worn down" (a word: condition cuts yield in proportion all the way down).
const WORN_BELOW = 60

const premisesTypes = (c: Config) => RACKET_TYPES.filter((t) => c.rackets.types[t].kind === 'premises')

// What a premises does at a tier, in a few words; `making` false leaves out what it makes (shown as a figure).
function premisesEffect(c: Config, type: RacketType, tier: number, making = true): string {
  const rt = c.rackets.types[type]
  return [
    rt.makesPerHr && making ? `makes ${glyph.packs}${fmtRate(formulas.factoryOutput(c, type, tier))}` : '',
    rt.capPerTier ? `holds +${glyph.packs}${fmt(formulas.warehouseCapacity(c, type, tier))}` : '',
    rt.leashHoursPerTier ? `vault holds +${fmt(rt.leashHoursPerTier * tier)}h` : '',
    rt.shieldPerTier ? `hides ${pct(rt.shieldPerTier * tier)} of this district's share of a raid` : '',
    rt.influencePerHrPerTier ? `${glyph.influence}${fmt(rt.influencePerHrPerTier * tier * 24)} a day` : '',
    rt.prosperityPerTier ? `district prosperity +${fmt(rt.prosperityPerTier * tier)}` : '',
    rt.injuryMult !== undefined ? `hurt crew heal ${fmt(1 / rt.injuryMult)}× faster` : '',
    rt.loyaltyPerDay ? `+${fmt(rt.loyaltyPerDay)} loyalty a day for everyone` : '',
    rt.lendHoursPerTier ? `lends up to ${fmt(rt.lendHoursPerTier * tier)}h of Dirty yield` : '',
    rt.premiumCapPerTier ? `holds +${glyph.premium}${fmt(rt.premiumCapPerTier * tier)}` : '',
    rt.seizureMult !== undefined ? `customs takes ×${rt.seizureMult} as often, in Zastava` : '',
    rt.convoyBonusPerTier ? `convoys land +${pct(rt.convoyBonusPerTier * tier)}` : '',
    rt.hijackMult !== undefined ? `road losses ×${rt.hijackMult}` : '',
    rt.premiumMakesPerHr && making ? `makes ${glyph.premium}${fmtRate(formulas.premiumOutput(c, type, tier))}` : '',
    rt.opinionPerTier ? `public opinion +${fmt(rt.opinionPerTier * tier)}` : '',
    rt.legalBonusPerTier ? `legal businesses +${pct(rt.legalBonusPerTier * tier)}` : '',
  ]
    .filter(Boolean)
    .join(', ')
}

// "a Kiosk", "an Auto Shop", "the Holding".
const withArticle = (name: string) => (name.startsWith('The ') ? `the ${name.slice(4)}` : /^[AEIOU]/.test(name) ? `an ${name}` : `a ${name}`)

function controllerLabel(c: Config, id: DistrictId, controller: Controller | undefined): string {
  const tribute = c.districts.list[id].tribute
  const cut = tribute > 0 ? ` · ${pct(tribute)}` : ''
  switch (controller) {
    case 'player':
      return 'yours'
    case 'tolya':
      return `Tolya’s${cut}`
    case 'zhanna':
      return `Zhanna’s${cut}`
    case 'colonel':
      return `the Colonel’s${cut}`
    case 'state':
      return 'the state’s'
    default:
      return 'open turf'
  }
}

export function RacketsScreen({ game }: ScreenProps) {
  const { state: s, derived: d, config: c } = game
  const sp = c.rackets.specialization
  const earners = d.perRacket.filter((r) => r.kind !== 'premises')
  const premises = d.perRacket.filter((r) => r.kind === 'premises')
  const shut = earners.filter((r) => r.closed).length
  const exposureOf = (kind: RacketDerived['kind']) => d.perRacket.filter((r) => r.kind === kind).reduce((sum, r) => sum + r.exposure, 0)
  const cigarettes = supplyNote(game)
  const premium = supplyNote(game, 'premium')

  return (
    <Screen>
      <Section title="Everything you own" right={`${earners.length} business${earners.length === 1 ? '' : 'es'} · ${premises.length} premises`}>
        <List>
          <Item
            label="Income"
            hint={
              <Text>
                {`${earners.length - shut} running`}
                {shut ? <Text style={{ color: colors.bad }}>{` · ${shut} shut`}</Text> : null}
              </Text>
            }
            value={`+${glyph.dirty}${fmtRate(d.yieldPerHr)}`}
            color={colors.dirty}
          />
          {d.tributePerHr > 0 && <Item label="Lost to tribute" hint="skimmed where someone else holds the street" value={`−${glyph.dirty}${fmtRate(d.tributePerHr)}`} plain />}
          <Item label="Upkeep" hint={`${premises.length} premises · businesses pay none`} value={`−${glyph.dirty}${fmtRate(d.upkeepPerHr)}`} plain />
          <Item
            label="Exposure"
            hint={`rackets ${fmt(exposureOf('racket'))} · joints ${fmt(exposureOf('joint'))} · premises ${fmt(exposureOf('premises'))}`}
            value={`${glyph.heat}${fmt(d.racketExposure)}`}
            plain
          />
        </List>
        <Text style={styles.explain}>
          {`Joints sell cigarettes and earn with the street’s prosperity. Rackets sell nothing and run hotter. Premises earn nothing: they make or store things. Each tier multiplies yield by ${c.rackets.tierYieldMult} and heat by ${c.rackets.tierHeatMult}. At tiers ${sp.atTier} and ${c.rackets.specialization6.atTier} you choose: greed for more money and much more heat, or stealth for the same money and less heat.`}
        </Text>
      </Section>

      <Section title="Cigarettes" right={<Note color={cigarettes.color}>{cigarettes.text}</Note>}>
        <SupplyCard game={game} />
      </Section>

      {s.act >= c.premium.fromAct && (
        <Section title="Premium" right={<Note color={premium.color}>{premium.text}</Note>}>
          <SupplyCard game={game} product="premium" />
        </Section>
      )}

      {DISTRICT_IDS.filter((id) => d.unlocked.district[id]).map((id) => (
        <DistrictSection key={id} game={game} id={id} />
      ))}

      {DISTRICT_IDS.some((id) => !d.unlocked.district[id]) && (
        <View style={styles.lockedList}>
          {DISTRICT_IDS.filter((id) => !d.unlocked.district[id]).map((id) => (
            <View key={id} style={styles.locked}>
              <Icon name="lock" size={12} color={colors.faint} />
              <Text style={styles.lockedName}>{c.districts.list[id].name}</Text>
              <View style={styles.lockedRule} />
              <Text style={styles.lockedNote}>{`Opens in Act ${ACT_NAME[c.districts.list[id].act]}`}</Text>
            </View>
          ))}
        </View>
      )}
    </Screen>
  )
}

function DistrictSection({ game, id }: { game: Snapshot; id: DistrictId }) {
  const { state: s, derived: d, config: c } = game
  const dc = c.districts.list[id]
  const district = s.districts.find((x) => x.id === id)
  const here = s.rackets.map((r, i) => ({ r, rd: d.perRacket[i] })).filter(({ r }) => r.districtId === id)
  const spots = here.filter(({ rd }) => rd.kind !== 'premises')
  const lotsTaken = here.filter(({ rd }) => rd.kind === 'premises')
  const open = openSpots(s, c, id)
  const lotsFree = openLots(s, c, id)
  const earning = spots.reduce((sum, { rd }) => sum + rd.yield, 0)
  const legalClean = spots.reduce((sum, { rd }) => sum + rd.legalClean, 0)
  const lotTypes = lotsFree > 0 ? premisesTypes(c).filter((type) => lotFits(game, id, type)) : []
  // Open by default where something wants you: a spot or lot you could fill, a choice to make, a repair.
  const wantsYou =
    open.some((t) => d.unlocked.racket[t] && !racketBlocked(s, c, t, id)) ||
    lotTypes.some((t) => d.unlocked.racket[t] && !racketBlocked(s, c, t, id)) ||
    here.some(({ r, rd }) => rd.closed || r.condition < WORN_BELOW)
  const [expanded, setExpanded] = useState(wantsYou || here.length === 0)

  return (
    <View style={styles.district}>
      <Pressable onPress={() => setExpanded(!expanded)} style={styles.districtHead} accessibilityRole="button" accessibilityState={{ expanded }}>
        <Text style={styles.districtTitle} numberOfLines={1}>{`${dc.name} · ${controllerLabel(c, id, district?.controller)}`}</Text>
        <View style={styles.districtRule} />
        <Text style={styles.districtNote}>
          {expanded ? '' : `${spots.length}/${dc.allows.length} · `}
          {earning > 0 || legalClean === 0 ? <Text style={{ color: colors.dirty }}>{rich(`+${glyph.dirty}${fmtRate(earning)}`, 12)}</Text> : null}
          {legalClean > 0 ? <Text style={{ color: colors.clean }}>{rich(`${earning > 0 ? ' ' : ''}+${glyph.clean}${fmtRate(legalClean)}`, 12)}</Text> : null}
        </Text>
        <Icon name={expanded ? 'chevronUp' : 'chevronDown'} size={14} color={colors.muted} strokeWidth={2} />
      </Pressable>
      {expanded && (
        <View style={styles.districtBody}>
          <DistrictSummary game={game} id={id} />
          {spots.map(({ r, rd }) => (
            <BusinessCard key={r.id} game={game} r={r} rd={rd} />
          ))}
          {lotsTaken.map(({ r, rd }) => (
            <PremisesCard key={r.id} game={game} r={r} rd={rd} />
          ))}
          {(open.length > 0 || lotTypes.length > 0) && (
            <View style={styles.spots}>
              {open.map((type) => (
                <OpenSpot key={type} game={game} id={id} type={type} />
              ))}
              {lotTypes.map((type) => (
                <OpenSpot key={type} game={game} id={id} type={type} />
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  )
}

// The premises a free lot here can take: not one already here, only the Kombinat's own on its lots.
function lotFits(game: Snapshot, id: DistrictId, type: RacketType): boolean {
  const { state: s, config: c } = game
  const rt = c.rackets.types[type]
  if (s.rackets.some((x) => x.districtId === id && x.type === type)) return false
  // The Kombinat's lots take only its own premises, which go nowhere else (ADR 0044).
  if (rt.onlyIn !== undefined && rt.onlyIn !== id) return false
  const lotsFor = c.districts.list[id].lotsFor
  return !lotsFor || lotsFor.includes(type)
}

// A spot or lot still open: a button with its price and what it earns or does, or a dashed row saying why not.
function OpenSpot({ game, id, type }: { game: Snapshot; id: DistrictId; type: RacketType }) {
  const { state: s, derived: d, config: c } = game
  const rt = c.rackets.types[type]
  const premises = rt.kind === 'premises'
  const why = !d.unlocked.racket[type] ? (rt.act > s.act ? `Opens in Act ${ACT_NAME[rt.act]}` : `Unlocks at ${glyph.rep}${fmt(rt.unlockRep)}`) : racketBlocked(s, c, type, id)
  const cost = d.costs.racket[type]
  const does = premises
    ? `${premisesEffect(c, type, 1)} · ${glyph.dirty}${fmtRate(formulas.premisesUpkeep(c, type, 1))} upkeep`
    : `${glyph.dirty}${fmtRate(rt.baseYield)} · ${glyph.heat}${fmt(rt.baseHeat)}${rt.kind === 'joint' && rt.sellsPerHr ? ` · sells ${glyph.packs}${fmtRate(rt.sellsPerHr)}` : ''}`
  return (
    <BuyRow
      name={why ? rt.name : `${premises ? 'Build' : 'Open'} ${withArticle(rt.name)}`}
      kind={rt.kind}
      cost={`${glyph.clean}${fmt(cost)}`}
      does={does}
      why={why}
      disabled={s.clean < cost}
      onPress={() => store.dispatch({ type: 'BUY_RACKET', racketType: type, districtId: id })}
    />
  )
}

// A card's head: the name and tier, then its tags.
function CardHead({ title, tier, tags }: { title: string; tier: number; tags: { text: string; color?: string }[] }) {
  return (
    <View style={styles.cardHead}>
      <Text style={styles.cardTitle}>
        {title}
        <Text style={styles.cardTier}>{` · tier ${tier}`}</Text>
      </Text>
      <View style={styles.tags}>
        {tags.map((tag) => (
          <Tag key={tag.text} text={tag.text} color={tag.color} />
        ))}
      </View>
    </View>
  )
}

function ConditionRow({ r, rd }: { r: Racket; rd: RacketDerived }) {
  const worn = r.condition < WORN_BELOW
  const color = r.condition <= 0 ? colors.bad : worn ? colors.warn : colors.text
  const word = r.condition <= 0 ? ' · smashed up' : worn ? ' · worn down' : ''
  return (
    <View style={styles.condition}>
      <View style={styles.prosperityLine}>
        <Text style={styles.label}>Condition</Text>
        <Text style={[styles.conditionValue, { color }]}>{`${Math.round(r.condition)}%${word}`}</Text>
      </View>
      <View style={styles.conditionTrack}>
        <View style={[styles.conditionFill, { width: `${Math.max(0, r.condition)}%`, backgroundColor: worn ? colors.warn : '#a2957c' }]} />
      </View>
      {worn && !rd.closed && <Text style={styles.faintNote}>{`It earns and makes ${pct(rd.conditionMult)} until it’s repaired.`}</Text>}
    </View>
  )
}

// "Tier 5 · ●95" with what it adds on the right.
function UpgradeBtn({ title, gains, disabled, onPress }: { title: string; gains: string; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" style={({ pressed }) => [styles.upgrade, disabled && styles.off, pressed && styles.pressed]}>
      <Text style={styles.upgradeTitle} numberOfLines={1}>
        {rich(title, 14)}
      </Text>
      {gains ? (
        <Text style={styles.upgradeGains} numberOfLines={1}>
          {rich(gains, 12.5, { plain: true })}
        </Text>
      ) : null}
    </Pressable>
  )
}

function RepairBtn({ game, r, rd, primary }: { game: Snapshot; r: Racket; rd: RacketDerived; primary?: boolean }) {
  const disabled = game.state.dirty < rd.repairCost
  const press = () => store.dispatch({ type: 'REPAIR_RACKET', racketId: r.id })
  return primary ? (
    <Btn kind="primary" title={`Repair ${glyph.dirty}${fmt(rd.repairCost)}`} disabled={disabled} onPress={press} style={styles.grow} />
  ) : (
    <Btn title={`Repair ${glyph.dirty}${fmt(rd.repairCost)}`} disabled={disabled} onPress={press} style={styles.repair} />
  )
}

const SPEC_STYLE = {
  greed: { borderColor: '#6b5024', backgroundColor: '#2a1f12', color: colors.warn },
  stealth: { borderColor: '#34506a', backgroundColor: '#172230', color: colors.influence },
} as const

function BusinessCard({ game, r, rd }: { game: Snapshot; r: Racket; rd: RacketDerived }) {
  const { state: s, derived: d, config: c, now } = game
  const rt = c.rackets.types[r.type]
  // The upgrades to tier 3 and tier 6 are each a choice (ADRs 0027, 0041); both past choices multiply.
  const sp = r.tier + 1 === c.rackets.specialization6.atTier ? c.rackets.specialization6 : c.rackets.specialization
  const specMult = {
    yieldMult: (r.specialization ? c.rackets.specialization[r.specialization].yieldMult : 1) * (r.specialization6 ? c.rackets.specialization6[r.specialization6].yieldMult : 1),
    exposureMult: (r.specialization ? c.rackets.specialization[r.specialization].exposureMult : 1) * (r.specialization6 ? c.rackets.specialization6[r.specialization6].exposureMult : 1),
  }
  const nextYield = (formulas.tierYield(c, r.type, r.tier + 1) - formulas.tierYield(c, r.type, r.tier)) * specMult.yieldMult
  const nextHeat = (formulas.tierHeat(c, r.type, r.tier + 1) - formulas.tierHeat(c, r.type, r.tier)) * specMult.exposureMult
  const choosing = rd.upgradeCost !== null && r.tier + 1 === sp.atTier
  const enforcer = s.crew.find((m) => m.id === r.enforcerId)
  const specTag = (spec: 'greed' | 'stealth', tier: number) => ({ text: `${spec} (T${tier})`, color: spec === 'greed' ? colors.warn : colors.influence })
  const tags = [
    { text: rt.kind },
    ...(r.specialization ? [specTag(r.specialization, c.rackets.specialization.atTier)] : []),
    ...(r.specialization6 ? [specTag(r.specialization6, c.rackets.specialization6.atTier)] : []),
    ...(rd.closed ? [{ text: 'shut', color: colors.bad }] : []),
    ...(enforcer ? [{ text: `enforcer · ${enforcer.name.split(' ')[0]}` }] : []),
    ...(r.legal ? [{ text: 'legal', color: colors.clean }] : []),
    // After the story (ADR 0052): tiers the book didn't have.
    ...(r.tier > formulas.bookMaxTier(c) ? [{ text: 'past the book', color: colors.accent }] : []),
  ]
  const yieldHint = [
    rd.tribute > 0 ? `−${glyph.dirty}${fmt(rd.tribute)} tribute` : '',
    rd.prosperityMult !== 1 ? `×${rd.prosperityMult.toFixed(2)} prosperity` : '',
    rd.synergyMult !== 1 ? `×${rd.synergyMult.toFixed(2)} pairing` : '',
    rd.opinionMult !== 1 ? `×${rd.opinionMult.toFixed(2)} opinion` : '',
  ]
    .filter(Boolean)
    .join(' · ')
  // Act VI (ADR 0045): what going legal would cost and earn.
  const legalBlock = legalizeBlocked(s, c, r.id)
  const legalCost = legalizeCost(s, c, r.id)
  return (
    <View style={[styles.card, rd.closed && styles.cardShut]}>
      <CardHead title={rt.name} tier={r.tier} tags={tags} />
      {rd.closed && r.closedUntil !== undefined && (
        <View style={styles.strip}>
          <Strip>{`Shut after an investigation. It opens again in ${fmtDuration(r.closedUntil - now, c)}.`}</Strip>
        </View>
      )}
      <List style={styles.flush}>
        {r.legal ? (
          <Item label="Clean, legally" hint="after tax: no heat, no tribute, no front" value={`${glyph.clean}${fmtRate(rd.legalClean)}`} color={colors.clean} />
        ) : (
          <Item
            label="Yield"
            hint={rd.closed ? <Text style={{ color: colors.bad }}>earns nothing while shut</Text> : yieldHint || undefined}
            value={`${glyph.dirty}${fmtRate(rd.yield)}`}
            color={rd.closed ? colors.faint : colors.dirty}
          />
        )}
        {rd.kind === 'joint' && (rt.cigaretteShare ?? 0) > 0 && !r.legal && (
          <Item
            label="Cigarettes sold"
            hint={rd.served < 1 ? <Text style={{ color: colors.bad }}>{`only ${pct(rd.served)} supplied`}</Text> : `${pct(rt.cigaretteShare ?? 0)} of its trade`}
            value={`${glyph.packs}${fmtRate(rd.packsPerHr)}`}
            color={rd.served < 1 ? colors.bad : colors.packs}
          />
        )}
        {rd.kind === 'joint' && (rt.premiumShare ?? 0) > 0 && s.act >= c.premium.fromAct && !r.legal && (
          <Item
            label="Premium sold"
            hint={rd.premiumServed < 1 ? <Text style={{ color: colors.bad }}>{`only ${pct(rd.premiumServed)} supplied`}</Text> : `${pct(rt.premiumShare!)} of its trade`}
            value={`${glyph.premium}${fmtRate(rd.premiumPacksPerHr)}`}
            color={rd.premiumServed < 1 ? colors.bad : colors.premium}
          />
        )}
        <Item label="Exposure" value={`${glyph.heat}${fmt(rd.exposure)}`} plain />
        <ConditionRow r={r} rd={rd} />
      </List>
      <View style={styles.actions}>
        {rd.upgradeCost === null ? (
          <>
            <View style={styles.grow}>
              <Tag text="max tier" />
            </View>
            {r.condition < 100 && <RepairBtn game={game} r={r} rd={rd} />}
          </>
        ) : choosing ? (
          <View style={styles.choose}>
            <Text style={styles.chooseNote}>{`Tier ${r.tier + 1} · pick one, it stays`}</Text>
            <View style={styles.row}>
              {(['greed', 'stealth'] as const).map((choice) => {
                const m = sp[choice]
                const dy = (formulas.tierYield(c, r.type, r.tier + 1) * m.yieldMult - formulas.tierYield(c, r.type, r.tier)) * specMult.yieldMult
                const dh = (formulas.tierHeat(c, r.type, r.tier + 1) * m.exposureMult - formulas.tierHeat(c, r.type, r.tier)) * specMult.exposureMult
                const cost = rd.upgradeCost!
                const look = SPEC_STYLE[choice]
                return (
                  <Pressable
                    key={choice}
                    onPress={() => store.dispatch({ type: 'UPGRADE_RACKET', racketId: r.id, specialization: choice })}
                    disabled={s.clean < cost}
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.spec, { borderColor: look.borderColor, backgroundColor: look.backgroundColor }, s.clean < cost && styles.off, pressed && styles.pressed]}
                  >
                    <Text style={[styles.specTitle, { color: look.color }]}>
                      {choice === 'greed' ? 'Greed · ' : 'Stealth · '}
                      {rich(`${glyph.clean}${fmt(cost)}`, 14)}
                    </Text>
                    <Text style={styles.upgradeGains}>{rich(`+${glyph.dirty}${fmt(dy)}/h · ${dh >= 0 ? '+' : '−'}${glyph.heat}${fmt(Math.abs(dh))}`, 12, { plain: true })}</Text>
                  </Pressable>
                )
              })}
            </View>
            {r.condition < 100 && <RepairBtn game={game} r={r} rd={rd} />}
          </View>
        ) : (
          <>
            <UpgradeBtn
              title={`${r.tier + 1 > formulas.bookMaxTier(c) ? 'Past the book · ' : ''}Tier ${r.tier + 1} · ${glyph.clean}${fmt(rd.upgradeCost)}`}
              gains={
                // A legal business earns Clean, after tax, and draws no heat (ADR 0045).
                r.legal
                  ? `+${glyph.clean}${fmt(nextYield * c.legalize.cleanShare * d.holdingMult)}/h · ${glyph.heat}0`
                  : `+${glyph.dirty}${fmt(nextYield)}/h · +${glyph.heat}${fmt(nextHeat)}`
              }
              disabled={s.clean < rd.upgradeCost}
              onPress={() => store.dispatch({ type: 'UPGRADE_RACKET', racketId: r.id })}
            />
            {r.condition < 100 && <RepairBtn game={game} r={r} rd={rd} />}
          </>
        )}
      </View>
      {!r.legal && legalOn(s, c) && (
        <View style={styles.legal}>
          {legalBlock ? (
            <Text style={styles.faintNote}>{legalBlock}</Text>
          ) : (
            <UpgradeBtn
              title={`Legalize · ${glyph.clean}${fmt(legalCost)}`}
              gains={`then ${glyph.clean}${fmtRate(rd.grossYield * c.legalize.cleanShare * d.holdingMult)} · ${glyph.heat}0`}
              disabled={s.clean < legalCost}
              onPress={() => store.dispatch({ type: 'LEGALIZE', racketId: r.id })}
            />
          )}
        </View>
      )}
    </View>
  )
}

function PremisesCard({ game, r, rd }: { game: Snapshot; r: Racket; rd: RacketDerived }) {
  const { state: s, config: c } = game
  const rt = c.rackets.types[r.type]
  const upkeepNow = formulas.premisesUpkeep(c, r.type, r.tier)
  const synergyUpkeep = upkeepNow > 0 ? rd.upkeep / upkeepNow : 1
  const nextUpkeep = (formulas.premisesUpkeep(c, r.type, r.tier + 1) - upkeepNow) * synergyUpkeep
  const making = rt.makesPerHr ? `${glyph.packs}${fmtRate(rd.packsPerHr)}` : rt.premiumMakesPerHr ? `${glyph.premium}${fmtRate(formulas.premiumOutput(c, r.type, r.tier) * rd.conditionMult)}` : ''
  return (
    <View style={styles.card}>
      <CardHead title={rt.name} tier={r.tier} tags={[{ text: 'premises' }]} />
      <List style={styles.flush}>
        <Item label="Does" hint={premisesEffect(c, r.type, r.tier, !making) || 'into the city’s stock'} value={making ? `makes ${making}` : undefined} color={rt.premiumMakesPerHr && !rt.makesPerHr ? colors.premium : colors.packs} />
        <Item label="Upkeep" hint={synergyUpkeep < 1 ? `×${fmt(synergyUpkeep)} beside its partner` : 'Dirty, after wages'} value={`−${glyph.dirty}${fmtRate(rd.upkeep)}`} plain />
        <Item label="Exposure" value={`${glyph.heat}${fmt(rd.exposure)}`} plain />
        <ConditionRow r={r} rd={rd} />
      </List>
      <View style={styles.actions}>
        {rd.upgradeCost === null ? (
          <View style={styles.grow}>
            <Tag text="max tier" />
          </View>
        ) : (
          <UpgradeBtn
            title={`Tier ${r.tier + 1} · ${glyph.clean}${fmt(rd.upgradeCost)}`}
            gains={`+${glyph.dirty}${fmtRate(nextUpkeep)} upkeep`}
            disabled={s.clean < rd.upgradeCost}
            onPress={() => store.dispatch({ type: 'UPGRADE_RACKET', racketId: r.id })}
          />
        )}
        {r.condition < 100 && <RepairBtn game={game} r={r} rd={rd} />}
      </View>
      {rd.upgradeCost !== null && <Text style={[styles.faintNote, styles.nextTier]}>{rich(`At tier ${r.tier + 1}: ${premisesEffect(c, r.type, r.tier + 1)}`, 12)}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  explain: { fontFamily: fonts.text400, fontSize: 13, lineHeight: 19, color: colors.muted },
  district: { gap: 10, marginTop: -12 },
  districtHead: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 44 },
  districtTitle: { fontFamily: fonts.text600, fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase', color: colors.accent, flexShrink: 1 },
  districtRule: { flexGrow: 1, height: 1, backgroundColor: colors.border, minWidth: 12 },
  districtNote: { fontFamily: fonts.text400, fontSize: 12, color: colors.muted },
  districtBody: { gap: 10 },
  lockedList: { marginTop: -12 },
  locked: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 32 },
  lockedName: { fontFamily: fonts.text600, fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase', color: colors.faint },
  lockedRule: { flexGrow: 1, borderTopWidth: 1, borderStyle: 'dashed', borderColor: colors.border },
  lockedNote: { fontFamily: fonts.text400, fontSize: 12, color: colors.faint },
  hosts: { alignItems: 'flex-end' },
  hostsValue: { fontFamily: fonts.text600, fontSize: 14, color: colors.text },
  hostsLots: { fontFamily: fonts.text400, fontSize: 14, color: colors.muted },
  label: { fontFamily: fonts.text400, fontSize: 14, color: colors.text },
  muted: { fontFamily: fonts.text400, color: colors.muted },
  prosperity: { gap: 6, paddingTop: 8, paddingBottom: 12, paddingHorizontal: 14 },
  prosperityLine: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  prosperityValue: { fontFamily: fonts.text600, fontSize: 15, color: colors.text },
  prosperityTrack: { height: 8, borderRadius: 1, backgroundColor: colors.cardAlt },
  prosperityFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#a2957c', borderRadius: 1 },
  prosperityToward: { position: 'absolute', top: 0, bottom: 0, backgroundColor: '#6a5f4d', opacity: 0.6 },
  prosperityMark: { position: 'absolute', top: -3, bottom: -3, width: 1, backgroundColor: colors.accent },
  faintNote: { fontFamily: fonts.text400, fontSize: 12, lineHeight: 17, color: colors.faint },
  spots: { gap: 8 },
  card: { backgroundColor: colors.card, borderRadius: 6, borderWidth: 1, borderColor: colors.divider },
  cardShut: { borderColor: '#6b3127' },
  cardHead: { gap: 8, paddingTop: 12, paddingBottom: 10, paddingHorizontal: 14 },
  cardTitle: { fontFamily: fonts.text600, fontSize: 16, color: colors.text },
  cardTier: { fontFamily: fonts.text400, color: colors.muted },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  strip: { paddingHorizontal: 14, paddingBottom: 12 },
  flush: { borderWidth: 0, borderTopWidth: 1, borderTopColor: colors.cardAlt, borderRadius: 0, backgroundColor: 'transparent', paddingVertical: 0 },
  condition: { gap: 8, paddingTop: 8, paddingBottom: 12, paddingHorizontal: 14 },
  conditionValue: { fontFamily: fonts.text600, fontSize: 14 },
  conditionTrack: { height: 8, borderRadius: 1, backgroundColor: colors.cardAlt, overflow: 'hidden' },
  conditionFill: { height: 8, borderRadius: 1 },
  actions: { flexDirection: 'row', gap: 8, paddingTop: 2, paddingBottom: 14, paddingHorizontal: 14 },
  upgrade: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 48, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.control, borderRadius: 4, backgroundColor: colors.cardAlt },
  upgradeTitle: { fontFamily: fonts.text600, fontSize: 14, color: colors.text, flexShrink: 0 },
  upgradeGains: { fontFamily: fonts.text400, fontSize: 12.5, color: colors.muted, flexShrink: 1 },
  repair: { minHeight: 48, paddingHorizontal: 14 },
  grow: { flex: 1, justifyContent: 'center' },
  choose: { flex: 1, gap: 8 },
  chooseNote: { fontFamily: fonts.text400, fontSize: 12, color: colors.muted },
  row: { flexDirection: 'row', gap: 8 },
  spec: { flex: 1, minHeight: 60, justifyContent: 'center', gap: 3, paddingHorizontal: 12, borderWidth: 1, borderRadius: 4 },
  specTitle: { fontFamily: fonts.text600, fontSize: 14 },
  legal: { paddingHorizontal: 14, paddingBottom: 14, marginTop: -6 },
  nextTier: { paddingHorizontal: 14, paddingBottom: 14, marginTop: -6 },
  off: { opacity: 0.45 },
  pressed: { opacity: 0.75 },
})
