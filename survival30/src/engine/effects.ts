// 이벤트/선택지 데이터를 짧게 쓰기 위한 헬퍼. events.ts와 engine.ts(파이널 데이)가
// 함께 쓴다.
import type { ChoiceRequirement, EffectOp, GameChoice, GameEvent, ItemId, JobId, StatusId } from './types'

export function hp(n: number): EffectOp {
  return { type: 'hp', amount: n }
}
export function mental(n: number): EffectOp {
  return { type: 'mental', amount: n }
}
// 물/식량은 "목마름·배고픔 게이지"가 아니라 들고 다니는 아이템이다. 이벤트에서
// water(n)/food(n)을 쓰면 물/통조림 아이템을 그만큼 더 갖거나 잃는다.
export function water(n: number): EffectOp {
  return { type: 'item', id: 'water', amount: n }
}
export function food(n: number): EffectOp {
  return { type: 'item', id: 'can', amount: n }
}
export function thirst(n: number): EffectOp {
  return { type: 'thirst', amount: n }
}
export function hunger(n: number): EffectOp {
  return { type: 'hunger', amount: n }
}
export function power(n: number): EffectOp {
  return { type: 'power', amount: n }
}
export function shelter(n: number): EffectOp {
  return { type: 'shelter', amount: n }
}
export function info(n: number): EffectOp {
  return { type: 'info', amount: n }
}
export function trust(n: number): EffectOp {
  return { type: 'trust', amount: n }
}
export function contamination(n: number): EffectOp {
  return { type: 'contamination', amount: n }
}
export function item(id: ItemId, n: number): EffectOp {
  return { type: 'item', id, amount: n }
}
export function flag(id: string, value = true): EffectOp {
  return { type: 'flag', id, value }
}
export function counter(id: string, n = 1): EffectOp {
  return { type: 'counter', id, amount: n }
}
export function status(id: StatusId, value: boolean): EffectOp {
  return { type: 'status', id, value }
}
export function survivorTrust(n: number, target: 'random' | 'all' = 'random'): EffectOp {
  return { type: 'survivorTrust', target, amount: n }
}
export function survivorHp(n: number, target: 'random' | 'all' = 'random'): EffectOp {
  return { type: 'survivorHp', target, amount: n }
}
export function survivorJoin(job?: JobId): EffectOp {
  return { type: 'survivorJoin', job }
}
export function survivorLeave(): EffectOp {
  return { type: 'survivorLeave' }
}
export function routeEff(v: 'north' | 'south'): EffectOp {
  return { type: 'route', value: v }
}

export function c(
  id: string,
  label: string,
  effects: EffectOp[],
  resultText: string,
  requires?: ChoiceRequirement,
): GameChoice {
  return { id, label, effects, resultText, requires }
}

export function roll(
  id: string,
  label: string,
  chance: number,
  success: EffectOp[],
  successText: string,
  fail: EffectOp[],
  failText: string,
  requires?: ChoiceRequirement,
): GameChoice {
  return { id, label, chance, success, successText, fail, failText, requires }
}

export function ev(
  id: string,
  dayMin: number,
  dayMax: number,
  title: string,
  description: string,
  category: GameEvent['category'],
  choices: GameChoice[],
  opts: Partial<GameEvent> = {},
): GameEvent {
  return { id, dayMin, dayMax, title, description, category, choices, ...opts }
}
