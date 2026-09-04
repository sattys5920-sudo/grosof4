// 곡별 최고 기록을 localStorage에 저장한다. 파일 자체는 저장하지 않는다
// (매번 사용자가 자기 파일을 다시 골라야 하지만, 서버 업로드가 전혀
// 없다는 뜻이기도 하다). 곡을 구분하는 키는 호출부에서 만든다 —
// 사용자가 고른 파일은 파일명+용량, 수록곡은 고정 id를 쓴다.
import type { Difficulty, PlayResult } from './types'

const PREFIX = 'rhythm-solo:best:v1:'
const NICKNAME_KEY = 'rhythm-solo:nickname:v1'

export function loadNickname(): string {
  try {
    return localStorage.getItem(NICKNAME_KEY) ?? ''
  } catch {
    return ''
  }
}

export function saveNickname(nickname: string): void {
  try {
    localStorage.setItem(NICKNAME_KEY, nickname)
  } catch {
    // 저장 실패해도 게임 진행에는 지장 없다
  }
}

export function fileSongKey(fileName: string, fileSize: number): string {
  return `file:${fileName}:${fileSize}`
}

export function builtinSongKey(id: string): string {
  return `builtin:${id}`
}

function storageKey(songKey: string, difficulty: Difficulty): string {
  return `${PREFIX}${songKey}:${difficulty}`
}

export function loadBest(songKey: string, difficulty: Difficulty): PlayResult | null {
  try {
    const raw = localStorage.getItem(storageKey(songKey, difficulty))
    if (!raw) return null
    return JSON.parse(raw) as PlayResult
  } catch {
    return null
  }
}

/** 이번 기록이 기존 최고 기록보다 높으면 저장하고 true를 돌려준다. */
export function saveBestIfHigher(songKey: string, difficulty: Difficulty, result: PlayResult): boolean {
  try {
    const prev = loadBest(songKey, difficulty)
    if (prev && prev.score >= result.score) return false
    localStorage.setItem(storageKey(songKey, difficulty), JSON.stringify(result))
    return true
  } catch {
    return false
  }
}
