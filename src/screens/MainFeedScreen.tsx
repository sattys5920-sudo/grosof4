import { useState } from 'react'
import './MainFeedScreen.css'
import { useGame } from '../state/GameContext'

export function MainFeedScreen() {
  const { feed, toggleHeart, addComment, displayName } = useGame()
  const [openPostId, setOpenPostId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  function submitComment(postId: string) {
    addComment(postId, draft)
    setDraft('')
  }

  return (
    <div className="feed">
      <div className="feed__intro">
        <span className="feed__intro-label">방송실 게시판</span>
        <p>학교 관리자와 방송실 명의로 올라오는 공지를 확인한다.</p>
      </div>

      <div className="feed__list">
        {feed.map((post) => {
          const isOpen = openPostId === post.id
          return (
            <article key={post.id} className="feed__post">
              <div className="feed__post-head">
                <span className={`feed__tag feed__tag--${post.tag === '경고' ? 'warn' : 'note'}`}>
                  {post.tag}
                </span>
                <span className="feed__author">{post.authorLabel}</span>
                <span className="feed__time">{post.time}</span>
              </div>
              <h3 className="feed__title">{post.title}</h3>
              <p className="feed__body">{post.body}</p>
              <div className="feed__actions">
                <button
                  className={`feed__heart ${post.heartedByViewer ? 'is-active' : ''}`}
                  onClick={() => toggleHeart(post.id)}
                >
                  ♥ {post.hearts}
                </button>
                <button
                  className="feed__comment-toggle"
                  onClick={() => setOpenPostId(isOpen ? null : post.id)}
                >
                  댓글 {post.comments.length}
                </button>
              </div>

              {isOpen && (
                <div className="feed__comments">
                  {post.comments.map((c) => (
                    <div key={c.id} className="feed__comment">
                      <span className="feed__comment-author">{displayName(c.authorId)}</span>
                      <span>{c.text}</span>
                    </div>
                  ))}
                  <div className="feed__comment-composer">
                    <input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && submitComment(post.id)}
                      placeholder="댓글 남기기..."
                    />
                    <button onClick={() => submitComment(post.id)}>등록</button>
                  </div>
                </div>
              )}
            </article>
          )
        })}
      </div>
    </div>
  )
}
