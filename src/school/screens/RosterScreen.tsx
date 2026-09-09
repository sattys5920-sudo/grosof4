import { useState } from 'react'
import './RosterScreen.css'
import { useSchoolGame } from '../state/SchoolGameContext'
import { roleById } from '../data/roles'
import { actionByKind } from '../data/actions'
import { missionCompleteCount, missionTotalCount } from '../engine/missionProgress'

export function RosterScreen() {
  const { isHost, viewerId, players, otherPlayerIds, session } = useSchoolGame()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const classmates = otherPlayerIds
    .map((id) => players[id])
    .filter(Boolean)
    .sort((a, b) => a.nickname.localeCompare(b.nickname, 'ko'))

  if (isHost) {
    return (
      <div className="sc-roster">
        <h1 className="sc-roster__title">아이들</h1>
        <ul className="sc-roster__list">
          {classmates.map((p) => {
            const role = p.roleId ? roleById[p.roleId] : null
            return (
              <li key={p.id} className="sc-roster__row">
                <span className="sc-roster__name">{p.nickname}</span>
                <span className="sc-roster__meta">
                  {role ? role.name : '역할 미배정'}
                  {role && ` · 미션 ${missionCompleteCount(p)}/${missionTotalCount(role)}`}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    )
  }

  const selected = selectedId ? players[selectedId] : null
  const sharedLog = selectedId
    ? session.actionLog
        .filter(
          (e) =>
            (e.actorId === viewerId && e.targetId === selectedId) ||
            (e.actorId === selectedId && e.targetId === viewerId),
        )
        .sort((a, b) => a.createdAtMs - b.createdAtMs)
    : []

  return (
    <div className="sc-roster">
      <h1 className="sc-roster__title">아이들</h1>
      <ul className="sc-roster__list">
        {classmates.map((p) => (
          <li key={p.id}>
            <button
              className={`sc-roster__row sc-roster__row--tap ${selectedId === p.id ? 'is-selected' : ''}`}
              onClick={() => setSelectedId(selectedId === p.id ? null : p.id)}
            >
              <span className="sc-roster__name">{p.nickname}</span>
              <span className="sc-roster__chevron">{selectedId === p.id ? '−' : '+'}</span>
            </button>
            {selectedId === p.id && (
              <div className="sc-roster__detail">
                {sharedLog.length === 0 && <p className="sc-roster__empty">{selected?.nickname}와 아직 아무 일도 없었다.</p>}
                {sharedLog.map((e) => {
                  const mine = e.actorId === viewerId
                  return (
                    <div key={e.id} className="sc-roster__entry">
                      <span className="sc-roster__entry-actor">{mine ? '나' : selected?.nickname}</span>
                      <span className="sc-roster__entry-kind">{actionByKind[e.kind].label}</span>
                      {e.text && <span className="sc-roster__entry-text">{e.text}</span>}
                    </div>
                  )
                })}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
