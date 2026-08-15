import { useEffect, useRef, useState } from 'react'
import './RoomsScreen.css'
import { useGame } from '../state/GameContext'
import { CARD_ROOMS, CHARACTERS, HALLI_ROOMS, ROOMS } from '../data/characters'
import { CREATURES } from '../data/creatures'
import { hallwayInvestigationByRoom } from '../data/hallwayInvestigations'
import {
  CARD_GAME_WIN_COINS,
  CARD_ROOM_MIN_PLAYERS,
  CARD_TIMEOUT_STRIKES,
  CARD_TURN_TIME_LIMIT_MS,
  isLegalCardPlay,
  MIN_PLAY_PER_TURN,
} from '../data/cardGame'
import { HALLI_COLOR_LABEL, HALLI_ROOM_MIN_PLAYERS } from '../data/halliGame'
import { resolvedTeam } from '../state/missionEngine'
import type { CardRoomId, HalliRoomId, RoomId } from '../data/types'
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
// 4명이면 마름모(위/오른쪽/아래/왼쪽), 5명이면 오각형으로 자리를 잡아 준다.
// 그 외 인원은 그냥 가로로 한 줄 배치한다(부모의 flex-wrap이 처리).
function halliSlotStyle(index: number, total: number): { top: string; left: string } | undefined {
  if (total !== 4 && total !== 5) return undefined
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2
  const radius = 38
  const left = 50 + radius * Math.cos(angle)
  const top = 50 + radius * Math.sin(angle)
  return { top: `${top}%`, left: `${left}%` }
}

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
    mission,
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
    cardGames,
    joinCardRoom,
    startCardGame,
    setCardFirstPlayer,
    leaveCardRoom,
    kickFromCardRoom,
    playCard,
    endCardTurn,
    resetCardGame,
    coins,
    halliGames,
    joinHalliRoom,
    leaveHalliRoom,
    kickFromHalliRoom,
    startHalliBetting,
    placeHalliBet,
    dealHalliGame,
    flipHalliCard,
    pressHalliBell,
    resetHalliGame,
  } = useGame()
  const [openRoom, setOpenRoom] = useState<RoomId | null>(null)
  const [openCardRoom, setOpenCardRoom] = useState<CardRoomId | null>(null)
  const [openHalliRoom, setOpenHalliRoom] = useState<HalliRoomId | null>(null)
  const [halliBetDraft, setHalliBetDraft] = useState('')
  const [halliActionPending, setHalliActionPending] = useState<'bet' | 'reset' | null>(null)
  const [firstCardPlayerId, setFirstCardPlayerId] = useState('')
  const [draft, setDraft] = useState('')
  const [selectedCard, setSelectedCard] = useState<number | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [blockedModalOpen, setBlockedModalOpen] = useState(false)
  const [now, setNow] = useState(Date.now())
  const viewer = viewerId ? charOf(viewerId) : null
  const pinScrollRef = useRef<HTMLDivElement | null>(null)
  const investigationLogsRef = useRef<HTMLDivElement | null>(null)
  const combatLogRef = useRef<HTMLDivElement | null>(null)
  const chatLogRef = useRef<HTMLDivElement | null>(null)
  const cardLogRef = useRef<HTMLDivElement | null>(null)
  const cardPinScrollRef = useRef<HTMLDivElement | null>(null)
  const cardChatLogRef = useRef<HTMLDivElement | null>(null)
  const halliChatLogRef = useRef<HTMLDivElement | null>(null)
  const currentInvestigationLogIndex = openRoom ? (roomEvents[openRoom]?.investigation?.logIndex ?? 0) : 0
  const currentRoomMsgCount = openRoom ? (roomMessages[openRoom]?.length ?? 0) : 0
  const currentCombatLogCount = openRoom ? (roomEvents[openRoom]?.combat?.log.length ?? 0) : 0
  const currentEventKey = openRoom
    ? `${roomEvents[openRoom]?.event?.title ?? ''}-${roomEvents[openRoom]?.investigation?.completed ?? false}-${roomEvents[openRoom]?.combat?.defeated ?? false}`
    : ''
  const currentCardRoomMsgCount = openCardRoom ? (roomMessages[openCardRoom]?.length ?? 0) : 0
  const currentCardLogCount = openCardRoom ? (cardGames[openCardRoom]?.log.length ?? 0) : 0
  const currentHalliRoomMsgCount = openHalliRoom ? (roomMessages[openHalliRoom]?.length ?? 0) : 0
  const currentHalliGame = openHalliRoom ? halliGames[openHalliRoom] : null

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

  // 카드 게임 로그는 그 안에서만 맨 아래(가장 최근)로 랜딩한다 — 패/1열·100열 카드는
  // 항상 보여야 하므로, 바깥 패널 전체를 강제로 스크롤하지는 않는다.
  useEffect(() => {
    const el = cardLogRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [openCardRoom, currentCardLogCount])

  useEffect(() => {
    const el = cardChatLogRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [openCardRoom, currentCardRoomMsgCount])

  useEffect(() => {
    if (openCardRoom) markRoomRead(openCardRoom)
  }, [openCardRoom, roomMessages[openCardRoom as CardRoomId]?.length, markRoomRead])

  useEffect(() => {
    setSelectedCard(null)
    setFirstCardPlayerId('')
  }, [openCardRoom])

  useEffect(() => {
    const el = halliChatLogRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [openHalliRoom, currentHalliRoomMsgCount])

  useEffect(() => {
    if (openHalliRoom) markRoomRead(openHalliRoom)
  }, [openHalliRoom, roomMessages[openHalliRoom as HalliRoomId]?.length, markRoomRead])

  useEffect(() => {
    setHalliBetDraft('')
    setHalliActionPending(null)
  }, [openHalliRoom])

  // 배팅/초기화 버튼이 눌린 뒤 서버 응답(게임 상태 갱신)이 오면 즉시, 오지 않더라도
  // 최대 4 초 뒤에는 눌림 상태를 풀어서 "눌러도 반응이 없다"처럼 보이지 않게 한다.
  useEffect(() => {
    if (!halliActionPending) return
    setHalliActionPending(null)
  }, [currentHalliGame])

  useEffect(() => {
    if (!halliActionPending) return
    const t = setTimeout(() => setHalliActionPending(null), 4000)
    return () => clearTimeout(t)
  }, [halliActionPending])

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
          <button className="rooms__back" onClick={() => { setOpenRoom(null); setOpenCardRoom(null); setOpenHalliRoom(null) }}>
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
                  <Badge team={resolvedTeam(mission, c.id)} size={18} revealed={revealedFor(c)} />
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

  if (openCardRoom) {
    const room = CARD_ROOMS.find((r) => r.id === openCardRoom)!
    const occupants = roomOccupancy[openCardRoom] ?? []
    const iAmHere = !!viewerId && occupants.includes(viewerId)
    const roomEvent = roomEvents[openCardRoom]
    const game = cardGames[openCardRoom]
    const requiredMin = game && game.drawPile.length === 0 ? 1 : MIN_PLAY_PER_TURN
    const myTurn = !!viewerId && !!game && game.status === 'playing' && game.turnOrder[game.turnIndex] === viewerId
    const myHand = viewerId && game ? [...(game.hands[viewerId] ?? [])].sort((a, b) => a - b) : []
    const canEndTurn = !!game && game.cardsPlayedThisTurn >= requiredMin

    function submitCardChat() {
      sendRoomMessage(openCardRoom!, draft)
      setDraft('')
    }

    return (
      <div className="rooms">
        <div className="rooms__pin">
          <button
            className="rooms__back"
            onClick={() => {
              setOpenRoom(null)
              setOpenCardRoom(null)
              setOpenHalliRoom(null)
              setSelectedCard(null)
            }}
          >
            ← 구관 목록
          </button>
          <div className="rooms__pin-scroll" ref={cardPinScrollRef}>
            <div className="rooms__pin-head">
              <span className="rooms__pin-title">{room.name}</span>
              {gmReveal && (
                <div className="rooms__pin-gm">
                  <button className="rooms__pin-reset" onClick={() => setRoomOpen(openCardRoom!, !roomEvent.open)}>
                    구관 {roomEvent.open ? '닫기' : '열기'}
                  </button>
                  {!game && (
                    <button
                      className="rooms__pin-reset"
                      disabled={occupants.length < CARD_ROOM_MIN_PLAYERS || occupants.length > room.capacity}
                      onClick={() => startCardGame(openCardRoom!)}
                    >
                      플레이
                    </button>
                  )}
                  {game && (
                    <button className="rooms__pin-reset" onClick={() => resetCardGame(openCardRoom!)}>
                      게임 초기화
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
                return (
                  <span key={id} className="rooms__pin-occupant">
                    <ChatAvatar authorId={id} name={displayName(id)} photo={players[id]?.photo} size={22} />
                    {isAdmin && (
                      <button
                        className="rooms__pin-kick"
                        onClick={() => kickFromCardRoom(openCardRoom!, id)}
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
                (iAmHere
                  ? (!game || game.status !== 'playing') && (
                      <button className="rooms__pin-toggle" onClick={() => leaveCardRoom(openCardRoom!)}>
                        나가기
                      </button>
                    )
                  : !roomEvent.open || game?.status === 'playing'
                    ? (
                        <span className="rooms__pin-locked">잠김</span>
                      )
                    : (
                        <button
                          className="rooms__pin-toggle"
                          disabled={occupants.length >= room.capacity}
                          onClick={() => joinCardRoom(openCardRoom!)}
                        >
                          {occupants.length >= room.capacity ? '인원 초과' : '입장'}
                        </button>
                      ))}
            </div>

            {!roomEvent.open && !isAdmin && !iAmHere && (
              <p className="rooms__pin-ambient">이 구관은 아직 잠겨 있다.</p>
            )}
            {roomEvent.open && game?.status === 'playing' && !isAdmin && !iAmHere && (
              <p className="rooms__pin-ambient">게임이 진행 중이라 지금은 입장할 수 없다.</p>
            )}

            <div className="cardgame__rule">
              <p className="cardgame__rule-line">
                참여 인원 {CARD_ROOM_MIN_PLAYERS}~{room.capacity}명. 시작·종료는 모두 불가의 권한이다.
              </p>
              <p className="cardgame__rule-line">손패 중 최소 2 장을 턴마다 내려놓을 수 있다.</p>
              <p className="cardgame__rule-line">카드를 내려놓으면 보충 덱에서 2 장 즉시 보충된다.</p>
              <p className="cardgame__rule-line">보충 덱이 없어질 경우, 최소 1 장씩 내려놓을 수 있다.</p>
              <p className="cardgame__rule-line">
                1 열과 100 열 중 하나를 골라서 내려놓을 수 있다. (장마다 다른 곳에 내려놓기 가능)
              </p>
              <p className="cardgame__rule-line">1 열은 오름차순, 100 열은 내림차순으로 만들어야 한다.</p>
              <p className="cardgame__rule-line">카드에 대한 직접적인 언급은 엄금한다. 시도 시 패배 처리.</p>
              <p className="cardgame__rule-sub">(ex. 86 있는 사람!! 또는 나 34 근처 있는데!!)</p>
              <p className="cardgame__rule-line">다만, 간접적인 어필은 가능하다.</p>
              <p className="cardgame__rule-sub">(ex. 1 열 안 건드려 주면.. 고마울 것 같어)</p>
              <p className="cardgame__rule-line">
                수열의 오류 없이 모든 숫자를 내려놓게 되면 성공. 성공 시 참여자 전원 코인 {CARD_GAME_WIN_COINS}개 지급.
              </p>
              <p className="cardgame__rule-line">
                한 사람당 차례 제한 시간은 3 분이며, 지나면 다음 사람에게 넘어간다. 이 경우가 {CARD_TIMEOUT_STRIKES} 회
                누적되면 즉시 패배 처리된다.
              </p>
            </div>

            {!game && (roomEvent.open || isAdmin || iAmHere) && (
              <p className="rooms__pin-ambient">
                {occupants.length < CARD_ROOM_MIN_PLAYERS
                  ? `최소 ${CARD_ROOM_MIN_PLAYERS}명이 모여야 시작할 수 있다. (${occupants.length}/${room.capacity})`
                  : `불가가 "플레이"를 누르면 시작된다. (${occupants.length}/${room.capacity})`}
              </p>
            )}

            {game && (
              <div className="cardgame">
                <div className="cardgame__deck">덱 {game.drawPile.length}장 남음</div>

                <div className="cardgame__order">
                  {game.turnOrder.map((id, i) => (
                    <span key={id} className={`cardgame__order-chip ${i === game.turnIndex ? 'is-current' : ''}`}>
                      {displayName(id)} ({(game.hands[id] ?? []).length})
                    </span>
                  ))}
                </div>

                {gmReveal && game.status === 'playing' && !game.log.some((e) => e.kind === 'play') && (
                  <div className="cardgame__order-picker">
                    <select
                      className="rooms__pin-first-select"
                      value={firstCardPlayerId}
                      onChange={(e) => setFirstCardPlayerId(e.target.value)}
                    >
                      <option value="">순서 정하기: 첫 순서 고르기</option>
                      {game.turnOrder.map((id) => (
                        <option key={id} value={id}>
                          첫 순서: {displayName(id)}
                        </option>
                      ))}
                    </select>
                    <button
                      className="rooms__pin-reset"
                      disabled={!firstCardPlayerId}
                      onClick={() => {
                        setCardFirstPlayer(openCardRoom!, firstCardPlayerId)
                        setFirstCardPlayerId('')
                      }}
                    >
                      순서 정하기
                    </button>
                  </div>
                )}

                {game.status === 'playing' && (
                  <p className="cardgame__turn">
                    지금 차례: <strong>{displayName(game.turnOrder[game.turnIndex])}</strong> (이번 차례{' '}
                    {game.cardsPlayedThisTurn}/{requiredMin}장) · 남은 시간{' '}
                    {formatRemaining(Math.max(0, game.turnStartedAtMs + CARD_TURN_TIME_LIMIT_MS - now))} · 시간 초과{' '}
                    {game.timeoutCount}/{CARD_TIMEOUT_STRIKES}
                  </p>
                )}
                {game.status === 'won' && (
                  <p className="cardgame__result is-win">
                    모두의 손패를 비웠다....... 승리! 참여자 전원이 코인 {CARD_GAME_WIN_COINS}개를 얻었다.
                  </p>
                )}
                {game.status === 'lost' && (
                  <p className="cardgame__result is-lose">
                    {game.log[game.log.length - 1]?.reason === 'timeout'
                      ? `시간 초과가 ${CARD_TIMEOUT_STRIKES} 회 누적됐다....... 패배.`
                      : '더 이상 낼 수 있는 카드가 없다....... 패배.'}
                  </p>
                )}

                <div className="cardgame__log" ref={cardLogRef}>
                  {game.log.map((entry) => (
                    <p key={entry.id} className="cardgame__log-line">
                      {entry.kind === 'start' && '게임을 시작했다....... 카드를 나눠 가졌다.'}
                      {entry.kind === 'play' &&
                        `${displayName(entry.actorId!)}이(가) ${entry.pile === 'asc' ? '1열' : '100열'}에 ${entry.card}을(를) 놓았다.`}
                      {entry.kind === 'endTurn' &&
                        (entry.reason === 'timeout'
                          ? `${displayName(entry.actorId!)}의 차례가 시간 초과로 끝났다. (덱 ${entry.deckLeft}장 남음)`
                          : `${displayName(entry.actorId!)}의 차례가 끝났다. (덱 ${entry.deckLeft}장 남음)`)}
                      {entry.kind === 'win' && `모두의 손패를 비웠다! 게임 승리 — 참여자 전원 코인 ${CARD_GAME_WIN_COINS}개 지급.`}
                      {entry.kind === 'lose' &&
                        (entry.reason === 'timeout'
                          ? `시간 초과가 ${CARD_TIMEOUT_STRIKES} 회 누적됐다....... 게임 패배.`
                          : `${displayName(entry.actorId!)}의 차례에 낼 수 있는 카드가 없다....... 게임 패배.`)}
                    </p>
                  ))}
                </div>

                {iAmHere && game.status === 'playing' && (
                  <div className="cardgame__hand-area">
                    <span className="cardgame__hand-label">
                      내 손패
                      {!myTurn && ` · ${displayName(game.turnOrder[game.turnIndex])}의 차례를 기다리는 중.......`}
                    </span>
                    <div className={`cardgame__hand ${!myTurn ? 'is-inactive' : ''}`}>
                      {myHand.map((c) => {
                        const canAsc = isLegalCardPlay(c, game.pileAsc, game.pileDesc, 'asc')
                        const canDesc = isLegalCardPlay(c, game.pileAsc, game.pileDesc, 'desc')
                        const deadForRules = !canAsc && !canDesc
                        const selected = selectedCard === c
                        return (
                          <button
                            key={c}
                            className={`cardcard ${selected ? 'is-selected' : ''} ${deadForRules ? 'is-dead' : ''}`}
                            disabled={!myTurn || deadForRules}
                            onClick={() => setSelectedCard(selected ? null : c)}
                          >
                            {c}
                          </button>
                        )
                      })}
                    </div>
                    {myTurn && selectedCard !== null && (
                      <div className="cardgame__play-actions">
                        <button
                          disabled={!isLegalCardPlay(selectedCard, game.pileAsc, game.pileDesc, 'asc')}
                          onClick={() => {
                            playCard(openCardRoom!, 'asc', selectedCard)
                            setSelectedCard(null)
                          }}
                        >
                          1열에 놓기
                        </button>
                        <button
                          disabled={!isLegalCardPlay(selectedCard, game.pileAsc, game.pileDesc, 'desc')}
                          onClick={() => {
                            playCard(openCardRoom!, 'desc', selectedCard)
                            setSelectedCard(null)
                          }}
                        >
                          100열에 놓기
                        </button>
                      </div>
                    )}
                    {myTurn && (
                      <button className="cardgame__end-turn" disabled={!canEndTurn} onClick={() => endCardTurn(openCardRoom!)}>
                        {canEndTurn
                          ? '턴 넘기기'
                          : `턴을 넘기려면 ${requiredMin}장 이상 내야 한다 (${game.cardsPlayedThisTurn}/${requiredMin})`}
                      </button>
                    )}
                  </div>
                )}
                {!iAmHere && !isAdmin && <p className="rooms__pin-note">입장한 사람만 카드를 낼 수 있다.</p>}
              </div>
            )}
          </div>
        </div>

        {game && (
          <div className="cardgame__pile-fixed">
            <span className="cardgame__pile-fixed-row">
              1열 {[1, ...game.log.filter((e) => e.kind === 'play' && e.pile === 'asc').map((e) => e.card)].join(' ')}
            </span>
            <span className="cardgame__pile-fixed-row">
              100열{' '}
              {[100, ...game.log.filter((e) => e.kind === 'play' && e.pile === 'desc').map((e) => e.card)].join(' ')}
            </span>
          </div>
        )}

        {iAmHere || isAdmin ? (
          <>
            <div className="rooms__log" ref={cardChatLogRef}>
              {(roomMessages[openCardRoom] ?? []).map((m) => {
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
                onKeyDown={(e) => e.key === 'Enter' && submitCardChat()}
                placeholder={`${room.name}에서 대화하기......`}
              />
              <button onClick={submitCardChat}>전송</button>
            </div>
          </>
        ) : (
          <p className="rooms__locked-note">입장해야 대화를 볼 수 있다.</p>
        )}
      </div>
    )
  }

  if (openHalliRoom) {
    const room = HALLI_ROOMS.find((r) => r.id === openHalliRoom)!
    const occupants = roomOccupancy[openHalliRoom] ?? []
    const iAmHere = !!viewerId && occupants.includes(viewerId)
    const roomEvent = roomEvents[openHalliRoom]
    const game = halliGames[openHalliRoom]
    const iAmParticipant = !!viewerId && !!game && game.playerIds.includes(viewerId)
    const iAmEliminated = !!viewerId && !!game && game.eliminated.includes(viewerId)
    const myDeckCount = viewerId && game ? (game.decks[viewerId] ?? []).length : 0
    const allBetsIn = !!game && game.playerIds.every((id) => game.bets[id] !== undefined)
    const betAmount = Number(halliBetDraft)
    const useCenterBell = !!game && (game.playerIds.length === 4 || game.playerIds.length === 5)

    function submitHalliChat() {
      sendRoomMessage(openHalliRoom!, draft)
      setDraft('')
    }

    return (
      <div className="rooms">
        <div className="rooms__pin">
          <button
            className="rooms__back"
            onClick={() => {
              setOpenRoom(null)
              setOpenCardRoom(null)
              setOpenHalliRoom(null)
            }}
          >
            ← 구관 목록
          </button>
          <div className="rooms__pin-scroll">
            <div className="rooms__pin-head">
              <span className="rooms__pin-title">{room.name}</span>
              {gmReveal && (
                <div className="rooms__pin-gm">
                  <button className="rooms__pin-reset" onClick={() => setRoomOpen(openHalliRoom!, !roomEvent.open)}>
                    구관 {roomEvent.open ? '닫기' : '열기'}
                  </button>
                  {!game && (
                    <button
                      className="rooms__pin-reset"
                      disabled={occupants.length < HALLI_ROOM_MIN_PLAYERS || occupants.length > room.capacity}
                      onClick={() => startHalliBetting(openHalliRoom!)}
                    >
                      베팅 시작
                    </button>
                  )}
                  {game && game.status === 'betting' && (
                    <button className="rooms__pin-reset" disabled={!allBetsIn} onClick={() => dealHalliGame(openHalliRoom!)}>
                      카드 나눠주기
                    </button>
                  )}
                  {game && (
                    <button
                      className="rooms__pin-reset"
                      disabled={halliActionPending === 'reset'}
                      onClick={() => {
                        setHalliActionPending('reset')
                        resetHalliGame(openHalliRoom!)
                      }}
                    >
                      {halliActionPending === 'reset' ? '초기화 중......' : '게임 초기화'}
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="rooms__pin-occupants">
              <span className="rooms__pin-count">
                {occupants.length}/{room.capacity}
              </span>
              {occupants.map((id) => (
                <span key={id} className="rooms__pin-occupant">
                  <ChatAvatar authorId={id} name={displayName(id)} photo={players[id]?.photo} size={22} />
                  {isAdmin && (
                    <button
                      className="rooms__pin-kick"
                      onClick={() => kickFromHalliRoom(openHalliRoom!, id)}
                      aria-label={`${displayName(id)} 쫓아내기`}
                      title={`${displayName(id)} 쫓아내기`}
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
              {!isAdmin &&
                (iAmHere
                  ? !game && (
                      <button className="rooms__pin-toggle" onClick={() => leaveHalliRoom(openHalliRoom!)}>
                        나가기
                      </button>
                    )
                  : !roomEvent.open || !!game
                    ? (
                        <span className="rooms__pin-locked">잠김</span>
                      )
                    : (
                        <button
                          className="rooms__pin-toggle"
                          disabled={occupants.length >= room.capacity}
                          onClick={() => joinHalliRoom(openHalliRoom!)}
                        >
                          {occupants.length >= room.capacity ? '인원 초과' : '입장'}
                        </button>
                      ))}
            </div>

            {!roomEvent.open && !isAdmin && !iAmHere && (
              <p className="rooms__pin-ambient">이 구관은 아직 잠겨 있다.</p>
            )}
            {roomEvent.open && !!game && !isAdmin && !iAmHere && (
              <p className="rooms__pin-ambient">게임이 진행 중이라 지금은 입장할 수 없다.</p>
            )}

            {!game && (roomEvent.open || isAdmin || iAmHere) && (
              <p className="rooms__pin-ambient">
                {occupants.length < HALLI_ROOM_MIN_PLAYERS
                  ? `최소 ${HALLI_ROOM_MIN_PLAYERS}명이 모여야 시작할 수 있다. (${occupants.length}/${room.capacity})`
                  : `불가가 "베팅 시작"을 누르면 시작된다. (${occupants.length}/${room.capacity})`}
              </p>
            )}

            {game && game.status === 'betting' && (
              <div className="hallibet">
                <p className="rooms__pin-ambient">참가자 전원이 코인을 걸어야 카드를 나눠줄 수 있다.</p>
                {game.playerIds.map((id) => (
                  <div key={id} className="hallibet__row">
                    <ChatAvatar authorId={id} name={displayName(id)} photo={players[id]?.photo} size={20} />
                    <span>{displayName(id)}</span>
                    <span className="hallibet__status">
                      {game.bets[id] !== undefined ? `코인 ${game.bets[id]} 배팅함` : '아직 배팅 안 함'}
                    </span>
                  </div>
                ))}
                {iAmParticipant && viewerId && game.bets[viewerId] === undefined && (
                  <div className="hallibet__form">
                    <input
                      type="number"
                      value={halliBetDraft}
                      onChange={(e) => setHalliBetDraft(e.target.value)}
                      placeholder={`걸 코인 (보유 ${coins})`}
                    />
                    <button
                      disabled={
                        halliActionPending === 'bet' ||
                        !halliBetDraft.trim() ||
                        Number.isNaN(betAmount) ||
                        betAmount < 1 ||
                        betAmount > coins
                      }
                      onClick={() => {
                        setHalliActionPending('bet')
                        placeHalliBet(openHalliRoom!, betAmount)
                      }}
                    >
                      {halliActionPending === 'bet' ? '배팅하는 중......' : '배팅하기'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {game && game.status !== 'betting' && (
              <div className="hallicards-wrap">
                <div className={`hallicards hallicards--n${game.playerIds.length}`}>
                  {game.playerIds.map((id, i) => {
                    const card = game.revealed[id]
                    const eliminated = game.eliminated.includes(id)
                    const style = halliSlotStyle(i, game.playerIds.length)
                    return (
                      <div key={id} className={`halli-slot ${eliminated ? 'is-eliminated' : ''}`} style={style}>
                        <span className="halli-slot__name">{displayName(id)}</span>
                        <span className="halli-slot__count">{(game.decks[id] ?? []).length}장</span>
                        {card ? (
                          <div className={`hallicard hallicard--${card.color}`}>{card.value}</div>
                        ) : (
                          <div className="hallicard hallicard--empty" />
                        )}
                        {eliminated && <span className="halli-slot__out">탈락</span>}
                      </div>
                    )
                  })}
                  {useCenterBell && game.status === 'playing' && iAmParticipant && !iAmEliminated && (
                    <button className="halli-bell-center" onClick={() => pressHalliBell(openHalliRoom!)}>
                      누르기!
                    </button>
                  )}
                </div>

                {game.status === 'playing' && (
                  <div className="halliactions">
                    {iAmParticipant && !iAmEliminated && (
                      <button className="halliactions__flip" disabled={myDeckCount === 0} onClick={() => flipHalliCard(openHalliRoom!)}>
                        뒤집기
                      </button>
                    )}
                    {!useCenterBell && iAmParticipant && !iAmEliminated && (
                      <button className="halliactions__bell" onClick={() => pressHalliBell(openHalliRoom!)}>
                        누르기!
                      </button>
                    )}
                    {!iAmParticipant && !isAdmin && <p className="rooms__pin-note">참가자만 뒤집기·누르기를 할 수 있다.</p>}
                    {iAmEliminated && <p className="rooms__pin-note">카드가 다 떨어져 탈락했다.</p>}
                  </div>
                )}

                {game.status === 'ended' && game.winnerId && (
                  <p className="cardgame__result is-win">
                    {displayName(game.winnerId)}의 승리....... 배팅된 코인 {game.pot}개를 전부 가져갔다.
                  </p>
                )}

                <div className="cardgame__log">
                  {game.log.length === 0 && <p className="cardgame__log-line">아직 아무 일도 없었다.</p>}
                  {game.log.slice(-30).map((entry) => (
                    <p key={entry.id} className="cardgame__log-line">
                      {entry.kind === 'start' && '게임을 시작했다....... 카드를 나눠 가졌다.'}
                      {entry.kind === 'win' &&
                        entry.actorId &&
                        entry.color &&
                        `${displayName(entry.actorId)}이(가) ${HALLI_COLOR_LABEL[entry.color]} 합 5를 맞혀 카드 ${entry.collected}장을 가져갔다.`}
                      {entry.kind === 'miss' && entry.actorId && `${displayName(entry.actorId)}이(가) 잘못 눌러 카드 한 장을 반납했다.`}
                      {entry.kind === 'gameover' && entry.actorId && `${displayName(entry.actorId)}이(가) 최종 승리했다!`}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {iAmHere || isAdmin ? (
          <>
            <div className="rooms__log" ref={halliChatLogRef}>
              {(roomMessages[openHalliRoom] ?? []).map((m) => {
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
                onKeyDown={(e) => e.key === 'Enter' && submitHalliChat()}
                placeholder={`${room.name}에서 대화하기......`}
              />
              <button onClick={submitHalliChat}>전송</button>
            </div>
          </>
        ) : (
          <p className="rooms__locked-note">입장해야 대화를 볼 수 있다.</p>
        )}
      </div>
    )
  }

  return (
    <div className="rooms">
      <div className="rooms__intro">
        <span className="rooms__intro-label">구관</span>
        <p>선착순으로 입장한다. 각 구관에는 인원 제한이 있다. 교실 A/B는 협동 카드 게임 "더 게임"이다.</p>
      </div>
      <div className="rooms__grid">
        {ROOMS.map((room) => {
          const occupants = roomOccupancy[room.id]
          const full = occupants.length >= room.capacity
          const cleared = roomEvents[room.id].cleared
          const investigating = !!roomEvents[room.id].event && !cleared
          const open = roomEvents[room.id].open
          return (
            <button
              key={room.id}
              className={`rooms__card ${!open ? 'is-locked' : ''}`}
              onClick={() => {
                setOpenCardRoom(null)
                setOpenHalliRoom(null)
                setOpenRoom(room.id)
              }}
            >
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
                  return <Badge key={id} team={resolvedTeam(mission, c.id)} size={18} revealed={revealedFor(c)} />
                })}
              </div>
            </button>
          )
        })}
        {CARD_ROOMS.map((room) => {
          const occupants = roomOccupancy[room.id] ?? []
          const full = occupants.length >= room.capacity
          const game = cardGames[room.id]
          const open = roomEvents[room.id].open
          return (
            <button
              key={room.id}
              className={`rooms__card ${!open ? 'is-locked' : ''}`}
              onClick={() => {
                setOpenRoom(null)
                setOpenHalliRoom(null)
                setOpenCardRoom(room.id)
              }}
            >
              <div className="rooms__card-top">
                <span className="rooms__card-name">
                  {room.name}
                  {hasUnreadRoom(room.id) && <span className="rooms__card-ping" />}
                  {!open && <span className="rooms__card-locked-tag">잠김</span>}
                  {game?.status === 'playing' && <span className="rooms__card-active-tag">진행 중</span>}
                  {game?.status === 'won' && <span className="rooms__card-clue-tag">승리</span>}
                  {game?.status === 'lost' && <span className="rooms__card-locked-tag">패배</span>}
                </span>
                <span className={`rooms__card-count ${full ? 'is-full' : ''}`}>
                  {occupants.length}/{room.capacity}
                </span>
              </div>
              <p className="rooms__card-desc">{room.description}</p>
              <div className="rooms__card-avatars">
                {occupants.map((id) => (
                  <ChatAvatar key={id} authorId={id} name={displayName(id)} photo={players[id]?.photo} size={18} />
                ))}
              </div>
            </button>
          )
        })}
        {HALLI_ROOMS.map((room) => {
          const occupants = roomOccupancy[room.id] ?? []
          const full = occupants.length >= room.capacity
          const game = halliGames[room.id]
          const open = roomEvents[room.id].open
          return (
            <button
              key={room.id}
              className={`rooms__card ${!open ? 'is-locked' : ''}`}
              onClick={() => {
                setOpenRoom(null)
                setOpenCardRoom(null)
                setOpenHalliRoom(room.id)
              }}
            >
              <div className="rooms__card-top">
                <span className="rooms__card-name">
                  {room.name}
                  {hasUnreadRoom(room.id) && <span className="rooms__card-ping" />}
                  {!open && <span className="rooms__card-locked-tag">잠김</span>}
                  {game?.status === 'betting' && <span className="rooms__card-active-tag">배팅 중</span>}
                  {game?.status === 'playing' && <span className="rooms__card-active-tag">진행 중</span>}
                  {game?.status === 'ended' && <span className="rooms__card-clue-tag">종료</span>}
                </span>
                <span className={`rooms__card-count ${full ? 'is-full' : ''}`}>
                  {occupants.length}/{room.capacity}
                </span>
              </div>
              <p className="rooms__card-desc">{room.description}</p>
              <div className="rooms__card-avatars">
                {occupants.map((id) => (
                  <ChatAvatar key={id} authorId={id} name={displayName(id)} photo={players[id]?.photo} size={18} />
                ))}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
