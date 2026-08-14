import { useEffect, useState } from 'react'
import './ProfileScreen.css'
import { useGame } from '../state/GameContext'
import {
  CHARACTERS,
  DAY4_REVEAL_TEXT,
  ENDING_LABELS,
  ENDING_SCRIPTS,
  LEAKER_ABILITY_DESCRIPTION,
  LEAKER_ABILITY_NAME,
  roleLabel,
} from '../data/characters'
import { HALL_EVENTS } from '../data/hallEvents'
import { SHOP_ITEMS, shopItemById } from '../data/shop'
import { Badge } from '../components/Badge'
import { AbilityUseModal } from '../components/AbilityUseModal'
import { PixelIcon } from '../components/PixelIcon'
import { PixelArt } from '../components/PixelArt'
import type { BroadcastKind, EndingKey } from '../data/types'

const PRESETS: { kind: BroadcastKind; label: string; title: string; body: string }[] = [
  {
    kind: 'event',
    label: '이벤트 발생',
    title: '갑작스러운 정전',
    body: '건물 전체 조명이 3 초간 꺼졌다. 그 순간 무언가를 본 사람이 있을지도 모른다.',
  },
  {
    kind: 'sin',
    label: '괴이 출현',
    title: '복도에서 괴이가 목격되었다',
    body: '방금 2 층 복도 CCTV에 정체를 알 수 없는 형체가 잡혔다. 문단속을 확인하라.',
  },
  {
    kind: 'notice',
    label: '공지',
    title: '불가의 공지',
    body: '내용을 입력하세요.',
  },
]

