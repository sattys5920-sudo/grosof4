import './EventDispatchSheet.css'

export interface DispatchItem {
  id: string
  category?: string
  title: string
  brief: string
  answer?: string
  onSend: () => void
}

export interface DispatchSection {
  label: string
  items: DispatchItem[]
}

export function EventDispatchSheet({
  sections,
  onClose,
}: {
  sections: DispatchSection[]
  onClose: () => void
}) {
  return (
    <div className="dispatch__backdrop" onClick={onClose}>
      <div className="dispatch__sheet" onClick={(e) => e.stopPropagation()}>
        <div className="dispatch__head">
          <span>불가 전용 — 발송할 이벤트 선택</span>
          <button className="dispatch__close" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </div>
        <div className="dispatch__body">
          {sections.map((section) => (
            <div key={section.label} className="dispatch__section">
              <span className="dispatch__section-label">{section.label}</span>
              {section.items.length === 0 && (
                <p className="dispatch__section-empty">준비된 항목이 없다.</p>
              )}
              {section.items.map((item) => (
                <div key={item.id} className="dispatch__item">
                  <div className="dispatch__item-head">
                    {item.category && <span className="dispatch__item-category">{item.category}</span>}
                    <span className="dispatch__item-title">{item.title}</span>
                  </div>
                  <p className="dispatch__item-brief">{item.brief}</p>
                  {item.answer && <p className="dispatch__item-answer">정답: {item.answer}</p>}
                  <button
                    className="dispatch__item-send"
                    onClick={() => {
                      item.onSend()
                      onClose()
                    }}
                  >
                    발송
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
