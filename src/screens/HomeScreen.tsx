import { useState } from 'react'
import './HomeScreen.css'
import { useGame } from '../state/GameContext'
import { CHARACTERS } from '../data/characters'
import { isRevealedTo } from '../data/reveal'
import { Badge } from '../components/Badge'

interface ChatMessage {
  id: number
  kind: 'system' | 'chat'
  authorId?: string
  text: string
  time: string
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 1,
    kind: 'system',
    text: '[교내 방송] ...학생 여러분은... 즉시 지정된 장소로... 되돌아오지... 않는...',
    time: '00:03',
  },
  {
    id: 2,
    kind: 'chat',
    authorId: 'seojun',
    text: '다들 봤어? 창밖... 안개가 안 걷혀',
    time: '00:04',
  },
  {
    id: 3,
    kind: 'chat',
    authorId: 'ayoung',
    text: '정문 쪽도 마찬가지야. 신호도 안 잡히고',
    time: '00:04',
  },
  {
    id: 4,
    kind: 'chat',
    authorId: 'jimin',
    text: '휴대폰은 켜지는데 밖으로 연결이 안 돼... 우리끼리만 되는 것 같아',
    time: '00:05',
  },
  {
    id: 5,
    kind: 'system',
    text: '[교내 방송] 세 사람은... 이미 그날의 죄를... 되갚고 있다. 나머지는 오늘 밤, 그들을 찾아내거나... 함께 잠식된다.',
    time: '00:07',
  },
]

export function HomeScreen() {
  const { viewerId, gmReveal } = useGame()
  const [messages, setMessages] = useState(INITIAL_MESSAGES)
  const [draft, setDraft] = useState('')
  const viewer = CHARACTERS.find((c) => c.id === viewerId)!

  function charOf(id?: string) {
    return CHARACTERS.find((c) => c.id === id)
  }

  function send() {
    if (!draft.trim()) return
    setMessages((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        kind: 'chat',
        authorId: viewerId,
        text: draft.trim(),
        time: '지금',
      },
    ])
    setDraft('')
  }

  return (
    <div className="home">
      <div className="home__banner">
        <span className="home__banner-label">진행 중인 이벤트</span>
        <span className="home__banner-text">다음 원정 소집까지 — 안개가 짙어지고 있다</span>
      </div>
      <div className="home__log">
        {messages.map((m) => {
          if (m.kind === 'system') {
            return (
              <div key={m.id} className="home__system">
                <span className="home__system-text">{m.text}</span>
                <span className="home__time">{m.time}</span>
              </div>
            )
          }
          const author = charOf(m.authorId)
          const isMe = m.authorId === viewerId
          return (
            <div key={m.id} className={`home__msg ${isMe ? 'is-me' : ''}`}>
              {author && (
                <Badge
                  team={author.team}
                  size={22}
                  revealed={isRevealedTo(viewer, author, gmReveal)}
                />
              )}
              <div className="home__msg-body">
                <div className="home__msg-head">
                  <span className="home__msg-name">{author?.name ?? '???'}</span>
                  <span className="home__time">{m.time}</span>
                </div>
                <p className="home__msg-text">{m.text}</p>
              </div>
            </div>
          )
        })}
      </div>
      <div className="home__composer">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="교실에 메시지 보내기..."
        />
        <button onClick={send}>전송</button>
      </div>
    </div>
  )
}
