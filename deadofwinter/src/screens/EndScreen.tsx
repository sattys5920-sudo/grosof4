import type { PlayerSecret, RoomDoc } from '../engine/types'
import { MAIN_OBJECTIVE_CRISIS_TARGET } from '../engine/logic'
import { SECRET_OBJECTIVE_MAP } from '../engine/secretObjectives'

const REASON_TEXT: Record<string, string> = {
  mainObjective: `메인 목표(위기 카드 ${MAIN_OBJECTIVE_CRISIS_TARGET}회 해결)를 달성했습니다.`,
  moraleZero: '사기가 바닥나 콜로니가 무너졌습니다.',
  roundLimit: '정해진 라운드 안에 메인 목표를 이루지 못했습니다.',
}

/** STEP 13 범위: 사기 0 / 메인 목표 달성(위기 5회 성공) / 라운드 제한
 * 초과로 승패를 가른다. 원작처럼 시나리오별 메인 목표가 다양하지는
 * 않고 이 한 가지로 고정했다. 다른 플레이어의 비밀 목표 달성 여부는
 * 채점하지 않고(관련 개인 통계를 안 쌓아서), 내 카드만 마지막으로
 * 공개해서 보여준다 — secrets/{uid}는 본인만 읽을 수 있어서 서버 쪽
 * 어떤 함수도 남의 카드를 모아 공개 문서에 옮길 권한이 없다. */
export default function EndScreen({
  room,
  mySecret,
  onLeave,
}: {
  room: RoomDoc
  mySecret: PlayerSecret | null
  onLeave: () => void
}) {
  const result = room.gameResult
  const won = result?.outcome === 'win'
  const mySecretObjective = mySecret ? SECRET_OBJECTIVE_MAP[mySecret.objectiveId] : undefined

  return (
    <div className="end-screen">
      <div className={`end-banner${won ? ' win' : ' loss'}`}>
        <span className="end-emblem">{won ? '🏆' : '🧟'}</span>
        <h2 className="end-title">{won ? '콜로니 생존!' : '콜로니 전멸…'}</h2>
        <p className="end-reason">{result ? REASON_TEXT[result.reason] : ''}</p>
      </div>

      <div className="end-stats">
        <span className="end-stat">🍖 식량 {room.food ?? 0}</span>
        <span className="end-stat">❤️ 사기 {room.morale ?? 0}</span>
        <span className="end-stat">
          🎯 위기 {room.crisisSuccessCount ?? 0}/{MAIN_OBJECTIVE_CRISIS_TARGET}
        </span>
        <span className="end-stat">📅 {result?.round ?? room.round ?? 1}라운드</span>
      </div>

      {mySecretObjective && (
        <div className={`secret-card${mySecretObjective.isBetrayer ? ' betrayer' : ''}`}>
          <span className="secret-icon">{mySecretObjective.icon}</span>
          <div className="secret-body">
            <p className="secret-title">내 비밀 목표: {mySecretObjective.title}</p>
            <p className="secret-desc">{mySecretObjective.description}</p>
            {mySecretObjective.isBetrayer && !won && (
              <p className="secret-desc betrayer-note">배신자 목표라 콜로니가 무너지면서 당신은 승리했습니다.</p>
            )}
          </div>
        </div>
      )}

      <div className="end-log">
        {(room.log ?? [])
          .slice(-8)
          .reverse()
          .map((entry, i) => (
            <p key={`${entry.at}-${i}`} className="game-log-entry">
              {entry.text}
            </p>
          ))}
      </div>

      <button type="button" className="menu-btn primary" onClick={onLeave}>
        메인 메뉴로
      </button>
    </div>
  )
}
