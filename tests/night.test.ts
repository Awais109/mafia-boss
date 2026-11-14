import { describe, expect, it } from 'vitest'
import { ART } from '../app/art/scenes'
import { byNight, NIGHT, nightXml } from '../app/art/night'

// The Empire by night (ADR 0062): the dawn panels recoloured, with a moon, lit windows and stars.

describe('the Empire by night', () => {
  it('leaves none of the dawn palette, and keeps the drawing', () => {
    for (const id of ['holdingDawn', 'coverHolding', 'creditsStrip'] as const) {
      const night = byNight(id)
      for (const dawn of ['#ece6d8', '#f0c27b', '#15120f', '#f4efe3', '#fbf8f0']) expect(night.toLowerCase(), `${id} ${dawn}`).not.toContain(dawn)
      expect(night).toContain(NIGHT.sky)
      expect(night).toContain(NIGHT.moon)
      expect(night.match(/viewBox="[^"]*"/)?.[0]).toBe(ART[id].xml.match(/viewBox="[^"]*"/)?.[0])
      expect(night.match(/<path /g)?.length).toBe(ART[id].xml.match(/<path /g)?.length) // same drawing, new colours
    }
  })

  it('lights the windows and turns the sun into the moon', () => {
    const night = byNight('holdingDawn')
    expect(night).toContain(`fill="${NIGHT.lit}"`)
    expect(night).toMatch(new RegExp(`<circle cx="60" cy="204" r="20" fill="${NIGHT.moon}"`))
    expect(night).toContain(NIGHT.water) // the water the sun lit
  })

  it('puts the same stars across the sky every time, behind the skyline', () => {
    const night = byNight('coverHolding')
    expect(nightXml(ART.coverHolding.xml, 'coverHolding', 330)).toBe(night)
    const stars = [...night.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="[\d.]+" fill="#ece4c8" opacity/g)].map((m) => [Number(m[1]), Number(m[2])])
    expect(stars).toHaveLength(40)
    for (const [x, y] of stars) {
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThanOrEqual(390)
      expect(y).toBeLessThanOrEqual(330)
    }
    expect(Math.max(...stars.map(([x]) => x)) - Math.min(...stars.map(([x]) => x))).toBeGreaterThan(200) // spread, not in a column
    expect(night.indexOf('<g><circle')).toBeLessThan(night.indexOf('<path')) // drawn before the skyline
  })
})
