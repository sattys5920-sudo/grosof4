import type { Character } from './types'

export function isRevealedTo(viewer: Character, target: Character, gmReveal: boolean): boolean {
  if (gmReveal) return true
  if (viewer.id === target.id) return true
  // 배신자는 완벽하게 은폐에 성공해 같은 괴이 편에게도 정체를 들키지 않는다.
  if (target.role === '배신자') return false
  if (viewer.team === 'sin' && target.team === 'sin') return true
  return false
}
