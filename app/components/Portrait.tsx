import { View } from 'react-native'
import { SvgXml } from 'react-native-svg'
import { CREW_HEAD_LABEL, CREW_HEADS, HEAD_LABEL, HEADS, type CrewHeadId, type HeadId } from '../art/heads'

// A headshot from the design, ink on paper, with the corners the design gives it.
export function Head({ id, size = 56 }: { id: HeadId; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: 4, overflow: 'hidden' }} accessible accessibilityRole="image" accessibilityLabel={HEAD_LABEL[id]}>
      <SvgXml xml={HEADS[id]} width={size} height={size} />
    </View>
  )
}

// One of the opening's crew (Crew, the hiring scene).
export function CrewHead({ id, size = 64 }: { id: CrewHeadId; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: 4, overflow: 'hidden' }} accessible accessibilityRole="image" accessibilityLabel={CREW_HEAD_LABEL[id]}>
      <SvgXml xml={CREW_HEADS[id]} width={size} height={size} />
    </View>
  )
}
