// 아티팩트로 배포된 페이지에서만 동작하는 공용 랭킹판. claude.ai가 주입하는
// window.claude.use('db')로 모든 방문자가 같은 문서 저장소를 공유한다.
// 로컬 개발 서버(vite dev/preview)에는 window.claude가 없으므로 항상 null로
// 대체되고, 랭킹 UI는 조용히 숨는다.
declare global {
  interface Window {
    claude?: {
      use: (name: string) => Promise<unknown>
    }
  }
}

export interface LeaderboardEntry {
  nickname: string
  day: number
  endingId: string
  endingTitle: string
  at: string
}

interface DbDocSnapshot {
  data(): Record<string, unknown> | undefined
}
interface DbQuerySnapshot {
  docs: DbDocSnapshot[]
}
interface DbQuery {
  orderBy(field: string, dir?: 'asc' | 'desc'): DbQuery
  limit(n: number): DbQuery
  get(): Promise<DbQuerySnapshot>
}
interface DbCollection extends DbQuery {
  add(data: Record<string, unknown>): Promise<unknown>
}
interface DbNamespace {
  collection(path: string): DbCollection
}

let dbPromise: Promise<DbNamespace | null> | null = null

function getDb(): Promise<DbNamespace | null> {
  if (typeof window === 'undefined' || !window.claude?.use) return Promise.resolve(null)
  if (!dbPromise) {
    dbPromise = window.claude
      .use('db')
      .then((ns) => (ns as DbNamespace) ?? null)
      .catch(() => null)
  }
  return dbPromise
}

export async function isLeaderboardAvailable(): Promise<boolean> {
  return (await getDb()) !== null
}

export async function submitScore(entry: Omit<LeaderboardEntry, 'at'>): Promise<boolean> {
  const db = await getDb()
  if (!db) return false
  try {
    await db.collection('leaderboard').add({ ...entry, at: new Date().toISOString() })
    return true
  } catch {
    return false
  }
}

// 같은 닉네임이 여러 번 등록해도 랭킹판이 도배되지 않도록, 넉넉히 가져온 뒤
// 닉네임당 최고 기록 하나만 남겨서 상위 limit개를 돌려준다.
export async function fetchTopScores(limit = 20): Promise<LeaderboardEntry[]> {
  const db = await getDb()
  if (!db) return []
  try {
    const snap = await db.collection('leaderboard').orderBy('day', 'desc').limit(200).get()
    const seen = new Set<string>()
    const result: LeaderboardEntry[] = []
    for (const doc of snap.docs) {
      const data = doc.data() as LeaderboardEntry | undefined
      if (!data || typeof data.nickname !== 'string' || typeof data.day !== 'number') continue
      const key = data.nickname.trim().toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      result.push(data)
      if (result.length >= limit) break
    }
    return result
  } catch {
    return []
  }
}
