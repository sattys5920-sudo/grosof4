import { useEffect, useState } from 'react'
import './ClassroomScreen.css'
import { useGame } from '../state/GameContext'
import { CHARACTERS } from '../data/characters'
import { HALL_EVENTS, hallEventById } from '../data/hallEvents'
import { hallPuzzleById } from '../data/hallPuzzles'
import type { HallObject } from '../data/types'
import { EventDispatchSheet, type DispatchSection } from '../components/EventDispatchSheet'
import { ChatAvatar } from '../components/ChatAvatar'
import { AbilityUseModal } from '../components/AbilityUseModal'

const HALL_TIME_LIMIT_MS = 60 * 60 * 1000
const KIND_LABEL: Record<HallObject['kind'], string> = {
  hazard: '위험',
  puzzle: '문제',
  item: '아이템',
  minigame: '미니게임',
}

function formatRemaining(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

const CLASSROOM_AMBIENT_TEXT =
  '강당은 조용하다....... 다들 각자 자리에 앉아 서로 눈치만 보고 있다. 아직 아무것도 열리지 않았다.......'

export function ClassroomScreen() {
  const {
    viewerId,
    isAdmin,
    gmReveal,
    classroomMessages,
    sendClassroomMessage,
    displayName,
    players,
    classroomOpen,
    setClassroomOpen,
    hallEvent,
    dispatchHallEvent,
    advanceHallLog,
    advanceHallObject,
    finishHallEvent,
    resolveHallObject,
    submitHallPuzzleAnswer,
    joinHallMinigame,
  } = useGame()
  const [draft, setDraft] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [pendingChoice, setPendingChoice] = useState<{ objectId: string; choice: 'open' | 'leave' } | null>(null)
  const [puzzleDrafts, setPuzzleDrafts] = useState<Record<string, string>>({})
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (!hallEvent.startedAtMs) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [hallEvent.startedAtMs])

  const canChat = (!!viewerId && classroomOpen) || isAdmin
  const activeEvent = hallEvent.eventId ? hallEventById(hallEvent.eventId) : null
  const logsRevealed = activeEvent ? hallEvent.logIndex >= activeEvent.logs.length : false
  const remainingMs = hallEvent.startedAtMs ? Math.max(0, hallEvent.startedAtMs + HALL_TIME_LIMIT_MS - now) : null

  function submit() {
    sendClassroomMessage(draft)
    setDraft('')
  }

  const sections: DispatchSection[] = [
    {
      label: '괴이 조사 (강당)',
      items: HALL_EVENTS.map((event) => ({
        id: event.id,
        category: hallEvent.completedEventIds.includes(event.id) ? '완료' : event.roomName,
        title: `${event.roomName} — ${event.creatureName}`,
        brief: event.creatureIntro,
        onSend: () => dispatchHallEvent(event.id),
      })),
    },
  ]

  function renderObject(obj: HallObject) {
    const result = hallEvent.objectResults[obj.id]
    const status = result?.status ?? 'idle'
    const actorName = result?.actorId ? displayName(result.actorId) : null

    if (obj.kind === 'minigame') {
      const participants = result?.minigameParticipants ?? {}
      const entries = Object.entries(participants)
      const myResult = viewerId ? participants[viewerId] : undefined
      return (
        <div key={obj.id} className="hallobj hallobj--minigame">
          <div className="hallobj__head">
            <span className="hallobj__label">{obj.label}</span>
            <span className={`hallobj__kind hallobj__kind--${obj.kind}`}>{KIND_LABEL[obj.kind]}</span>
          </div>
          <p className="hallobj__note">{obj.minigameRule}</p>
          {!isAdmin && myResult === undefined && (
            <button className="hallobj__minigame-join" onClick={() => joinHallMinigame(obj.id)}>
              참여하기
            </button>
          )}
          {myResult !== undefined && (
            <p className={`hallobj__minigame-mine ${myResult ? 'is-win' : 'is-lose'}`}>
              {myResult
                ? `승리! 코인 ${obj.minigameWinCoins ?? 2}개를 얻었다.`
                : `패배....... ${obj.hpDamage ? `HP -${obj.hpDamage}` : obj.staminaDamage ? `스태미나 -${obj.staminaDamage}` : ''}`}
            </p>
          )}
          {entries.length > 0 && (
            <div className="hallobj__minigame-list">
              {entries.map(([pid, won]) => (
                <span key={pid} className={`hallobj__minigame-entry ${won ? 'is-win' : 'is-lose'}`}>
                  {displayName(pid)} {won ? '승' : '패'}
                </span>
              ))}
            </div>
          )}
        </div>
      )
    }

    return (
      <div key={obj.id} className={`hallobj hallobj--${status}`}>
        <div className="hallobj__head">
          <span className="hallobj__label">{obj.label}</span>
          <span className={`hallobj__kind hallobj__kind--${obj.kind}`}>{KIND_LABEL[obj.kind]}</span>
        </div>

        {status === 'idle' && !isAdmin && (
          <div className="hallobj__actions">
            <p className="hallobj__warn">한 명만 선택할 수 있다....... 다 같이 상의하고 신중하게 눌러야 한다.</p>
            <div className="hallobj__action-row">
              <button onClick={() => setPendingChoice({ objectId: obj.id, choice: 'open' })}>열어 본다</button>
              <button onClick={() => setPendingChoice({ objectId: obj.id, choice: 'leave' })}>그냥 둔다</button>
            </div>
          </div>
        )}
        {status === 'idle' && isAdmin && <p className="hallobj__note">아직 아무도 손대지 않았다.</p>}

        {status === 'left' && <p className="hallobj__note">{actorName}이(가) 그냥 두기로 했다.</p>}

        {status === 'opened' && obj.kind === 'hazard' && (
          <div className="hallobj__result">
            <p className="hallobj__note">
              {actorName}이(가) 열어 보았다....... {obj.hazardText}
            </p>
            <p className="hallobj__damage">
              {obj.hpDamage ? `HP -${obj.hpDamage} ` : ''}
              {obj.staminaDamage ? `스태미나 -${obj.staminaDamage}` : ''}
              {' '}({actorName}에게만 적용)
            </p>
          </div>
        )}

        {status === 'opened' && obj.kind === 'item' && (
          <p className="hallobj__note">
            {actorName}이(가) 열어 보고 {obj.itemCoins ? `코인 ${obj.itemCoins}개를` : '아이템을'} 손에 넣었다.
          </p>
        )}

        {status === 'opened' && obj.kind === 'puzzle' && obj.puzzleId && (() => {
          const puzzle = hallPuzzleById(obj.puzzleId)!
          const attempts = result?.puzzleAttempts ?? 0
          const solved = result?.puzzleSolved ?? false
          return (
            <div className="hallobj__puzzle">
              <p className="hallobj__note">{actorName}이(가) 열어 보니 문제가 나타났다.</p>
              <p className="hallobj__puzzle-title">
                《{puzzle.category}》 {puzzle.title}
              </p>
              <p className="hallobj__puzzle-text">{puzzle.questionText}</p>
              {solved ? (
                <div className="hallobj__puzzle-solved">
                  <span>정답: {puzzle.answer}</span>
                  <p>{puzzle.solution}</p>
                </div>
              ) : attempts >= 3 ? (
                <p className="hallobj__puzzle-fail">기회를 모두 소진했다....... 정답은 끝내 밝혀지지 않았다.</p>
              ) : (
                !isAdmin && (
                  <div className="hallobj__puzzle-answer">
                    <input
                      value={puzzleDrafts[obj.id] ?? ''}
                      onChange={(e) => setPuzzleDrafts((prev) => ({ ...prev, [obj.id]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter') return
                        submitHallPuzzleAnswer(obj.id, puzzleDrafts[obj.id] ?? '')
                        setPuzzleDrafts((prev) => ({ ...prev, [obj.id]: '' }))
                      }}
                      placeholder="정답 입력......"
                    />
                    <button
                      onClick={() => {
                        submitHallPuzzleAnswer(obj.id, puzzleDrafts[obj.id] ?? '')
                        setPuzzleDrafts((prev) => ({ ...prev, [obj.id]: '' }))
                      }}
                    >
                      제출
                    </button>
                    <span className="hallobj__puzzle-attempts">남은 기회 {3 - attempts}/3</span>
                  </div>
                )
              )}
            </div>
          )
        })()}
      </div>
    )
  }

  return (
    <div className="classroom">
      <div className="classroom__pin">
        <div className="classroom__pin-head">
          <span className="classroom__pin-heading">강당</span>
          {gmReveal && (
            <div className="classroom__pin-gm">
              <button className="classroom__pin-reset" onClick={() => setClassroomOpen(!classroomOpen)}>
                강당 {classroomOpen ? '닫기' : '열기'}
              </button>
              <button className="classroom__pin-plus" onClick={() => setSheetOpen(true)} aria-label="괴이 조사 발동">
                +
              </button>
            </div>
          )}
        </div>

        {!classroomOpen && !gmReveal && (
          <p className="classroom__pin-ambient">강당 문이 아직 잠겨 있다....... 열릴 때까지 기다려야 한다.</p>
        )}

        {(classroomOpen || gmReveal) && !activeEvent && (
          <p className="classroom__pin-ambient">{CLASSROOM_AMBIENT_TEXT}</p>
        )}

        {(classroomOpen || gmReveal) && activeEvent && (
          <div className="hallevent">
            <div className="hallevent__head">
              <span className="hallevent__room">{activeEvent.roomName}</span>
              <span className="hallevent__creature">{activeEvent.creatureName}</span>
              {remainingMs !== null && (
                <span className={`hallevent__timer ${remainingMs === 0 ? 'is-over' : ''}`}>
                  {remainingMs > 0 ? `남은 시간 ${formatRemaining(remainingMs)}` : '시간 종료'}
                </span>
              )}
            </div>

            <div className="hallevent__logs">
              {activeEvent.logs.slice(0, hallEvent.logIndex).map((line, i) => (
                <p key={i} className="hallevent__log-line">
                  {line}
                </p>
              ))}
              {!logsRevealed && gmReveal && (
                <button className="hallevent__next-log" onClick={advanceHallLog}>
                  다음 로그
                </button>
              )}
              {!logsRevealed && !gmReveal && hallEvent.logIndex === 0 && (
                <p className="hallevent__waiting">교내 방송이 상황을 전하는 중이다.......</p>
              )}
            </div>

            {logsRevealed && (
              <div className="hallevent__objects">
                {activeEvent.objects.slice(0, hallEvent.objectIndex).map(renderObject)}
                {hallEvent.objectIndex < activeEvent.objects.length && gmReveal && (
                  <button className="hallevent__next-log" onClick={advanceHallObject}>
                    다음 오브젝트 ({hallEvent.objectIndex}/{activeEvent.objects.length})
                  </button>
                )}
                {hallEvent.objectIndex === 0 && !gmReveal && (
                  <p className="hallevent__waiting">불가가 첫 번째 물건을 공개할 때까지 기다려 보자.......</p>
                )}
              </div>
            )}

            {gmReveal && (
              <button className="hallevent__finish" onClick={finishHallEvent}>
                조사 종료 (최종 단서 공개)
              </button>
            )}
          </div>
        )}
      </div>

      {(classroomOpen || gmReveal) && (
        <div className="classroom__log">
          {classroomMessages.length === 0 && (
            <p className="classroom__empty">아직 아무도 말하지 않았다....... 함께 의논해보자.</p>
          )}
          {classroomMessages.map((m) => {
            const author = CHARACTERS.find((c) => c.id === m.authorId)
            const isMe = m.authorId === viewerId
            const isGm = m.authorId === 'admin'
            const name = isGm || author ? displayName(m.authorId) : '???'
            return (
              <div key={m.id} className={`classroom__msg-row ${isMe ? 'is-me' : ''}`}>
                {!isMe && (
                  <ChatAvatar authorId={m.authorId} name={name} photo={players[m.authorId]?.photo} />
                )}
                <div className={`classroom__msg ${isMe ? 'is-me' : ''} ${isGm ? 'is-gm' : ''}`}>
                  <div className="classroom__msg-head">
                    <span className="classroom__msg-name">{name}</span>
                  </div>
                  <p className="classroom__msg-text">{m.text}</p>
                </div>
                {isMe && (
                  <ChatAvatar authorId={m.authorId} name={name} photo={players[m.authorId]?.photo} />
                )}
              </div>
            )
          })}
        </div>
      )}

      {canChat && (
        <div className="classroom__composer">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="강당에 메시지 보내기......"
          />
          <button onClick={submit}>전송</button>
        </div>
      )}

      {sheetOpen && <EventDispatchSheet sections={sections} onClose={() => setSheetOpen(false)} />}

      {pendingChoice && (
        <AbilityUseModal
          title={pendingChoice.choice === 'open' ? '정말 열어 보겠는가' : '정말 그냥 두겠는가'}
          prompt={
            pendingChoice.choice === 'open'
              ? '한 번 열면 되돌릴 수 없다....... 무엇이 나올지 모른다. 정말 열겠는가?'
              : '이 오브젝트는 더 이상 손댈 수 없게 된다....... 정말 그냥 두겠는가?'
          }
          confirmLabel="결정한다"
          onConfirm={() => {
            resolveHallObject(pendingChoice.objectId, pendingChoice.choice)
            setPendingChoice(null)
          }}
          onClose={() => setPendingChoice(null)}
        />
      )}
    </div>
  )
}
