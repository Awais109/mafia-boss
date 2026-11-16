// Accessibility (#45, ADR 0072). Pure, so it's tested.
//
// Resource amounts are drawn as glyphs ("−◆20", "+●5/h", "★53"), which a screen reader can't say: `spoken`
// turns a string into words for an accessibilityLabel ("minus 20 Dirty", "plus 5 Clean an hour", "53 Rep").
// `FONT_CAP` caps how far the phone's text size grows text where the layout is dense; body text grows freely.

const WORD: Record<string, string> = { '◆': 'Dirty', '●': 'Clean', '✦': 'Influence', '★': 'Rep', '▲': 'heat', '▮': 'packs', '▣': 'premium', '▰': 'gold' }

// The same shape the UI kit draws (AMOUNT in components/ui.tsx): a sign, the glyph, and a figure.
const AMOUNT = /([+\-−]?)([◆●✦★▲▮▣▰])\s?(\d[\d,]*(?:\.\d+)?[KM]?)?(\/h)?/g
const SCALE: Record<string, string> = { K: ' thousand', M: ' million' }

export function spoken(text: string): string {
  return text
    .replace(AMOUNT, (_, sign: string, glyph: string, figure?: string, perHour?: string) => {
      const word = WORD[glyph]
      const lead = sign === '+' ? 'plus ' : sign ? 'minus ' : ''
      if (!figure) return `${lead}${word}`
      const n = figure.replace(/([\d.]+)([KM])$/, (_m, x: string, s: string) => `${x}${SCALE[s]}`)
      return `${lead}${n} ${word}${perHour ? ' an hour' : ''}`
    })
    .replace(/ · /g, ', ')
    .replace(/›/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Text in the header's cells, the bottom bar and tags has fixed room; buttons and chips a little more.
export const FONT_CAP = { dense: 1.2, compact: 1.4 }
