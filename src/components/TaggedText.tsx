function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function TaggedText({ text, names }: { text: string; names: string[] }) {
  const unique = Array.from(new Set(names.filter(Boolean))).sort((a, b) => b.length - a.length)
  if (unique.length === 0) return <>{text}</>
  const pattern = new RegExp(`(@(?:${unique.map(escapeRegex).join('|')}))(?![가-힣a-zA-Z0-9])`, 'g')
  const parts = text.split(pattern)
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('@') && unique.includes(part.slice(1)) ? (
          <span key={i} className="mention-tag">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  )
}
