import { describe, expect, it } from 'vitest'
import { DISTRICT_IDS, LATER_ACTS, TUTORIAL_STEPS, type PlayerState } from '../engine'
import { ACT_TITLE, ACT_TURN, DISTRICT_STORY, mapTitle, revealed, revealedBy } from '../app/story'
import { PORTRAITS, SILHOUETTES } from '../app/art/people'
import { PEOPLE } from '../app/people'
import { act, blank, config, fresh, T0 } from './helpers'

// The map's reveals (ADR 0046): a district is inked in when someone shows it to you, not when a number is reached.

describe('the map', () => {
  it('starts with only home on the page', () => {
    const s = blank()
    expect(DISTRICT_IDS.filter((id) => revealed(s, config, id))).toEqual(['zarechye'])
    expect(mapTitle(s, config, DISTRICT_IDS)).toBe('Lyosha’s notebook')
  })

  it('shows Kiosk Row when Tolya’s boys first call, and Station Square when the opening ends', () => {
    const s: PlayerState = blank()
    s.tutorial.step = TUTORIAL_STEPS.findIndex((st) => st.id === 'tolya')
    expect(revealed(s, config, 'kioskRow')).toBe(true)
    expect(revealed(s, config, 'stationSquare')).toBe(false)
    s.tutorial.done = true
    expect(revealed(s, config, 'stationSquare')).toBe(true)
  })

  it('inks in each later district with its act, and writes the title once every page is', () => {
    let s = fresh('story')
    s.tutorial.done = true
    expect(revealed(s, config, 'portQuarter')).toBe(false)
    s = act(s, [{ type: 'DEBUG_COMPLETE_GOALS' }], T0)
    expect(revealed(s, config, 'portQuarter')).toBe(true)
    expect(revealed(s, config, 'sovietsky')).toBe(true)
    expect(revealedBy(config, 2, DISTRICT_IDS)).toEqual(['portQuarter', 'sovietsky'])
    expect(revealedBy(config, 6, DISTRICT_IDS)).toEqual(['nagornaya'])
    s.act = 6
    expect(mapTitle(s, config, DISTRICT_IDS)).toBe('Sevgorod')
  })

  it('has a story for every district and a turn for every act after the first', () => {
    for (const id of DISTRICT_IDS) expect(DISTRICT_STORY[id].reveal.length).toBeGreaterThan(0)
    for (const a of LATER_ACTS) {
      expect(ACT_TURN[a].length).toBeGreaterThan(0)
      expect(ACT_TITLE[a].length).toBeGreaterThan(0)
    }
  })
})

// People (ADR 0048): who you've met follows the story, not the numbers.
describe('people', () => {
  const met = (s: PlayerState) => PEOPLE.filter((p) => p.met(s, config)).map((p) => p.id)

  it('starts knowing only Lyosha, and meets the crew at the opening’s hire step', () => {
    const s = blank()
    expect(met(s)).toEqual(['lyosha'])
    s.tutorial.step = TUTORIAL_STEPS.findIndex((st) => st.id === 'hire')
    expect(met(s)).toEqual(['lyosha', 'vitya', 'dima', 'sasha'])
  })

  it('meets each act’s boss with the act, officials on the payroll, and the lender’s men at a missed payment', () => {
    const s = blank()
    s.tutorial.done = true
    s.act = 3
    expect(met(s)).toEqual(expect.arrayContaining(['tolya', 'zhanna', 'ignatov']))
    expect(met(s)).not.toContain('colonel')
    expect(met(s)).not.toContain('pasha')
    s.officials.push('wardCop')
    expect(met(s)).toContain('pasha')
    expect(met(s)).not.toContain('collectors')
    s.stats.loans.missed = 1
    expect(met(s)).toContain('collectors')
  })

  it('has a fragment for everyone who can be unmet, and art for everyone', () => {
    for (const p of PEOPLE) {
      if (p.id !== 'lyosha') expect(p.fragment.length, p.id).toBeGreaterThan(0)
      expect(PORTRAITS[p.id] ?? (p.head ? 'head' : SILHOUETTES[p.id]), p.id).toBeTruthy()
    }
  })
})
