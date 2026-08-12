import type { ShopItem } from './types'

// 매점 — 코인으로 구매. 무기/방어구는 장착형(구매 즉시 기존 장비를 대체), 음식/약은 소비형(구매 즉시 회복).
export const SHOP_ITEMS: ShopItem[] = [
  { id: 'sh-food-1', name: '초코바', kind: 'food', amount: 15, price: 6, icon: 'pen' },
  { id: 'sh-food-2', name: '삼각김밥', kind: 'food', amount: 20, price: 8, icon: 'pen' },
  { id: 'sh-food-3', name: '컵라면', kind: 'food', amount: 35, price: 15, icon: 'pen' },

  { id: 'sh-med-1', name: '대일밴드 세트', kind: 'medicine', amount: 15, price: 8, icon: 'key' },
  { id: 'sh-med-2', name: '진통제', kind: 'medicine', amount: 25, price: 15, icon: 'key' },
  { id: 'sh-med-3', name: '링거 세트', kind: 'medicine', amount: 50, price: 30, icon: 'key' },

  { id: 'sh-wpn-1', name: '나무 자', kind: 'weapon', amount: 2, price: 12, icon: 'lock' },
  { id: 'sh-wpn-2', name: '청소용 대걸레', kind: 'weapon', amount: 4, price: 25, icon: 'lock' },
  { id: 'sh-wpn-3', name: '체육관 배트', kind: 'weapon', amount: 6, price: 42, icon: 'lock' },
  { id: 'sh-wpn-4', name: '소화기', kind: 'weapon', amount: 9, price: 65, icon: 'lock' },

  { id: 'sh-arm-1', name: '학생회 완장', kind: 'armor', amount: 1, price: 12, icon: 'chain' },
  { id: 'sh-arm-2', name: '두꺼운 체육복', kind: 'armor', amount: 3, price: 28, icon: 'chain' },
  { id: 'sh-arm-3', name: '사물함 문짝 방패', kind: 'armor', amount: 5, price: 48, icon: 'chain' },
  { id: 'sh-arm-4', name: '방화복', kind: 'armor', amount: 7, price: 70, icon: 'chain' },
]

export const SHOP_KIND_LABEL: Record<ShopItem['kind'], string> = {
  weapon: '무기',
  armor: '방어구',
  food: '음식',
  medicine: '약',
}

export function shopItemById(id: string): ShopItem | undefined {
  return SHOP_ITEMS.find((i) => i.id === id)
}