function formatLogTime(ms: number): string {
  const d = new Date(ms)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

function formatDisguiseRemaining(untilMs: number): string {
  const remainingMin = Math.max(0, Math.ceil((untilMs - Date.now()) / 60000))
  const h = Math.floor(remainingMin / 60)
  const m = remainingMin % 60
  if (h <= 0) return `${m}분`
  if (m === 0) return `${h}시간`
  return `${h}시간 ${m}분`
}

function AdminAbilityLogPanel() {
  const { abilityLog, displayName } = useGame()
  const sorted = [...abilityLog].sort((a, b) => b.atMs - a.atMs)

  return (
    <div className="profile__gm">
      <span className="profile__section-label">불가 전용 — 능력 사용 기록</span>
      <p className="profile__gm-note">누가 언제 어떤 능력을 썼고 그 결과로 무엇을 받았는지 시간순으로 모아 보여준다.</p>
      <div className="profile__ability-log">
        {sorted.length === 0 && <p className="profile__dm-empty">아직 사용된 능력이 없다.</p>}
        {sorted.map((entry) => (
          <div key={entry.id} className="profile__ability-log-row">
            <div className="profile__ability-log-head">
              <span className="profile__ability-log-name">{displayName(entry.characterId)}</span>
              <span className="profile__ability-log-ability">{entry.abilityName}</span>
              <span className="profile__ability-log-time">{formatLogTime(entry.atMs)}</span>
            </div>
            <p className="profile__ability-log-result">{entry.resultText}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function PlayerGmDmPanel() {
  const { gmDmMessages, sendGmDm, markDmRead } = useGame()
  const [draft, setDraft] = useState('')

  useEffect(() => {
    markDmRead()
  }, [gmDmMessages.length, markDmRead])

  function submit() {
    sendGmDm(draft)
    setDraft('')
  }

  return (
    <div className="profile__section profile__dm">
      <span className="profile__section-label">??에게 개인 메시지</span>
      <p className="profile__gm-note">다른 부원에게는 보이지 않는, ??와 나 사이의 개인 대화다.</p>
      <div className="profile__dm-log">
        {gmDmMessages.length === 0 && (
          <p className="profile__dm-empty">아직 대화가 없다.</p>
        )}
        {gmDmMessages.map((m) => (
          <div key={m.id} className={`profile__dm-msg ${m.authorId === 'admin' ? 'is-gm' : 'is-me'}`}>
            <span className="profile__dm-msg-name">{m.authorId === 'admin' ? '??' : '나'}</span>
            <p className="profile__dm-msg-text">{m.text}</p>
          </div>
        ))}
      </div>
      <div className="profile__dm-composer">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="??에게 메시지 보내기......"
        />
        <button onClick={submit}>전송</button>
      </div>
    </div>
  )
}

function AdminGmDmPanel() {
  const { players, sendGmDmAsAdmin, markDmThreadRead } = useGame()
  const [openId, setOpenId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  function toggle(characterId: string) {
    setOpenId((prev) => (prev === characterId ? null : characterId))
    setDraft('')
    markDmThreadRead(characterId)
  }

  function submit(characterId: string) {
    sendGmDmAsAdmin(characterId, draft)
    setDraft('')
  }

  return (
    <div className="profile__gm">
      <span className="profile__section-label">불가 전용 — 개인 대화</span>
      <p className="profile__gm-note">부원 각자와 나눈 개인 대화를 확인하고 답장할 수 있다.</p>
      <div className="profile__dm-roster">
        {CHARACTERS.map((c) => {
          const player = players[c.id]
          const messages = player?.gmDmMessages ?? []
          const isOpen = openId === c.id
          return (
            <div key={c.id} className="profile__dm-thread">
              <button className="profile__dm-thread-toggle" onClick={() => toggle(c.id)} disabled={!player}>
                <span>{player ? player.nickname : `${c.name} (미참가)`}</span>
                {messages.length > 0 && <span className="profile__dm-thread-count">{messages.length}</span>}
              </button>
              {isOpen && player && (
                <div className="profile__dm-thread-body">
                  <div className="profile__dm-log">
                    {messages.length === 0 && <p className="profile__dm-empty">아직 대화가 없다.</p>}
                    {messages.map((m) => (
                      <div key={m.id} className={`profile__dm-msg ${m.authorId === 'admin' ? 'is-gm' : 'is-me'}`}>
                        <span className="profile__dm-msg-name">{m.authorId === 'admin' ? '??' : player.nickname}</span>
                        <p className="profile__dm-msg-text">{m.text}</p>
                      </div>
                    ))}
                  </div>
                  <div className="profile__dm-composer">
                    <input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && submit(c.id)}
                      placeholder={`${player.nickname}에게 답장하기......`}
                    />
                    <button onClick={() => submit(c.id)}>전송</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function ProfileScreen() {
  const {
    viewerId,
    nickname,
    setNickname,
    grade,
    photo,
    updatePhoto,
    displayName,
    accountUsername,
    logout,
    gmReveal,
    sendBroadcast,
    broadcast,
    clearBroadcastForAll,
    notifyRoomEvents,
    setNotifyRoomEvents,
    notifyGeneralBroadcasts,
    setNotifyGeneralBroadcasts,
    enableAllNotifications,
    notifPermission,
    requestBrowserNotifications,
    notifyPushEnabled,
    toggleBrowserNotifications,
    missionsOpen,
    openMissions,
    setMissionsOpen,
    abilityUseCount,
    abilityMaxUses,
    personalClues,
    forgottenIdentity,
    useRecordBook,
    investigate,
    armShield,
    checkCctv,
    discern,
    usedDiscernToday,
    usedRecordBookToday,
    forgeResult,
    revengerCheck,
    armDisguise,
    disguiseArmed,
    disguiseArmedUntilMs,
    leakLog,
    leakUnlocked,
    investigateLeak,
    publishLeak,
    hp,
    stamina,
    coins,
    atk,
    def,
    equippedWeaponId,
    equippedArmorId,
    incapacitated,
    inventory,
    useItem,
    mission,
    players,
    collectedClues,
    assignRoleManually,
    resetAllData,
    storyDay,
    revealStoryDay,
    truthRevealed,
    revealTruth,
    endingKey,
    sendEnding,
  } = useGame()
  const viewer = viewerId ? CHARACTERS.find((c) => c.id === viewerId)! : null
  // 서버에서 되돌아오는 값을 곧바로 입력창에 반영하면, Firestore 왕복 시간 동안
  // 타자가 빨라졌을 때 방금 입력한 글자가 지워지거나 깨지는 문제가 있었다.
  // 그래서 입력 중에는 이 로컬 드래프트만 신뢰하고, 신원(viewerId)이 바뀔 때만 다시 동기화한다.
  const [nicknameDraft, setNicknameDraft] = useState(nickname)
  useEffect(() => {
    setNicknameDraft(nickname)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewerId])
  const [kind, setKind] = useState<BroadcastKind>('event')
  const [title, setTitle] = useState(PRESETS[0].title)
  const [body, setBody] = useState(PRESETS[0].body)
  const [targetId, setTargetId] = useState('')
  const [recordTargetAId, setRecordTargetAId] = useState('')
  const [recordTargetBId, setRecordTargetBId] = useState('')
  const [missionPick, setMissionPick] = useState(0)
  const [firstPlayerId, setFirstPlayerId] = useState('')
  const [manualCharacterId, setManualCharacterId] = useState('')
  const [manualNickname, setManualNickname] = useState('')
  const [openClueId, setOpenClueId] = useState<string | null>(null)
  const [abilityModalOpen, setAbilityModalOpen] = useState(false)
  const [masterListOpen, setMasterListOpen] = useState(false)
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)
  const [endingWinner, setEndingWinner] = useState<'ward' | 'sin'>('ward')
  const [endingBroken, setEndingBroken] = useState(true)
  const usesLeft = abilityMaxUses - abilityUseCount

  const otherCharacters = CHARACTERS.filter((c) => c.id !== viewerId)
  const sortedPlayerEntries = Object.entries(players).sort((a, b) =>
    a[1].nickname.localeCompare(b[1].nickname, 'ko'),
  )
  const unclaimedCharacters = CHARACTERS.filter((c) => !players[c.id])
  const missionFresh =
    mission.missionIndex === 0 && mission.phase === 'propose' && mission.wardWins === 0 && mission.sinWins === 0
  const completedMissions = mission.missionResults
    .map((r, i) => ({ r, i }))
    .filter((m) => m.r !== null)
  const accompliceReady =
    mission.phase === 'result' &&
    !!viewerId &&
    mission.proposedTeam.includes(viewerId) &&
    mission.missionResults[mission.missionIndex] === 'success'

  function applyPreset(preset: (typeof PRESETS)[number]) {
    setKind(preset.kind)
    setTitle(preset.title)
    setBody(preset.body)
  }

  function send() {
    sendBroadcast(kind, title, body)
  }

  function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => updatePhoto(reader.result as string)
    reader.readAsDataURL(file)
  }

  return (
    <div className="profile">
      {viewer ? (
        <div className="profile__card">
          <div className="profile__card-head">
            <label className="profile__photo-picker">
              <input type="file" accept="image/*" onChange={onPhotoChange} hidden />
              {photo ? (
                <img className="profile__photo" src={photo} alt="프로필 사진" />
              ) : (
                <Badge team={viewer.team} size={56} />
              )}
              <span className="profile__photo-edit">수정</span>
            </label>
            <div className="profile__name-block">
              <input
                className="profile__name-input"
                value={nicknameDraft}
                maxLength={12}
                onChange={(e) => {
                  setNicknameDraft(e.target.value)
                  setNickname(e.target.value)
                }}
                placeholder="닉네임을 입력하세요"
              />
              <span className={`profile__role profile__role--${viewer.team}`}>
                {roleLabel(viewer)} · {grade}
              </span>
            </div>
          </div>
          <div className="profile__stats">
            <span className={`profile__stat ${hp <= 30 ? 'is-danger' : ''}`}>HP {hp}/100</span>
            <span className={`profile__stat ${stamina <= 30 ? 'is-danger' : ''}`}>스태미나 {stamina}/100</span>
            <span className="profile__stat">코인 {coins}</span>
            <span className="profile__stat">
              공격력 {atk}
              <span className="profile__stat-equip">
                {equippedWeaponId ? ` (${shopItemById(equippedWeaponId)?.name ?? '?'})` : ' (미장착)'}
              </span>
            </span>
            <span className="profile__stat">
              방어력 {def}
              <span className="profile__stat-equip">
                {equippedArmorId ? ` (${shopItemById(equippedArmorId)?.name ?? '?'})` : ' (미장착)'}
              </span>
            </span>
          </div>
          {incapacitated && (
            <p className="profile__ability-locked">
              빈사 상태다....... HP나 스태미나가 모두 바닥나 지금은 구관에 들어갈 수 없다. 매점에서 음식이나 약을
              구해 회복해야 한다.
            </p>
          )}

          {Object.entries(inventory).some(([, count]) => count > 0) && (
            <div className="profile__section profile__inventory">
              <span className="profile__section-label">아이템 가방</span>
              <div className="profile__clue-list">
                {SHOP_ITEMS.filter((item) => (inventory[item.id] ?? 0) > 0).map((item) => (
                  <div key={item.id} className="profile__inventory-item">
                    <PixelArt pixels={item.art.pixels} palette={item.art.palette} size={36} />
                    <div className="profile__inventory-body">
                      <span className="profile__clue-title">
                        {item.name} × {inventory[item.id]}
                      </span>
                      <span className="profile__clue-source">
                        {item.kind === 'weapon' && `공격력 +${item.amount}`}
                        {item.kind === 'armor' && `방어력 +${item.amount}`}
                        {item.kind === 'food' && `스태미나 +${item.amount}`}
                        {item.kind === 'medicine' && `HP +${item.amount}`}
                      </span>
                    </div>
                    <button onClick={() => useItem(item.id)}>사용</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="profile__ability">
            <span className="profile__section-label">
              특수 능력 — {viewer.role === '망각자' && leakUnlocked ? LEAKER_ABILITY_NAME : viewer.abilityName}
            </span>
            <p>{viewer.role === '망각자' && leakUnlocked ? LEAKER_ABILITY_DESCRIPTION : viewer.abilityDescription}</p>

            {['기록자', '감찰자', '복수자', '보호자', '목격자', '괴이의 사도', '파괴자'].includes(viewer.role) && (
                <>
                  {usesLeft <= 0 ? (
                    <p className="profile__ability-locked">
                      사용 완료 ({abilityUseCount}/{abilityMaxUses}) — ??와의 개인 대화에서 결과를 다시
                      확인할 수 있다.
                    </p>
                  ) : viewer.role === '파괴자' && !accompliceReady ? (
                    <p className="profile__ability-locked">
                      조사에 참가한 회차가 성공으로 끝난 직후에만 사용할 수 있다. (남은 횟수 {usesLeft}/
                      {abilityMaxUses})
                    </p>
                  ) : viewer.role === '목격자' && completedMissions.length === 0 ? (
                    <p className="profile__ability-locked">
                      완료된 조사가 있어야 사용할 수 있다. (남은 횟수 {usesLeft}/{abilityMaxUses})
                    </p>
                  ) : viewer.role === '괴이의 사도' && usedDiscernToday ? (
                    <p className="profile__ability-locked">
                      오늘은 이미 사용했다....... 내일 다시 사용할 수 있다. (남은 횟수 {usesLeft}/{abilityMaxUses})
                    </p>
                  ) : viewer.role === '기록자' && usedRecordBookToday ? (
                    <p className="profile__ability-locked">
                      오늘은 이미 사용했다....... 내일 다시 사용할 수 있다. (남은 횟수 {usesLeft}/{abilityMaxUses})
                    </p>
                  ) : (
                    <button
                      onClick={() => {
                        setTargetId('')
                        setRecordTargetAId('')
                        setRecordTargetBId('')
                        setAbilityModalOpen(true)
                      }}
                    >
                      능력 사용하기 (남은 횟수 {usesLeft}/{abilityMaxUses})
                    </button>
                  )}
                </>
              )}

            {viewer.role === '잠입자' && (
              <>
                {disguiseArmed && disguiseArmedUntilMs ? (
                  <p className="profile__ability-locked">
                    지금 위장이 걸려 있다....... {formatDisguiseRemaining(disguiseArmedUntilMs)} 후 풀린다.
                  </p>
                ) : usesLeft <= 0 ? (
                  <p className="profile__ability-locked">
                    사용 완료 ({abilityUseCount}/{abilityMaxUses}) — 더는 위장을 걸 수 없다.
                  </p>
                ) : (
                  <button onClick={armDisguise}>
                    위장 걸기 (남은 횟수 {usesLeft}/{abilityMaxUses})
                  </button>
                )}
              </>
            )}

            {viewer.role === '망각자' && (
              <>
                <p className="profile__ability-locked">
                  {forgottenIdentity
                    ? `기억이 돌아왔다 — 지금까지의 조사 결과로 볼 때, 너는 ${forgottenIdentity === 'ward' ? '학생' : '괴이'}이었다.`
                    : '3 차 조사가 끝나기 전까지는 자신의 정체를 알 수 없다.'}
                </p>
                {leakUnlocked && (
                  <>
                    {usesLeft <= 0 ? (
                      <p className="profile__ability-locked">
                        사용 완료 ({abilityUseCount}/{abilityMaxUses}) — 더는 유포할 수 없다.
                      </p>
                    ) : (
                      <button
                        onClick={() => {
                          setTargetId('')
                          setAbilityModalOpen(true)
                        }}
                      >
                        유포자 능력 사용하기 (남은 횟수 {usesLeft}/{abilityMaxUses})
                      </button>
                    )}
                    {leakLog.length > 0 && (
                      <div className="profile__leak-log">
                        {[...leakLog].reverse().map((entry) => (
                          <div key={entry.id} className="profile__leak-entry">
                            <p className="profile__leak-text">{entry.resultText}</p>
                            {entry.published ? (
                              <span className="profile__leak-published">유포됨</span>
                            ) : (
                              <button className="profile__leak-btn" onClick={() => publishLeak(entry.id)}>
                                유포하기
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>

          {storyDay >= 1 && (
            <div className="profile__personal-clues">
              <span className="profile__section-label">1 일차</span>
              <p>{viewer.storyDay1}</p>
            </div>
          )}
          {storyDay >= 2 && (
            <div className="profile__personal-clues">
              <span className="profile__section-label">2 일차</span>
              <p>{viewer.storyDay2}</p>
            </div>
          )}
          {storyDay >= 3 && (
            <div className="profile__personal-clues">
              <span className="profile__section-label">3 일차</span>
              <p>{viewer.storyDay3}</p>
            </div>
          )}
          {storyDay >= 4 && (
            <div className="profile__personal-clues">
              <span className="profile__section-label">4 일차</span>
              <p>{viewer.storyDay4}</p>
            </div>
          )}
          {truthRevealed && (
            <div className="profile__personal-clues">
              <span className="profile__section-label">전말</span>
              <p>{DAY4_REVEAL_TEXT}</p>
            </div>
          )}
          {endingKey && (
            <div className="profile__personal-clues">
              <span className="profile__section-label">엔딩</span>
              <p className={`profile__ending-text profile__ending-text--${endingKey}`}>
                {ENDING_SCRIPTS[endingKey]}
              </p>
              <p className={`profile__ending-label profile__ending-label--${endingKey}`}>
                {ENDING_LABELS[endingKey]}
              </p>
            </div>
          )}

          {personalClues.length > 0 && (
            <div className="profile__personal-clues">
              <span className="profile__section-label">나만 아는 단서</span>
              {personalClues.map((c, i) => (
                <p key={i}>{c}</p>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {viewer && abilityModalOpen && viewer.role === '기록자' && (
        <AbilityUseModal
          title="능력 사용 — 출석부 펼치기"
          prompt="오늘 출석부에서 확인하고 싶은 두 사람을 직접 골라 볼까....... 다만 그중 하나는 거짓 정보로 섞여서 나올 거야. 그래도 펼쳐볼까?"
          confirmLabel="출석부 펼치기"
          confirmDisabled={!recordTargetAId || !recordTargetBId || recordTargetAId === recordTargetBId}
          onConfirm={() => {
            useRecordBook(recordTargetAId, recordTargetBId)
            setAbilityModalOpen(false)
          }}
          onClose={() => setAbilityModalOpen(false)}
        >
          <select value={recordTargetAId} onChange={(e) => setRecordTargetAId(e.target.value)}>
            <option value="">첫 번째 대상 선택</option>
            {otherCharacters.map((c) => (
              <option key={c.id} value={c.id}>
                {displayName(c.id)}
              </option>
            ))}
          </select>
          <select value={recordTargetBId} onChange={(e) => setRecordTargetBId(e.target.value)}>
            <option value="">두 번째 대상 선택</option>
            {otherCharacters.map((c) => (
              <option key={c.id} value={c.id}>
                {displayName(c.id)}
              </option>
            ))}
          </select>
        </AbilityUseModal>
      )}

      {viewer && abilityModalOpen && (viewer.role === '감찰자' || viewer.role === '복수자') && (
        <AbilityUseModal
          title={`능력 사용 — ${viewer.role === '감찰자' ? '조사하기' : '투시하기'}`}
          prompt={
            viewer.role === '감찰자'
              ? '오늘은 누구의 정체를 조사해 볼까?'
              : '오늘은 누구를 투시해서 진짜 정체를 캐볼까?'
          }
          confirmLabel={viewer.role === '감찰자' ? '조사하기' : '투시하기'}
          confirmDisabled={!targetId}
          onConfirm={() => {
            if (viewer.role === '감찰자') investigate(targetId)
            else revengerCheck(targetId)
            setAbilityModalOpen(false)
          }}
          onClose={() => setAbilityModalOpen(false)}
        >
          <select value={targetId} onChange={(e) => setTargetId(e.target.value)}>
            <option value="">대상 선택</option>
            {otherCharacters.map((c) => (
              <option key={c.id} value={c.id}>
                {displayName(c.id)}
              </option>
            ))}
          </select>
        </AbilityUseModal>
      )}

      {viewer && abilityModalOpen && viewer.role === '보호자' && (
        <AbilityUseModal
          title="능력 사용 — 수호 발동"
          prompt="지금 《수호》를 발동할까....... 발동 직후 진행되는 조사에서 실패 카드 1 장이 무효화된다. 언제 발동할지는 신중하게 고르자."
          confirmLabel="발동하기"
          onConfirm={() => {
            armShield()
            setAbilityModalOpen(false)
          }}
          onClose={() => setAbilityModalOpen(false)}
        />
      )}

      {viewer && abilityModalOpen && viewer.role === '목격자' && (
        <AbilityUseModal
          title="능력 사용 — CCTV 확인"
          prompt="어느 조사의 CCTV 기록을 확인해 볼까?"
          confirmLabel="확인하기"
          confirmDisabled={completedMissions.length === 0}
          onConfirm={() => {
            checkCctv(missionPick)
            setAbilityModalOpen(false)
          }}
          onClose={() => setAbilityModalOpen(false)}
        >
          <select value={missionPick} onChange={(e) => setMissionPick(Number(e.target.value))}>
            {completedMissions.map((m) => (
              <option key={m.i} value={m.i}>
                {m.i + 1} 차 조사
              </option>
            ))}
          </select>
        </AbilityUseModal>
      )}

      {viewer && abilityModalOpen && viewer.role === '괴이의 사도' && (
        <AbilityUseModal
          title="능력 사용 — 분별"
          prompt="오늘은 누구의 능력과 발동 전적을 분별해 볼까?"
          confirmLabel="분별하기"
          confirmDisabled={!targetId}
          onConfirm={() => {
            discern(targetId)
            setAbilityModalOpen(false)
          }}
          onClose={() => setAbilityModalOpen(false)}
        >
          <select value={targetId} onChange={(e) => setTargetId(e.target.value)}>
            <option value="">대상 선택</option>
            {otherCharacters.map((c) => (
              <option key={c.id} value={c.id}>
                {displayName(c.id)}
              </option>
            ))}
          </select>
        </AbilityUseModal>
      )}

      {viewer && abilityModalOpen && viewer.role === '파괴자' && (
        <AbilityUseModal
          title="능력 사용 — 파괴 발동"
          prompt="이번 조사 결과를 몰래 조작해 볼까....... 한번 발동하면 되돌릴 수 없어."
          confirmLabel="파괴하기"
          confirmDisabled={!accompliceReady}
          onConfirm={() => {
            forgeResult()
            setAbilityModalOpen(false)
          }}
          onClose={() => setAbilityModalOpen(false)}
        />
      )}

      {viewer && abilityModalOpen && viewer.role === '망각자' && leakUnlocked && (
        <AbilityUseModal
          title="능력 사용 — 유포"
          prompt="누가 누구에게 능력을 썼는지 알아볼까?"
          confirmLabel="조사하기"
          confirmDisabled={!targetId}
          onConfirm={() => {
            investigateLeak(targetId)
            setAbilityModalOpen(false)
          }}
          onClose={() => setAbilityModalOpen(false)}
        >
          <select value={targetId} onChange={(e) => setTargetId(e.target.value)}>
            <option value="">대상 선택</option>
            {otherCharacters.map((c) => (
              <option key={c.id} value={c.id}>
                {displayName(c.id)}
              </option>
            ))}
          </select>
        </AbilityUseModal>
      )}

      {!viewer && (
        <div className="profile__card">
          <div className="profile__card-head">
            <div className="profile__admin-badge">
              <img src={`${import.meta.env.BASE_URL}images/admin-eye.jpg`} alt="??" />
            </div>
            <div className="profile__name-block">
              <span className="profile__name-static">{nickname}</span>
              <span className="profile__role">진행자 계정</span>
            </div>
          </div>
          <p className="profile__tagline">역할이 배정되지 않는다. 진행과 연출만 담당한다.</p>
        </div>
      )}

      <div className="profile__section">
        <span className="profile__section-label">함께 있는 사람들</span>
        <div className="profile__roster">
          {CHARACTERS.map((c) => (
            <div key={c.id} className="profile__roster-item">
              <span className="profile__roster-name">{displayName(c.id)}</span>
              {gmReveal && <span className="profile__roster-role">{roleLabel(c)}</span>}
              {c.id === viewerId && <span className="profile__me-tag">나</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="profile__section">
        <span className="profile__section-label">알림 설정</span>
        <div className="profile__gm-presets">
          <button className="profile__gm-preset" onClick={enableAllNotifications}>
            전체 켜기
          </button>
          <button
            className={`profile__gm-preset ${notifyRoomEvents ? 'is-active' : ''}`}
            onClick={() => setNotifyRoomEvents(!notifyRoomEvents)}
          >
            내 채팅방 알림 {notifyRoomEvents ? '켜짐' : '꺼짐'}
          </button>
          <button
            className={`profile__gm-preset ${notifyGeneralBroadcasts ? 'is-active' : ''}`}
            onClick={() => setNotifyGeneralBroadcasts(!notifyGeneralBroadcasts)}
          >
            전체 공지 알림 {notifyGeneralBroadcasts ? '켜짐' : '꺼짐'}
          </button>
          {notifPermission !== 'unsupported' && (
            <button
              className={`profile__gm-preset ${notifPermission === 'granted' && notifyPushEnabled ? 'is-active' : ''}`}
              onClick={notifPermission === 'granted' ? toggleBrowserNotifications : requestBrowserNotifications}
              disabled={notifPermission === 'denied'}
            >
              {notifPermission === 'granted'
                ? notifyPushEnabled
                  ? '다른 화면에서도 알림 받는 중'
                  : '다른 화면 알림 꺼짐'
                : notifPermission === 'denied'
                  ? '브라우저 알림 차단됨 (설정에서 허용 필요)'
                  : '다른 화면에서도 알림 받기'}
            </button>
          )}
        </div>
        {notifPermission === 'granted' && (
          <p className="profile__gm-note">
            {notifyPushEnabled
              ? '이 창을 열어 둔 채로 다른 화면을 보고 있어도 새 소식이 오면 알림이 뜬다. 다만 앱을 완전히 종료하면 알림도 오지 않는다.'
              : '지금은 꺼둔 상태라 다른 화면에 있어도 알림이 뜨지 않는다. 버튼을 다시 누르면 켤 수 있다.'}
          </p>
        )}
      </div>

      <div className="profile__section">
        <span className="profile__section-label">계정</span>
        <div className="profile__gm-presets">
          {accountUsername && <span className="profile__me-tag">{accountUsername}</span>}
          <button className="profile__gm-preset" onClick={logout}>
            로그아웃
          </button>
        </div>
      </div>

      {!gmReveal && collectedClues.length > 0 && (
        <div className="profile__section profile__clues">
          <span className="profile__section-label">단서 보관함</span>
          <div className="profile__clue-list">
            {collectedClues.map((clue) => {
              const isOpen = openClueId === clue.id
              return (
                <div key={clue.id} className="profile__clue-item">
                  <button
                    className="profile__clue-toggle"
                    onClick={() => setOpenClueId(isOpen ? null : clue.id)}
                  >
                    <span className="profile__clue-icon">
                      <PixelIcon name={clue.icon ?? 'key'} size={20} />
                    </span>
                    <span className="profile__clue-title">{clue.title}</span>
                    <span className="profile__clue-source">{clue.source}</span>
                  </button>
                  {isOpen && (
                    <p className={`profile__clue-text${clue.emphasize ? ' is-emphasis' : ''}`}>{clue.text}</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!gmReveal && <PlayerGmDmPanel />}

      {gmReveal && (
        <>
          <div className="profile__gm">
            <span className="profile__section-label">불가 전용 — 빠른 쪽지 발송</span>
            <p className="profile__gm-note">
              모든 구관·강당·조사 정보를 열람할 수 있고, 아래에서 전원에게 팝업 쪽지를 즉시 보낼 수 있다.
            </p>
            <div className="profile__gm-presets">
              {PRESETS.map((p) => (
                <button
                  key={p.kind}
                  className={`profile__gm-preset ${kind === p.kind ? 'is-active' : ''}`}
                  onClick={() => applyPreset(p)}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <input
              className="profile__gm-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="쪽지 제목"
            />
            <textarea
              className="profile__gm-textarea"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="쪽지 내용"
              rows={3}
            />
            <button className="profile__gm-send" onClick={send}>
              전원에게 쪽지 보내기
            </button>
            {broadcast && (
              <button className="profile__gm-preset" onClick={clearBroadcastForAll}>
                지금 뜬 공지 전원에게서 끄기
              </button>
            )}
          </div>

          {unclaimedCharacters.length > 0 && (
            <div className="profile__gm">
              <span className="profile__section-label">불가 전용 — 역할 수동 배정</span>
              <p className="profile__gm-note">
                랜덤 배정이 안 되거나 특정 인원에게 특정 역할을 주고 싶을 때 사용한다.
              </p>
              <div className="profile__gm-presets">
                {unclaimedCharacters.map((c) => (
                  <button
                    key={c.id}
                    className={`profile__gm-preset ${manualCharacterId === c.id ? 'is-active' : ''}`}
                    onClick={() => setManualCharacterId(c.id)}
                  >
                    {c.name} · {c.role}
                  </button>
                ))}
              </div>
              <input
                className="profile__gm-input"
                value={manualNickname}
                onChange={(e) => setManualNickname(e.target.value)}
                placeholder="배정할 사람의 닉네임"
              />
              <button
                className="profile__gm-send"
                disabled={!manualCharacterId || !manualNickname.trim()}
                onClick={() => {
                  assignRoleManually(manualCharacterId, manualNickname)
                  setManualCharacterId('')
                  setManualNickname('')
                }}
              >
                수동 배정하기
              </button>
            </div>
          )}

          <div className="profile__gm">
            <span className="profile__section-label">불가 전용 — 조사</span>
            <p className="profile__gm-note">
              조사 상태: <strong>{missionsOpen ? '열림' : '잠김'}</strong>
              {!missionFresh &&
                ` (진행 중 — ${mission.missionIndex + 1} 차, 일반 학생 ${mission.wardWins} : ${mission.sinWins} 괴이 학생)`}
            </p>
            {missionsOpen ? (
              <button className="profile__gm-preset" onClick={() => setMissionsOpen(false)}>
                조사 닫기
              </button>
            ) : missionFresh ? (
              <>
                <select value={firstPlayerId} onChange={(e) => setFirstPlayerId(e.target.value)}>
                  <option value="">첫 순서: 가나다순 자동</option>
                  {sortedPlayerEntries.map(([id, p]) => (
                    <option key={id} value={id}>
                      첫 순서: {p.nickname}
                    </option>
                  ))}
                </select>
                <button
                  className="profile__gm-preset"
                  onClick={() => openMissions(firstPlayerId || undefined)}
                >
                  조사 열기 (5 조사 전체 진행)
                </button>
              </>
            ) : (
              <button className="profile__gm-preset" onClick={() => setMissionsOpen(true)}>
                조사 다시 열기 (이어서 진행)
              </button>
            )}
            <p className="profile__gm-note">
              강당·구관의 문제 발동은 각 채팅 화면 안의 + 버튼에서 진행한다.
            </p>
          </div>

          <div className="profile__gm">
            <span className="profile__section-label">불가 전용 — 강당 조사 10 종 (스포일러)</span>
            <p className="profile__gm-note">
              강당 조사 이벤트 10 개가 각각 공개하는 최종 단서와 오브젝트 구성 전체다. 플레이어들이
              실제로 어디까지 진행했는지와 무관하게 항상 전부 보인다 — 진행 페이스를 가늠할 때 참고한다.
            </p>
            <button className="profile__gm-preset" onClick={() => setMasterListOpen(!masterListOpen)}>
              {masterListOpen ? '숨기기' : '펼쳐보기'}
            </button>
            {masterListOpen && (
              <div className="profile__clue-list">
                {HALL_EVENTS.map((event, i) => (
                  <div key={event.id} className="profile__clue-item">
                    <div className="profile__clue-toggle profile__clue-toggle--static">
                      <span className="profile__clue-title">
                        {i + 1}. {event.roomName} — {event.creatureName}
                      </span>
                      <span className="profile__clue-source">
                        {event.objects.filter((o) => o.kind === 'hazard').length}위험 ·{' '}
                        {event.objects.filter((o) => o.kind === 'puzzle').length}문제 ·{' '}
                        {event.objects.filter((o) => o.kind === 'item').length}아이템
                      </span>
                    </div>
                    <p className="profile__clue-text">{event.finalClue}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="profile__gm">
            <span className="profile__section-label">불가 전용 — 일차별 서사 전달</span>
            <p className="profile__gm-note">
              하루가 지날 때마다 눌러서 그날의 개인화된 기억을 전원에게 한 번에 전달한다. 프로필
              화면과 각자의 개인 대화에 동시에 남고, 순서대로만 진행할 수 있다. 4 일차까지 마치면
              전말을 별도로 전송할 수 있다.
            </p>
            <div className="profile__gm-presets">
              {([1, 2, 3, 4] as const).map((day) => (
                <button
                  key={day}
                  className="profile__gm-preset"
                  onClick={() => revealStoryDay(day)}
                  disabled={storyDay !== day - 1}
                >
                  {storyDay >= day ? `${day} 일차 전달 완료` : `${day} 일차 전달하기`}
                </button>
              ))}
              <button className="profile__gm-preset" onClick={revealTruth} disabled={storyDay !== 4 || truthRevealed}>
                {truthRevealed ? '전말 전송 완료' : '전말 전송'}
              </button>
            </div>
          </div>

          <div className="profile__gm">
            <span className="profile__section-label">불가 전용 — 엔딩 발송</span>
            <p className="profile__gm-note">
              학생 진영의 승패와 괴이를 끊었는지 여부를 골라 확정하면, 그에 맞는 엔딩 기사를 전원에게
              한 번에 전달한다. 한번 보내면 되돌릴 수 없다.
            </p>
            <div className="profile__gm-presets">
              <button
                className={`profile__gm-preset ${endingWinner === 'ward' ? 'is-active' : ''}`}
                onClick={() => setEndingWinner('ward')}
              >
                학생 진영 승리
              </button>
              <button
                className={`profile__gm-preset ${endingWinner === 'sin' ? 'is-active' : ''}`}
                onClick={() => setEndingWinner('sin')}
              >
                학생 진영 패배
              </button>
              <button
                className={`profile__gm-preset ${endingBroken ? 'is-active' : ''}`}
                onClick={() => setEndingBroken(true)}
              >
                괴이를 끊음
              </button>
              <button
                className={`profile__gm-preset ${!endingBroken ? 'is-active' : ''}`}
                onClick={() => setEndingBroken(false)}
              >
                괴이를 못 끊음
              </button>
            </div>
            <button
              className="profile__gm-send"
              disabled={!!endingKey}
              onClick={() => {
                const key: EndingKey = `${endingWinner}-${endingBroken ? 'broken' : 'unbroken'}`
                sendEnding(key)
              }}
            >
              {endingKey ? '엔딩 발송 완료' : '이 엔딩으로 확정해 발송하기'}
            </button>
          </div>

          <div className="profile__gm">
            <span className="profile__section-label">불가 전용 — 위험 구역</span>
            <p className="profile__gm-note">
              가입 데이터(플레이어), 모든 채팅·게시글을 전부 지우고 세션을 처음 상태로 되돌린다. 되돌릴 수 없다.
            </p>
            <button className="profile__gm-send" onClick={() => setResetConfirmOpen(true)}>
              전체 초기화
            </button>
          </div>

          <AdminAbilityLogPanel />
          <AdminGmDmPanel />
        </>
      )}

      {resetConfirmOpen && (
        <AbilityUseModal
          title="전체 초기화"
          prompt="정말로 모든 가입 데이터와 채팅·게시글을 지울까....... 이 작업은 되돌릴 수 없고, 모든 플레이어는 다시 가입해야 한다."
          confirmLabel="전부 지우기"
          onConfirm={() => {
            resetAllData()
            setResetConfirmOpen(false)
          }}
          onClose={() => setResetConfirmOpen(false)}
        />
      )}
    </div>
  )
}
