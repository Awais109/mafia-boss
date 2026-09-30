import Svg, { Circle, Path, Rect } from 'react-native-svg'
import { colors } from '../theme'

// The eight resource glyphs, drawn on a 12-unit square (design: Foundations · Glyphs). A glyph sits at about
// 0.7 of the text size beside its figure; the shape carries the meaning, never the colour alone.

export type Resource = 'dirty' | 'clean' | 'influence' | 'rep' | 'heat' | 'packs' | 'premium' | 'gold'

export const GLYPH_CHAR: Record<Resource, string> = {
  dirty: '◆',
  clean: '●',
  influence: '✦',
  rep: '★',
  heat: '▲',
  packs: '▮',
  premium: '▣',
  gold: '▰',
}

export const CHAR_RESOURCE: Record<string, Resource> = Object.fromEntries(
  Object.entries(GLYPH_CHAR).map(([k, v]) => [v, k as Resource]),
) as Record<string, Resource>

export function Glyph({ kind, size = 10, color }: { kind: Resource; size?: number; color?: string }) {
  const fill = color ?? colors[kind]
  return (
    <Svg width={size} height={size} viewBox="0 0 12 12" accessibilityLabel={kind}>
      {kind === 'dirty' && <Path d="M6 .6 11.4 6 6 11.4.6 6Z" fill={fill} />}
      {kind === 'clean' && <Circle cx={6} cy={6} r={4.8} fill={fill} />}
      {kind === 'influence' && <Path d="M6 .4 7.6 4.4 11.6 6 7.6 7.6 6 11.6 4.4 7.6.4 6 4.4 4.4Z" fill={fill} />}
      {kind === 'rep' && <Path d="M6 .6 7.41 4.46 11.52 4.61 8.28 7.14 9.41 11.09 6 8.8 2.59 11.09 3.72 7.14.48 4.61 4.59 4.46Z" fill={fill} />}
      {kind === 'heat' && <Path d="M6 1 11.6 10.8H.4Z" fill={fill} />}
      {kind === 'packs' && <Path d="M2.4 1.4Q2.4.8 3 .8H9Q9.6.8 9.6 1.4V3.4H2.4ZM2.4 4.2H9.6V10.6Q9.6 11.2 9 11.2H3Q2.4 11.2 2.4 10.6Z" fill={fill} />}
      {kind === 'premium' && (
        <>
          <Rect x={3} y={1.4} width={6} height={9.2} rx={0.5} fill="none" stroke={fill} strokeWidth={1.3} />
          <Rect x={4.8} y={3.3} width={2.4} height={5.4} fill={fill} />
        </>
      )}
      {kind === 'gold' && <Path d="M3.4 2.6H11.6L8.6 9.4H.4Z" fill={fill} />}
    </Svg>
  )
}

// Line icons on a 24-unit square: the bottom bar, the More sheet, alerts and events.
export type IconName =
  | 'home' | 'business' | 'fronts' | 'ops' | 'map' | 'more' | 'crew' | 'heat' | 'stats' | 'help' | 'log' | 'debug'
  | 'close' | 'chevronLeft' | 'chevronRight' | 'chevronDown' | 'chevronUp' | 'done' | 'lock' | 'warning' | 'ministry' | 'election'
  | 'walkout' | 'frozen' | 'ending' | 'blocked' | 'check' | 'clock' | 'flag' | 'fork' | 'cash'

