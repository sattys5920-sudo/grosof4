import { useState } from 'react'
import './MissionScreen.css'
import { useGame } from '../state/GameContext'
import { CHARACTERS } from '../data/characters'
import { isRevealedTo } from '../data/reveal'
import { Badge } from '../components/Badge'
import { MISSION_SIZES, TWO_FAILS_REQUIRED, WINS_NEEDED } from '../state/missionEngine'

function charOf(id: string) {
  return CHARACTERS.find((c) => c.id === id)!
}

function MissionTrack() {
  const { mission } = useGame()
  return (
    <div className="mtrack">
      {MISSION_SIZES.map((size, i) => {
        const result = mission.missionResults[i]
        const isCurrent = i === mission.missionIndex && result === null
        return (
          <div
            key={i}
            className={`mtrack__node ${result ? `is-${result}` : ''} ${isCurrent ? 'is-current' : ''}`}
          >
            <span className="mtrack__size">{size}</span>
            {TWO_FAILS_REQUIRED[i] && <span className="mtrack__two">2</span>}
          </div>
        )
      })}
    </div>
  )
}

export function MissionScreen() {
  const {
    viewerId,
    gmReveal,
    mission,
    confirmProposal,
    castVote,
    submitCard,
    continueMission,
    resetMission,
    displayName,
  } = useGame()
  const viewer = charOf(viewerId)
  const [draftTeam, setDraftTeam] = useState<string[]>([])
  const leader = charOf(CHARACTERS[mission.leaderIdx].id)
  const isLeader = leader.id === viewerId
  const teamSize = MISSION_SIZES[mission.missionIndex]
  const onTeam = mission.proposedTeam.includes(viewerId)

  function toggleDraft(id: string) {
    setDraftTeam((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= teamSize) return prev
      return [...prev, id]
    })
  }

  if (mission.phase === 'gameover') {
    const winnerLabel = mission.winner === 'ward' ? '탐구자 진영 승리' : '괴이 진영 승리'
    return (
      <div className="mission mission--gameover">
        <h2>{winnerLabel}</h2>
        <p>탐구자 {mission.wardWins}승 · 괴이 {mission.sinWins}승</p>
        <button onClick={resetMission}>새 원정 시작하기</button>
      </div>
    )
  }

  return (
    <div className="mission">
      <div className="mission__head">
        <span className="mission__index">
          {mission.missionIndex + 1}차 원정 · 필요 인원 {teamSize}명
          {TWO_FAILS_REQUIRED[mission.missionIndex] && ' (실패 카드 2장부터 실패)'}
        </span>
        <span className="mission__score">
          탐구자 {mission.wardWins} : {mission.sinWins} 괴이
        </span>
      </div>

      <MissionTrack />

      {mission.lastNote && <p className="mission__note">{mission.lastNote}</p>}

      {mission.phase === 'propose' && (
        <div className="mission__panel">
          <p className="mission__leader">
            이번 원정대장: <strong>{displayName(leader.id)}</strong>
            {isLeader && ' (나)'}
          </p>
          {isLeader ? (
            <>
              <div className="mission__roster">
                {CHARACTERS.map((c) => (
                  <button
                    key={c.id}
                    className={`mission__pick ${draftTeam.includes(c.id) ? 'is-picked' : ''}`}
                    onClick={() => toggleDraft(c.id)}
                  >
                    <Badge
                      team={c.team}
                      size={20}
                      revealed={isRevealedTo(viewer, c, gmReveal)}
                    />
                    <span>{displayName(c.id)}</span>
                  </button>
                ))}
              </div>
              <button
                className="mission__cta"
                disabled={draftTeam.length !== teamSize}
                onClick={() => confirmProposal(draftTeam)}
              >
                원정대 제안 ({draftTeam.length}/{teamSize})
              </button>
            </>
          ) : (
            <>
              <div className="mission__roster mission__roster--readonly">
                {mission.proposedTeam.map((id) => {
                  const c = charOf(id)
                  return (
                    <div key={id} className="mission__pick is-picked">
                      <Badge team={c.team} size={20} revealed={isRevealedTo(viewer, c, gmReveal)} />
                      <span>{displayName(c.id)}</span>
                    </div>
                  )
                })}
              </div>
              <button className="mission__cta" onClick={() => confirmProposal(mission.proposedTeam)}>
                투표 시작
              </button>
            </>
          )}
        </div>
      )}

      {mission.phase === 'vote' && (
        <div className="mission__panel">
          <p className="mission__leader">
            <strong>{displayName(leader.id)}</strong>의 제안 — 부결 {mission.rejectionCount}/5
          </p>
          <div className="mission__roster mission__roster--readonly">
            {mission.proposedTeam.map((id) => {
              const c = charOf(id)
              return (
                <div key={id} className="mission__pick is-picked">
                  <Badge team={c.team} size={20} revealed={isRevealedTo(viewer, c, gmReveal)} />
                  <span>{displayName(c.id)}</span>
                </div>
              )
            })}
          </div>
          <div className="mission__vote-row">
            <button className="mission__vote mission__vote--yes" onClick={() => castVote(true)}>
              찬성
            </button>
            <button className="mission__vote mission__vote--no" onClick={() => castVote(false)}>
              반대
            </button>
          </div>
        </div>
      )}

      {mission.phase === 'execute' && (
        <div className="mission__panel">
          <p className="mission__leader">원정 진행 중 — 팀원들이 카드를 제출하고 있다</p>
          <div className="mission__roster mission__roster--readonly">
            {mission.proposedTeam.map((id) => {
              const c = charOf(id)
              return (
                <div key={id} className="mission__pick is-picked">
                  <Badge team={c.team} size={20} revealed={isRevealedTo(viewer, c, gmReveal)} />
                  <span>{displayName(c.id)}</span>
                </div>
              )
            })}
          </div>
          {onTeam ? (
            <div className="mission__vote-row">
              <button className="mission__vote mission__vote--yes" onClick={() => submitCard('success')}>
                성공 카드 제출
              </button>
              {viewer.team === 'sin' && (
                <button className="mission__vote mission__vote--no" onClick={() => submitCard('fail')}>
                  실패 카드 제출
                </button>
              )}
            </div>
          ) : (
            <button className="mission__cta" onClick={() => submitCard(null)}>
              결과 확인하기
            </button>
          )}
        </div>
      )}

      {mission.phase === 'result' && (
        <div className="mission__panel">
          {mission.cardTally && (
            <p className="mission__leader">
              성공 {mission.cardTally.success} · 실패 {mission.cardTally.fail}
            </p>
          )}
          <button className="mission__cta" onClick={continueMission}>
            {mission.wardWins >= WINS_NEEDED || mission.sinWins >= WINS_NEEDED
              ? '결과 확인'
              : '다음 원정으로'}
          </button>
        </div>
      )}
    </div>
  )
}
