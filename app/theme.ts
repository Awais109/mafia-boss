// The warm-ledger identity (design/Sevgorod Screens.html, "Foundations"). Two registers: the ledger (dark,
// calm, numbers first) for operations screens, and paper and ink for the notebook and the story.

export const colors = {
  // Ledger neutrals: brown-black ink, bone text
  bg: '#16130f', // ground: the screen
  shell: '#1b1712', // header and bottom bar
  card: '#1f1b16',
  cardAlt: '#2a251e', // nested cards, inputs, options
  border: '#3b3429', // hairlines, rules
  divider: '#2e2820', // rules inside the shell and between card rows
  control: '#4a4133', // borders of buttons and options
  text: '#ece4d3', // bone
  muted: '#ab9f89',
  faint: '#8c826f', // card only
  // Brass and states
  accent: '#c9a86a', // brass: titles, active tab, primary button, wordmark
  dot: '#e2c07a', // a tab that wants you
  rule: '#6a5634', // single rule above a total, double below
  warn: '#e8a33d',
  good: '#5fbf7f',
  bad: '#ec7b6b', // red, as text
  link: '#9dbfe6',
  // Resources: fixed game language
  dirty: '#d9a441',
  clean: '#5fbf7f',
  influence: '#6fa8dc',
  rep: '#b48ee6',
  heat: '#e0604f', // the ▲ glyph; heat as text uses `bad`
  packs: '#c79a6b',
  premium: '#e07a7a',
  gold: '#e8c547',
} as const

// Paper and ink: story surfaces and the notebook only; the ledger stays flat.
export const paper = {
  paper: '#ece6d8',
  paperLight: '#f4efe3',
  ink: '#15120f',
  squared: '#ece5d3',
  grid: '#c9d3dc',
  fountain: '#1f2a44', // Lyosha's ink, once a place is known
  pencil: '#6b675f',
  pencilLine: '#8b877e',
  redPencil: '#b23a29', // your own marks
  stampRed: '#c8432f',
  brassInk: '#8a6a2e',
} as const

// The resource glyphs as they're inked on paper: the same hues, dark enough to read on the page.
export const paperInk = {
  dirty: '#9a6a1c',
  clean: '#2f7a4a',
  influence: '#2f5f8f',
  rep: '#6b4aa0',
  heat: '#b23a29',
  packs: '#7a5a3a',
  premium: '#a24a4a',
  gold: '#8a6a2e',
} as const

// Five faces, never more than three on one screen. Each weight is its own family on native platforms.
export const fonts = {
  display700: 'FiraSansExtraCondensed_700Bold',
  display800: 'FiraSansExtraCondensed_800ExtraBold',
  display900: 'FiraSansExtraCondensed_900Black',
  text400: 'IBMPlexSansCondensed_400Regular',
  text500: 'IBMPlexSansCondensed_500Medium',
  text600: 'IBMPlexSansCondensed_600SemiBold',
  speech: 'PatrickHandSC_400Regular', // speech bubbles, all caps
  caption: 'SpecialElite_400Regular', // captions and slugs
  hand500: 'Caveat_500Medium', // Lyosha's notebook
  hand700: 'Caveat_700Bold',
} as const

// The text family for a weight: custom fonts can't be bolded with fontWeight on Android.
export function textFont(weight: 400 | 500 | 600 = 400): string {
  return weight === 600 ? fonts.text600 : weight === 500 ? fonts.text500 : fonts.text400
}
