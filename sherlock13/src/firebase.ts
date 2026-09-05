// 괴이/리듬게임과 같은 Firebase 프로젝트를 공유해서 쓴다. 이 게임은 상대에게
// 내 손패·범인 카드를 절대 보여주면 안 되므로, 여기서만 익명 인증(Anonymous
// Auth)을 추가로 켠다 — 보안 규칙이 uid 기준으로 "이 방의 호스트/게스트
// 본인만" 비공개 문서를 읽을 수 있게 걸어야 하기 때문이다(다른 프로젝트는
// 로그인 없이 공개 컬렉션만 써서 필요 없었다).
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth, signInAnonymously, onAuthStateChanged, type User } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const firebaseConfigured = Boolean(firebaseConfig.projectId)

const app = firebaseConfigured ? initializeApp(firebaseConfig) : null

export const db = app ? getFirestore(app) : null
const auth = app ? getAuth(app) : null

let authReadyPromise: Promise<string | null> | null = null

/** 이 브라우저 세션의 익명 uid가 준비될 때까지 기다린다. 방 문서 경로가
 * 전부 이 uid를 기준으로 하므로, 어떤 Firestore 호출보다도 먼저 이게
 * 끝나야 한다. */
export function ensureSignedIn(): Promise<string | null> {
  if (!auth) return Promise.resolve(null)
  if (authReadyPromise) return authReadyPromise
  authReadyPromise = new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user: User | null) => {
      if (user) {
        unsub()
        resolve(user.uid)
      }
    })
    signInAnonymously(auth).catch(() => {
      unsub()
      resolve(null)
    })
  })
  return authReadyPromise
}
