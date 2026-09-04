// 팬데믹 기본판(2013)의 실제 48개 도시와 연결 관계를 그대로 옮긴 데이터.
// 좌표는 각 도시의 실제 위도/경도를 등장방형 투영으로 환산한 값이라, 실제
// 세계지도와 상대적 배치가 비슷하다 (x: 경도, y: 위도 기준, 0~1000 / 0~560).
// 연결 관계는 대칭이어야 하며 engine.test.ts에서 이를 검증한다.
import type { CityDef, CityId, DiseaseColor } from './types'

export const CITIES: Record<CityId, CityDef> = {
  // ------------------------------ 파란색 ------------------------------
  sanFrancisco: { id: 'sanFrancisco', name: '샌프란시스코', color: 'blue', x: 160, y: 163, connections: ['chicago', 'losAngeles', 'tokyo', 'manila'] },
  chicago: { id: 'chicago', name: '시카고', color: 'blue', x: 257, y: 150, connections: ['sanFrancisco', 'losAngeles', 'mexicoCity', 'atlanta', 'montreal'] },
  montreal: { id: 'montreal', name: '몬트리올', color: 'blue', x: 296, y: 138, connections: ['chicago', 'newYork', 'washington'] },
  newYork: { id: 'newYork', name: '뉴욕', color: 'blue', x: 294, y: 153, connections: ['montreal', 'washington', 'london', 'madrid'] },
  washington: { id: 'washington', name: '워싱턴', color: 'blue', x: 286, y: 159, connections: ['newYork', 'montreal', 'atlanta', 'miami'] },
  atlanta: { id: 'atlanta', name: '애틀랜타', color: 'blue', x: 266, y: 175, connections: ['chicago', 'washington', 'miami'] },
  london: { id: 'london', name: '런던', color: 'blue', x: 500, y: 120, connections: ['newYork', 'madrid', 'paris', 'essen'] },
  essen: { id: 'essen', name: '에센', color: 'blue', x: 519, y: 120, connections: ['london', 'paris', 'milan', 'stPetersburg'] },
  paris: { id: 'paris', name: '파리', color: 'blue', x: 506, y: 128, connections: ['london', 'essen', 'milan', 'madrid', 'algiers'] },
  milan: { id: 'milan', name: '밀라노', color: 'blue', x: 526, y: 138, connections: ['essen', 'paris', 'istanbul'] },
  madrid: { id: 'madrid', name: '마드리드', color: 'blue', x: 490, y: 154, connections: ['newYork', 'london', 'paris', 'algiers', 'saoPaulo'] },
  stPetersburg: { id: 'stPetersburg', name: '상트페테르부르크', color: 'blue', x: 584, y: 94, connections: ['essen', 'istanbul', 'moscow'] },

  // ------------------------------ 노란색 ------------------------------
  losAngeles: { id: 'losAngeles', name: '로스앤젤레스', color: 'yellow', x: 172, y: 174, connections: ['sanFrancisco', 'chicago', 'mexicoCity', 'sydney'] },
  mexicoCity: { id: 'mexicoCity', name: '멕시코시티', color: 'yellow', x: 225, y: 220, connections: ['losAngeles', 'chicago', 'miami', 'bogota', 'lima'] },
  miami: { id: 'miami', name: '마이애미', color: 'yellow', x: 277, y: 200, connections: ['atlanta', 'washington', 'mexicoCity', 'bogota'] },
  bogota: { id: 'bogota', name: '보고타', color: 'yellow', x: 294, y: 265, connections: ['mexicoCity', 'miami', 'lima', 'buenosAires', 'saoPaulo'] },
  lima: { id: 'lima', name: '리마', color: 'yellow', x: 286, y: 317, connections: ['mexicoCity', 'bogota', 'santiago'] },
  santiago: { id: 'santiago', name: '산티아고', color: 'yellow', x: 304, y: 384, connections: ['lima'] },
  buenosAires: { id: 'buenosAires', name: '부에노스아이레스', color: 'yellow', x: 338, y: 388, connections: ['bogota', 'saoPaulo'] },
  saoPaulo: { id: 'saoPaulo', name: '상파울루', color: 'yellow', x: 371, y: 353, connections: ['madrid', 'bogota', 'buenosAires', 'lagos'] },
  lagos: { id: 'lagos', name: '라고스', color: 'yellow', x: 509, y: 260, connections: ['saoPaulo', 'khartoum', 'kinshasa'] },
  kinshasa: { id: 'kinshasa', name: '킨샤사', color: 'yellow', x: 543, y: 293, connections: ['lagos', 'khartoum', 'johannesburg'] },
  johannesburg: { id: 'johannesburg', name: '요하네스버그', color: 'yellow', x: 578, y: 362, connections: ['kinshasa', 'khartoum'] },
  khartoum: { id: 'khartoum', name: '하르툼', color: 'yellow', x: 590, y: 232, connections: ['lagos', 'kinshasa', 'johannesburg', 'cairo'] },

  // ------------------------------ 검은색 ------------------------------
  algiers: { id: 'algiers', name: '알제', color: 'black', x: 509, y: 166, connections: ['madrid', 'paris', 'istanbul', 'cairo'] },
  istanbul: { id: 'istanbul', name: '이스탄불', color: 'black', x: 580, y: 152, connections: ['milan', 'stPetersburg', 'moscow', 'baghdad', 'cairo', 'algiers'] },
  cairo: { id: 'cairo', name: '카이로', color: 'black', x: 587, y: 187, connections: ['algiers', 'istanbul', 'baghdad', 'khartoum', 'riyadh'] },
  moscow: { id: 'moscow', name: '모스크바', color: 'black', x: 604, y: 106, connections: ['stPetersburg', 'istanbul', 'tehran'] },
  baghdad: { id: 'baghdad', name: '바그다드', color: 'black', x: 623, y: 176, connections: ['istanbul', 'cairo', 'tehran', 'riyadh', 'karachi'] },
  tehran: { id: 'tehran', name: '테헤란', color: 'black', x: 643, y: 169, connections: ['moscow', 'baghdad', 'karachi', 'delhi'] },
  riyadh: { id: 'riyadh', name: '리야드', color: 'black', x: 630, y: 203, connections: ['cairo', 'baghdad', 'karachi'] },
  karachi: { id: 'karachi', name: '카라치', color: 'black', x: 686, y: 203, connections: ['baghdad', 'tehran', 'riyadh', 'delhi', 'mumbai'] },
  delhi: { id: 'delhi', name: '델리', color: 'black', x: 714, y: 191, connections: ['tehran', 'karachi', 'mumbai', 'chennai', 'kolkata'] },
  mumbai: { id: 'mumbai', name: '뭄바이', color: 'black', x: 703, y: 221, connections: ['karachi', 'delhi', 'chennai'] },
  chennai: { id: 'chennai', name: '첸나이', color: 'black', x: 723, y: 239, connections: ['mumbai', 'delhi', 'kolkata', 'bangkok', 'jakarta'] },
  kolkata: { id: 'kolkata', name: '콜카타', color: 'black', x: 746, y: 210, connections: ['delhi', 'chennai', 'bangkok', 'hongKong'] },

  // ------------------------------ 빨간색 ------------------------------
  beijing: { id: 'beijing', name: '베이징', color: 'red', x: 823, y: 156, connections: ['seoul', 'shanghai'] },
  shanghai: { id: 'shanghai', name: '상하이', color: 'red', x: 838, y: 183, connections: ['beijing', 'seoul', 'tokyo', 'taipei', 'hongKong'] },
  hongKong: { id: 'hongKong', name: '홍콩', color: 'red', x: 817, y: 211, connections: ['shanghai', 'taipei', 'bangkok', 'hoChiMinhCity', 'manila', 'kolkata'] },
  taipei: { id: 'taipei', name: '타이베이', color: 'red', x: 838, y: 202, connections: ['shanghai', 'hongKong', 'osaka', 'manila'] },
  osaka: { id: 'osaka', name: '오사카', color: 'red', x: 876, y: 172, connections: ['taipei', 'tokyo'] },
  tokyo: { id: 'tokyo', name: '도쿄', color: 'red', x: 888, y: 169, connections: ['sanFrancisco', 'osaka', 'shanghai', 'seoul'] },
  seoul: { id: 'seoul', name: '서울', color: 'red', x: 853, y: 163, connections: ['beijing', 'shanghai', 'tokyo'] },
  bangkok: { id: 'bangkok', name: '방콕', color: 'red', x: 779, y: 237, connections: ['kolkata', 'chennai', 'hongKong', 'jakarta', 'hoChiMinhCity'] },
  jakarta: { id: 'jakarta', name: '자카르타', color: 'red', x: 797, y: 299, connections: ['chennai', 'bangkok', 'hoChiMinhCity', 'sydney'] },
  sydney: { id: 'sydney', name: '시드니', color: 'red', x: 920, y: 385, connections: ['jakarta', 'manila', 'losAngeles'] },
  manila: { id: 'manila', name: '마닐라', color: 'red', x: 836, y: 235, connections: ['hongKong', 'taipei', 'sydney', 'sanFrancisco', 'hoChiMinhCity'] },
  hoChiMinhCity: { id: 'hoChiMinhCity', name: '호치민시', color: 'red', x: 796, y: 246, connections: ['bangkok', 'jakarta', 'manila', 'hongKong'] },
}

export const CITY_IDS: CityId[] = Object.keys(CITIES)

export const START_CITY: CityId = 'atlanta'

export function citiesOfColor(color: DiseaseColor): CityId[] {
  return CITY_IDS.filter((id) => CITIES[id].color === color)
}

export function isAdjacent(a: CityId, b: CityId): boolean {
  return CITIES[a].connections.includes(b)
}
