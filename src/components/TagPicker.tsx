import { useState } from 'react'
import './TagPicker.css'

export function TagPicker({ names, onPick }: { names: string[]; onPick: (name: string) => void }) {
  const [open, setOpen] = useState(false)
  const unique = Array.from(new Set(names.filter(Boolean)))
  if (unique.length === 0) return null
  return (
    <div className="tagpicker">
      <button
        type="button"
        className="tagpicker__toggle"
        aria-label="태그하기"
        onClick={() => setOpen((v) => !v)}
      >
        @
      </button>
      {open && (
        <div className="tagpicker__menu">
          {unique.map((name) => (
            <button
              key={name}
              type="button"
              className="tagpicker__item"
              onClick={() => {
                onPick(name)
                setOpen(false)
              }}
            >
              @{name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
