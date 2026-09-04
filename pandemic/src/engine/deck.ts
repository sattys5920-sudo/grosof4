// 플레이어 카드 덱(도시 카드 48 + 이벤트 카드 5 + 전염 카드 N장 삽입)과
// 감염 카드 덱(도시 카드 48장) 구성. 실제 상자 설명서 순서를 그대로 따른다:
// 1) 도시+이벤트 카드를 섞는다 2) 손패를 나눠 준다 3) 남은 카드를 전염 카드
// 개수만큼의 더미로 나눈다 4) 각 더미에 전염 카드 1장을 넣고 섞는다
// 5) 더미를 순서대로 쌓는다(전체를 다시 섞지 않는다).
import { CITY_IDS } from './map'
import { Rng } from './rng'
import type { CityId, Difficulty, EventId, PlayerCard } from './types'

export const EVENT_IDS: EventId[] = ['airlift', 'governmentGrant', 'oneQuietNight', 'forecast', 'resilientPopulation']

export const EPIDEMIC_COUNT: Record<Difficulty, number> = {
  easy: 4,
  normal: 5,
  hard: 6,
}

export const STARTING_HAND_SIZE = 4

export interface DeckSetup {
  hands: [PlayerCard[], PlayerCard[]]
  playerDeck: PlayerCard[]
  infectionDeck: CityId[]
}

export function buildDecks(rng: Rng, difficulty: Difficulty): DeckSetup {
  const cityCards: PlayerCard[] = CITY_IDS.map((id) => ({ kind: 'city', city: id }))
  const eventCards: PlayerCard[] = EVENT_IDS.map((id) => ({ kind: 'event', event: id }))
  const shuffled = rng.shuffle([...cityCards, ...eventCards])

  const hand1 = shuffled.slice(0, STARTING_HAND_SIZE)
  const hand2 = shuffled.slice(STARTING_HAND_SIZE, STARTING_HAND_SIZE * 2)
  const remaining = shuffled.slice(STARTING_HAND_SIZE * 2)

  const epidemicCount = EPIDEMIC_COUNT[difficulty]
  const piles: PlayerCard[][] = Array.from({ length: epidemicCount }, () => [])
  remaining.forEach((card, i) => {
    piles[i % epidemicCount].push(card)
  })

  const stacked: PlayerCard[] = []
  for (const pile of piles) {
    const withEpidemic = rng.shuffle([...pile, { kind: 'epidemic' } as PlayerCard])
    stacked.push(...withEpidemic)
  }

  const infectionDeck = rng.shuffle(CITY_IDS)

  return { hands: [hand1, hand2], playerDeck: stacked, infectionDeck }
}
