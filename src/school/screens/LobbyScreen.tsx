import { useState } from 'react'
import './LobbyScreen.css'
import { useSchoolGame } from '../state/SchoolGameContext'
import { MAX_PLAYERS, MIN_PLAYERS } from '../data/roles'

export function LobbyScreen() {
  const { isHost, players, hostAssignRoles } = useSchoolGame()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const roster = Object.values(players)
    .filter((p) => !p.isHost)
    .sort((a, b) => a.joinedAtMs - b.joinedAtMs)
  const count = roster.length
  const canStart = count >= MIN_PLAYERS && count <= MAX_PLAYERS

  async function start() {
    setError('')
    setBusy(true)
    try {
      await hostAssignRoles()
    } catch (e) {
      setError(e instanceof Error ? e.message : '알 수 없는 오류가 발생했다.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="sc-lobby">
      <div className="sc-lobby__head">
        <span className="sc-lobby__eyebrow">아직 시작하지 않았다</span>
        <h1>
          {count}명이 모였다
          <span className="sc-lobby__range">
            {' '}
            / {MIN_PLAYERS}~{MAX_PLAYERS}
          </span>
        </h1>
      </div>

      <ul className="sc-lobby__list">
        {roster.map((p, i) => (
          <li key={p.id} className="sc-lobby__row">
            <span className="sc-lobby__index">{String(i + 1).padStart(2, '0')}</span>
            <span className="sc-lobby__name">{p.nickname}</span>
          </li>
        ))}
        {roster.length === 0 && <li className="sc-lobby__empty">아직 아무도 들어오지 않았다.</li>}
      </ul>

      {isHost ? (
        <div className="sc-lobby__host">
          {!canStart && (
            <p className="sc-lobby__hint">
              {count < MIN_PLAYERS ? `최소 ${MIN_PLAYERS}명이 필요하다.` : `최대 ${MAX_PLAYERS}명까지 가능하다.`}
            </p>
          )}
          {error && <p className="sc-lobby__error">{error}</p>}
          <button className="sc-lobby__start" disabled={!canStart || busy} onClick={start}>
            역할을 배정하고 시작한다
          </button>
        </div>
      ) : (
        <p className="sc-lobby__wait">진행자가 시작할 때까지 기다린다.</p>
      )}
    </div>
  )
}
