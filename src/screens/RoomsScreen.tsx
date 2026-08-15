import { useEffect, useRef, useState } from 'react'
import './RoomsScreen.css'
import { useGame } from '../state/GameContext'
import { CHARACTERS, ROOMS } from '../data/characters'
import { CREATURES } from '../data/creatures'
import { hallwayInvestigationByRoom } from '../data/hallwayInvestigations'
import type { RoomId } from '../data/types'
import { isRevealedTo } from '../data/reveal'
import { Badge } from '../components/Badge'
import { EventDispatchSheet, type DispatchSection } from '../components/EventDispatchSheet'
import { AbilityUseModal } from '../components/AbilityUseModal'
import { ChatAvatar } from '../components/ChatAvatar'
import { PixelArt } from '../components/PixelArt'
import { TaggedText } from '../components/TaggedText'
import { TagPicker } from '../components/TagPicker'

function charOf(id: string) {
  return CHARACTERS.find((c) => c.id === id)!
}

const ROOM_EVICT_MS = 5 * 60 * 1000

function formatRemaining(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

// 전투 중 실제로 차례를 진행할 수 있는 사람을 계산한다. 저장된 차례가 이미 방을 나갔거나
// 빈사(HP 0) 상태라면 (방에 남아 움직일 수 있는 사람 중) 맨 앞 사람으로 자연스럽게 넘어간다.
function effectiveTurnPlayerId(
  occupants: string[],
  turnPlayerId: string | null,
  isEligible: (id: string) => boolean,
): string | null {
  if (turnPlayerId && occupants.includes(turnPlayerId) && isEligible(turnPlayerId)) return turnPlayerId
  return occupants.find((id) => isEligible(id)) ?? null
}

export function RoomsScreen() {
  const {
    viewerId,
    isAdmin,
    gmReveal,
    roomOccupancy,
    joinRoom,
    leaveRoom,
    kickFromRoom,
    roomMessages,
    sendRoomMessage,
    hasUnreadRoom,
    markRoomRead,
    roomEvents,
    dispatchCreature,
    closeRoomInvestigation,
    setRoomOpen,
    startHallwayInvestigation,
    advanceHallwayInvestigationLog,
    finishHallwayInvestigation,
    attackCreature,
    defendInCombat,
    hp,
    stamina,
    incapacitated,
    displayName,
    players,
  } = useGame()
  const [openRoom, setOpenRoom] = useState<RoomId | null>(null)
  const [draft, setDraft] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [blockedModalOpen, setBlockedModalOpen] = useState(false)
  const [now, setNow] = useState(Date.now())
  const viewer = viewerId ? charOf(viewerId) : null
  const pinScrollRef = useRef<HTMLDivElement | null>(null)
  const investigationLogsRef = useRef<HTMLDivElement | null>(null)
  const combatLogRef = useRef<HTMLDivElement | null>(null)
  const chatLogRef = useRef<HTMLDivElement | null>(null)
  const currentInvestigationLogIndex = openRoom ? (roomEvents[openRoom]?.investigation?.logIndex ?? 0) : 0
  const currentRoomMsgCount = openRoom ? (roomMessages[openRoom]?.length ?? 0) : 0
  const currentCombatLogCount = openRoom ? (roomEvents[openRoom]?.combat?.log.length ?? 0) : 0
  const currentEventKey = openRoom
    ? `${roomEvents[openRoom]?.event?.title ?? ''}-${roomEvents[openRoom]?.investigation?.completed ?? false}-${roomEvents[openRoom]?.combat?.defeated ?? false}`
    : ''

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const el = investigationLogsRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [openRoom, currentInvestigationLogIndex])

  // 전투 로그도 항상 가장 최근 판정이 보이는 맨 아래로 스크롤한다.
  useEffect(() => {
    const el = combatLogRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [openRoom, currentCombatLogCount])

  // 상단 패널(조사/전투 등) 전체도 새 내용이 생기면 맨 아래(가장 최근)로 랜딩한다.
  useEffect(() => {
    const el = pinScrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [openRoom, currentInvestigationLogIndex, currentCombatLogCount, currentEventKey])

  // 방에 들어오거나 새 메시지가 오면 항상 가장 최근 대화가 보이게 한다.
  useEffect(() => {
    const el = chatLogRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [openRoom, currentRoomMsgCount])

  useEffect(() => {
    if (openRoom) markRoomRead(openRoom)
  }, [openRoom, roomMessages[openRoom as RoomId]?.length, markRoomRead])

  function revealedFor(c: ReturnType<typeof charOf>) {
    return viewer ? isRevealedTo(viewer, c, gmReveal) : gmReveal
  }

  const tagNames = ['전원', ...CHARACTERS.map((c) => displayName(c.id)), displayName('admin')]

  if (openRoom) {
    const room = ROOMS.find((r) => r.id === openRoom)!
    const occupants = roomOccupancy[openRoom]
    const iAmHere = !!viewerId && occupants.includes(viewerId)
    const roomEvent = roomEvents[openRoom]
    const investigation = hallwayInvestigationByRoom(openRoom)

    function submitChat() {
      sendRoomMessage(openRoom!, draft)
      setDraft('')
    }

    const sections: DispatchSection[] = [
      {
        label: '괴이 발동',
        items: CREATURES.map((creature) => ({
          id: creature.id,
          category: `${creature.category} · ${
            creature.difficulty === 'easy' ? '하' : creature.difficulty === 'medium' ? '중' : '상'
          } · HP ${creature.hp} · 코인 ${creature.coinReward}`,
          title: creature.name,
          brief: creature.intro,
          onSend: () => dispatchCreature(openRoom!, creature),
        })),
      },
    ]
    const combat = roomEvent.combat
    const creature = combat ? CREATURES.find((cr) => cr.id === combat.creatureId) : null

    return (
      <div className="rooms">
        <div className={`rooms__pin ${roomEvent.cleared ? 'is-cleared' : ''}`}>
          <button className="rooms__back" onClick={() => setOpenRoom(null)}>
            ← 구관 목록
          </button>
          <div className="rooms__pin-scroll" ref={pinScrollRef}>
          <div className="rooms__pin-head">
            <span className="rooms__pin-title">{room.name}</span>
            {gmReveal && (
              <div className="rooms__pin-gm">
                <button className="rooms__pin-reset" onClick={() => setRoomOpen(openRoom!, !roomEvent.open)}>
                  구관 {roomEvent.open ? '닫기' : '열기'}
                </button>
                {roomEvent.event && (
                  <button className="rooms__pin-reset" onClick={() => closeRoomInvestigation(openRoom!)}>
                    초기화
                  </button>
                )}
                <button className="rooms__pin-plus" onClick={() => setSheetOpen(true)} aria-label="괴이 발동" title="괴이 발동">
                  +
                </button>
                {!roomEvent.investigation.started && (
                  <button
                    className="rooms__pin-plus rooms__pin-plus--investigate"
                    onClick={() => startHallwayInvestigation(openRoom!)}
                    aria-label="조사 시작"
                    title="조사 시작"
                  >
                    +
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="rooms__pin-occupants">
            <span className="rooms__pin-count">
              {occupants.length}/{room.capacity}
            </span>
            {occupants.map((id) => {
              const c = charOf(id)
              return (
                <span key={id} className="rooms__pin-occupant">
                  <Badge team={c.team} size={18} revealed={revealedFor(c)} />
                  {isAdmin && (
                    <button
                      className="rooms__pin-kick"
                      onClick={() => kickFromRoom(openRoom!, id)}
                      aria-label={`${displayName(id)} 쫓아내기`}
                      title={`${displayName(id)} 쫓아내기`}
                    >
                      ×
                    </button>
                  )}
                </span>
              )
            })}
            {!isAdmin &&
              (iAmHere ? (
                <button className="rooms__pin-toggle" onClick={() => leaveRoom(openRoom!)}>
                  나가기
                </button>
              ) : !roomEvent.open ? (
                <span className="rooms__pin-locked">잠김</span>
              ) : (
                <button
                  className="rooms__pin-toggle"
                  disabled={occupants.length >= room.capacity}
                  onClick={() => {
                    if (incapacitated) setBlockedModalOpen(true)
                    else joinRoom(openRoom!)
                  }}
                >
                  {occupants.length >= room.capacity ? '인원 초과' : '입장'}
                </button>
              ))}
          </div>

          {!roomEvent.open && !isAdmin && !iAmHere && (
            <p className="rooms__pin-ambient">이 구관은 아직 잠겨 있다.</p>
          )}

          {(roomEvent.open || isAdmin || iAmHere) && !roomEvent.event && (
            <p className="rooms__pin-ambient">{room.ambientText}</p>
          )}

          {investigation && roomEvent.investigation.started && (
            <div className="rooms__investigation">
              <span className="rooms__investigation-creature">{investigation.creatureName}</span>
              <div className="rooms__investigation-logs" ref={investigationLogsRef}>
                {investigation.logs.slice(0, roomEvent.investigation.logIndex).map((line, i) => (
                  <p key={i} className="rooms__investigation-log-line">
                    {line}
                  </p>
                ))}
                {roomEvent.investigation.logIndex === 0 && !gmReveal && (
                  <p className="rooms__investigation-waiting">아직 아무 일도 일어나지 않았다.</p>
                )}
                {roomEvent.investigation.logIndex < investigation.logs.length && gmReveal && (
                  <button
                    className="rooms__investigation-next"
                    onClick={() => advanceHallwayInvestigationLog(openRoom!)}
                  >
                    다음 로그 ({roomEvent.investigation.logIndex}/{investigation.logs.length})
                  </button>
                )}
              </div>
              {roomEvent.investigation.logIndex >= investigation.logs.length &&
                !roomEvent.investigation.completed &&
                gmReveal && (
                  <button
                    className="rooms__investigation-finish"
                    onClick={() => finishHallwayInvestigation(openRoom!)}
                  >
                    종이 줍기 (역할 정보 공개)
                  </button>
                )}
              {roomEvent.investigation.completed && (
                <p className="rooms__investigation-done">
                  조사를 마쳤다....... 채팅에 남은 단서를 확인하자.
                </p>
              )}
            </div>
          )}

          {roomEvent.event && combat && creature && (
            <div className="rooms__combat">
              {roomEvent.event.category && <span className="rooms__pin-tag">{roomEvent.event.category}</span>}
              <div className="rooms__combat-head">
                <PixelArt pixels={creature.art.pixels} palette={creature.art.palette} size={56} />
                <div className="rooms__combat-head-text">
                  <span className="rooms__pin-puzzle-title">{creature.name}</span>
                  <p className="rooms__pin-desc">{roomEvent.event.description}</p>
                  <span className="rooms__combat-reward">쓰러뜨리면 코인 {creature.coinReward}</span>
                </div>
              </div>
              <p className="rooms__combat-rule">
                전투 규칙: 공격할 때마다 주사위(1~6) 3 개를 굴려 합이 11 이상이면 명중이다....... 명중하면
                공격력만큼 피해를 입히고, 쓰러뜨리지 못하면 괴이가 같은 방식으로 반격한다. 자기 차례에는
                공격 대신 방어를 선택할 수 있다 — 방어하면 다음 자기 차례가 돌아올 때까지 팀원들이 받을
                반격을 전부 대신 맞는다. 빈사(HP 0) 상태가 되면 회복할 때까지 차례에서 제외된다.
              </p>
              <div className="rooms__combat-hp">
                <div
                  className="rooms__combat-hp-fill"
                  style={{ width: `${Math.max(0, (combat.creatureHp / creature.hp) * 100)}%` }}
                />
                <span className="rooms__combat-hp-label">
                  HP {combat.creatureHp}/{creature.hp}
                </span>
              </div>
              <div className="rooms__combat-log" ref={combatLogRef}>
                {combat.log.length === 0 && (
                  <p className="rooms__empty">아직 아무도 손을 대지 않았다.</p>
                )}
                {combat.log.map((entry) => (
                  <p key={entry.id} className="rooms__combat-log-line">
                    {entry.text}
                  </p>
                ))}
              </div>
              {combat.defeated ? (
                <p className="rooms__pin-note">
                  쓰러뜨렸다....... 전투에 참여한 모두가 코인 {creature.coinReward}을(를) 얻었다.
                  {combat.defeatedAtMs && (
                    <>
                      {' '}
                      남은 시간 {formatRemaining(ROOM_EVICT_MS - (now - combat.defeatedAtMs))} — 이 방은 곧
                      자동으로 닫힌다.
                    </>
                  )}
                </p>
              ) : occupants.length < room.capacity ? (
                <p className="rooms__pin-note">
                  정원이 다 찰 때까지는 싸울 수 없다. ({occupants.length}/{room.capacity})
                </p>
              ) : iAmHere ? (
                (() => {
                  const isEligible = (id: string) => (players[id]?.hp ?? 0) > 0
                  const turnId = effectiveTurnPlayerId(occupants, combat.turnPlayerId, isEligible)
                  const myTurn = turnId === viewerId
                  return (
                    <>
                      <p className="rooms__combat-turn">
                        지금 차례: <strong>{turnId ? displayName(turnId) : '—'}</strong>
                        {combat.defenderId && (
                          <span className="rooms__combat-defender">
                            {' '}
                            (방어 중: {displayName(combat.defenderId)})
                          </span>
                        )}
                      </p>
                      <div className="rooms__combat-actions">
                        <button
                          className="rooms__combat-attack"
                          disabled={!myTurn || incapacitated || stamina < 4}
                          onClick={() => attackCreature(openRoom!)}
                        >
                          {myTurn
                            ? `공격하기 (스태미나 -4, 현재 HP ${hp} · 스태미나 ${stamina})`
                            : `${turnId ? displayName(turnId) : '다른 사람'}의 차례를 기다리는 중......`}
                        </button>
                        {myTurn && (
                          <button
                            className="rooms__combat-defend"
                            disabled={incapacitated}
                            onClick={() => defendInCombat(openRoom!)}
                          >
                            방어하기 (반격 대신 맞기)
                          </button>
                        )}
                      </div>
                    </>
                  )
                })()
              ) : (
                !isAdmin && <p className="rooms__pin-note">입장한 사람만 싸울 수 있다.</p>
              )}
            </div>
          )}
          </div>
        </div>

        {iAmHere || isAdmin ? (
          <>
            <div className="rooms__log" ref={chatLogRef}>
              {roomMessages[openRoom].map((m) => {
                const isMe = m.authorId === viewerId
                const isGm = m.authorId === 'admin'
                const name = displayName(m.authorId)
                return (
                  <div key={m.id} className={`rooms__msg-row ${isMe ? 'is-me' : ''}`}>
                    {!isMe && <ChatAvatar authorId={m.authorId} name={name} photo={players[m.authorId]?.photo} size={26} />}
                    <div className={`rooms__msg ${isMe ? 'is-me' : ''} ${isGm ? 'is-gm' : ''}`}>
                      <span className="rooms__msg-name">{name}</span>
                      <p className="rooms__msg-text">
                        <TaggedText text={m.text} names={tagNames} />
                      </p>
                    </div>
                    {isMe && <ChatAvatar authorId={m.authorId} name={name} photo={players[m.authorId]?.photo} size={26} />}
                  </div>
                )
              })}
            </div>
            <div className="rooms__composer">
              <TagPicker names={tagNames} onPick={(name) => setDraft((prev) => `${prev}@${name} `)} />
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitChat()}
                placeholder={`${room.name}에서 대화하기......`}
              />
              <button onClick={submitChat}>전송</button>
            </div>
          </>
        ) : (
          <p className="rooms__locked-note">입장해야 대화를 볼 수 있다.</p>
        )}

        {sheetOpen && <EventDispatchSheet sections={sections} onClose={() => setSheetOpen(false)} />}
        {blockedModalOpen && (
          <AbilityUseModal
            title="입장 불가"
            prompt="지금은 너무 힘들어서 구관에 들어갈 수 없다....... HP나 스태미나가 바닥났다. 매점에서 음식이나 약을 구해 회복한 뒤 다시 시도하자."
            confirmLabel="확인"
            onConfirm={() => setBlockedModalOpen(false)}
            onClose={() => setBlockedModalOpen(false)}
          />
        )}
      </div>
    )
  }

  return (
    <div className="rooms">
      <div className="rooms__intro">
        <span className="rooms__intro-label">구관</span>
        <p>선착순으로 입장한다. 각 구관에는 인원 제한이 있다.</p>
      </div>
      <div className="rooms__grid">
        {ROOMS.map((room) => {
          const occupants = roomOccupancy[room.id]
          const full = occupants.length >= room.capacity
          const cleared = roomEvents[room.id].cleared
          const investigating = !!roomEvents[room.id].event && !cleared
          const open = roomEvents[room.id].open
          return (
            <button key={room.id} className={`rooms__card ${!open ? 'is-locked' : ''}`} onClick={() => setOpenRoom(room.id)}>
              <div className="rooms__card-top">
                <span className="rooms__card-name">
                  {room.name}
                  {hasUnreadRoom(room.id) && <span className="rooms__card-ping" />}
                  {!open && <span className="rooms__card-locked-tag">잠김</span>}
                  {cleared && <span className="rooms__card-clue-tag">단서 발견</span>}
                  {investigating && <span className="rooms__card-active-tag">조사 중</span>}
                </span>
                <span className={`rooms__card-count ${full ? 'is-full' : ''}`}>
                  {occupants.length}/{room.capacity}
                </span>
              </div>
              <p className="rooms__card-desc">{room.description}</p>
              <div className="rooms__card-avatars">
                {occupants.map((id) => {
                  const c = charOf(id)
                  return <Badge key={id} team={c.team} size={18} revealed={revealedFor(c)} />
                })}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