export function Icon({ name, size = 24, color = colors.muted, strokeWidth = 1.6 }: { name: IconName; size?: number; color?: string; strokeWidth?: number }) {
  const common = { fill: 'none', stroke: color, strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'home' && (
        <>
          <Rect x={5} y={3} width={14} height={18} rx={1} {...common} />
          <Path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2" {...common} />
        </>
      )}
      {name === 'business' && <Path d="M3.5 9h17M5 9 6.5 4h11L19 9M6 9v11h12V9M9 12.5h6v4H9z" {...common} />}
      {name === 'fronts' && <Path d="M19.5 12a7.5 7.5 0 0 1-12.9 5.2M4.5 12a7.5 7.5 0 0 1 12.9-5.2M17.8 3.5v3.4h-3.4M6.2 20.5v-3.4h3.4" {...common} />}
      {name === 'ops' && (
        <>
          <Path d="M2.5 16.5v-3.3l3.8-1 2.6-4.2h6.4l3 4.2 3.2 1v3.3M2.5 16.5h2.3M9.2 16.5h5.6M19.2 16.5h2.3M6.4 12.2h12.4" {...common} />
          <Circle cx={7} cy={16.8} r={2.2} {...common} />
          <Circle cx={17} cy={16.8} r={2.2} {...common} />
        </>
      )}
      {name === 'map' && <Path d="M3 5.5c3-1 6-.8 9 1v14c-3-1.8-6-2-9-1zM21 5.5c-3-1-6-.8-9 1v14c3-1.8 6-2 9-1z" {...common} />}
      {name === 'more' && <Path d="M4 7h16M4 12h16M4 17h16" {...common} />}
      {name === 'crew' && (
        <>
          <Circle cx={9} cy={8} r={3.2} {...common} />
          <Path d="M3.5 19c.6-3.6 3-5.4 5.5-5.4s4.9 1.8 5.5 5.4M16 13.8c2.4 0 4 1.4 4.6 4.2" {...common} />
          <Circle cx={17} cy={9} r={2.4} {...common} />
        </>
      )}
      {name === 'heat' && <Path d="M12 3.5 21 19.5H3ZM12 9.5v5M12 16.8v.4" {...common} />}
      {name === 'stats' && <Path d="M5 20V11M10 20V5M15 20v-7M20 20V8" {...common} />}
      {name === 'help' && <Path d="M5 4h11l3 3v13H5zM8.5 10h7M8.5 13.5h7M8.5 17h4" {...common} />}
      {name === 'log' && <Path d="M4 6h2M9 6h11M4 12h2M9 12h11M4 18h2M9 18h11" {...common} />}
      {name === 'debug' && <Path d="M9 4.5 7.5 3M15 4.5 16.5 3M8 8h8v8a4 4 0 0 1-8 0zM4 11h4M16 11h4M4 17h4M16 17h4M12 8v12" {...common} />}
      {name === 'close' && <Path d="M6 6l12 12M18 6 6 18" {...common} />}
      {name === 'chevronLeft' && <Path d="M15 6l-6 6 6 6" {...common} />}
      {name === 'chevronRight' && <Path d="M9 5l7 7-7 7" {...common} />}
      {name === 'chevronDown' && <Path d="M5 9l7 7 7-7" {...common} />}
      {name === 'chevronUp' && <Path d="M5 15l7-7 7 7" {...common} />}
      {name === 'done' && <Path d="M5 12.4 10 17.2 19.2 6.8" {...common} />}
      {name === 'check' && <Path d="M5 12.4 10 17.2 19.2 6.8" {...common} />}
      {name === 'lock' && (
        <>
          <Rect x={5} y={10.4} width={14} height={10.6} rx={2} {...common} />
          <Path d="M8 10.4V8a4 4 0 0 1 8 0v2.4" {...common} />
        </>
      )}
      {name === 'flag' && <Path d="M6 21V4M6 4h11l-2.5 4L17 12H6" {...common} />}
      {name === 'fork' && <Path d="M7 4v4a5 5 0 0 0 10 0V4M12 13v8" {...common} />}
      {name === 'cash' && (
        <>
          <Rect x={3} y={7} width={18} height={10} rx={1.5} {...common} />
          <Circle cx={12} cy={12} r={2.4} {...common} />
        </>
      )}
      {name === 'clock' && (
        <>
          <Circle cx={12} cy={12} r={8.5} {...common} />
          <Path d="M12 7.5V12l3 2" {...common} />
        </>
      )}
      {name === 'warning' && (
        <>
          <Circle cx={12} cy={12} r={9} {...common} />
          <Path d="M12 7.5v5.5M12 16.2v.3" {...common} />
        </>
      )}
      {name === 'blocked' && (
        <>
          <Circle cx={12} cy={12} r={9} {...common} />
          <Path d="M5.6 5.6l12.8 12.8" {...common} />
        </>
      )}
      {name === 'ministry' && <Path d="M3 9 12 4l9 5ZM5.5 11.5v6M10 11.5v6M14 11.5v6M18.5 11.5v6M3.5 20.5h17" {...common} />}
      {name === 'election' && <Path d="M4 11h16v9H4ZM9.5 11V4.5h5V11M11 7h2" {...common} />}
      {name === 'walkout' && (
        <>
          <Circle cx={9} cy={7} r={3.2} {...common} />
          <Path d="M3.5 19.5c.6-3.6 3-5.6 5.5-5.6 1.5 0 2.9.6 4 1.8M15 16.5h6.5M18.5 13.5l3 3-3 3" {...common} />
        </>
      )}
      {name === 'frozen' && (
        <Path
          d="M12 2.5v19M3.8 7.2l16.4 9.6M3.8 16.8l16.4-9.6M9.3 4.2 12 6.4l2.7-2.2M9.3 19.8 12 17.6l2.7 2.2M4.2 10.6l3.4-.6-1.2-3.2M19.8 13.4l-3.4.6 1.2 3.2M4.2 13.4l3.4.6-1.2 3.2M19.8 10.6l-3.4-.6 1.2-3.2"
          {...common}
        />
      )}
      {name === 'ending' && <Path d="M5.5 4.5h11a2 2 0 0 1 2 2v14h-11a2 2 0 0 1-2-2zM5.5 18.5a2 2 0 0 1 2-2h11M9.5 8.5h5" {...common} />}
    </Svg>
  )
}
