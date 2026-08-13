import { useEffect, useRef, useState } from 'react'
import './MissionScreen.css'
import { useGame } from '../state/GameContext'
import { CHARACTERS } from '../data/characters'
import { isRevealedTo } from '../data/reveal'
import { Badge } from '../components/Badge'
import { ChatAvatar } from '../components/ChatAvatar'
import {
  MAX_REJECTIONS,
  MISSION_PHASE_MS,
  MISSION_SIZES,
  TWO_FAILS_REQUIRED,
  resolvedTeam,
} from '../state/missionEngine'

function MissionPopup({ text, onClose }: { text: string; onClose: () => void }) {
  return (
    <div className="mission-popup__backdrop" role="alertdialog" aria-modal="true">
      <div className="mission-popup__box">
        <span className="mission-popup__kind">원정 결과</span>
        <p className="mission-popup__body">{text}</p>
        <button className="mission-popup__dismiss" onClick={onClose}>
          확인
        </button>
      </div>
    </div>
  )
}

const DISCUSSION_MS = 2 * 60 * 1000

const MISSION_SUCCESS_FLAVOR = [
  '조사대가 흔적을 끝까지 쫓았다....... 괴이의 정체가 드러났다. 오래전 이 학교 어딘가에서 소리 없이 사라진 한 학생의 망령이었다.',
  '조사대가 마지막 단서를 찾아냈다....... 괴이는 실체가 없었다. 그저 누군가 남기고 간 미련이, 사람의 형태를 하고 이 복도를 떠돌고 있었을 뿐이다.',
  '조사대가 진실에 가까이 다가섰다....... 괴이의 정체는 몇 해 전 이 학교를 떠났다던 학생, 그 사라짐의 잔상이었다.',
  '조사대가 마침내 실체를 확인했다....... 괴이는 다른 무엇도 아닌, 이곳에서 잊혀진 어느 부원의 원념이었다.',
  '조사대가 모든 것을 밝혀냈다....... 괴이의 정체는 스스로도 자신이 사라졌다는 사실을 모르는, 어느 부원의 망령이었다.',
]

