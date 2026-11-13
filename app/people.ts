import { colonelHostile, gameDay, tolyaHostile, TUTORIAL_STEPS, zhannaHostile, type Config, type DistrictId, type OfficialId, type PlayerState } from '../engine'
import type { HeadId } from './art/heads'
import type { PersonId } from './art/people'
import { ACT_NAME } from './acts'
import { FRIENDLY_FROM, openingCrew, tolyaMood } from './story'

// The cast as the People pages show them (design: Map · People and the dossier; canon: docs/story.md and
// design/sevgorod-design-brief.md, Part 3). Who each person is, when you've met them, and what they hold,
// read live from state. Text only: nothing here changes a rule.

export type Person = {
  id: PersonId
  name: string
  epithet: string
  line: string // what they say on their card
  about: string
  role: string
  head?: HeadId // for anyone the People grid has no portrait of
  fragment: string // Lyosha's note, before you meet them
  met: (s: PlayerState, c: Config) => boolean
  since: (s: PlayerState, c: Config) => string // "Met in Act II", "On the payroll since Day 4"
  holds?: (s: PlayerState, c: Config) => string | null
  mood?: (s: PlayerState, c: Config) => { words: readonly string[]; at: string }
}

const holder = (s: PlayerState, id: DistrictId) => s.districts.find((d) => d.id === id)?.controller
const hireStep = TUTORIAL_STEPS.findIndex((st) => st.id === 'hire')
const metCrew = (s: PlayerState) => s.tutorial.done || s.tutorial.step >= hireStep
const official = (id: OfficialId) => ({
  met: (s: PlayerState) => s.officials.includes(id),
  since: (s: PlayerState, c: Config) => {
    const at = s.stats.officialBoughtAt[id]
    return at === undefined ? 'On the payroll' : `On the payroll since Day ${gameDay(c, s, at)}`
  },
})
const crew = (name: string) => ({
  met: metCrew,
  since: (s: PlayerState, c: Config) => (s.crew.some((m) => openingCrew(c, m.name) && m.name.startsWith(name)) ? 'On your crew' : 'Met in the opening'),
})
const inAct = (act: 1 | 2 | 3 | 4 | 5 | 6) => ({ met: (s: PlayerState) => s.act >= act, since: () => `Met in Act ${ACT_NAME[act]}` })

