import { useState } from 'react'
import type { LocationId, RoomDoc } from '../engine/types'
import Board from '../components/Board'
import SurvivorCard from '../components/SurvivorCard'
import { LOCATIONS, LOCATION_MAP } from '../engine/locations'
import { ITEM_TYPE_MAP } from '../engine/items'
import { SURVIVOR_MAP } from '../engine/survivors'
import { CRISIS_MAP } from '../engine/crises'
import { CROSSROAD_MAP } from '../engine/crossroads'
import { SECRET_OBJECTIVE_MAP } from '../engine/secretObjectives'
import type { PlayerSecret } from '../engine/types'

const CATEGORY_LABEL: Record<string, string> = {
  weapon: '무기',
  food: '식량',
  medical: '의료품',
  tool: '도구',
  info: '정보',
}

/** STEP 9 범위: 라운드/턴 진행 + 보드 + 생존자·주사위 + 이동·탐색·공격 +
 * 노출/물림 전염 판정 + 콜로니 단계(식량·사기·좀비·라운드 넘김) + 위기 카드
 * 기여까지. 위기는 아이템 카테고리 매칭 성공/실패에 따른 사기 증감으로
 * 단순화했다(카드별 고유 실패 효과는 미구현). */
export default function GameScreen({
  room,
  myUid,
  mySecret,
  busy,
  errorMsg,
  onEndTurn,
  onMove,
  onSearch,
  onAttack,
  onResolveBite,
  onResolveColonyPhase,
  onContribute,
  onResolveCrossroad,
  onProposeBanishment,
  onCastBanishmentVote,
}: {
  room: RoomDoc
  myUid: string
  mySecret: PlayerSecret | null
  busy: boolean
  errorMsg: string
  onEndTurn: () => void
  onMove: (survivorId: string, destination: LocationId) => void
  onSearch: (survivorId: string) => void
  onAttack: (survivorId: string) => void
  onResolveBite: (choice: 'die' | 'reroll') => void
  onResolveColonyPhase: () => void
  onContribute: (itemTypeId: string) => void
  onResolveCrossroad: (choice: 'yes' | 'no') => void
  onProposeBanishment: (survivorId: string) => void
  onCastBanishmentVote: (vote: boolean) => void
}) {
  const [selectedSurvivorId, setSelectedSurvivorId] = useState<string | null>(null)
  const [showSecret, setShowSecret] = useState(false)

  const turnOrder = room.turnOrder ?? []
  const currentUid = room.currentPlayerIndex !== undefined ? turnOrder[room.currentPlayerIndex] : undefined
  const myTurn = currentUid === myUid
  const nameOf = (uid: string) => room.players.find((p) => p.uid === uid)?.name ?? '???'
  const mySurvivors = (room.survivors ?? []).filter((s) => s.ownerUid === myUid)
  const myDice = room.dice?.[myUid] ?? []
  const myDiceUsed = room.diceUsed?.[myUid] ?? []
  const diceLeft = myDiceUsed.filter((u) => !u).length
  const myItems = room.itemsByPlayer?.[myUid] ?? []

  const selected = mySurvivors.find((s) => s.survivorId === selectedSurvivorId && s.alive) ?? null
  const deckLeft = selected ? (room.itemDecks?.[selected.locationId]?.length ?? 0) : 0
  const zombiesHere = selected ? (room.zombies?.[selected.locationId] ?? 0) : 0

  const pendingBite = room.pendingBite
  const myBiteChoice = pendingBite?.targetOwnerUid === myUid
  const biteTargetName = pendingBite ? (SURVIVOR_MAP[pendingBite.targetSurvivorId]?.name ?? '생존자') : ''
  const isHost = room.hostUid === myUid

  const currentCrisis = room.crisis ? CRISIS_MAP[room.crisis] : undefined
  const totalContributions = Object.values(room.crisisContributions ?? {}).reduce((sum, list) => sum + list.length, 0)
  const myContributions = room.crisisContributions?.[myUid]?.length ?? 0
  const canContribute = room.roundPhase === 'turns'

  const crossroadPending = room.crossroadPending
  const myCrossroadChoice = crossroadPending?.uid === myUid
  const crossroadCard = crossroadPending ? CROSSROAD_MAP[crossroadPending.cardId] : undefined

  const mySecretObjective = mySecret ? SECRET_OBJECTIVE_MAP[mySecret.objectiveId] : undefined

  const colonySurvivors = (room.survivors ?? []).filter((s) => s.alive && s.locationId === 'colony')
  const banishmentVote = room.banishmentVote
  const iHaveVoted = banishmentVote ? myUid in banishmentVote.votes : false
  const votedCount = banishmentVote ? Object.keys(banishmentVote.votes).length : 0
  // 물림 전염/크로스로드/추방 투표 중 하나라도 진행 중이면 다른 모든
  // 행동(이동·탐색·공격·턴 종료·새 추방 제안)이 막힌다.
  const noBlockingState = !pendingBite && !crossroadPending && !banishmentVote
  const canProposeBanishment = noBlockingState

  return (
    <div className="game-screen">
      <div className="game-hud">
        <span className="hud-round">ROUND {room.round ?? 1}</span>
        <span className="hud-resource">🍖 {room.food ?? 0}</span>
        <span className="hud-resource">❤️ {room.morale ?? 0}</span>
        <span className={`hud-phase phase-${room.roundPhase}`}>
          {room.roundPhase === 'colony' ? '콜로니 단계' : '플레이어 턴'}
        </span>
      </div>

      <div className="turn-track">
        {turnOrder.map((uid, i) => (
          <div key={uid} className={`turn-chip${uid === currentUid ? ' active' : ''}${uid === myUid ? ' mine' : ''}`}>
            <span className="turn-chip-order">{i + 1}</span>
            <span className="turn-chip-name">{nameOf(uid)}</span>
          </div>
        ))}
      </div>

      {mySecretObjective && (
        <div className="secret-panel">
          <button type="button" className="secret-toggle" onClick={() => setShowSecret((v) => !v)}>
            🔒 내 비밀 목표 {showSecret ? '숨기기' : '보기'} (나만 볼 수 있어요)
          </button>
          {showSecret && (
            <div className={`secret-card${mySecretObjective.isBetrayer ? ' betrayer' : ''}`}>
              <span className="secret-icon">{mySecretObjective.icon}</span>
              <div className="secret-body">
                <p className="secret-title">{mySecretObjective.title}</p>
                <p className="secret-desc">{mySecretObjective.description}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {currentCrisis && (
        <div className="crisis-panel">
          <span className="panel-label">위기 카드</span>
          <div className="crisis-card" key={currentCrisis.id}>
            <span className="crisis-icon">{currentCrisis.icon}</span>
            <div className="crisis-body">
              <p className="crisis-title">{currentCrisis.title}</p>
              <p className="crisis-desc">{currentCrisis.description}</p>
              <p className="crisis-req">
                필요: {CATEGORY_LABEL[currentCrisis.requiredCategory]} 카테고리 아이템 · 콜로니 단계에서 판정 (내 기여{' '}
                {myContributions}개 / 전체 {totalContributions}개)
              </p>
            </div>
          </div>
        </div>
      )}

      <Board zombies={room.zombies} />

      {pendingBite && (
        <div className="bite-panel">
          {myBiteChoice ? (
            <>
              <span className="panel-label">🧟 물림 전염 — {biteTargetName}</span>
              <p className="turn-hint">
                같은 장소에서 물린 생존자가 나왔어요. {biteTargetName}에게 전염될 위기예요 — 어떻게 할까요?
              </p>
              <div className="action-buttons">
                <button type="button" className="menu-btn danger" disabled={busy} onClick={() => onResolveBite('die')}>
                  즉시 사망시키기
                </button>
                <button type="button" className="menu-btn" disabled={busy} onClick={() => onResolveBite('reroll')}>
                  다시 굴리기 (도박)
                </button>
              </div>
            </>
          ) : (
            <p className="turn-hint">🧟 {biteTargetName}의 주인이 물림 전염 판정을 하는 중이에요…</p>
          )}
        </div>
      )}

      {crossroadCard && (
        <div className="crossroad-panel">
          {myCrossroadChoice ? (
            <>
              <span className="panel-label">
                {crossroadCard.icon} 크로스로드 — {crossroadCard.title}
              </span>
              <p className="turn-hint">{crossroadCard.description}</p>
              <p className="turn-hint crossroad-prompt">{crossroadCard.prompt}</p>
              <div className="action-buttons">
                <button type="button" className="menu-btn primary" disabled={busy} onClick={() => onResolveCrossroad('yes')}>
                  {crossroadCard.yesLabel}
                </button>
                <button type="button" className="menu-btn" disabled={busy} onClick={() => onResolveCrossroad('no')}>
                  {crossroadCard.noLabel}
                </button>
              </div>
            </>
          ) : (
            <p className="turn-hint">
              {crossroadCard.icon} 크로스로드 카드 "{crossroadCard.title}"가 발동했어요 — {nameOf(crossroadPending!.uid)}이(가) 고르는 중이에요…
            </p>
          )}
        </div>
      )}

      {banishmentVote && (
        <div className="vote-panel">
          <span className="panel-label">
            🗳 추방 투표 — {SURVIVOR_MAP[banishmentVote.targetSurvivorId]?.name ?? '생존자'}
          </span>
          <p className="turn-hint">
            {nameOf(banishmentVote.proposedByUid)}이(가) 이 생존자의 추방을 제안했어요. ({votedCount}/{room.players.length}명
            투표함)
          </p>
          {iHaveVoted ? (
            <p className="turn-hint">투표했어요. 다른 사람들을 기다리는 중…</p>
          ) : (
            <div className="action-buttons">
              <button type="button" className="menu-btn danger" disabled={busy} onClick={() => onCastBanishmentVote(true)}>
                추방 찬성
              </button>
              <button type="button" className="menu-btn" disabled={busy} onClick={() => onCastBanishmentVote(false)}>
                추방 반대
              </button>
            </div>
          )}
        </div>
      )}

      {colonySurvivors.length > 0 && (
        <div className="colony-survivors">
          <span className="panel-label">콜로니에 있는 생존자</span>
          <div className="colony-survivors-row">
            {colonySurvivors.map((s, i) => {
              const base = SURVIVOR_MAP[s.survivorId]
              return (
                <div key={`${s.survivorId}-${i}`} className="colony-survivor-chip">
                  <span>
                    {base?.icon} {base?.name} ({nameOf(s.ownerUid)})
                  </span>
                  <button
                    type="button"
                    className="colony-survivor-banish-btn"
                    disabled={busy || !canProposeBanishment}
                    onClick={() => onProposeBanishment(s.survivorId)}
                  >
                    추방 제안
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {mySurvivors.length > 0 && (
        <div className="my-survivors">
          <span className="panel-label">내 생존자{myTurn && room.roundPhase === 'turns' ? ' (눌러서 이동·탐색·공격)' : ''}</span>
          <div className="my-survivors-row">
            {mySurvivors.map((s, i) => (
              <SurvivorCard
                key={`${s.survivorId}-${i}`}
                instance={s}
                location={LOCATION_MAP[s.locationId]}
                selected={s.survivorId === selectedSurvivorId}
                onClick={
                  myTurn && room.roundPhase === 'turns' && s.alive && noBlockingState
                    ? () => setSelectedSurvivorId((cur) => (cur === s.survivorId ? null : s.survivorId))
                    : undefined
                }
              />
            ))}
          </div>
        </div>
      )}

      {myDice.length > 0 && (
        <div className="my-dice">
          <span className="panel-label">내 행동 주사위 ({diceLeft}/{myDice.length} 남음)</span>
          <div className="my-dice-row">
            {myDice.map((value, i) => (
              <span key={`${room.round}-${i}`} className={`dice-face${myDiceUsed[i] ? ' used' : ''}`} style={{ animationDelay: `${i * 60}ms` }}>
                🎲 {value}
              </span>
            ))}
          </div>
        </div>
      )}

      {myItems.length > 0 && (
        <div className="my-items">
          <span className="panel-label">내 아이템</span>
          <div className="my-items-row">
            {myItems.map((itemId, i) => (
              <span key={`${itemId}-${i}`} className="item-chip" title={ITEM_TYPE_MAP[itemId]?.name}>
                {ITEM_TYPE_MAP[itemId]?.icon} {ITEM_TYPE_MAP[itemId]?.name}
                {currentCrisis && (
                  <button
                    type="button"
                    className="item-contribute-btn"
                    disabled={busy || !canContribute}
                    title="위기에 기여하기"
                    onClick={() => onContribute(itemId)}
                  >
                    위기에 기여
                  </button>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {room.roundPhase === 'turns' && myTurn && noBlockingState && selected && (
        <div className="action-panel">
          <span className="panel-label">
            {LOCATION_MAP[selected.locationId].icon} {LOCATION_MAP[selected.locationId].name}에서
          </span>
          <div className="action-buttons">
            <button
              type="button"
              className="menu-btn"
              disabled={busy || diceLeft === 0 || selected.locationId === 'colony'}
              onClick={() => onSearch(selected.survivorId)}
            >
              🔍 탐색 {selected.locationId !== 'colony' && `(카드 ${deckLeft}장 남음)`}
            </button>
            <button
              type="button"
              className="menu-btn danger"
              disabled={busy || diceLeft === 0 || zombiesHere === 0}
              onClick={() => onAttack(selected.survivorId)}
            >
              ⚔️ 공격 {zombiesHere > 0 ? `(좀비 ${zombiesHere}마리)` : '(좀비 없음)'}
            </button>
          </div>
          <span className="panel-label move-label">다른 장소로 이동</span>
          <div className="move-grid">
            {LOCATIONS.filter((loc) => loc.id !== selected.locationId).map((loc) => (
              <button
                type="button"
                key={loc.id}
                className="move-btn"
                disabled={busy || diceLeft === 0}
                onClick={() => onMove(selected.survivorId, loc.id)}
              >
                {loc.icon} {loc.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {room.roundPhase === 'turns' && (
        <div className="turn-panel">
          <p className="turn-status">
            {myTurn ? '🔎 당신의 차례입니다' : `${currentUid ? nameOf(currentUid) : '???'}의 차례를 기다리는 중…`}
          </p>
          {myTurn && !selected && noBlockingState && <p className="turn-hint">위에서 생존자를 먼저 선택하세요.</p>}
          {errorMsg && <p className="menu-error">{errorMsg}</p>}
          <button type="button" className="menu-btn primary" disabled={!myTurn || busy || !noBlockingState} onClick={onEndTurn}>
            {busy && myTurn ? '처리 중…' : '턴 종료'}
          </button>
        </div>
      )}

      {room.roundPhase === 'colony' && (
        <div className="turn-panel">
          <p className="turn-status">🏕 전원의 턴이 끝났습니다.</p>
          <p className="turn-hint">
            콜로니에 있는 생존자만큼 식량을 지불하고, 위기 카드를 판정하고, 외부 장소에 좀비가 늘어난 뒤 다음 라운드가
            시작됩니다.
          </p>
          {errorMsg && <p className="menu-error">{errorMsg}</p>}
          {isHost ? (
            <button type="button" className="menu-btn primary" disabled={busy} onClick={onResolveColonyPhase}>
              {busy ? '처리 중…' : '콜로니 단계 진행'}
            </button>
          ) : (
            <p className="turn-hint">방장이 콜로니 단계를 진행하는 중이에요…</p>
          )}
        </div>
      )}

      <div className="game-log">
        {(room.log ?? [])
          .slice(-10)
          .reverse()
          .map((entry, i) => (
            // 같은 밀리초에 로그가 두 개 이상 쌓일 수 있어 entry.at만으로는
            // 키가 겹칠 수 있다 — 잘라낸 목록 안에서의 위치를 더해 유일하게 만든다.
            <p key={`${entry.at}-${i}`} className="game-log-entry">
              {entry.text}
            </p>
          ))}
      </div>
    </div>
  )
}
