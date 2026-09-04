// 팬데믹 기본판(2013)의 실제 48개 도시와 연결 관계를 그대로 옮긴 데이터.
// 좌표는 실제 위경도가 아니라, 대륙별 배치는 세계지도와 비슷하게 두되
// 라벨/큐브가 서로 겹치지 않도록 도시 사이 간격을 넉넉하게 손으로 벌려
// 잡은 값이다 (실제 위경도 그대로 쓰면 유럽·동아시아처럼 도시가 몰린
// 구간에서 라벨이 겹친다). 연결 관계는 대칭이어야 하며 engine.test.ts에서
// 이를 검증한다.
import type { CityDef, CityId, DiseaseColor } from './types'

export const CITIES: Record<CityId, CityDef> = {
  // ------------------------------ 파란색 ------------------------------
  sanFrancisco: { id: 'sanFrancisco', name: '샌프란시스코', color: 'blue', x: 60, y: 260, connections: ['chicago', 'losAngeles', 'tokyo', 'manila'] },
  chicago: { id: 'chicago', name: '시카고', color: 'blue', x: 190, y: 220, connections: ['sanFrancisco', 'losAngeles', 'mexicoCity', 'atlanta', 'montreal'] },
  montreal: { id: 'montreal', name: '몬트리올', color: 'blue', x: 310, y: 160, connections: ['chicago', 'newYork', 'washington'] },
  newYork: { id: 'newYork', name: '뉴욕', color: 'blue', x: 320, y: 260, connections: ['montreal', 'washington', 'london', 'madrid'] },
  washington: { id: 'washington', name: '워싱턴', color: 'blue', x: 270, y: 320, connections: ['newYork', 'montreal', 'atlanta', 'miami'] },
  atlanta: { id: 'atlanta', name: '애틀랜타', color: 'blue', x: 190, y: 370, connections: ['chicago', 'washington', 'miami'] },
  london: { id: 'london', name: '런던', color: 'blue', x: 620, y: 200, connections: ['newYork', 'madrid', 'paris', 'essen'] },
  essen: { id: 'essen', name: '에센', color: 'blue', x: 700, y: 190, connections: ['london', 'paris', 'milan', 'stPetersburg'] },
  paris: { id: 'paris', name: '파리', color: 'blue', x: 660, y: 260, connections: ['london', 'essen', 'milan', 'madrid', 'algiers'] },
  milan: { id: 'milan', name: '밀라노', color: 'blue', x: 700, y: 320, connections: ['essen', 'paris', 'istanbul'] },
  madrid: { id: 'madrid', name: '마드리드', color: 'blue', x: 560, y: 300, connections: ['newYork', 'london', 'paris', 'algiers', 'saoPaulo'] },
  stPetersburg: { id: 'stPetersburg', name: '상트페테르부르크', color: 'blue', x: 790, y: 100, connections: ['essen', 'istanbul', 'moscow'] },

  // ------------------------------ 노란색 ------------------------------
  losAngeles: { id: 'losAngeles', name: '로스앤젤레스', color: 'yellow', x: 60, y: 370, connections: ['sanFrancisco', 'chicago', 'mexicoCity', 'sydney'] },
  mexicoCity: { id: 'mexicoCity', name: '멕시코시티', color: 'yellow', x: 150, y: 470, connections: ['losAngeles', 'chicago', 'miami', 'bogota', 'lima'] },
  miami: { id: 'miami', name: '마이애미', color: 'yellow', x: 290, y: 420, connections: ['atlanta', 'washington', 'mexicoCity', 'bogota'] },
  bogota: { id: 'bogota', name: '보고타', color: 'yellow', x: 220, y: 560, connections: ['mexicoCity', 'miami', 'lima', 'buenosAires', 'saoPaulo'] },
  lima: { id: 'lima', name: '리마', color: 'yellow', x: 180, y: 650, connections: ['mexicoCity', 'bogota', 'santiago'] },
  santiago: { id: 'santiago', name: '산티아고', color: 'yellow', x: 220, y: 740, connections: ['lima'] },
  buenosAires: { id: 'buenosAires', name: '부에노스아이레스', color: 'yellow', x: 340, y: 740, connections: ['bogota', 'saoPaulo'] },
  saoPaulo: { id: 'saoPaulo', name: '상파울루', color: 'yellow', x: 390, y: 640, connections: ['madrid', 'bogota', 'buenosAires', 'lagos'] },
  lagos: { id: 'lagos', name: '라고스', color: 'yellow', x: 640, y: 460, connections: ['saoPaulo', 'khartoum', 'kinshasa'] },
  kinshasa: { id: 'kinshasa', name: '킨샤사', color: 'yellow', x: 680, y: 550, connections: ['lagos', 'khartoum', 'johannesburg'] },
  johannesburg: { id: 'johannesburg', name: '요하네스버그', color: 'yellow', x: 720, y: 660, connections: ['kinshasa', 'khartoum'] },
  khartoum: { id: 'khartoum', name: '하르툼', color: 'yellow', x: 760, y: 400, connections: ['lagos', 'kinshasa', 'johannesburg', 'cairo'] },

  // ------------------------------ 검은색 ------------------------------
  algiers: { id: 'algiers', name: '알제', color: 'black', x: 590, y: 370, connections: ['madrid', 'paris', 'istanbul', 'cairo'] },
  istanbul: { id: 'istanbul', name: '이스탄불', color: 'black', x: 780, y: 220, connections: ['milan', 'stPetersburg', 'moscow', 'baghdad', 'cairo', 'algiers'] },
  cairo: { id: 'cairo', name: '카이로', color: 'black', x: 760, y: 330, connections: ['algiers', 'istanbul', 'baghdad', 'khartoum', 'riyadh'] },
  moscow: { id: 'moscow', name: '모스크바', color: 'black', x: 850, y: 120, connections: ['stPetersburg', 'istanbul', 'tehran'] },
  baghdad: { id: 'baghdad', name: '바그다드', color: 'black', x: 870, y: 280, connections: ['istanbul', 'cairo', 'tehran', 'riyadh', 'karachi'] },
  tehran: { id: 'tehran', name: '테헤란', color: 'black', x: 950, y: 230, connections: ['moscow', 'baghdad', 'karachi', 'delhi'] },
  riyadh: { id: 'riyadh', name: '리야드', color: 'black', x: 860, y: 380, connections: ['cairo', 'baghdad', 'karachi'] },
  karachi: { id: 'karachi', name: '카라치', color: 'black', x: 1030, y: 280, connections: ['baghdad', 'tehran', 'riyadh', 'delhi', 'mumbai'] },
  delhi: { id: 'delhi', name: '델리', color: 'black', x: 1110, y: 250, connections: ['tehran', 'karachi', 'mumbai', 'chennai', 'kolkata'] },
  mumbai: { id: 'mumbai', name: '뭄바이', color: 'black', x: 1070, y: 350, connections: ['karachi', 'delhi', 'chennai'] },
  chennai: { id: 'chennai', name: '첸나이', color: 'black', x: 1110, y: 440, connections: ['mumbai', 'delhi', 'kolkata', 'bangkok', 'jakarta'] },
  kolkata: { id: 'kolkata', name: '콜카타', color: 'black', x: 1200, y: 280, connections: ['delhi', 'chennai', 'bangkok', 'hongKong'] },

  // ------------------------------ 빨간색 ------------------------------
  beijing: { id: 'beijing', name: '베이징', color: 'red', x: 1280, y: 150, connections: ['seoul', 'shanghai'] },
  shanghai: { id: 'shanghai', name: '상하이', color: 'red', x: 1320, y: 240, connections: ['beijing', 'seoul', 'tokyo', 'taipei', 'hongKong'] },
  hongKong: { id: 'hongKong', name: '홍콩', color: 'red', x: 1290, y: 370, connections: ['shanghai', 'taipei', 'bangkok', 'hoChiMinhCity', 'manila', 'kolkata'] },
  taipei: { id: 'taipei', name: '타이베이', color: 'red', x: 1370, y: 320, connections: ['shanghai', 'hongKong', 'osaka', 'manila'] },
  osaka: { id: 'osaka', name: '오사카', color: 'red', x: 1440, y: 260, connections: ['taipei', 'tokyo'] },
  tokyo: { id: 'tokyo', name: '도쿄', color: 'red', x: 1480, y: 200, connections: ['sanFrancisco', 'osaka', 'shanghai', 'seoul'] },
  seoul: { id: 'seoul', name: '서울', color: 'red', x: 1400, y: 170, connections: ['beijing', 'shanghai', 'tokyo'] },
  bangkok: { id: 'bangkok', name: '방콕', color: 'red', x: 1180, y: 440, connections: ['kolkata', 'chennai', 'hongKong', 'jakarta', 'hoChiMinhCity'] },
  jakarta: { id: 'jakarta', name: '자카르타', color: 'red', x: 1230, y: 570, connections: ['chennai', 'bangkok', 'hoChiMinhCity', 'sydney'] },
  sydney: { id: 'sydney', name: '시드니', color: 'red', x: 1470, y: 660, connections: ['jakarta', 'manila', 'losAngeles'] },
  manila: { id: 'manila', name: '마닐라', color: 'red', x: 1420, y: 400, connections: ['hongKong', 'taipei', 'sydney', 'sanFrancisco', 'hoChiMinhCity'] },
  hoChiMinhCity: { id: 'hoChiMinhCity', name: '호치민시', color: 'red', x: 1260, y: 480, connections: ['bangkok', 'jakarta', 'manila', 'hongKong'] },
}

export const CITY_IDS: CityId[] = Object.keys(CITIES)

export const START_CITY: CityId = 'atlanta'

export function citiesOfColor(color: DiseaseColor): CityId[] {
  return CITY_IDS.filter((id) => CITIES[id].color === color)
}

export function isAdjacent(a: CityId, b: CityId): boolean {
  return CITIES[a].connections.includes(b)
}
