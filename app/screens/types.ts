import type { Snapshot } from '../store'

export type TabId = 'home' | 'rackets' | 'fronts' | 'ops' | 'crew' | 'heat' | 'turf' | 'stats' | 'help' | 'log' | 'settings' | 'debug'

export type ScreenProps = {
  game: Snapshot
  go: (tab: TabId) => void
}
