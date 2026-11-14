import { makeRng } from '../../engine'
import { ART, type ArtId } from './scenes'

// The Empire by night (ADR 0062; #15): the Holding's dawn panels turned to night by their palette, until there's
// drawn night art. The design draws only the dawn. Its art has four colours (paper, ink, a warm sun, a
// highlight), so night is a recolouring:
// - the sky and the ground go to night blue, and the ink goes a cooler black;
// - the sun becomes the moon, and the water it lit turns silver;
// - windows are lit: a group drawn in paper, or a path in paper made of several small boxes;
// - stars go in behind the skyline.
// Pure; each panel is made once.

export const NIGHT = { sky: '#262d45', ink: '#0c0d13', moon: '#ece4c8', water: '#7d87a6', lit: '#f0c46e' }

const PAPER = '#ece6d8'
const SUN = '#f0c27b'

// How far down each panel the sky reaches, for the stars.
const SKY: Partial<Record<ArtId, number>> = { holdingDawn: 190, coverHolding: 330, creditsStrip: 44 }
const STARS = 40

const made = new Map<ArtId, string>()

export function byNight(id: ArtId): string {
  const cached = made.get(id)
  if (cached) return cached
  const xml = nightXml(ART[id].xml, id, SKY[id] ?? 0)
  made.set(id, xml)
  return xml
}

export function nightXml(dawn: string, seed: string, skyBottom: number): string {
  let s = dawn.replace(new RegExp(`<g fill="${PAPER}">`, 'gi'), `<g fill="${NIGHT.lit}">`)
  s = s.replace(new RegExp(`<path d="([^"]*)" fill="${PAPER}"`, 'gi'), (whole, d: string) =>
    (d.match(/[zZ]/g)?.length ?? 0) >= 3 && !/[CQ]/.test(d) ? `<path d="${d}" fill="${NIGHT.lit}"` : whole,
  )
  s = s.replace(new RegExp(`(<circle[^>]*fill=")${SUN}"`, 'gi'), `$1${NIGHT.moon}"`).replace(new RegExp(SUN, 'gi'), NIGHT.water)
  s = s.replace(new RegExp(PAPER, 'gi'), NIGHT.sky).replace(/#f4efe3|#fbf8f0/gi, NIGHT.moon).replace(/#15120f/gi, NIGHT.ink)
  if (skyBottom <= 0) return s
  const width = Number(/viewBox="[\d.-]+ [\d.-]+ ([\d.]+) /.exec(dawn)?.[1] ?? 0)
  const r = makeRng(seed).derive('stars')
  const stars = Array.from(
    { length: STARS },
    () => `<circle cx="${(r.next() * width).toFixed(1)}" cy="${(r.next() * skyBottom).toFixed(1)}" r="${r.range(0.4, 1.2).toFixed(2)}" fill="${NIGHT.moon}" opacity="${r.range(0.45, 1).toFixed(2)}"/>`,
  ).join('')
  // Right after the background, so the skyline and the sky's screentone are drawn over them.
  return s.replace(new RegExp(`(<rect width="[\\d.]+" height="[\\d.]+" fill="${NIGHT.sky}">(?:</rect>)?)`), `$1<g>${stars}</g>`)
}
