import { View } from 'react-native'
import { DISTRICT_IDS, tolyaHostile, tolyaIntervalHours, type RacketType } from '../../engine'
import { Btn, BtnRow, Card, colors, Row, Screen, Section, T, Tag } from '../components/ui'
import { fmt, fmtDuration, fmtRate, pct } from '../format'
import { store } from '../store'
import type { ScreenProps } from './types'

const CONTROLLER = { player: 'yours', tolya: 'Tolya’s', zhanna: 'Zhanna’s', none: 'nobody’s' } as const

export function TurfScreen({ game, go }: ScreenProps) {
  const { state: s, derived: d, config: c, now } = game
  const tol = s.rival.tolya
  const hostile = tolyaHostile(s, c)
  const mood = hostile ? 'hostile' : tol.disposition < 0 ? 'annoyed' : tol.disposition >= 20 ? 'friendly' : 'watchful'

  return (
    <Screen>
      <Section title="Districts">
        {DISTRICT_IDS.map((id) => {
          const dc = c.districts.list[id]
          const district = s.districts.find((x) => x.id === id)!
          const ours = district.controller === 'player'
          const count = s.rackets.filter((r) => r.districtId === id).length
          const tributeHere = d.perRacket.reduce((sum, rd, i) => (s.rackets[i].districtId === id ? sum + rd.tribute : sum), 0)
          const perks = [
            ...Object.entries(dc.mod.yieldMult ?? {}).map(([t, m]) => `${c.rackets.types[t as RacketType].name} yield ×${m}`),
            dc.mod.wageMult ? `crew wages ×${dc.mod.wageMult}` : '',
            dc.home ? '' : `control +${pct(c.heat.districtControlPct)}`,
          ].filter(Boolean)
          return (
            <Card key={id}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <T bold>{dc.name}</T>
                <Tag text={dc.home ? 'home turf' : CONTROLLER[district.controller]} color={ours ? colors.good : colors.muted} />
              </View>
              {!d.unlocked.district[id] ? (
                <T small muted>Opens in Act II.</T>
              ) : (
                <>
                  <T small muted>{`Hosts ${dc.allows.map((t) => c.rackets.types[t].name).join(', ')} · ${count}/${dc.allows.length} running`}</T>
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
                        title={`Buy out ●${fmt(dc.buyout)}`}
                        disabled={s.clean < dc.buyout}
                        onPress={() => store.dispatch({ type: 'BUY_DISTRICT', districtId: id })}
                      />
                      <Btn small title={`Pressure ${district.pressureCount}/${c.districts.pressureOpsToFlip} → Ops`} onPress={() => go('ops')} />
                    </BtnRow>
                  )}
                </>
              )}
            </Card>
          )
        })}
      </Section>

      <Section title="Tolya">
        <Card>
          <T small muted>
            The old boss of these streets. Every few hours he sends his boys: to break something, to ask for a cut, or just to be seen.
          </T>
          <Row label="Mood" hint={`disposition ${fmt(tol.disposition)}`} value={mood} color={hostile ? colors.heat : tol.disposition < 0 ? colors.warn : colors.good} />
          <Row label="Next visit" hint={`every ${fmt(tolyaIntervalHours(s, c))}h`} value={fmtDuration(tol.nextTickAt - now, c)} />
          {tol.demand !== null ? (
            <>
              <T small color={colors.warn}>{`He wants ◆${fmt(tol.demand)}. If it’s unpaid by his next visit, he breaks a racket.`}</T>
              <Btn small kind="primary" title={`Pay ◆${fmt(tol.demand)}`} disabled={s.dirty < tol.demand} onPress={() => store.dispatch({ type: 'PAY_TRIBUTE' })} />
            </>
          ) : (
            <T small muted>No demands right now.</T>
          )}
          <T small color={colors.faint}>
            Paying keeps him sweet. Pressuring or buying his turf sours him; below {c.rivals.tolya.hostileBelow} he visits more often.
          </T>
        </Card>
      </Section>

      {s.act >= 2 && (
        <Section title="Zhanna">
          <Card>
            <T small muted>
              Runs the Port Quarter and every crate that moves through it. Her supply chain isn’t in this prototype; for now she just takes{' '}
              {pct(c.districts.list.portQuarter.tribute)} of what you run on her docks.
            </T>
          </Card>
        </Section>
      )}
    </Screen>
  )
}
