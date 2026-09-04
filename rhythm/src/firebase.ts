// 괴이(루트 앱)와 같은 Firebase 프로젝트를 공유해서 쓴다 — 별도 서버 없이
// 랭킹만 저장할 것이므로 sessions/live 트리와는 다른 최상위 컬렉션
// (rhythmScores)에만 접근한다. 설정값은 배포 시 같은 VITE_FIREBASE_*
// 환경변수를 빌드에 주입해서 채운다 (루트 앱의 src/firebase.ts와 동일한
// 방식).
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

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
