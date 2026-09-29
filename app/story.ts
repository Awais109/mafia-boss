import { TUTORIAL_STEPS, type Act, type Config, type DistrictId, type LaterAct, type PlayerState } from '../engine'

// The story's canon in the game's own words (docs/story.md, ADR 0046): each act's title, the line that
// turns one act into the next, and for each district the fragment Lyosha left in his notebook, the line
// that inks it in, and who shows it to you. Text only: nothing here changes a rule or a number.

export const ACT_TITLE: Record<Act, string> = {
  1: 'The streets',
  2: 'The tram east',
  3: 'Across the bridge',
  4: 'The road out',
  5: 'The factory',
  6: 'The hills',
}

// Each act opens on the previous act's turn.
export const ACT_TURN: Record<LaterAct, string> = {
  2: '“Zhanna Arkadyevna sends her condolences, four months late, and asks whether you’re buying or selling.”',
  3: '“Lunch, Thursday, the Hotel Sevgorod. Wear something that wasn’t bought on Kiosk Row.”',
  4: '“Everything that comes up the river came down the highway first. You’re paying Zhanna’s margin on the Colonel’s cigarettes.”',
  5: '“The Combine’s council asks whether Voronin’s family would consider the plant. The director was not consulted.”',
  6: '“He looked up there every night for ten years. Never went. Said the road was for other people.”',
}

export type DistrictStory = {
  fragment: string // Lyosha's note, before you know the place
  reveal: string // the line that inks it in
  by: string // who shows it to you
}

export const DISTRICT_STORY: Record<DistrictId, DistrictStory> = {
  zarechye: { fragment: '…home', reveal: '“Third floor, the window over the tram. He left the key with Vitya.”', by: 'Lyosha, by leaving you his flat' },
  kioskRow: { fragment: '…forty kiosks, and a man who counts them', reveal: '“Tolya’s boys came from the Row. Now you know where it is.”', by: 'Tolya’s boys' },
  stationSquare: { fragment: '…the station. Whose now?', reveal: '“Vitya: ‘Station’s nobody’s since spring. Won’t stay that way.’”', by: 'Vitya' },
  sovietsky: { fragment: '…nine floors, no lifts', reveal: '“Nine floors, no lifts, no wages since October. Anyone here will work for you.”', by: 'the tram east' },
  portQuarter: { fragment: '…the one with the cranes', reveal: '“Zhanna runs the Port Quarter. Her people watch every crate that moves.”', by: 'Zhanna, who sends a card' },
  centre: { fragment: '…across the bridge. Not for us.', reveal: '“The bridge has been there all along. It’s the invitation that was missing.”', by: 'the deputy mayor for trade' },
  zastava: { fragment: '…60 km west. The border.', reveal: '“The truck came back empty. The driver says the Colonel sends his regards and his rates.”', by: 'the Colonel, who stops your first truck' },
  kombinat: {
    fragment: '…the plant. The night line.',
    reveal: '“The council writes: the director has the vouchers, the workers have the plant, and neither has been paid.”',
    by: 'the Red Director, who wants to sell you nothing',
  },
  nagornaya: { fragment: '…the dachas. Never went.', reveal: '“From here you can see all of it. He never came up. You did.”', by: 'nobody: you drive up yourself' },
}

// A district is on the map once someone has shown it to you, not when a number is reached. Act I's two
// neighbours come during the opening: Kiosk Row when Tolya's boys first call, Station Square when it ends.
export function revealed(s: PlayerState, c: Config, id: DistrictId): boolean {
  if (c.districts.list[id].home) return true
  if (id === 'kioskRow') return s.tutorial.done || s.tutorial.step >= TUTORIAL_STEPS.findIndex((st) => st.id === 'tolya') || s.rival.tolya.tickCount > 0
  if (id === 'stationSquare') return s.tutorial.done
  return c.districts.list[id].act <= s.act
}

// The map's title is only written in once every page is.
export function mapTitle(s: PlayerState, c: Config, ids: readonly DistrictId[]): string {
  return ids.every((id) => revealed(s, c, id)) ? 'Sevgorod' : 'Lyosha’s notebook'
}

// The districts an act inks in, for the reveal page.
export function revealedBy(c: Config, act: Act, ids: readonly DistrictId[]): DistrictId[] {
  return ids.filter((id) => c.districts.list[id].act === act && !c.districts.list[id].home)
}

// The last word, either way (ADR 0045).
export const LAST_LINE = '“Where to?”'
