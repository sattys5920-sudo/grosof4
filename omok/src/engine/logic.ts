const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // 헷갈리는 0/O, 1/I 제외

/** 초대 코드를 만든다. 대문자/숫자만 써서 손으로 불러줘도 헷갈리지 않게 한다. */
export function generateRoomCode(rng: () => number = Math.random, length = 4): string {
  let code = ''
  for (let i = 0; i < length; i++) {
    code += ROOM_CODE_CHARS[Math.floor(rng() * ROOM_CODE_CHARS.length)]
  }
  return code
}
