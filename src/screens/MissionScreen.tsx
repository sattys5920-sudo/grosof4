import { useEffect, useState } from 'react'
import './MissionScreen.css'
import { useGame } from '../state/GameContext'
import { CHARACTERS } from '../data/characters'
import { isRevealedTo } from '../data/reveal'
import { Badge } from '../components/Badge'
import { MISSION_SIZES, TWO_FAILS_REQUIRED, WINS_NEEDED } from '../state/missionEngine'

const DISCUSSION_MS = 3 * 60 * 1000

function charOf(id: string) {
  return CHARACTERS.find((c) => c.id === id)!
}

function formatCountdown(ms: number) {
  const total = Math.ceil(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function MissionDiscussionPanel() {
  const {
    isAdmin,
    viewerId,
    missionMessages,
    sendMissionMessage,
    discussionOpen,
    discussionOpenedAt,
    setDiscussionOpen,
    displayName,
  } = useGame()
  const [draft, setDraft] = useState('')
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (!discussionOpen) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [discussionOpen])

  const canChat = !!viewerId || isAdmin
  const remainingMs = discussionOpenedAt ? Math.max(0, discussionOpenedAt + DISCUSSION_MS - now) : 0

  function submit() {
    sendMissionMessage(draft)
    setDraft('')
  }

  return (
    <div className={`mdisc ${discussionOpen ? 'is-open' : ''}`}>
      <div className="mdisc__head">
        <span className="mdisc__title">원정 토론</span>
        {discussionOpen && discussionOpenedAt && (
          <span className={`mdisc__timer ${remainingMs === 0 ? 'is-over' : ''}`}>
            {remainingMs > 0 ? formatCountdown(remainingMs) : '시간 종료'}
          </span>
        )}
        {isAdmin && (
          <button className="mdisc__toggle" onClick={() => setDiscussionOpen(!discussionOpen)}>
            {discussionOpen ? '토론 닫기' : '토론 열기'}
          </button>
        )}
      </div>

      {discussionOpen ? (
        <>
          <div className="mdisc__log">
            {missionMessages.length === 0 && (
              <p className="mdisc__empty">아직 아무도 말하지 않았다....... 3 분 동안 자유롭게 의논해보자.</p>
            )}
            {missionMessages.map((m) => {
              const isMe = m.authorId === viewerId
              const isGm = m.authorId === 'admin'
              return (
                <div key={m.id} className={`mdisc__msg ${isMe ? 'is-me' : ''} ${isGm ? 'is-gm' : ''}`}>
                  <span className="mdisc__msg-name">{displayName(m.authorId)}</span>
                  <p className="mdisc__msg-text">{m.text}</p>
                </div>
              )
            })}
          </div>
          {canChat && (
            <div className="mdisc__composer">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                placeholder="원정 토론방에 메시지 보내기......"
              />
              <button onClick={submit}>전송</button>
            </div>
          )}
        </>
      ) : (
        <p className="mdisc__locked">불가가 토론을 열면 대화할 수 있다.</p>
      )}
    </div>
  )
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
    isAdmin,
    gmReveal,
    missionsOpen,
    mission,
    confirmProposal,
    castVote,
    submitCard,
    continueMission,
    resetMission,
    displayName,
  } = useGame()
  const [draftTeam, setDraftTeam] = useState<string[]>([])
  const leader = charOf(mission.turnOrder[mission.leaderIdx])
  const isLeader = leader.id === viewerId
  const teamSize = MISSION_SIZES[mission.missionIndex]
  const onTeam = viewerId ? mission.proposedTeam.includes(viewerId) : false

  function toggleDraft(id: string) {
    setDraftTeam((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= teamSize) return prev
      return [...prev, id]
    })
  }

  if (!missionsOpen) {
    return (
      <div className="mission mission--locked">
        <span className="mission__lock-icon">▧</span>
        <p className="mission__lock-text">원정은 아직 열리지 않았다. GM이 열 때까지 기다려야 한다.</p>
      </div>
    )
  }

  if (isAdmin || !viewerId) {
    return (
      <div className="mission">
        <div className="mission__head">
          <span className="mission__index">
            {mission.missionIndex + 1} 차 원정 · 불가 관전
          </span>
          <span className="mission__score">
            선 {mission.wardWins} : {mission.sinWins} 악
          </span>
        </div>
        <MissionTrack />
        {mission.lastNote && <p className="mission__note">{mission.lastNote}</p>}
        <p className="mission__lock-text">불가는 원정에 참여하지 않고 진행 상황만 지켜본다.</p>
        <MissionDiscussionPanel />
      </div>
    )
  }

  const viewer = charOf(viewerId)

  if (mission.phase === 'gameover') {
    const winnerLabel = mission.winner === 'ward' ? '선 진영 승리' : '악 진영 승리'
    return (
      <div className="mission mission--gameover">
        <h2>{winnerLabel}</h2>
        <p>선 {mission.wardWins} 승 · 악 {mission.sinWins} 승</p>
        <button onClick={resetMission}>새 원정 시작하기</button>
      </div>
    )
  }

  return (
    <div className="mission">
      <div className="mission__head">
        <span className="mission__index">
          {mission.missionIndex + 1} 차 원정 · 필요 인원 {teamSize} 명
          {TWO_FAILS_REQUIRED[mission.missionIndex] && ' (실패 카드 2 장부터 실패)'}
        </span>
        <span className="mission__score">
          선 {mission.wardWins} : {mission.sinWins} 악
        </span>
      </div>

      <MissionTrack />

      {mission.lastNote && <p className="mission__note">{mission.lastNote}</p>}

      <MissionDiscussionPanel />

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
