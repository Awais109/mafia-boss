import { describe, expect, it } from 'vitest'
import { DISTRICT_IDS, LATER_ACTS, TUTORIAL_STEPS, type PlayerState } from '../engine'
import { ACT_TITLE, ACT_TURN, DISTRICT_STORY, mapTitle, revealed, revealedBy } from '../app/story'
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
