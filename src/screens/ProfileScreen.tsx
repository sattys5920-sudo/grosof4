import { useState } from 'react'
import './ProfileScreen.css'
import { useGame } from '../state/GameContext'
import { CHARACTERS, roleLabel } from '../data/characters'
import { isRevealedTo } from '../data/reveal'
import { Badge } from '../components/Badge'
import { EVENT_LIBRARY } from '../data/eventLibrary'
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
    setViewerId,
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
    closeInvestigation,
    missionsOpen,
    openMissions,
    openDm,
  } = useGame()
  const viewer = CHARACTERS.find((c) => c.id === viewerId)!
  const [kind, setKind] = useState<BroadcastKind>('event')
  const [title, setTitle] = useState(PRESETS[0].title)
  const [body, setBody] = useState(PRESETS[0].body)

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
        <p className="profile__assigned">배정된 인물: {viewer.name}</p>
        <p className="profile__tagline">{viewer.tagline}</p>
        <dl className="profile__facts">
          <dt>사건 당시</dt>
          <dd>{viewer.incidentPosition}</dd>
          <dt>서사</dt>
          <dd>{viewer.bio}</dd>
          <dt>단서 특기</dt>
          <dd>{viewer.clueHint}</dd>
        </dl>
      </div>

      <div className="profile__section">
        <span className="profile__section-label">함께 갇힌 10명</span>
        <div className="profile__roster">
          {CHARACTERS.map((c) => {
            const revealed = isRevealedTo(viewer, c, gmReveal)
            const isMe = c.id === viewerId
            return (
              <div key={c.id} className="profile__roster-item">
                <Badge team={c.team} size={26} revealed={revealed} />
                <div className="profile__roster-info">
                  <span className="profile__roster-name">{displayName(c.id)}</span>
                  <span className="profile__roster-role">
                    {revealed ? roleLabel(c) : '정체 미상'} · {isMe ? grade : c.grade}
                  </span>
                </div>
                {isMe ? (
                  <span className="profile__me-tag">나</span>
                ) : (
                  <button className="profile__dm-btn" onClick={() => openDm(c.id)}>
                    귓속말
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="profile__dev">
        <span className="profile__section-label">프로토타입 도구</span>
        <label className="profile__dev-row">
          <span>시점 전환 (관전용 캐릭터 선택)</span>
          <select
            value={viewerId}
            onChange={(e) => {
              setViewerId(e.target.value)
              setNickname(CHARACTERS.find((c) => c.id === e.target.value)!.name)
            }}
          >
            {CHARACTERS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <p className="profile__admin-status">
          {gmReveal
            ? '관리자 코드로 로그인됨 — GM 권한이 활성화되어 있다.'
            : '일반 참가자 계정 — 가입 시 관리자 코드를 입력하지 않았다.'}
        </p>
      </div>

      {gmReveal && (
        <>
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
                원정 열기 (3전 2선승)
              </button>
            )}
          </div>

          <div className="profile__gm">
            <span className="profile__section-label">GM 전용 — 교실 이벤트 목록</span>
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
