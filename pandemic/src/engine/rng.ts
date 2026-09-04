// mulberry32 기반 결정론적 RNG. GameState.rngState에 내부 값을 저장해 두기
// 때문에, 새로고침 후에도 "다음에 나올 난수"가 이어진다 (같은 시드가 반복되지 않음).
export class Rng {
  private a: number

  constructor(seed: number) {
    this.a = seed >>> 0
  }

  /** 0 이상 1 미만의 실수 */
  next(): number {
    this.a = (this.a + 0x6d2b79f5) >>> 0
    let t = this.a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  intBelow(maxExclusive: number): number {
    return Math.floor(this.next() * maxExclusive)
  }

  pick<T>(items: readonly T[]): T {
    return items[this.intBelow(items.length)]
  }

  shuffle<T>(items: readonly T[]): T[] {
    const out = items.slice()
    for (let i = out.length - 1; i > 0; i--) {
      const j = this.intBelow(i + 1)
      ;[out[i], out[j]] = [out[j], out[i]]
    }
    return out
  }

  get state(): number {
    return this.a
  }
}

/** 새 게임을 시작할 때마다 다른 시드를 만든다. */
export function freshSeed(): number {
  const buf = new Uint32Array(1)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(buf)
    return buf[0] >>> 0
  }
  return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0
}
