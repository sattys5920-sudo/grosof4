import { useState } from 'react'
import './SearcherModal.css'
import { useGame } from '../state/GameContext'

export function SearcherModal({ onClose }: { onClose: () => void }) {
  const { searcherUses, searchQueries, submitSearchQuery } = useGame()
  const [draft, setDraft] = useState('')

  const sorted = [...searchQueries].sort((a, b) => b.askedAtMs - a.askedAtMs)
  const canSearch = searcherUses > 0 && draft.trim().length > 0

  function search() {
    if (!canSearch) return
    submitSearchQuery(draft)
    setDraft('')
  }

  return (
    <div className="searcher__backdrop" onClick={onClose}>
      <div className="searcher__win" onClick={(e) => e.stopPropagation()}>
        <div className="searcher__titlebar">
          <span className="searcher__titlebar-text">⚠ SEARCH_ENGINE.EXE</span>
          <div className="searcher__winbtns">
            <span className="searcher__winbtn">_</span>
            <span className="searcher__winbtn">□</span>
            <button className="searcher__winbtn searcher__winbtn--close" onClick={onClose} aria-label="닫기">
              X
            </button>
          </div>
        </div>

        <div className="searcher__body">
          <div className="searcher__noise" />

          <div className="searcher__monitor">
            <div className="searcher__screen">
              <div className="searcher__scanlines" />
              <div className="searcher__screen-content">
                {sorted.length === 0 && (
                  <p className="searcher__empty">검색 기록이 없다....... 알고 싶은 것을 검색해 보자.</p>
                )}
                {sorted.map((q) => (
                  <div key={q.id} className="searcher__result">
                    <p className="searcher__result-q">&gt; Q. {q.query}</p>
                    {q.answer ? (
                      <p className="searcher__result-a">{q.answer}</p>
                    ) : (
                      <p className="searcher__result-pending">검색 중.......</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="searcher__monitor-bar">
              <span className="searcher__monitor-led" />
              <span className="searcher__monitor-label">RESULT.CRT</span>
            </div>
          </div>

          <div className="searcher__uses">
            남은 검색 횟수 <span className="searcher__uses-num">{searcherUses}</span> 회
          </div>

          <div className="searcher__inputrow">
            <input
              className="searcher__input"
              type="text"
              value={draft}
              maxLength={80}
              placeholder={searcherUses > 0 ? '검색어를 입력...' : '남은 횟수가 없다'}
              disabled={searcherUses <= 0}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') search()
              }}
            />
            <button className="searcher__searchbtn" disabled={!canSearch} onClick={search}>
              검색
            </button>
          </div>

          <div className="searcher__notice">
            <p className="searcher__notice-title">※ 검색 시 주의사항</p>
            <p>· 모르는 것은 답해 주지 않는다.</p>
            <p>· 고운고 DB 속 정보만 나온다. 의심하지 말도록.</p>
            <p>· 결과가 없어도 횟수는 차감된다. 1 개당 2 회.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
