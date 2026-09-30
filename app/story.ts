import { tolyaHostile, TUTORIAL_STEPS, type Act, type Config, type ContractId, type DistrictId, type Ending, type LaterAct, type MissionId, type OfficialId, type PlayerState } from '../engine'
import type { HeadId } from './art/heads'

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

// Tolya's mood, from his disposition, and what he says when he wants his cut. He talks in grievances.
export type TolyaMood = 'watchful' | 'cold' | 'friendly' | 'hostile'

// Where a rival's mood turns friendly: a word on the card, not a rule. Nothing in the engine reads it.
export const FRIENDLY_FROM = 20

export function tolyaMood(s: PlayerState, c: Config): TolyaMood {
  const disposition = s.rival.tolya.disposition
  if (tolyaHostile(s, c)) return 'hostile'
  if (disposition < 0) return 'cold'
  return disposition >= FRIENDLY_FROM ? 'friendly' : 'watchful'
}

// `{amount}` is the demand, written with its glyph.
export const TOLYA_ASKS: Record<TolyaMood, string> = {
  watchful: '{amount}, and we’ll say no more about the window.',
  cold: '{amount}. Your uncle never made me ask twice.',
  friendly: '{amount}. Lyosha and I carried packs together. I keep it fair.',
  hostile: '{amount}. Ten years I carried your uncle’s packs, and this is what I get.',
}

// The opening's three, in `crew.openingPool` order: who they are to you, and their portrait. Anyone hired
// later has neither.
export const OPENING_CREW = [
  { head: 'vitya', epithet: 'The driver' },
  { head: 'dima', epithet: 'The nephew' },
  { head: 'sasha', epithet: 'The card player' },
] as const

export function openingCrew(c: Config, name: string): (typeof OPENING_CREW)[number] | null {
  const i = c.crew.openingPool.findIndex((p) => p.name === name)
  return i >= 0 && i < OPENING_CREW.length ? OPENING_CREW[i] : null
}

// The officials as people (docs/story.md, the cast): who you actually pay, and their headshot.
export const OFFICIAL_PERSON: Record<OfficialId, { who: string; head: HeadId }> = {
  wardCop: { who: 'Sergeant Pasha', head: 'pasha' },
  precinctCaptain: { who: 'Major Kravets', head: 'kravets' },
  cityHall: { who: 'Ignatov', head: 'ignatov' },
  customsChief: { who: 'The stamp', head: 'customs' },
  governor: { who: 'The telephone to the capital', head: 'governor' },
}

// What each boss mission comes to, in the story's words (ADR 0050; design brief, Part 5). An overreach only
// fails; a rematch is won or lost, and can be tried again.
export const MISSION_LINES: Record<MissionId, { failed?: string; won?: string; lost?: string }> = {
  crateThroughPort: { failed: 'Gate wasn’t empty. The crate’s gone, and Zhanna Arkadyevna sends her card.' },
  herTerms: { won: 'Zhanna: “Fine. Forty a lot, not forty-five. Don’t make me regret the five.”', lost: 'Zhanna: “Come back when you can afford to be polite.”' },
  acrossTheBridge: { failed: 'The militia turned the stall back at the bridge. Trade on the north bank is licensed by City Hall.' },
  secondLunch: { won: 'Ignatov: “It will be noted that you were helpful.”', lost: 'Ignatov: “It has been decided that lunch is over.”' },
  firstTruck: { failed: 'The truck came back empty. The Colonel sends his regards, and his rates.' },
  firstAuction: { failed: 'Golovin’s vouchers carried the first round. Your bid came back stamped REJECTED.' },
  overGovernor: { failed: 'You went to the capital to ask it to stop looking. You came home with a case file.' },
}

// Each mission's card (ADR 0050; design: Ops · Unfinished business): the line that sends you, who says it,
// and for a rematch what's at stake.
export const MISSION_CARD: Record<MissionId, { line: string; by?: string; stake?: string }> = {
  crateThroughPort: { line: 'Minsk truck at the Port tonight. East gate’s never watched.', by: 'Vitya' },
  herTerms: { line: 'The Minsk drivers want paying on the day. We pay on the day.', by: 'Dima', stake: 'The Minsk drivers and her respect: her lots cheaper for good' },
  acrossTheBridge: { line: 'Sell on the embankment. The Centre smokes too. Bridge has had militia on it since spring.', by: 'Vitya' },
  secondLunch: { line: 'Lunch again, the Hotel Sevgorod. This time you bring the envelope.', stake: 'Ignatov as a partner' },
  firstTruck: { line: 'Why pay Zhanna’s margin? Send our own truck to the border.' },
  firstAuction: { line: 'The Combine is being sold. Bid.' },
  overGovernor: { line: 'The Ministry won’t stop looking. Go to the capital and ask it to.' },
}

// Lyosha's second envelope (ADR 0051; design brief, Rock bottom): the note inside changes with the act.
export const ENVELOPE_NOTES: Record<Act, string> = {
  1: 'For when you’ve done something stupid.',
  2: 'Again?',
  3: 'Third time. Your father was the same.',
  4: 'Borrow less.',
  5: 'The city’s watching now.',
  6: 'Last one. Make it count.',
}

// After the story (ADR 0052): the endings by name, and what each contract on the board is for.
export const ENDING_NAME: Record<Ending, string> = { holding: 'the Holding', empire: 'the Empire' }

// The endings' last caption, over the city from the hills (ADR 0053; Scenes 17 and 18), and the credits' line
// under Lyosha's name.
export const ENDING_LINE: Record<Ending, string> = {
  holding: 'Every rouble with a story. The rule, followed to its end.',
  empire: 'Every district held. Nothing legal. Nothing needed.',
}
export const LYOSHA_DATES = 'Alexei Voronin · 1938–1993'

export const CONTRACT_TEXT: Record<ContractId, string> = {
  tramDepot: 'The number 4’s sheds, roof first. The council pays when the trams sleep indoors again.',
  boilerHouse: 'Thirty-one buildings on one boiler, built in 1961. The council promised heat before the first frost.',
  portChannel: 'The big ships have anchored outside the silt since autumn. Zhanna’s co-operative will share the dredger.',
  bridgeLights: 'The lamps on the bridge went out in 1991, and nobody asked why. The mayor’s office is asking now.',
  palaceRoof: 'It rains on the stage of the Palace of Culture. The council wants the cinema open by the holidays.',
  stationClock: 'The clock over the station has said twenty to four for two years. Nobody meets under it any more.',
}
