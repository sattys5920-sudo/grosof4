import type { Character } from './types'

export function isRevealedTo(viewer: Character, target: Character, gmReveal: boolean): boolean {
  if (gmReveal) return true
  if (viewer.id === target.id) return true
  return false
}
