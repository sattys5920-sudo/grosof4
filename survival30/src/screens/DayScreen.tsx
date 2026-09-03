import { useState } from 'react'
import {
  actionAvailability,
  enabledChoices,
  getActiveEvent,
  performAction,
  requirementMet,
  resolveChoice,
} from '../engine/engine'
import { CRAFT_RECIPES, ITEMS } from '../engine/items'
import { GAME_RULES, LOCATIONS, mentalTier, mentalTierLabel } from '../engine/rules'
import type { ActionId, GameState, ItemId, LocationId } from '../engine/types'

const ACTION_LABELS: Record<ActionId, string> = {
  rest: '휴식',
  explore: '탐색',
  repair: '수리',
  scout: '정찰',
  radio: '라디오 청취',
  treat: '치료',
  craft: '제작',
  guard: '경계',
}

const STATUS_LABELS: Record<string, string> = {
  injured: '부상',
  dehydrated: '탈수',
  starving: '굶주림',
  infected: '감염',
}

function StatItem({ label, value, max, tone }: { label: string; value: number; max?: number; tone?: 'danger' | 'ok' }) {
  return (
    <div className={`stat-item ${tone ?? ''}`}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">
        {value}
        {max ? <span className="stat-max">/{max}</span> : null}
      </span>
    </div>
  )
}

function TopBar({ state }: { state: GameState }) {
  const tier = mentalTier(state.stats.mental)
  const activeStatuses = (Object.keys(state.statusEffects) as (keyof typeof state.statusEffects)[]).filter(
    (k) => state.statusEffects[k],
  )
  return (
    <header className="topbar">
      <div className="topbar-day">
        DAY {state.day} <span className="topbar-day-total">/ {GAME_RULES.TOTAL_DAYS}</span>
      </div>
      <div className="stat-row">
        <StatItem label="체력" value={state.stats.hp} max={100} tone={state.stats.hp <= 30 ? 'danger' : undefined} />
        <StatItem label="정신력" value={state.stats.mental} max={100} tone={state.stats.mental <= 30 ? 'danger' : undefined} />
        <StatItem label="물" value={state.stats.water} tone={state.stats.water <= 1 ? 'danger' : undefined} />
        <StatItem label="식량" value={state.stats.food} tone={state.stats.food <= 1 ? 'danger' : undefined} />
        <StatItem label="전력" value={state.stats.power} />
        <StatItem label="대피소" value={state.stats.shelter} max={100} tone={state.stats.shelter <= 30 ? 'danger' : undefined} />
        <StatItem label="정보" value={state.stats.info} max={100} />
      </div>
      <div className="badge-row">
        <span className="badge badge-mental">{mentalTierLabel(tier)}</span>
        {activeStatuses.map((s) => (
          <span key={s} className="badge badge-status">
            {STATUS_LABELS[s]}
          </span>
        ))}
        {state.stats.contamination > 0 && <span className="badge badge-status">오염 {state.stats.contamination}</span>}
      </div>
    </header>
  )
}

function EventPanel({ state, onChange }: { state: GameState; onChange: (s: GameState) => void }) {
  const event = getActiveEvent(state)
  if (!event) return null
  const enabled = enabledChoices(state, event)
  return (
    <div className="event-card">
      <div className="event-title">{event.title}</div>
      <p className="event-desc">{event.description}</p>
      <div className="event-choices">
        {event.choices.map((choice) => {
          const met = requirementMet(state, choice.requires)
          return (
            <button
              key={choice.id}
              className="choice-btn"
              disabled={!met}
              onClick={() => onChange(resolveChoice(state, choice.id))}
            >
              {choice.label}
              {!met && choice.requires?.item ? <span className="choice-need"> ({ITEMS[choice.requires.item].name} 필요)</span> : null}
            </button>
          )
        })}
      </div>
      {enabled.length === 0 && <p className="event-desc">지금은 아무것도 할 수 없어 그냥 지나쳤다.</p>}
    </div>
  )
}