const MISSION_FAIL_FLAVOR = [
  '조사가 실패로 끝났다....... 무언가를 보긴 했지만, 그게 뭐였는지는 끝내 알 수 없었다.',
  '조사가 실패로 끝났다....... 손에 잡힐 듯했던 단서는 안개처럼 흩어져 사라졌다.',
  '조사가 실패로 끝났다....... 분명 무언가 있었는데, 뭐가 뭔지 알 수가 없다.',
  '조사가 실패로 끝났다....... 기록도, 기억도 남지 않았다. 아무것도 밝혀내지 못했다.',
  '조사가 실패로 끝났다....... 괴이는 끝까지 정체를 드러내지 않았다.',
]

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
    players,
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
        <span className="mdisc__title">조사 토론</span>
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
              <p className="mdisc__empty">아직 아무도 말하지 않았다.</p>
            )}
            {missionMessages.map((m) => {
              const isMe = m.authorId === viewerId
              const isGm = m.authorId === 'admin'
              const name = displayName(m.authorId)
              return (
                <div key={m.id} className={`mdisc__msg-row ${isMe ? 'is-me' : ''}`}>
                  {!isMe && <ChatAvatar authorId={m.authorId} name={name} photo={players[m.authorId]?.photo} />}
                  <div className={`mdisc__msg ${isMe ? 'is-me' : ''} ${isGm ? 'is-gm' : ''}`}>
                    <span className="mdisc__msg-name">{name}</span>
                    <p className="mdisc__msg-text">{m.text}</p>
                  </div>
                  {isMe && <ChatAvatar authorId={m.authorId} name={name} photo={players[m.authorId]?.photo} />}
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
                placeholder="조사 토론방에 메시지 보내기......"
              />
              <button onClick={submit}>전송</button>
            </div>
          )}
        </>
      ) : (
        <p className="mdisc__locked">토론은 아직 열리지 않았다.</p>
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
    closeVote,
    submitCard,
    closeExecute,
    continueMission,
    resetMission,
    displayName,
    players,
  } = useGame()
  const [draftTeam, setDraftTeam] = useState<string[]>([])
  const leader = charOf(mission.turnOrder[mission.leaderIdx])
  const isLeader = leader.id === viewerId
  const teamSize = MISSION_SIZES[mission.missionIndex]
  const onTeam = viewerId ? mission.proposedTeam.includes(viewerId) : false
  const trueResult = mission.missionResults[mission.missionIndex]
  const hideFailFromMe = mission.phase === 'result' && !!mission.cardTally && trueResult === 'fail' && !onTeam

  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (mission.phase !== 'propose' && mission.phase !== 'vote' && mission.phase !== 'execute') return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [mission.phase, mission.phaseStartedAtMs])
  const phaseRemainingMs = mission.phaseStartedAtMs
    ? Math.max(0, mission.phaseStartedAtMs + MISSION_PHASE_MS - now)
    : null

  const [popupText, setPopupText] = useState<string | null>(null)
  const prevRef = useRef({ phase: mission.phase, missionIndex: mission.missionIndex })
  useEffect(() => {
    if (isAdmin || !viewerId) {
      prevRef.current = { phase: mission.phase, missionIndex: mission.missionIndex }
      return
    }
    const prev = prevRef.current
    if (prev.missionIndex === mission.missionIndex) {
      if (prev.phase === 'vote' && mission.phase === 'execute') {
        const teamNames = mission.proposedTeam.map((id) => displayName(id)).join(', ')
        setPopupText(`조사대(${teamNames})가 승인되어 조사를 떠났다.`)
      } else if (prev.phase === 'vote' && mission.phase === 'propose') {
        setPopupText('조사단 선정에 실패했다....... 다음 리더에게 넘어간다.')
      } else if (prev.phase === 'vote' && mission.phase === 'result') {
        setPopupText(`${MAX_REJECTIONS} 번의 부결 끝에 조사대 구성에 실패했다....... 이번 조사는 불발되었다.`)
      } else if (prev.phase === 'execute' && mission.phase === 'result') {
        const flavor =
          trueResult === 'fail'
            ? MISSION_FAIL_FLAVOR[mission.missionIndex % MISSION_FAIL_FLAVOR.length]
            : MISSION_SUCCESS_FLAVOR[mission.missionIndex % MISSION_SUCCESS_FLAVOR.length]
        if (onTeam) {
          setPopupText(flavor)
        } else {
          setPopupText(MISSION_SUCCESS_FLAVOR[mission.missionIndex % MISSION_SUCCESS_FLAVOR.length])
        }
      }
    }
    prevRef.current = { phase: mission.phase, missionIndex: mission.missionIndex }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mission.phase, mission.missionIndex])

  useEffect(() => {
    if (mission.phase === 'propose') setDraftTeam([])
  }, [mission.phase, mission.leaderIdx, mission.missionIndex])

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
        <p className="mission__lock-text">조사는 아직 열리지 않았다.</p>
      </div>
    )
  }

  if (isAdmin || !viewerId) {
    const approveCount = Object.values(mission.votes).filter(Boolean).length
    const voteCount = Object.keys(mission.votes).length
    const rejectCount = voteCount - approveCount
    const submittedCount = mission.proposedTeam.filter((id) => mission.cards[id] !== undefined).length
    return (
      <div className="mission">
        <div className="mission__head">
          <span className="mission__index">
            {mission.missionIndex + 1} 차 조사 · 불가 관전
          </span>
          <span className="mission__score">
            선 {mission.wardWins} : {mission.sinWins} 악
          </span>
        </div>
        <MissionTrack />
        {mission.lastNote && <p className="mission__note">{mission.lastNote}</p>}
        <p className="mission__lock-text">불가는 조사에 참여하지 않고 진행 상황만 지켜본다.</p>

        {mission.phase === 'propose' && (
          <div className="mission__panel">
            <p className="mission__leader">
              조사대장 <strong>{displayName(leader.id)}</strong>이(가) 조사대를 고르는 중이다.
              {phaseRemainingMs !== null && (
                <span className="mission__timer">
                  {' '}
                  ({phaseRemainingMs > 0 ? formatCountdown(phaseRemainingMs) : '시간 종료'})
                </span>
              )}
            </p>
          </div>
        )}

        {mission.phase === 'vote' && (
          <div className="mission__panel">
            <p className="mission__leader">
              투표 현황: 찬성 {approveCount} · 반대 {rejectCount} (총 {voteCount}/{mission.turnOrder.length} 명)
              {phaseRemainingMs !== null && (
                <span className="mission__timer">
                  {' '}
                  ({phaseRemainingMs > 0 ? formatCountdown(phaseRemainingMs) : '시간 종료'})
                </span>
              )}
            </p>
            <div className="mission__vote-roster">
              {mission.turnOrder.map((id) => {
                const voted = mission.votes[id]
                return (
                  <div
                    key={id}
                    className={`mission__voter ${voted === undefined ? 'is-pending' : voted ? 'is-yes' : 'is-no'}`}
                  >
                    <ChatAvatar authorId={id} name={displayName(id)} photo={players[id]?.photo} />
                    <span className="mission__voter-name">{displayName(id)}</span>
                    <span className="mission__voter-choice">
                      {voted === undefined ? '투표 대기' : voted ? '찬성' : '반대'}
                    </span>
                  </div>
                )
              })}
            </div>
            <button className="mission__cta" onClick={closeVote}>
              표결 마감
            </button>
          </div>
        )}

        {mission.phase === 'execute' && (
          <div className="mission__panel">
            <p className="mission__leader">
              카드 제출 현황: {submittedCount}/{teamSize} 명
              {phaseRemainingMs !== null && (
                <span className="mission__timer">
                  {' '}
                  ({phaseRemainingMs > 0 ? formatCountdown(phaseRemainingMs) : '시간 종료'})
                </span>
              )}
            </p>
            <button className="mission__cta" onClick={closeExecute}>
              조사 마감
            </button>
          </div>
        )}

        <MissionDiscussionPanel />
      </div>
    )
  }

  const viewer = charOf(viewerId)

  if (mission.phase === 'gameover') {
    const winnerLabel = mission.winner === 'ward' ? '학생 진영 승리' : '괴이 진영 승리'
    return (
      <div className="mission mission--gameover">
        <h2>{winnerLabel}</h2>
        <p>학생 {mission.wardWins} 승 · 괴이 {mission.sinWins} 승</p>
        <button onClick={resetMission}>새 조사 시작하기</button>
      </div>
    )
  }

  return (
    <div className="mission">
      <div className="mission__head">
        <span className="mission__index">
          {mission.missionIndex + 1} 차 조사 · 필요 인원 {teamSize} 명
          {TWO_FAILS_REQUIRED[mission.missionIndex] && ' (실패 카드 2 장부터 실패)'}
        </span>
        <span className="mission__score">
          선 {mission.wardWins} : {mission.sinWins} 악
        </span>
      </div>

      <MissionTrack />

      {hideFailFromMe ? (
        <p className="mission__note">성공 {teamSize} · 실패 0 — 조사 성공.</p>
      ) : (
        mission.lastNote && <p className="mission__note">{mission.lastNote}</p>
      )}

      <MissionDiscussionPanel />

      {mission.phase === 'propose' && (
        <div className="mission__panel">
          <p className="mission__leader">
            이번 조사대장: <strong>{displayName(leader.id)}</strong>
            {isLeader && ' (나)'}
            {phaseRemainingMs !== null && (
              <span className="mission__timer">
                {' '}
                ({phaseRemainingMs > 0 ? formatCountdown(phaseRemainingMs) : '시간 종료'})
              </span>
            )}
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
                조사대 제안 ({draftTeam.length}/{teamSize})
              </button>
            </>
          ) : (
            <p className="mission__waiting">{displayName(leader.id)}이(가) 고르는 중이다.</p>
          )}
        </div>
      )}

      {mission.phase === 'vote' && (
        <div className="mission__panel">
          <p className="mission__leader">
            <strong>{displayName(leader.id)}</strong>의 제안 — 부결 {mission.rejectionCount}/{MAX_REJECTIONS}
            {phaseRemainingMs !== null && (
              <span className="mission__timer">
                {' '}
                ({phaseRemainingMs > 0 ? formatCountdown(phaseRemainingMs) : '시간 종료'})
              </span>
            )}
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
          <p className="mission__tally">
            찬성 {Object.values(mission.votes).filter(Boolean).length} · 반대{' '}
            {Object.values(mission.votes).filter((v) => !v).length} (총 {Object.keys(mission.votes).length}/
            {mission.turnOrder.length} 명 투표)
          </p>
          <div className="mission__vote-roster">
            {mission.turnOrder.map((id) => {
              const voted = mission.votes[id]
              return (
                <div
                  key={id}
                  className={`mission__voter ${voted === undefined ? 'is-pending' : voted ? 'is-yes' : 'is-no'}`}
                >
                  <ChatAvatar authorId={id} name={displayName(id)} photo={players[id]?.photo} />
                  <span className="mission__voter-name">{displayName(id)}</span>
                  <span className="mission__voter-choice">
                    {voted === undefined ? '투표 대기' : voted ? '찬성' : '반대'}
                  </span>
                </div>
              )
            })}
          </div>
          {viewerId && mission.votes[viewerId] === undefined ? (
            <div className="mission__vote-row">
              <button className="mission__vote mission__vote--yes" onClick={() => castVote(true)}>
                찬성
              </button>
              <button className="mission__vote mission__vote--no" onClick={() => castVote(false)}>
                반대
              </button>
            </div>
          ) : (
            <p className="mission__waiting">투표를 마쳤다. 기다리는 중이다.</p>
          )}
        </div>
      )}

      {mission.phase === 'execute' && (
        <div className="mission__panel">
          <p className="mission__leader">
            조사 진행 중 — 팀원들이 카드를 제출하고 있다
            {phaseRemainingMs !== null && (
              <span className="mission__timer">
                {' '}
                ({phaseRemainingMs > 0 ? formatCountdown(phaseRemainingMs) : '시간 종료'})
              </span>
            )}
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
          <p className="mission__tally">
            카드 제출 {mission.proposedTeam.filter((id) => mission.cards[id] !== undefined).length}/{teamSize} 명
          </p>
          {onTeam ? (
            viewerId && mission.cards[viewerId] === undefined ? (
              <div className="mission__vote-row">
                <button className="mission__vote mission__vote--yes" onClick={() => submitCard('success')}>
                  성공 카드 제출
                </button>
                {viewerId && resolvedTeam(mission, viewerId) === 'sin' && (
                  <button className="mission__vote mission__vote--no" onClick={() => submitCard('fail')}>
                    실패 카드 제출
                  </button>
                )}
              </div>
            ) : (
              <p className="mission__waiting">카드를 제출했다. 기다리는 중이다.</p>
            )
          ) : (
            <p className="mission__waiting">조사대를 기다리는 중이다.</p>
          )}
        </div>
      )}

      {mission.phase === 'result' && (
        <div className="mission__panel">
          {mission.cardTally &&
            (hideFailFromMe ? (
              <p className="mission__leader">성공 {teamSize} · 실패 0</p>
            ) : (
              <p className="mission__leader">
                성공 {mission.cardTally.success} · 실패 {mission.cardTally.fail}
              </p>
            ))}
          <button className="mission__cta" onClick={continueMission}>
            {mission.missionIndex >= MISSION_SIZES.length - 1 ? '결과 확인' : '다음 조사으로'}
          </button>
        </div>
      )}

      {popupText && <MissionPopup text={popupText} onClose={() => setPopupText(null)} />}
    </div>
  )
}
