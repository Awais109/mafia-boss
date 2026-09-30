import { StyleSheet, Text, View } from 'react-native'
import { fmt, fmtDuration } from '../format'
import type { Snapshot } from '../store'
import { fonts } from '../theme'
import { BigFigure, Card, colors, Meter, rich, Tile } from './ui'

type Product = 'cigarettes' | 'premium'

// A stock at a glance (ADR 0032; design: Home · Cigarettes): stock against its cap, the net rate, and
// what's made against what's sold. Read straight from `derive`. The premium line (ADR 0043) is made only
// by the Combine; convoys and Zhanna fill the rest.
export function SupplyCard({ game, product = 'cigarettes' }: { game: Snapshot; product?: Product }) {
  const { state: s, derived: d, config: c } = game
  const premium = product === 'premium'
  const sup = premium ? d.premium : d.supply
  const empty = premium ? s.premiumEmpty : s.stockEmpty
  const color = premium ? colors.premium : colors.packs
  const g = premium ? '▣' : '▮'
  const net = sup.madePerHr - sup.soldPerHr
  const atCap = sup.stock >= sup.cap - 1e-6
  const idle = sup.madePerHr === 0 && sup.demandPerHr === 0
  const sellers = d.perRacket.filter((r) => r.kind === 'joint' && (premium ? r.premiumPacksPerHr > 0 : r.packsPerHr > 0))
  const served = sellers.length ? (premium ? sellers[0].premiumServed : sellers[0].served) : 1
  const madeSub = premium
    ? sup.madePerHr > 0
      ? 'the Combine'
      : 'convoys and Zhanna bring it in'
    : makersText(s, c, d.perRacket.filter((r) => r.kind === 'premises' && r.packsPerHr > 0).map((r) => r.id))
  const soldSub = empty && sup.demandPerHr > 0 ? `only ${Math.round(served * 100)}% supplied` : sellers.length ? `${sellers.length} ${premium ? 'premium ' : ''}joint${sellers.length === 1 ? '' : 's'}` : premium ? 'no joint sells premium yet' : 'no joints yet'
  return (
    <Card>
      <View style={styles.top}>
        <BigFigure kind={premium ? 'premium' : 'packs'} value={fmt(sup.stock)} of={fmt(sup.cap)} size={24} color={empty ? colors.bad : color} />
        <Text style={styles.net}>
          {idle ? (
            'nothing made, nothing sold'
          ) : empty ? (
            <>
              {'short '}
              <Text style={[styles.netFigure, { color: colors.bad }]}>{`${fmt(sup.demandPerHr - sup.soldPerHr)}/h`}</Text>
            </>
          ) : (
            <>
              {'net '}
              <Text style={[styles.netFigure, net < 0 && { color: colors.warn }]}>{`${net >= 0 ? '+' : '−'}${fmt(Math.abs(net))}/h`}</Text>
            </>
          )}
        </Text>
      </View>
      <Meter value={sup.stock} max={sup.cap} color={color} />
      <View style={styles.tiles}>
        <Tile label="Made" value={`${g}${fmt(sup.madePerHr)}/h`} sub={madeSub} color={color} />
        <Tile label="Sold" value={`${g}${fmt(sup.soldPerHr)}/h`} sub={soldSub} color={color} subColor={empty ? colors.bad : undefined} />
      </View>
      {atCap && sup.madePerHr > 0 && (
        <Text style={styles.advice}>{rich(`Full: anything more made is wasted. A ${premium ? 'bonded warehouse' : 'warehouse'} holds more.`, 12.5)}</Text>
      )}
      {empty && (
        <Text style={[styles.advice, { color: colors.bad }]}>
          {premium ? 'Out: the road joints are losing their premium trade. Run a convoy or buy a lot from Zhanna.' : 'Out: joints are losing their cigarette trade. Upgrade a factory, build another, or smuggle.'}
        </Text>
      )}
    </Card>
  )
}

// The section rule's note: when it runs out or fills, or that it's out.
export function supplyNote(game: Snapshot, product: Product = 'cigarettes'): { text: string; color?: string } {
  const { state: s, derived: d, config: c } = game
  const premium = product === 'premium'
  const sup = premium ? d.premium : d.supply
  const hours = (h: number) => fmtDuration(h * c.time.hourMs, c)
  if (premium ? s.premiumEmpty : s.stockEmpty) return { text: 'out', color: colors.bad }
  if (Number.isFinite(sup.hoursToEmpty)) return { text: `runs out in ${hours(sup.hoursToEmpty)}`, color: sup.hoursToEmpty < 6 ? colors.warn : undefined }
  if (sup.stock >= sup.cap - 1e-6 && sup.madePerHr > 0) return { text: 'full', color: colors.warn }
  if (Number.isFinite(sup.hoursToFull)) return { text: `full in ${hours(sup.hoursToFull)}` }
  if (!premium && sup.madePerHr === 0) return { text: 'no factory yet' }
  return { text: 'holding steady' }
}

function rackOf(s: Snapshot['state'], id: string) {
  return s.rackets.find((r) => r.id === id)
}

// "Tobacco Factory · tier 2", "2 factories, the Combine", "no factory yet".
function makersText(s: Snapshot['state'], c: Snapshot['config'], ids: string[]): string {
  const rackets = ids.map((id) => rackOf(s, id)).filter((r) => r !== undefined)
  if (!rackets.length) return 'no factory yet'
  if (rackets.length === 1) return `${c.rackets.types[rackets[0].type].name} · tier ${rackets[0].tier}`
  const factories = rackets.filter((r) => r.type === 'tobaccoFactory').length
  const others = rackets.filter((r) => r.type !== 'tobaccoFactory').map((r) => (r.type === 'combine' ? 'the Combine' : c.rackets.types[r.type].name))
  return [factories ? `${factories} factor${factories === 1 ? 'y' : 'ies'}` : '', ...others].filter(Boolean).join(', ')
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 },
  net: { fontFamily: fonts.text400, fontSize: 13, color: colors.muted },
  netFigure: { fontFamily: fonts.text600, color: colors.text },
  tiles: { flexDirection: 'row', gap: 10 },
  advice: { fontFamily: fonts.text400, fontSize: 12.5, lineHeight: 18, color: colors.warn },
})
