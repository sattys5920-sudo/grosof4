import { useState } from 'react'
import './MainFeedScreen.css'
import { useGame } from '../state/GameContext'

export function MainFeedScreen() {
  const { feed, toggleHeart, addComment, displayName, viewerId, gmReveal, toggleCommentsEnabled } = useGame()
  const [openPostId, setOpenPostId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [secret, setSecret] = useState(false)

  const openPost = feed.find((p) => p.id === openPostId) ?? null

  function submitComment(postId: string) {
    addComment(postId, draft, secret)
    setDraft('')
    setSecret(false)
  }

  if (openPost) {
    return (
      <div className="feed feed--detail">
        <button className="feed__back" onClick={() => setOpenPostId(null)}>
          ← 피드 목록
        </button>

        <article className="feed__detail-post">
          <div className="feed__post-head">
            <span className={`feed__tag feed__tag--${openPost.tag === '경고' ? 'warn' : 'note'}`}>
              {openPost.tag}
            </span>
            <span className="feed__author">{openPost.authorLabel}</span>
            <span className="feed__time">{openPost.time}</span>
          </div>
          <h2 className="feed__detail-title">{openPost.title}</h2>
          <p className="feed__detail-body">{openPost.body}</p>
          <div className="feed__actions">
            <button
              className={`feed__heart ${openPost.heartedByViewer ? 'is-active' : ''}`}
              onClick={() => toggleHeart(openPost.id)}
            >
              ♥ {openPost.hearts}
            </button>
            {gmReveal && (
              <button
                className="feed__admin-toggle"
                onClick={() => toggleCommentsEnabled(openPost.id)}
              >
                {openPost.commentsEnabled ? '[관리자] 댓글 닫기' : '[관리자] 댓글 열기'}
              </button>
            )}
          </div>
        </article>

        <div className="feed__comments feed__comments--detail">
          <span className="feed__comments-label">댓글 {openPost.comments.length}</span>
          {!openPost.commentsEnabled && (
            <p className="feed__comment-disabled">이 게시글은 댓글이 비활성화되어 있다.</p>
          )}
          {openPost.commentsEnabled && openPost.comments.length === 0 && (
            <p className="feed__comment-disabled">아직 댓글이 없다....... 첫 댓글을 남겨보자.</p>
          )}
          {openPost.commentsEnabled &&
            openPost.comments.map((c) => {
              const canSee = !c.secret || c.authorId === viewerId || gmReveal
              return (
                <div key={c.id} className="feed__comment">
                  <span className="feed__comment-author">{displayName(c.authorId)}</span>
                  {canSee ? (
                    <span>
                      {c.secret && '🔒 '}
                      {c.text}
                    </span>
                  ) : (
                    <span className="feed__comment-hidden">🔒 비밀 댓글</span>
                  )}
                </div>
              )
            })}
          {openPost.commentsEnabled && (
            <div className="feed__comment-composer">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitComment(openPost.id)}
                placeholder="댓글 남기기......"
              />
              <label className="feed__secret-toggle">
                <input
                  type="checkbox"
                  checked={secret}
                  onChange={(e) => setSecret(e.target.checked)}
                />
                비밀
              </label>
              <button onClick={() => submitComment(openPost.id)}>등록</button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="feed">
      <div className="feed__intro">
        <span className="feed__intro-label">방송실 게시판</span>
        <p>학교 관리자와 방송실 명의로 올라오는 공지를 확인한다.</p>
      </div>

      <div className="feed__list">
        {feed.length === 0 && (
          <p className="feed__empty">아직 게시된 공지가 없다....... 관리자가 올리는 글을 기다려보자.</p>
        )}
        {feed.map((post) => (
          <button key={post.id} className="feed__post" onClick={() => setOpenPostId(post.id)}>
            <div className="feed__post-head">
              <span className={`feed__tag feed__tag--${post.tag === '경고' ? 'warn' : 'note'}`}>
                {post.tag}
              </span>
              <span className="feed__author">{post.authorLabel}</span>
              <span className="feed__time">{post.time}</span>
            </div>
            <h3 className="feed__title">{post.title}</h3>
            <p className="feed__preview">{post.body}</p>
            <div className="feed__meta">
              <span className={`feed__meta-heart ${post.heartedByViewer ? 'is-active' : ''}`}>
                ♥ {post.hearts}
              </span>
              <span className="feed__meta-comments">
                {post.commentsEnabled ? `댓글 ${post.comments.length}` : '댓글 비활성화'}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
