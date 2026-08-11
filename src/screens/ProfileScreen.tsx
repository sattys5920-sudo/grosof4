import { useState } from 'react'
import './ProfileScreen.css'
import { useGame } from '../state/GameContext'
import { CHARACTERS, roleLabel } from '../data/characters'
import { Badge } from '../components/Badge'
import { EVENT_LIBRARY } from '../data/eventLibrary'
import { CLASSROOM_PUZZLES } from '../data/classroomPuzzles'
import type { BroadcastKind } from '../data/types'

const PRESETS: { kind: BroadcastKind; label: string; title: string; body: string }[] = [
  {
    kind: 'event',
    label: '이벤트 발생',
    title: '갑작스러운 정전',
    body: '건물 전체 조명이 3초간 꺼졌다. 그 순간 무언가를 본 사람이 있을지도 모른다.',
  },
  {
    kind: 'sin',
    label: '괴이 출현',
    title: '복도에서 괴이가 목격되었다',
    body: '방금 2층 복도 CCTV에 정체를 알 수 없는 형체가 잡혔다. 문단속을 확인하라.',
  },
  {
    kind: 'notice',
    label: '공지',
    title: '관리자 공지',
    body: '내용을 입력하세요.',
  },
]

export function ProfileScreen() {
  const {
    viewerId,
    nickname,
    setNickname,
    grade,
    photo,
    updatePhoto,
    displayName,
    gmReveal,
    sendBroadcast,
    classroom,
    dispatchClassroomEvent,
    dispatchPuzzle,
    closeInvestigation,
    missionsOpen,
    openMissions,
    abilityUnlocked,
    abilityUsed,
    personalClues,
    forgottenIdentity,
    useRecordBook,
    investigate,
    protect,
    checkCctv,
    erode,
    forgeResult,
    revengerCheck,
    mission,
    openDm,
    createFeedPost,
  } = useGame()
  const viewer = viewerId ? CHARACTERS.find((c) => c.id === viewerId)! : null
  const [kind, setKind] = useState<BroadcastKind>('event')
  const [title, setTitle] = useState(PRESETS[0].title)
  const [body, setBody] = useState(PRESETS[0].body)
  const [targetId, setTargetId] = useState('')
  const [missionPick, setMissionPick] = useState(0)
  const [postTitle, setPostTitle] = useState('')
  const [postBody, setPostBody] = useState('')
  const [postCommentsOn, setPostCommentsOn] = useState(false)

  const otherCharacters = CHARACTERS.filter((c) => c.id !== viewerId)
  const completedMissions = mission.missionResults
    .map((r, i) => ({ r, i }))
    .filter((m) => m.r !== null)

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

  const CLASSROOM_STATUS_LABEL: Record<typeof classroom.status, string> = {
    locked: '잠김',
    active: '진행 중',
    cleared: '완료',
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
                value={nickname}
                maxLength={12}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="닉네임을 입력하세요"
              />
              <span className={`profile__role profile__role--${viewer.team}`}>
                {roleLabel(viewer)} · {grade}
              </span>
            </div>
          </div>
          <p className="profile__tagline">{viewer.tagline}</p>
          <dl className="profile__facts">
            <dt>사건 당시</dt>
            <dd>{viewer.incidentPosition}</dd>
            <dt>서사</dt>
            <dd>{viewer.bio}</dd>
            <dt>단서 특기</dt>
            <dd>{viewer.clueHint}</dd>
          </dl>

          <div className="profile__ability">
            <span className="profile__section-label">특수 능력 — {viewer.abilityName}</span>
            <p>{viewer.abilityDescription}</p>

            {!abilityUnlocked && viewer.role !== '잠입자' && viewer.role !== '망각자' && viewer.role !== '일반학생' && (
              <p className="profile__ability-locked">조사실에서 단서를 확보하면 사용할 수 있게 된다.</p>
            )}

            {abilityUnlocked && viewer.role === '기록자' && (
              <button disabled={abilityUsed} onClick={useRecordBook}>
                {abilityUsed ? '사용 완료' : '출석부 펼치기'}
              </button>
            )}

            {abilityUnlocked && (viewer.role === '감찰자' || viewer.role === '복수자') && (
              <div className="profile__ability-row">
                <select value={targetId} onChange={(e) => setTargetId(e.target.value)} disabled={abilityUsed}>
                  <option value="">대상 선택</option>
                  {otherCharacters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {displayName(c.id)}
                    </option>
                  ))}
                </select>
                <button
                  disabled={abilityUsed || !targetId}
                  onClick={() =>
                    viewer.role === '감찰자' ? investigate(targetId) : revengerCheck(targetId)
                  }
                >
                  {abilityUsed ? '사용 완료' : '조사하기'}
                </button>
              </div>
            )}

            {abilityUnlocked && viewer.role === '보호자' && (
              <div className="profile__ability-row">
                <select value={targetId} onChange={(e) => setTargetId(e.target.value)} disabled={abilityUsed}>
                  <option value="">대상 선택</option>
                  {otherCharacters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {displayName(c.id)}
                    </option>
                  ))}
                </select>
                <button disabled={abilityUsed || !targetId} onClick={() => protect(targetId)}>
                  {abilityUsed ? '사용 완료' : '보호하기'}
                </button>
              </div>
            )}

            {abilityUnlocked && viewer.role === '목격자' && (
              <div className="profile__ability-row">
                <select
                  value={missionPick}
                  onChange={(e) => setMissionPick(Number(e.target.value))}
                  disabled={abilityUsed || completedMissions.length === 0}
                >
                  {completedMissions.length === 0 && <option value={0}>완료된 원정 없음</option>}
                  {completedMissions.map((m) => (
                    <option key={m.i} value={m.i}>
                      {m.i + 1}차 원정
                    </option>
                  ))}
                </select>
                <button
                  disabled={abilityUsed || completedMissions.length === 0}
                  onClick={() => checkCctv(missionPick)}
                >
                  {abilityUsed ? '사용 완료' : '확인하기'}
                </button>
              </div>
            )}

            {abilityUnlocked && viewer.role === '괴이의 사도' && (
              <div className="profile__ability-row">
                <select value={targetId} onChange={(e) => setTargetId(e.target.value)} disabled={abilityUsed}>
                  <option value="">대상 선택</option>
                  {otherCharacters
                    .filter((c) => c.team === 'ward')
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {displayName(c.id)}
                      </option>
                    ))}
                </select>
                <button disabled={abilityUsed || !targetId} onClick={() => erode(targetId)}>
                  {abilityUsed ? '사용 완료' : '표적으로 삼기'}
                </button>
              </div>
            )}

            {abilityUnlocked && viewer.role === '공범' && (
              <button
                disabled={
                  abilityUsed ||
                  mission.phase !== 'result' ||
                  !viewerId ||
                  !mission.proposedTeam.includes(viewerId) ||
                  mission.missionResults[mission.missionIndex] !== 'success'
                }
                onClick={forgeResult}
              >
                {abilityUsed ? '사용 완료' : '결과 위조하기'}
              </button>
            )}

            {viewer.role === '잠입자' && (
              <p className="profile__ability-locked">
                평소엔 아무것도 하지 않아도 된다 — 누군가 정체를 처음 확인할 때 자동으로 발동한다.
              </p>
            )}

            {viewer.role === '망각자' && (
              <p className="profile__ability-locked">
                {forgottenIdentity
                  ? `《기억 회복》 발동 — 지금까지의 원정 결과로 볼 때, 너는 ${forgottenIdentity === 'ward' ? '선' : '악'}이었다.`
                  : '3차 원정이 끝나기 전까지는 자신의 정체를 알 수 없다.'}
              </p>
            )}

            {viewer.role === '일반학생' && (
              <p className="profile__ability-locked">
                특별한 능력은 없다. 대신 5차 원정에 반드시 참가해야 한다.
              </p>
            )}
          </div>

          {personalClues.length > 0 && (
            <div className="profile__personal-clues">
              <span className="profile__section-label">나만 아는 단서</span>
              {personalClues.map((c, i) => (
                <p key={i}>{c}</p>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="profile__card">
          <div className="profile__card-head">
            <div className="profile__admin-badge">GM</div>
            <div className="profile__name-block">
              <input
                className="profile__name-input"
                value={nickname}
                maxLength={12}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="닉네임을 입력하세요"
              />
              <span className="profile__role">관리자 계정</span>
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
              {c.id === viewerId ? (
                <span className="profile__me-tag">나</span>
              ) : (
                <button className="profile__dm-btn" onClick={() => openDm(c.id)}>
                  귓속말
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {gmReveal && (
        <>
          <div className="profile__gm">
            <span className="profile__section-label">GM 전용 — 새 공지 작성</span>
            <p className="profile__gm-note">메인 피드에 새 게시글을 올린다. 댓글 허용 여부는 이후에도 다시 바꿀 수 있다.</p>
            <input
              className="profile__gm-input"
              value={postTitle}
              onChange={(e) => setPostTitle(e.target.value)}
              placeholder="게시글 제목"
            />
            <textarea
              className="profile__gm-textarea"
              value={postBody}
              onChange={(e) => setPostBody(e.target.value)}
              placeholder="게시글 내용"
              rows={3}
            />
            <label className="profile__gm-checkbox">
              <input
                type="checkbox"
                checked={postCommentsOn}
                onChange={(e) => setPostCommentsOn(e.target.checked)}
              />
              댓글 허용
            </label>
            <button
              className="profile__gm-send"
              disabled={!postTitle.trim() || !postBody.trim()}
              onClick={() => {
                createFeedPost(postTitle, postBody, postCommentsOn)
                setPostTitle('')
                setPostBody('')
                setPostCommentsOn(false)
              }}
            >
              게시하기
            </button>
          </div>

          <div className="profile__gm">
            <span className="profile__section-label">GM 전용 — 빠른 쪽지 발송</span>
            <p className="profile__gm-note">
              모든 조사실·교실·원정 정보를 열람할 수 있고, 아래에서 전원에게 팝업 쪽지를 즉시 보낼 수 있다.
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
          </div>

          <div className="profile__gm">
            <span className="profile__section-label">GM 전용 — 원정</span>
            <p className="profile__gm-note">
              원정 상태: <strong>{missionsOpen ? '열림' : '잠김'}</strong>
            </p>
            {!missionsOpen && (
              <button className="profile__gm-preset" onClick={openMissions}>
                원정 열기 (5원정 · 3선승)
              </button>
            )}
          </div>

          <div className="profile__gm">
            <span className="profile__section-label">GM 전용 — 교실 단체조사 문제 (10)</span>
            <p className="profile__gm-note">
              교실 상태: <strong>{CLASSROOM_STATUS_LABEL[classroom.status]}</strong>
              {classroom.event && ` — ${classroom.event.title}`}
            </p>
            {classroom.status !== 'locked' && (
              <button className="profile__gm-preset" onClick={closeInvestigation}>
                교실 잠그기 / 초기화
              </button>
            )}
            <div className="profile__gm-eventlist">
              {CLASSROOM_PUZZLES.map((puzzle) => (
                <div key={puzzle.id} className="profile__gm-event">
                  <div className="profile__gm-event-head">
                    <span className="profile__gm-event-category">{puzzle.category}</span>
                    <span className="profile__gm-event-title">{puzzle.title}</span>
                  </div>
                  <p className="profile__gm-event-desc">{puzzle.brief}</p>
                  <button className="profile__gm-event-send" onClick={() => dispatchPuzzle(puzzle)}>
                    발송
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="profile__gm">
            <span className="profile__section-label">GM 전용 — 기타 이벤트</span>
            <div className="profile__gm-eventlist">
              {EVENT_LIBRARY.map((item) => (
                <div key={item.id} className="profile__gm-event">
                  <div className="profile__gm-event-head">
                    <span className="profile__gm-event-category">{item.category}</span>
                    <span className="profile__gm-event-title">{item.title}</span>
                  </div>
                  <p className="profile__gm-event-desc">{item.description}</p>
                  <button
                    className="profile__gm-event-send"
                    disabled={!item.implemented}
                    onClick={() => {
                      if (item.dispatchKind === 'popup') {
                        sendBroadcast(item.popupKind!, item.title, item.popupBody!)
                      } else {
                        dispatchClassroomEvent(item)
                      }
                    }}
                  >
                    {item.implemented ? '발송' : '준비 중'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