function ExplorePicker({ state, onChange }: { state: GameState; onChange: (s: GameState) => void }) {
  return (
    <div className="sub-panel">
      <div className="sub-panel-title">어디를 탐색할까?</div>
      <div className="location-grid">
        {(Object.keys(LOCATIONS) as LocationId[]).map((id) => {
          const loc = LOCATIONS[id]
          const locked = state.day < loc.unlockDay
          return (
            <button
              key={id}
              className="location-btn"
              disabled={locked}
              onClick={() => onChange(performAction(state, 'explore', { location: id }))}
            >
              <div className="location-name">{locked ? '???' : loc.name}</div>
              <div className="location-meta">{locked ? `${loc.unlockDay}일째 개방` : `위험도 ${loc.danger}%`}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function TreatPicker({ state, onChange }: { state: GameState; onChange: (s: GameState) => void }) {
  const hasMedicine = (state.inventory.medicine ?? 0) > 0
  const hasBandage = (state.inventory.bandage ?? 0) > 0
  const [item, setItem] = useState<'medicine' | 'bandage' | null>(null)
  const survivors = state.survivors.filter((s) => s.alive)
  return (
    <div className="sub-panel">
      <div className="sub-panel-title">무엇을 사용할까?</div>
      <div className="choice-row">
        <button className="choice-btn" disabled={!hasMedicine} onClick={() => setItem('medicine')}>
          의약품 사용
        </button>
        <button className="choice-btn" disabled={!hasBandage} onClick={() => setItem('bandage')}>
          붕대 사용
        </button>
      </div>
      {item === 'medicine' && (
        <div className="choice-row">
          <button className="choice-btn" onClick={() => onChange(performAction(state, 'treat', { itemUsed: 'medicine', target: 'self' }))}>
            나에게
          </button>
          {survivors.map((sv) => (
            <button
              key={sv.id}
              className="choice-btn"
              onClick={() => onChange(performAction(state, 'treat', { itemUsed: 'medicine', target: sv.id }))}
            >
              {sv.name}에게
            </button>
          ))}
        </div>
      )}
      {item === 'bandage' && (
        <div className="choice-row">
          <button className="choice-btn" onClick={() => onChange(performAction(state, 'treat', { itemUsed: 'bandage', target: 'self' }))}>
            나에게 사용
          </button>
        </div>
      )}
    </div>
  )
}

function CraftPicker({ state, onChange }: { state: GameState; onChange: (s: GameState) => void }) {
  return (
    <div className="sub-panel">
      <div className="sub-panel-title">무엇을 만들까?</div>
      <div className="choice-row">
        {CRAFT_RECIPES.map((r) => {
          const ok =
            Object.entries(r.consumes).every(([id, need]) => (state.inventory[id as ItemId] ?? 0) >= (need ?? 0)) &&
            Object.entries(r.keeps ?? {}).every(([id, need]) => (state.inventory[id as ItemId] ?? 0) >= (need ?? 0)) &&
            (r.id !== 'warmMeal' || state.stats.food >= 1)
          return (
            <button key={r.id} className="choice-btn" disabled={!ok} onClick={() => onChange(performAction(state, 'craft', { recipeId: r.id }))}>
              {r.name}
              <span className="choice-need"> ({r.description})</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ActionPanel({ state, onChange }: { state: GameState; onChange: (s: GameState) => void }) {
  const [expanded, setExpanded] = useState<ActionId | null>(null)
  const availability = actionAvailability(state)

  const simpleActions: ActionId[] = ['rest', 'repair', 'scout', 'radio', 'guard']

  function click(id: ActionId) {
    if (id === 'explore' || id === 'treat' || id === 'craft') {
      setExpanded(expanded === id ? null : id)
      return
    }
    onChange(performAction(state, id))
  }

  return (
    <div className="action-panel">
      <div className="sub-panel-title">오늘의 행동을 하나 고른다</div>
      <div className="action-grid">
        {(['rest', 'explore', 'repair', 'scout', 'radio', 'treat', 'craft', 'guard'] as ActionId[]).map((id) => (
          <button
            key={id}
            className={`action-btn ${expanded === id ? 'active' : ''}`}
            disabled={!availability[id]}
            onClick={() => click(id)}
          >
            {ACTION_LABELS[id]}
          </button>
        ))}
      </div>
      {expanded === 'explore' && <ExplorePicker state={state} onChange={onChange} />}
      {expanded === 'treat' && <TreatPicker state={state} onChange={onChange} />}
      {expanded === 'craft' && <CraftPicker state={state} onChange={onChange} />}
      {simpleActions.length > 0 && null}
    </div>
  )
}

function SidePanel({ state }: { state: GameState }) {
  const items = (Object.keys(state.inventory) as ItemId[]).filter((id) => (state.inventory[id] ?? 0) > 0)
  return (
    <aside className="side-panel">
      <section>
        <h3>소지품</h3>
        {items.length === 0 && <p className="muted">가진 것이 없다.</p>}
        <ul className="item-list">
          {items.map((id) => (
            <li key={id}>
              <span>{ITEMS[id].name}</span>
              <span className="item-qty">×{state.inventory[id]}</span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3>동료</h3>
        {state.survivors.filter((s) => s.alive).length === 0 && <p className="muted">혼자다.</p>}
        <ul className="survivor-list">
          {state.survivors
            .filter((s) => s.alive)
            .map((sv) => (
              <li key={sv.id}>
                <div className="survivor-name">
                  {sv.name} <span className="survivor-job">· {sv.personality}</span>
                </div>
                <div className="survivor-meta">
                  체력 {sv.hp} · 신뢰 {sv.trust}
                  {sv.infected ? ' · 감염' : ''}
                </div>
              </li>
            ))}
        </ul>
      </section>
    </aside>
  )
}

function LogDrawer({ state }: { state: GameState }) {
  const entries = state.eventLog.slice(-30).reverse()
  return (
    <details className="log-drawer">
      <summary>기록 보기</summary>
      <ul className="log-list">
        {entries.map((e, i) => (
          <li key={i}>
            <span className="log-day">D{e.day}</span> {e.text}
          </li>
        ))}
      </ul>
    </details>
  )
}

export default function DayScreen({ state, onChange }: { state: GameState; onChange: (s: GameState) => void }) {
  return (
    <div className="day">
      <TopBar state={state} />
      <div className="day-body">
        <main className="day-main">
          {state.activeEventId ? <EventPanel state={state} onChange={onChange} /> : <ActionPanel state={state} onChange={onChange} />}
        </main>
        <SidePanel state={state} />
      </div>
      <LogDrawer state={state} />
    </div>
  )
}
