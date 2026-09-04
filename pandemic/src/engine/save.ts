import type { GameState } from './types'

const SAVE_KEY = 'pandemic-solo:save:v1'

export function saveGame(state: GameState): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state))
  } catch {
    // 프라이빗 모드 등에서 저장이 막혀도 게임 자체는 계속 진행되게 둔다.
  }
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as GameState
  } catch {
    return null
  }
}

export function clearGame(): void {
  try {
    localStorage.removeItem(SAVE_KEY)
  } catch {
    // no-op
  }
}
