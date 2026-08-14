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
    editComment,
    deleteComment,
    displayName,
    viewerId,
    gmReveal,
    toggleCommentsEnabled,
    createFeedPost,
    editFeedPost,
    deleteFeedPost,
    players,
  } = useGame()
  const [openPostId, setOpenPostId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [secret, setSecret] = useState(false)
  const [composerOpen, setComposerOpen] = useState(false)
  const [postTitle, setPostTitle] = useState('')
  const [postBody, setPostBody] = useState('')
  const [postCommentsOn, setPostCommentsOn] = useState(false)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')
  const [editingPost, setEditingPost] = useState(false)
  const [editPostTitle, setEditPostTitle] = useState('')
  const [editPostBody, setEditPostBody] = useState('')

  const openPost = feed.find((p) => p.id === openPostId) ?? null
  const myCommentId = gmReveal ? 'admin' : viewerId

  function startEditComment(commentId: string, currentText: string) {
    setEditingCommentId(commentId)
    setEditDraft(currentText)
  }

  function saveEditComment(postId: string) {
    if (!editingCommentId) return
    editComment(postId, editingCommentId, editDraft)
    setEditingCommentId(null)
    setEditDraft('')
  }

  function submitComment(postId: string) {
    addComment(postId, draft, secret)
    setDraft('')
    setSecret(false)
  }

  function startEditPost(title: string, body: string) {
    setEditingPost(true)
    setEditPostTitle(title)
    setEditPostBody(body)
  }

  function saveEditPost(postId: string) {
    editFeedPost(postId, editPostTitle, editPostBody)
    setEditingPost(false)
  }

  function removePost(postId: string) {
    deleteFeedPost(postId)
    setEditingPost(false)
    setOpenPostId(null)
  }

  const tagNames = ['전원', ...CHARACTERS.map((c) => displayName(c.id)), displayName('admin')]

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
          {editingPost ? (
            <div className="feed__post-edit">
              <input value={editPostTitle} onChange={(e) => setEditPostTitle(e.target.value)} placeholder="게시글 제목" />
              <textarea value={editPostBody} onChange={(e) => setEditPostBody(e.target.value)} placeholder="게시글 내용" rows={3} />
              <div className="feed__composer-row">
                <button onClick={() => setEditingPost(false)}>취소</button>
                <button
                  className="feed__composer-submit"
                  disabled={!editPostTitle.trim() || !editPostBody.trim()}
                  onClick={() => saveEditPost(openPost.id)}
                >
                  저장
                </button>
              </div>
            </div>
          ) : (
            <>
              <h2 className="feed__detail-title">{openPost.title}</h2>
              <p className="feed__detail-body">{openPost.body}</p>
            </>
          )}
          <div className="feed__actions">
            <button
              className={`feed__heart ${openPost.heartedByViewer ? 'is-active' : ''}`}
              onClick={() => toggleHeart(openPost.id)}
            >
              ♥ {openPost.hearts}
            </button>
            {gmReveal && !editingPost && (
              <>
                <button
                  className="feed__admin-toggle"
                  onClick={() => toggleCommentsEnabled(openPost.id)}
                >
                  {openPost.commentsEnabled ? '[불가] 댓글 닫기' : '[불가] 댓글 열기'}
                </button>
                <button className="feed__admin-toggle" onClick={() => startEditPost(openPost.title, openPost.body)}>
                  [불가] 수정
                </button>
                <button className="feed__admin-toggle" onClick={() => removePost(openPost.id)}>
                  [불가] 삭제
                </button>
              </>
            )}
          </div>
        </article>

        <div className="feed__comments feed__comments--detail">
          <span className="feed__comments-label">댓글 {openPost.comments.length}</span>
          {!openPost.commentsEnabled && openPost.comments.length === 0 && (
            <p className="feed__comment-disabled">이 게시글은 댓글이 비활성화되어 있다.</p>
          )}
          {openPost.comments.map((c) => {
              const canSee = !c.secret || c.authorId === viewerId || gmReveal
              const name = displayName(c.authorId)
              const isMine = c.authorId === myCommentId
              const isEditing = editingCommentId === c.id
              return (
                <div key={c.id} className="feed__comment">
                  <ChatAvatar authorId={c.authorId} name={name} photo={players[c.authorId]?.photo} />
                  <div className="feed__comment-body">
                    <span className="feed__comment-author">{name}</span>
                    {isEditing ? (
                      <div className="feed__comment-edit">
                        <input
                          value={editDraft}
                          onChange={(e) => setEditDraft(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && saveEditComment(openPost.id)}
                          autoFocus
                        />
                        <button onClick={() => saveEditComment(openPost.id)}>저장</button>
                        <button onClick={() => setEditingCommentId(null)}>취소</button>
                      </div>
                    ) : canSee ? (
                      <span>
                        {c.secret && '🔒 '}
                        <TaggedText text={c.text} names={tagNames} />
                      </span>
                    ) : (
                      <span className="feed__comment-hidden">🔒 비밀 댓글</span>
                    )}
                    {isMine && !isEditing && (
                      <div className="feed__comment-owner-actions">
                        <button onClick={() => startEditComment(c.id, c.text)}>수정</button>
                        <button onClick={() => deleteComment(openPost.id, c.id)}>삭제</button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          {openPost.commentsEnabled ? (
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
          ) : (
            openPost.comments.length > 0 && (
              <p className="feed__comment-disabled">댓글이 잠겨 있어 더 이상 남길 수 없다.</p>
            )
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
        {feed.length === 0 && (
          <p className="feed__empty">아직 게시된 공지가 없다....... 방송실의 새 방송을 기다려 보자.</p>
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
