import { useState } from 'react'
import './AuthScreen.css'
import { useGame } from '../state/GameContext'
import { SCHOOL_NAME } from '../data/characters'

export function AuthScreen() {
  const { register, login, loginAsAdmin, registerAdmin, loginAdmin } = useGame()
  const [mode, setMode] = useState<'register' | 'login'>('register')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const [adminMode, setAdminMode] = useState<'quick' | 'register' | 'login'>('quick')
  const [adminCode, setAdminCode] = useState('')
  const [adminUsername, setAdminUsername] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminError, setAdminError] = useState('')
  const [adminBusy, setAdminBusy] = useState(false)

  async function submit() {
    if (!username.trim() || !password.trim() || busy) return
    setBusy(true)
    setError('')
    try {
      if (mode === 'register') {
        await register(username, password)
      } else {
        await login(username, password)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '알 수 없는 오류가 발생했다.')
    } finally {
      setBusy(false)
    }
  }

  async function submitAdmin() {
    if (adminBusy) return
    setAdminError('')
    setAdminBusy(true)
    try {
      if (adminMode === 'quick') {
        loginAsAdmin(adminCode)
      } else if (adminMode === 'register') {
        await registerAdmin(adminUsername, adminPassword, adminCode)
      } else {
        await loginAdmin(adminUsername, adminPassword)
      }
    } catch (e) {
      setAdminError(e instanceof Error ? e.message : '알 수 없는 오류가 발생했다.')
    } finally {
      setAdminBusy(false)
    }
  }

  return (
    <div className="auth">
      <div className="auth__intro">
        <span className="auth__eyebrow">{SCHOOL_NAME} · 재학생 확인</span>
        <h1>{mode === 'register' ? '처음 왔다면' : '다시 왔다면'}</h1>
        <p>아이디와 비밀번호로 자신을 증명해야 한다....... 이 안개 속에서는 그것만이 유일한 증거다.</p>
      </div>

      <div className="auth__tabs">
        <button className={`auth__tab ${mode === 'register' ? 'is-active' : ''}`} onClick={() => setMode('register')}>
          가입하기
        </button>
        <button className={`auth__tab ${mode === 'login' ? 'is-active' : ''}`} onClick={() => setMode('login')}>
          로그인
        </button>
      </div>

      <label className="auth__field">
        <span>아이디</span>
        <input
          value={username}
          maxLength={20}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="영문/숫자로 입력"
        />
      </label>

      <label className="auth__field">
        <span>비밀번호</span>
        <input
          type="password"
          value={password}
          maxLength={40}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="비밀번호를 입력"
        />
      </label>

      {error && <p className="auth__error">{error}</p>}

      <button className="auth__submit" disabled={!username.trim() || !password.trim() || busy} onClick={submit}>
        {busy ? '확인 중......' : mode === 'register' ? '가입하기' : '로그인'}
      </button>

      <button className="auth__admin-toggle" onClick={() => setAdminOpen((prev) => !prev)}>
        불가이신가요?
      </button>

      {adminOpen && (
        <div className="auth__admin-box">
          <div className="auth__admin-modes">
            <button
              className={adminMode === 'quick' ? 'is-active' : ''}
              onClick={() => setAdminMode('quick')}
            >
              코드로 입장
            </button>
            <button
              className={adminMode === 'register' ? 'is-active' : ''}
              onClick={() => setAdminMode('register')}
            >
              불가 가입
            </button>
            <button
              className={adminMode === 'login' ? 'is-active' : ''}
              onClick={() => setAdminMode('login')}
            >
              불가 로그인
            </button>
          </div>

          {adminMode === 'quick' && (
            <input
              value={adminCode}
              onChange={(e) => setAdminCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitAdmin()}
              placeholder="관리자 코드"
            />
          )}

          {(adminMode === 'register' || adminMode === 'login') && (
            <>
              <input
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                placeholder="관리자 아이디"
              />
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitAdmin()}
                placeholder="관리자 비밀번호"
              />
            </>
          )}

          {adminMode === 'register' && (
            <input
              value={adminCode}
              onChange={(e) => setAdminCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitAdmin()}
              placeholder="관리자 코드 (가입 확인용)"
            />
          )}

          <button onClick={submitAdmin} disabled={adminBusy}>
            {adminBusy
              ? '확인 중......'
              : adminMode === 'quick'
                ? '관리자로 입장'
                : adminMode === 'register'
                  ? '불가로 가입하기'
                  : '불가로 로그인'}
          </button>
          {adminError && <p className="auth__error">{adminError}</p>}
        </div>
      )}
    </div>
  )
}