export const PEOPLE: Person[] = [
  {
    id: 'lyosha',
    name: 'Uncle Lyosha',
    epithet: 'The night line',
    line: 'Never spend money that has no story.',
    about: 'Alexei Voronin, 1938–1993. Ran the Combine’s unrecorded third shift from 1974; four years inside from 1984. Died of his heart on the number 4 tram, and left you his notebook, his driver and an envelope.',
    role: 'Your uncle',
    fragment: '',
    met: () => true,
    since: () => '1938–1993',
  },
  {
    id: 'vitya',
    name: 'Vitya',
    epithet: 'The driver',
    line: 'Car’s downstairs.',
    about: 'Mid-fifties, heavy, a grey army crop under a flat cap. Lyosha’s driver since 1979; yours because Lyosha told him to be. Speaks in two words and is always right about the station.',
    role: 'Crew',
    fragment: '…the driver',
    ...crew('Vitya'),
  },
  {
    id: 'dima',
    name: 'Dima',
    epithet: 'The nephew',
    line: 'I read that the co-operative law actually allows… sorry. Yes. I’ll come.',
    about: 'Nineteen, thin, a polytechnic scarf and always a folder. Family: he can’t be fired and never walks out. The highest Brains ceiling in the game, and too many words.',
    role: 'Crew · family',
    fragment: '…the boy with the folder',
    ...crew('Dima'),
  },
  {
    id: 'sasha',
    name: 'Sasha “Cold”',
    epithet: 'The card player',
    line: 'I work for money. You have some?',
    about: 'Thirties, still hands, an unlit cigarette, a deck always moving. To Sasha you’re a job: loyalty starts at half.',
    role: 'Crew',
    fragment: '…the card player',
    ...crew('Sasha'),
  },
  {
    id: 'tolya',
    name: 'Tolya',
    epithet: 'The old boss of Kiosk Row',
    line: 'Your uncle paid on the day.',
    about: 'Sixty, a Combine foreman’s jacket, a thermos, three lads in tracksuits. Carried Lyosha’s packs for ten years and kept walking the day the police came. Thinks Lyosha owed him, and that you do too.',
    role: 'Act I boss',
    fragment: '…forty kiosks, and a man who counts them',
    met: (s) => s.tutorial.done || s.rival.tolya.tickCount > 0 || s.tutorial.step >= TUTORIAL_STEPS.findIndex((st) => st.id === 'tolya'),
    since: () => 'Met in Act I',
    holds: (s, c) => (holder(s, 'kioskRow') === 'tolya' ? `Kiosk Row · ${Math.round(c.districts.list.kioskRow.tribute * 100)}% tribute` : 'Nothing now: the Row is yours'),
    mood: (s, c) => ({ words: ['hostile', 'cold', 'watchful', 'friendly'], at: tolyaHostile(s, c) ? 'hostile' : tolyaMood(s, c) }),
  },
  { id: 'pasha', name: 'Sergeant Pasha', epithet: 'The ward cop', line: 'I didn’t see anything. Happy New Year.', about: 'A round face, cognac at New Year. The first official you put on the payroll.', role: 'Official', fragment: '…the ward cop', ...official('wardCop') },
  {
    id: 'zhanna',
    name: 'Zhanna Arkadyevna',
    epithet: 'The trader',
    line: 'Her people watch every crate that moves.',
    about: 'Ran the Combine’s sales office; now the port’s freight co-operative. Not a gangster: a trader with a payroll. Speaks in prices.',
    role: 'Act II boss · rival, then trade partner',
    fragment: '…the one with the cranes',
    ...inAct(2),
    holds: (s, c) => (holder(s, 'portQuarter') === 'zhanna' ? `The Port Quarter · ${Math.round(c.districts.list.portQuarter.tribute * 100)}% tribute` : 'Her trade, not the Port'),
    mood: (s, c) => {
      const z = s.rival.zhanna.disposition
      return { words: ['hostile', 'cool', 'businesslike', 'friendly'], at: zhannaHostile(s, c) ? 'hostile' : z < 0 ? 'cool' : z >= FRIENDLY_FROM ? 'friendly' : 'businesslike' }
    },
  },
  {
    id: 'kravets',
    name: 'Major Kravets',
    epithet: 'The precinct captain',
    line: 'It has been decided that nothing happened.',
    about: 'Never seen to smile. A portrait behind his desk he hasn’t taken down. Speaks in the passive voice.',
    role: 'Official',
    fragment: '…the captain',
    ...official('precinctCaptain'),
  },
  {
    id: 'ignatov',
    name: 'Ignatov',
    epithet: 'The deputy mayor for trade',
    line: 'Respectable districts are expensive.',
    about: 'A grey suit, precise with a fish knife, a City Hall crest on his letters. Holds the Centre’s licences, and the lunch invitations.',
    role: 'Act III boss · then City Hall',
    fragment: '…across the bridge',
    ...inAct(3),
    holds: () => 'The Centre’s licences',
  },
  {
    id: 'colonel',
    name: 'The Colonel',
    epithet: 'The man who owns the road',
    line: 'The Colonel sends his regards. And his rates.',
    about: 'Demobilised with his men and a lorry park: an army-surplus coat with the insignia cut off, a field cap, a barrier across the highway. Can be paid, or bought out of the crossing; can’t be reasoned with.',
    role: 'Act IV boss',
    head: 'colonel',
    fragment: '…the army left. The men didn’t.',
    ...inAct(4),
    holds: (s, c) => (holder(s, 'zastava') === 'colonel' ? `Zastava · ${Math.round(c.districts.list.zastava.tribute * 100)}% tribute` : 'Nothing now: the road is yours'),
    mood: (s, c) => {
      const d = s.rival.colonel.disposition
      return { words: ['hostile', 'cold', 'correct', 'obliging'], at: colonelHostile(s, c) ? 'hostile' : d < 0 ? 'cold' : d >= FRIENDLY_FROM ? 'obliging' : 'correct' }
    },
  },
  { id: 'customs', name: 'The Customs Chief', epithet: 'The stamp', line: 'Everything is in order. Now.', about: 'A pension two years away and a rubber stamp.', role: 'Official', head: 'customs', fragment: '…the stamp costs more than the goods', ...official('customsChief') },
  {
    id: 'golovin',
    name: 'Golovin',
    epithet: 'The Red Director',
    line: 'Voronin’s family. I signed your uncle’s dismissal.',
    about: 'Sixties, heavy glasses, a small hole in his lapel where the Party pin was, a stack of vouchers as thick as a brick. The only person who calls you by Lyosha’s surname.',
    role: 'Act V boss',
    head: 'golovin',
    fragment: '…the director signed it himself. 1984.',
    ...inAct(5),
    holds: (s) => (s.politics.mayor ? 'The opposition’s seat' : holder(s, 'kombinat') === 'player' ? 'The workers’ vouchers, and every election' : 'The Combine, until the auction'),
  },
  { id: 'governor', name: 'The Governor', epithet: 'The telephone to the capital', line: 'I only take calls from the mayor.', about: 'Mostly a voice on a heavy phone, and a window with snow.', role: 'Official', head: 'governor', fragment: '…one telephone, and it isn’t ours', ...official('governor') },
  {
    id: 'prosecutor',
    name: 'The prosecutor',
    epithet: 'From the capital',
    line: 'Your file is thicker than you are.',
    about: 'Forties, a plain dark suit, no jewellery, a thin folder that becomes a box. Quiet; never raises their voice.',
    role: 'Act VI boss',
    head: 'prosecutor',
    fragment: '…from the capital? They’d send a quiet one.',
    ...inAct(6),
  },
  {
    id: 'collectors',
    name: 'The lender’s men',
    epithet: 'The collectors',
    line: 'We’ll take the keys. The debt is closed.',
    about: 'Two polite men, a clipboard, clean shoes. They come when a loan payment is missed.',
    role: 'The lender',
    fragment: '…never borrow from men with clean shoes',
    met: (s) => s.stats.loans.missed > 0,
    since: () => 'Met over a missed payment',
  },
]
