import type { ShopItem } from './types'

// 매점 — 코인으로 구매. 무기/방어구는 장착형(구매 즉시 기존 장비를 대체), 음식/약은 소비형(구매 즉시 회복).
export const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'sh-food-0',
    name: '군것질 사탕',
    kind: 'food',
    amount: 15,
    price: 4,
    art: {
      pixels: ['..WWWW..', '.WYYYYW.', 'WYYYYYYW', 'WYYYYYYW', 'WYYYYYYW', 'WYYYYYYW', '.WYYYYW.', '..WWWW..'],
      palette: { W: '#e8d9c0', Y: '#e0b23c' },
    },
  },
  {
    id: 'sh-food-1',
    name: '초코바',
    kind: 'food',
    amount: 20,
    price: 6,
    art: {
      pixels: ['..WWWW..', '.WRRRRW.', 'WBBBBBBW', 'WBDDDDBW', 'WBDDDDBW', 'WBBBBBBW', '.WRRRRW.', '..WWWW..'],
      palette: { W: '#e8d9c0', R: '#a8382f', B: '#8a5a2f', D: '#5a3a1c' },
    },
  },
  {
    id: 'sh-food-2',
    name: '삼각김밥',
    kind: 'food',
    amount: 35,
    price: 8,
    art: {
      pixels: ['...RR...', '..RRRR..', '.RRRRRR.', 'NNNNNNNN', 'NRRRRRRN', 'NRRRRRRN', 'NRRRRRRN', 'NNNNNNNN'],
      palette: { R: '#f0e8d8', N: '#1c1815' },
    },
  },
  {
    id: 'sh-food-3',
    name: '컵라면',
    kind: 'food',
    amount: 50,
    price: 15,
    art: {
      pixels: ['.LLLLLL.', '.NNNNNN.', 'CCCCCCCC', 'CCCCCCCC', '.CCCCCC.', '.CCCCCC.', '..CCCC..', '..CCCC..'],
      palette: { L: '#e8d9c0', N: '#e0b23c', C: '#c97b2a' },
    },
  },
  {
    id: 'sh-med-0',
    name: '연고',
    kind: 'medicine',
    amount: 15,
    price: 5,
    art: {
      pixels: ['..TTTT..', '.TWWWWT.', '.TWWWWT.', '.TWWWWT.', '.TWWWWT.', '..TTTT..', '...TT...', '...TT...'],
      palette: { T: '#5b7a9e', W: '#e8d9c0' },
    },
  },
  {
    id: 'sh-med-1',
    name: '대일밴드 세트',
    kind: 'medicine',
    amount: 25,
    price: 8,
    art: {
      pixels: ['........', 'FFF.....', 'FFFF....', '.FFPPFF.', '.FPPPPF.', '....FFFF', '.....FFF', '........'],
      palette: { F: '#d9a066', P: '#e8a0a0' },
    },
  },
  {
    id: 'sh-med-2',
    name: '진통제',
    kind: 'medicine',
    amount: 50,
    price: 15,
    art: {
      pixels: ['........', '.WRWRWR.', '.WRWRWR.', '........', '.WRWRWR.', '.WRWRWR.', '........', '........'],
      palette: { W: '#e8d9c0', R: '#a8382f' },
    },
  },
  {
    id: 'sh-med-3',
    name: '링거 세트',
    kind: 'medicine',
    amount: 80,
    price: 30,
    art: {
      pixels: ['.BBBBB..', 'BBBBBBB.', 'BLLLLLB.', 'BLLLLLB.', '.BBBBB..', '...T....', '...T....', '...T....'],
      palette: { B: '#5b7a9e', L: '#a8382f', T: '#8a8073' },
    },
  },
  {
    id: 'sh-wpn-0',
    name: '실내화',
    kind: 'weapon',
    amount: 2,
    price: 8,
    art: {
      pixels: ['........', '.SSSSSS.', 'SSSSSSSS', 'SSSSSSSS', '.SSSSSS.', '........', '........', '........'],
      palette: { S: '#d9a066' },
    },
  },
  {
    id: 'sh-wpn-1',
    name: '나무 자',
    kind: 'weapon',
    amount: 4,
    price: 12,
    art: {
      pixels: ['W.......', 'WW......', '.WKW....', '..WKW...', '...WKW..', '....WKW.', '.....WWW', '......WW'],
      palette: { W: '#b8895a', K: '#1c1815' },
    },
  },
  {
    id: 'sh-wpn-2',
    name: '청소용 대걸레',
    kind: 'weapon',
    amount: 6,
    price: 25,
    art: {
      pixels: ['...H....', '...H....', '...H....', '...H....', '..MMM...', '.MMMMM..', 'MMMMMMM.', 'M.M.M.M.'],
      palette: { H: '#8a5a2f', M: '#d9cfbf' },
    },
  },
  {
    id: 'sh-wpn-3',
    name: '체육관 배트',
    kind: 'weapon',
    amount: 9,
    price: 42,
    art: {
      pixels: ['.......W', '......WW', '.....WW.', '....WW..', '...WW...', '..WW....', '.DD.....', 'DD......'],
      palette: { W: '#b8895a', D: '#4a2a12' },
    },
  },
  {
    id: 'sh-wpn-4',
    name: '소화기',
    kind: 'weapon',
    amount: 13,
    price: 65,
    art: {
      pixels: ['..KKK...', '..K.K...', '.RRRRR..', '.RRRRR..', '.RRRRR..', '.RRRRR..', '.RRRRR..', '..RRR...'],
      palette: { K: '#1c1815', R: '#a8382f' },
    },
  },
  {
    id: 'sh-arm-0',
    name: '체육복 상의',
    kind: 'armor',
    amount: 1,
    price: 8,
    art: {
      pixels: ['J......J', 'JJ....JJ', '.JJJJJJ.', '.JSSSSJ.', '.JSSSSJ.', '.JJJJJJ.', '.JJJJJJ.', '........'],
      palette: { J: '#3a4a6b', S: '#e8d9c0' },
    },
  },
  {
    id: 'sh-arm-1',
    name: '학생회 완장',
    kind: 'armor',
    amount: 3,
    price: 12,
    art: {
      pixels: ['..AAAA..', '.AAAAAA.', 'AAYYYYAA', 'AAYRRYAA', 'AAYYYYAA', '.AAAAAA.', '..AAAA..', '........'],
      palette: { A: '#d9a066', Y: '#c9a83c', R: '#a8382f' },
    },
  },
  {
    id: 'sh-arm-2',
    name: '두꺼운 체육복',
    kind: 'armor',
    amount: 5,
    price: 28,
    art: {
      pixels: ['JJ....JJ', 'JJJ..JJJ', '.JJJJJJ.', '.JSJJSJ.', '.JSJJSJ.', '.JJJJJJ.', '.JJJJJJ.', '........'],
      palette: { J: '#3a4a6b', S: '#e8d9c0' },
    },
  },
  {
    id: 'sh-arm-3',
    name: '사물함 문짝 방패',
    kind: 'armor',
    amount: 7,
    price: 48,
    art: {
      pixels: ['LLLLLLLL', 'LLLLLLLL', 'LL....LL', 'LL.HH.LL', 'LL.HH.LL', 'LL....LL', 'LLLLLLLL', 'LLLLLLLL'],
      palette: { L: '#5b7a9e', H: '#1c1815' },
    },
  },
  {
    id: 'sh-arm-4',
    name: '방화복',
    kind: 'armor',
    amount: 9,
    price: 70,
    art: {
      pixels: ['.FFFFFF.', 'FFFFFFFF', 'FFSSSSFF', 'FFFFFFFF', 'FF.FF.FF', 'FF.FF.FF', 'FF.FF.FF', '........'],
      palette: { F: '#c97b2a', S: '#d9cfbf' },
    },
  },
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
