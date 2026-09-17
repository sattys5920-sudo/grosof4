// 괴이와 같은 Firebase 프로젝트를 공유해서 쓴다. 방을 허위로 만들거나
// 남의 방에 함부로 쓰는 걸 막을 정도로만 익명 인증(Anonymous Auth)을
// 켠다 — 오목판 자체는 애초에 숨길 정보가 없어서(양쪽 다 항상 전체
// 바둑판을 본다) 손패처럼 사람별로 읽기 권한을 나눌 필요는 없다.
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

let authReadyPromise: Promise<string> | null = null

export class SignInFailedError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.name = 'SignInFailedError'
    this.code = code
  }
}

export function ensureSignedIn(): Promise<string | null> {
  if (!auth) return Promise.resolve(null)
  if (authReadyPromise) return authReadyPromise
  authReadyPromise = new Promise((resolve, reject) => {
    const unsub = onAuthStateChanged(auth, (user: User | null) => {
      if (user) {
        unsub()
        resolve(user.uid)
      }
    })
    signInAnonymously(auth).catch((err) => {
      unsub()
      authReadyPromise = null
      const code = typeof err?.code === 'string' ? err.code : 'unknown'
      reject(new SignInFailedError(code, err?.message ?? String(err)))
    })
  })
  return authReadyPromise
}
