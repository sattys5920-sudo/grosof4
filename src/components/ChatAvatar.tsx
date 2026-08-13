import './ChatAvatar.css'

export function ChatAvatar({
  authorId,
  name,
  photo,
  size = 34,
}: {
  authorId: string
  name: string
  photo?: string | null
  size?: number
}) {
  if (authorId === 'admin') {
    return (
      <img
        className="chat-avatar chat-avatar--gm"
        style={{ width: size, height: size }}
        src={`${import.meta.env.BASE_URL}images/admin-eye.jpg`}
        alt="??"
      />
    )
  }
  if (photo) {
    return (
      <img
        className="chat-avatar chat-avatar--photo"
        style={{ width: size, height: size }}
        src={photo}
        alt=""
      />
    )
  }
  return (
    <span className="chat-avatar chat-avatar--fallback" style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {name.charAt(0) || '?'}
    </span>
  )
}
