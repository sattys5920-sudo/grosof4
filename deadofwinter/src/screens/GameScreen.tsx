import { useState } from 'react'
import type { LocationId, RoomDoc } from '../engine/types'
import Board from '../components/Board'
import SurvivorCard from '../components/SurvivorCard'
import { LOCATIONS, LOCATION_MAP } from '../engine/locations'
import { ITEM_TYPE_MAP } from '../engine/items'
import { SURVIVOR_MAP } from '../engine/survivors'

/** STEP 7 범위: 라운드/턴 진행 + 보드 + 생존자·주사위 + 이동·탐색·공격 +
 * 노출/물림 전염 판정까지. 매 라운드 자동으로 늘어나는 좀비(콜로니 단계)는
 * STEP 8~9에서 이어서 구현한다. */
export default function GameScreen({
  room,
  myUid,
  busy,
  errorMsg,
  onEndTurn,
  onMove,
  onSearch,
  onAttack,
  onResolveBite,
}: {
  room: RoomDoc
  myUid: string
  busy: boolean
  errorMsg: string
  onEndTurn: () => void
  onMove: (survivorId: string, destination: LocationId) => void
  onSearch: (survivorId: string) => void
  onAttack: (survivorId: string) => void
  onResolveBite: (choice: 'die' | 'reroll') => void
}) {
  const [selectedSurvivorId, setSelectedSurvivorId] = useState<string | null>(null)

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

  return (
    <div className="game-screen">
      <div className="game-hud">
        <span className="hud-round">ROUND {room.round ?? 1}</span>
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
                  myTurn && room.roundPhase === 'turns' && s.alive && !pendingBite
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
              <span key={i} className={`dice-face${myDiceUsed[i] ? ' used' : ''}`}>
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
              </span>
            ))}
          </div>
        </div>
      )}

      {room.roundPhase === 'turns' && myTurn && !pendingBite && selected && (
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
          {myTurn && !selected && !pendingBite && <p className="turn-hint">위에서 생존자를 먼저 선택하세요.</p>}
          {errorMsg && <p className="menu-error">{errorMsg}</p>}
          <button type="button" className="menu-btn primary" disabled={!myTurn || busy || Boolean(pendingBite)} onClick={onEndTurn}>
            턴 종료
          </button>
        </div>
      )}

      {room.roundPhase === 'colony' && (
        <div className="turn-panel">
          <p className="turn-status">🏕 전원의 턴이 끝났습니다.</p>
          <p className="turn-hint">식량 지불 · 폐기물 확인 · 위기 해결 · 좀비 추가 등 콜로니 단계는 다음 단계에서 구현됩니다.</p>
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
