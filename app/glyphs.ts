// The text glyphs that carry resources in strings ("◆20", "★53"); `Rich` in components/ui.tsx draws them.
// Their own module, free of React Native, so pure modules (goals, the next-step card) can be tested.
export const glyph = { dirty: '◆', clean: '●', influence: '✦', rep: '★', heat: '▲', packs: '▮', premium: '▣', gold: '▰' } as const
