// 곡+난이도별 전체 랭킹. 괴이와 같은 Firebase 프로젝트의 rhythmScores
// 컬렉션에 저장한다. 사람마다(닉네임 기준) 한 문서만 갖고, 그 문서를 자기
// 최고 기록으로만 덮어쓴다 — 별도 인덱스 없이도(where만 쓰고 orderBy는
// 클라이언트에서) 동작하도록 정렬은 받아온 뒤 여기서 한다.
import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore'
import { db } from '../firebase'
import type { Difficulty, PlayResult } from './types'

export interface RankingEntry {
  nickname: string
  score: number
  accuracy: number
  maxCombo: number
}

function songDifficultyKey(songId: string, difficulty: Difficulty): string {
  return `${songId}:${difficulty}`
}

function docId(songId: string, difficulty: Difficulty, nickname: string): string {
  return `${songDifficultyKey(songId, difficulty)}:${nickname}`
}

/** 이번 기록이 이 사람의(닉네임 기준) 기존 랭킹 기록보다 높을 때만
 * 서버에 저장한다. Firebase가 설정 안 돼 있으면 조용히 아무것도 안 한다. */
export async function submitRankingIfHigher(songId: string, difficulty: Difficulty, nickname: string, result: PlayResult): Promise<void> {
  if (!db || !nickname) return
  try {
    const ref = doc(db, 'rhythmScores', docId(songId, difficulty, nickname))
    const prev = await getDoc(ref)
    if (prev.exists() && (prev.data().score ?? 0) >= result.score) return
    await setDoc(ref, {
      songId,
      difficulty,
      nickname,
      score: result.score,
      accuracy: result.accuracy,
      maxCombo: result.maxCombo,
      updatedAt: Date.now(),
    })
  } catch {
    // 네트워크/권한 문제로 실패해도 로컬 기록·게임 진행에는 지장 없다
  }
}

export interface RankInfo {
  rank: number
  total: number
}

/** 기록을 저장하고(더 높을 때만), 이 닉네임이 그 곡+난이도 전체에서
 * 몇 등인지도 함께 돌려준다. Firebase가 없거나 실패하면 null. */
export async function submitRankingAndGetRank(songId: string, difficulty: Difficulty, nickname: string, result: PlayResult): Promise<RankInfo | null> {
  await submitRankingIfHigher(songId, difficulty, nickname, result)
  if (!db || !nickname) return null
  const entries = await fetchRanking(songId, difficulty)
  const index = entries.findIndex((e) => e.nickname === nickname)
  if (index === -1) return null
  return { rank: index + 1, total: entries.length }
}

/** 특정 곡+난이도의 전체 랭킹을 점수 내림차순으로 가져온다. */
export async function fetchRanking(songId: string, difficulty: Difficulty): Promise<RankingEntry[]> {
  if (!db) return []
  try {
    const q = query(collection(db, 'rhythmScores'), where('songId', '==', songId), where('difficulty', '==', difficulty))
    const snap = await getDocs(q)
    const entries: RankingEntry[] = snap.docs.map((d) => {
      const data = d.data()
      return { nickname: String(data.nickname ?? '???'), score: Number(data.score ?? 0), accuracy: Number(data.accuracy ?? 0), maxCombo: Number(data.maxCombo ?? 0) }
    })
    entries.sort((a, b) => b.score - a.score)
    return entries
  } catch {
    return []
  }
}
