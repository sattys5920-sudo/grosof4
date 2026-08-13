import { useState } from 'react'
import './MainFeedScreen.css'
import { useGame } from '../state/GameContext'
import { CHARACTERS } from '../data/characters'
import { ChatAvatar } from '../components/ChatAvatar'
import { TaggedText } from '../components/TaggedText'
import { TagPicker } from '../components/TagPicker'

export function MainFeedScreen() {
  const {
    feed,
    toggleHeart,
    addComment,
    displayName,
    viewerId,
    gmReveal,
    toggleCommentsEnabled,
    createFeedPost,
    players,
  } = useGame()
  const [openPostId, setOpenPostId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [secret, setSecret] = useState(false)
  const [composerOpen, setComposerOpen] = useState(false)
  const [postTitle, setPostTitle] = useState('')
  const [postBody, setPostBody] = useState('')
  const [postCommentsOn, setPostCommentsOn] = useState(false)

  const openPost = feed.find((p) => p.id === openPostId) ?? null

  function submitComment(postId: string) {
    addComment(postId, draft, secret)
    setDraft('')
    setSecret(false)
  }

  const tagNames = [...CHARACTERS.map((c) => displayName(c.id)), displayName('admin')]

  function submitNewPost() {
    createFeedPost(postTitle, postBody, postCommentsOn)
    setPostTitle('')
    setPostBody('')
    setPostCommentsOn(false)
    setComposerOpen(false)
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
                {openPost.commentsEnabled ? '[불가] 댓글 닫기' : '[불가] 댓글 열기'}
              </button>
            )}
          </div>
        </article>

        <div className="feed__comments feed__comments--detail">
          <span className="feed__comments-label">댓글 {openPost.comments.length}</span>
          {!openPost.commentsEnabled && (
            <p className="feed__comment-disabled">이 게시글은 댓글이 비활성화되어 있다.</p>
          )}
          {openPost.commentsEnabled &&
            openPost.comments.map((c) => {
              const canSee = !c.secret || c.authorId === viewerId || gmReveal
              const name = displayName(c.authorId)
              return (
                <div key={c.id} className="feed__comment">
                  <ChatAvatar authorId={c.authorId} name={name} photo={players[c.authorId]?.photo} />
                  <div className="feed__comment-body">
                    <span className="feed__comment-author">{name}</span>
                    {canSee ? (
                      <span>
                        {c.secret && '🔒 '}
                        <TaggedText text={c.text} names={tagNames} />
                      </span>
                    ) : (
                      <span className="feed__comment-hidden">🔒 비밀 댓글</span>
                    )}
                  </div>
                </div>
              )
            })}
          {openPost.commentsEnabled && (
            <div className="feed__comment-composer">
              <TagPicker names={tagNames} onPick={(name) => setDraft((prev) => `${prev}@${name} `)} />
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
        <div className="feed__intro-row">
          <div>
            <span className="feed__intro-label">방송실 게시판</span>
          </div>
          {gmReveal && (
            <button
              className="feed__new-post-btn"
              onClick={() => setComposerOpen((v) => !v)}
              aria-label="새 공지 작성"
            >
              {composerOpen ? '×' : '+'}
            </button>
          )}
        </div>
      </div>

      {gmReveal && composerOpen && (
        <div className="feed__composer">
          <input
            value={postTitle}
            onChange={(e) => setPostTitle(e.target.value)}
            placeholder="게시글 제목"
          />
          <textarea
            value={postBody}
            onChange={(e) => setPostBody(e.target.value)}
            placeholder="게시글 내용"
            rows={3}
          />
          <div className="feed__composer-row">
            <label className="feed__secret-toggle">
              <input
                type="checkbox"
                checked={postCommentsOn}
                onChange={(e) => setPostCommentsOn(e.target.checked)}
              />
              댓글 허용
            </label>
            <button
              className="feed__composer-submit"
              disabled={!postTitle.trim() || !postBody.trim()}
              onClick={submitNewPost}
            >
              게시하기
            </button>
          </div>
        </div>
      )}

      <div className="feed__list">
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
