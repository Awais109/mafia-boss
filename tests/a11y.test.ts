import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { spoken } from '../app/a11y'

// Accessibility (#45, ADR 0072): amounts read as words, and nothing tappable goes without a role.

describe('spoken', () => {
  it('reads resource amounts as words', () => {
    expect(spoken('Collect ◆72')).toBe('Collect 72 Dirty')
    expect(spoken('−◆20 · +●5/h')).toBe('minus 20 Dirty, plus 5 Clean an hour')
    expect(spoken('★1,200 to Act III')).toBe('1,200 Rep to Act III')
    expect(spoken('needs ✦12 · you have ✦10')).toBe('needs 12 Influence, you have 10 Influence')
    expect(spoken('◆1.21M on hand')).toBe('1.21 million Dirty on hand')
    expect(spoken('Claim ▰2')).toBe('Claim 2 gold')
    expect(spoken('+▲3')).toBe('plus 3 heat')
    expect(spoken('Fronts ›')).toBe('Fronts')
    expect(spoken('no glyphs here')).toBe('no glyphs here')
  })
})

// Every <Pressable> (and the like) in the app says what it is to a screen reader. A static check, since the app
// isn't rendered in tests: it reads each opening tag.
function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    return statSync(p).isDirectory() ? tsxFiles(p) : p.endsWith('.tsx') ? [p] : []
  })
}

function openingTags(source: string, tag: string): { line: number; text: string }[] {
  const out: { line: number; text: string }[] = []
  for (const m of source.matchAll(new RegExp(`<${tag}\\b`, 'g'))) {
    let i = m.index! + m[0].length
    let depth = 0
    for (; i < source.length; i++) {
      const ch = source[i]
      if (ch === '{') depth++
      else if (ch === '}') depth--
      else if (ch === '>' && depth === 0) break
    }
    out.push({ line: source.slice(0, m.index).split('\n').length, text: source.slice(m.index, i) })
  }
  return out
}

describe('every tappable thing has a role', () => {
  it('in App.tsx and everything under app/', () => {
    const missing: string[] = []
    for (const file of ['App.tsx', ...tsxFiles('app')]) {
      const source = readFileSync(file, 'utf8')
      for (const tag of ['Pressable', 'TouchableOpacity', 'TouchableHighlight']) {
        for (const t of openingTags(source, tag)) if (!t.text.includes('accessibilityRole')) missing.push(`${file}:${t.line}`)
      }
    }
    expect(missing).toEqual([])
  })
})
