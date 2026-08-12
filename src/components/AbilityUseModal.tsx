import type { ReactNode } from 'react'
import './AbilityUseModal.css'

export function AbilityUseModal({
  title,
  prompt,
  confirmLabel,
  confirmDisabled,
  onConfirm,
  onClose,
  children,
}: {
  title: string
  prompt: string
  confirmLabel: string
  confirmDisabled?: boolean
  onConfirm: () => void
  onClose: () => void
  children?: ReactNode
}) {
  return (
    <div className="ability-modal__backdrop" onClick={onClose}>
      <div className="ability-modal__box" onClick={(e) => e.stopPropagation()}>
        <div className="ability-modal__head">
          <span>{title}</span>
          <button className="ability-modal__close" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </div>
        <div className="ability-modal__chat">
          <div className="ability-modal__msg">
            <span className="ability-modal__msg-name">교내 방송</span>
            <p className="ability-modal__msg-text">{prompt}</p>
          </div>
        </div>
        {children && <div className="ability-modal__control">{children}</div>}
        <div className="ability-modal__actions">
          <button className="ability-modal__cancel" onClick={onClose}>
            취소
          </button>
          <button className="ability-modal__confirm" disabled={confirmDisabled} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
