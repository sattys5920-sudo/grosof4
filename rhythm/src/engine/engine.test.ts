import { describe, expect, it } from 'vitest'
import { classifyHit, findNoteToHit, autoMissNotes, scoreForJudgment, summarize, PERFECT_WINDOW, GREAT_WINDOW, GOOD_WINDOW } from './judge'
import {
  computeEnergy,
  pickOnsets,
  fillGaps,
  assignLanes,
  buildChartFromEnergy,
  mixToMono,
  DIFFICULTY_PARAMS,
  estimateTempo,
  DENSE_ONSET_PARAMS,
  addHoldsAndChords,
  type HoldChordParams,
} from './analyze'
import type { NoteState } from './types'

// 4분음표(강)/8분음표(중)/16분음표(약) 세 층으로 클릭을 겹쳐 넣어서,
// 실제 곡처럼 "강박 + 잔잔한 사이 박자"가 있는 트랙을 흉내낸다.
function buildLayeredClickTrackFor(sampleRate: number, duration: number) {
  const samples = new Float32Array(Math.floor(sampleRate * duration))
  const beat = 0.5
  const sixteenth = beat / 4
  for (let t = beat; t < duration - beat; t += sixteenth) {
    const stepIndex = Math.round((t - beat) / sixteenth)
    const amp = stepIndex % 4 === 0 ? 1.0 : stepIndex % 2 === 0 ? 0.6 : 0.35
    const start = Math.floor(t * sampleRate)
    const len = 110
    for (let i = 0; i < len && start + i < samples.length; i++) {
      const env = 1 - i / len
      samples[start + i] += Math.sin((2 * Math.PI * 440 * i) / sampleRate) * env * amp
    }
  }
  return samples
}

function mockNote(overrides: Partial<NoteState> = {}): NoteState {
  return { id: 0, time: 1, lane: 0, judgment: null, judgedAt: null, ...overrides }
}

describe('판정 등급', () => {
  it('0에 가까울수록 perfect, 멀어질수록 great/good/miss(null) 순으로 나빠진다', () => {
    expect(classifyHit(0)).toBe('perfect')
    expect(classifyHit(PERFECT_WINDOW)).toBe('perfect')
    expect(classifyHit(PERFECT_WINDOW + 0.001)).toBe('great')
    expect(classifyHit(GREAT_WINDOW)).toBe('great')
    expect(classifyHit(GREAT_WINDOW + 0.001)).toBe('good')
    expect(classifyHit(GOOD_WINDOW)).toBe('good')
    expect(classifyHit(GOOD_WINDOW + 0.001)).toBeNull()
  })

  it('음수 오차(일찍 침)도 절댓값 기준으로 동일하게 판정한다', () => {
    expect(classifyHit(-0.02)).toBe('perfect')
    expect(classifyHit(-0.15)).toBe('good')
  })
})

describe('findNoteToHit', () => {
  it('같은 레인에서 GOOD_WINDOW 안에 가장 가까운 미판정 노트를 찾는다', () => {
    const notes = [mockNote({ id: 1, lane: 0, time: 1.0 }), mockNote({ id: 2, lane: 0, time: 1.5 }), mockNote({ id: 3, lane: 1, time: 1.02 })]
    const found = findNoteToHit(notes, 0, 1.02)
    expect(found?.id).toBe(1)
  })

  it('다른 레인 노트는 찾지 않는다', () => {
    const notes = [mockNote({ id: 1, lane: 1, time: 1.0 })]
    expect(findNoteToHit(notes, 0, 1.0)).toBeNull()
  })

  it('이미 판정된 노트는 다시 찾지 않는다', () => {
    const notes = [mockNote({ id: 1, lane: 0, time: 1.0, judgment: 'perfect' })]
    expect(findNoteToHit(notes, 0, 1.0)).toBeNull()
  })

  it('GOOD_WINDOW를 벗어나면 찾지 않는다', () => {
    const notes = [mockNote({ id: 1, lane: 0, time: 1.0 })]
    expect(findNoteToHit(notes, 0, 1.0 + GOOD_WINDOW + 0.01)).toBeNull()
  })
})

describe('autoMissNotes', () => {
  it('판정선을 GOOD_WINDOW만큼 지난 미판정 노트는 자동으로 miss가 된다', () => {
    const notes = [mockNote({ id: 1, time: 1.0 })]
    const result = autoMissNotes(notes, 1.0 + GOOD_WINDOW + 0.001)
    expect(result[0].judgment).toBe('miss')
  })

  it('아직 GOOD_WINDOW 안이면 건드리지 않는다', () => {
    const notes = [mockNote({ id: 1, time: 1.0 })]
    const result = autoMissNotes(notes, 1.0 + GOOD_WINDOW - 0.01)
    expect(result[0].judgment).toBeNull()
  })

  it('이미 판정된 노트는 건드리지 않는다', () => {
    const notes = [mockNote({ id: 1, time: 1.0, judgment: 'good' })]
    const result = autoMissNotes(notes, 100)
    expect(result[0].judgment).toBe('good')
  })
})

describe('점수/콤보', () => {
  it('miss는 0점이고, 등급이 좋을수록 기본 점수가 높다', () => {
    expect(scoreForJudgment('miss', 0)).toBe(0)
    expect(scoreForJudgment('perfect', 0)).toBeGreaterThan(scoreForJudgment('great', 0))
    expect(scoreForJudgment('great', 0)).toBeGreaterThan(scoreForJudgment('good', 0))
  })

  it('콤보가 쌓일수록 같은 등급도 점수가 올라간다 (최대 2배로 제한)', () => {
    const low = scoreForJudgment('perfect', 0)
    const high = scoreForJudgment('perfect', 50)
    const capped = scoreForJudgment('perfect', 500)
    expect(high).toBeGreaterThan(low)
    expect(high).toBe(capped)
    expect(high).toBe(low * 2)
  })

  it('summarize: miss가 나오면 콤보가 끊기고 maxCombo는 끊기기 전 값을 유지한다', () => {
    const notes: NoteState[] = [
      mockNote({ id: 1, judgment: 'perfect' }),
      mockNote({ id: 2, judgment: 'perfect' }),
      mockNote({ id: 3, judgment: 'miss' }),
      mockNote({ id: 4, judgment: 'good' }),
    ]
    const result = summarize(notes)
    expect(result.maxCombo).toBe(2)
    expect(result.counts).toEqual({ perfect: 2, great: 0, good: 1, miss: 1 })
    expect(result.totalNotes).toBe(4)
    expect(result.score).toBeGreaterThan(0)
  })

  it('summarize: 미판정(null) 노트는 miss로 취급한다', () => {
    const notes: NoteState[] = [mockNote({ id: 1, judgment: null })]
    const result = summarize(notes)
    expect(result.counts.miss).toBe(1)
  })

  it('summarize: 전부 perfect면 정확도가 100에 가깝다', () => {
    const notes: NoteState[] = Array.from({ length: 10 }, (_, i) => mockNote({ id: i, judgment: 'perfect' }))
    const result = summarize(notes)
    expect(result.accuracy).toBe(100)
  })
})

describe('mixToMono', () => {
  it('모노는 그대로, 스테레오는 채널 평균을 낸다', () => {
    const mono = new Float32Array([0.5, -0.5])
    expect(mixToMono([mono])).toBe(mono)

    const left = new Float32Array([1, 0])
    const right = new Float32Array([0, 1])
    const mixed = mixToMono([left, right])
    expect(Array.from(mixed)).toEqual([0.5, 0.5])
  })
})

describe('computeEnergy', () => {
  it('무음 구간은 에너지가 0에 가깝다', () => {
    const silence = new Float32Array(4096)
    const { energies } = computeEnergy(silence, 44100)
    expect(energies.every((e) => e === 0)).toBe(true)
  })

  it('진폭이 큰 구간일수록 에너지가 크다', () => {
    const samples = new Float32Array(4096)
    for (let i = 2048; i < 4096; i++) samples[i] = 1.0 // 뒤쪽 절반만 큰 진폭
    const { energies, times } = computeEnergy(samples, 44100, 1024, 512)
    expect(energies.length).toBe(times.length)
    const firstHalfMax = Math.max(...energies.slice(0, 2))
    const lastHalfMax = Math.max(...energies.slice(-2))
    expect(lastHalfMax).toBeGreaterThan(firstHalfMax)
  })
})

describe('pickOnsets', () => {
  it('일정한 간격으로 튀는 클릭 트랙에서 온셋을 정확히 찾아낸다', () => {
    const sampleRate = 44100
    const durationSec = 8
    const samples = new Float32Array(sampleRate * durationSec)
    const clickTimes = [1, 2, 3, 4, 5, 6, 7]
    for (const t of clickTimes) {
      const start = Math.floor(t * sampleRate)
      for (let i = 0; i < 200; i++) samples[start + i] = 1.0 // 짧고 강한 클릭
    }
    const { energies, times } = computeEnergy(samples, sampleRate)
    const onsets = pickOnsets(energies, times, DIFFICULTY_PARAMS.normal)

    expect(onsets.length).toBe(clickTimes.length)
    for (let i = 0; i < clickTimes.length; i++) {
      expect(Math.abs(onsets[i] - clickTimes[i])).toBeLessThan(0.05)
    }
  })

  it('완전한 무음에서는 온셋이 없다', () => {
    const { energies, times } = computeEnergy(new Float32Array(44100 * 3), 44100)
    expect(pickOnsets(energies, times, DIFFICULTY_PARAMS.normal)).toEqual([])
  })

  it('minSpacing보다 가까운 두 번째 피크는 걸러낸다', () => {
    const sampleRate = 44100
    const samples = new Float32Array(sampleRate * 3)
    for (const t of [1.0, 1.05, 2.0]) {
      const start = Math.floor(t * sampleRate)
      for (let i = 0; i < 200; i++) samples[start + i] = 1.0
    }
    const { energies, times } = computeEnergy(samples, sampleRate)
    const onsets = pickOnsets(energies, times, { thresholdMultiplier: 1.15, minSpacing: 0.3 })
    // 1.0과 1.05는 minSpacing(0.3) 안에 있으니 하나만 남아야 한다
    const near1 = onsets.filter((t) => t < 1.5)
    expect(near1.length).toBe(1)
  })

  it('쉬움 난이도는 어려움보다 온셋(노트)이 같거나 더 적다', () => {
    const sampleRate = 44100
    const samples = new Float32Array(sampleRate * 10)
    for (let t = 0.5; t < 10; t += 0.3) {
      const start = Math.floor(t * sampleRate)
      const amp = 0.3 + Math.random() * 0.7
      for (let i = 0; i < 150; i++) samples[start + i] = amp
    }
    const { energies, times } = computeEnergy(samples, sampleRate)
    const easy = pickOnsets(energies, times, DIFFICULTY_PARAMS.easy)
    const hard = pickOnsets(energies, times, DIFFICULTY_PARAMS.hard)
    expect(easy.length).toBeLessThanOrEqual(hard.length)
  })
})

describe('fillGaps', () => {
  it('maxGap보다 넓은 빈 구간에는 노트를 채워 넣는다', () => {
    const filled = fillGaps([1], 20, 0.2, 2.5)
    expect(filled.length).toBeGreaterThan(1)
    // 채워진 노트끼리도 minSpacing은 지킨다
    for (let i = 1; i < filled.length; i++) {
      expect(filled[i] - filled[i - 1]).toBeGreaterThanOrEqual(0.2 - 1e-9)
    }
  })

  it('이미 촘촘하면 아무것도 추가하지 않는다', () => {
    const dense = Array.from({ length: 20 }, (_, i) => i * 0.5)
    const filled = fillGaps(dense, 10, 0.2, 2.5)
    expect(filled.length).toBe(dense.length)
  })
})

describe('assignLanes', () => {
  it('레인은 항상 0~4 사이다', () => {
    const notes = assignLanes([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    for (const n of notes) {
      expect(n.lane).toBeGreaterThanOrEqual(0)
      expect(n.lane).toBeLessThanOrEqual(4)
    }
  })

  it('같은 레인이 3번 이상 연속되지 않는다', () => {
    const times = Array.from({ length: 100 }, (_, i) => i * 0.3)
    const notes = assignLanes(times)
    let streak = 1
    for (let i = 1; i < notes.length; i++) {
      if (notes[i].lane === notes[i - 1].lane) {
        streak++
        expect(streak).toBeLessThan(3)
      } else {
        streak = 1
      }
    }
  })

  it('같은 온셋 시각 배열이면 항상 같은 채보를 만든다 (결정적)', () => {
    const times = [1.1, 2.2, 3.3, 4.4, 5.5]
    const a = assignLanes(times)
    const b = assignLanes(times)
    expect(a).toEqual(b)
  })
})

describe('buildChartFromEnergy', () => {
  it('곡 시작 direct와 끝부분에는 노트를 두지 않는다 (여유 시간)', () => {
    const sampleRate = 44100
    const duration = 10
    const samples = new Float32Array(sampleRate * duration)
    for (let t = 0.1; t < duration; t += 0.2) {
      const start = Math.floor(t * sampleRate)
      for (let i = 0; i < 150 && start + i < samples.length; i++) samples[start + i] = 1.0
    }
    const { energies, times } = computeEnergy(samples, sampleRate)
    const chart = buildChartFromEnergy(energies, times, duration, 'normal')
    expect(chart.notes.every((n) => n.time > 1.0 && n.time < duration - 0.3)).toBe(true)
    expect(chart.notes.length).toBeGreaterThan(0)
    expect(chart.difficulty).toBe('normal')
    expect(chart.duration).toBe(duration)
  })

  it('노트는 시간순으로 정렬돼 있다', () => {
    const sampleRate = 44100
    const duration = 6
    const samples = new Float32Array(sampleRate * duration)
    for (const t of [1.5, 3.0, 2.0, 4.5]) {
      const start = Math.floor(t * sampleRate)
      for (let i = 0; i < 150; i++) samples[start + i] = 1.0
    }
    const { energies, times } = computeEnergy(samples, sampleRate)
    const chart = buildChartFromEnergy(energies, times, duration, 'hard')
    for (let i = 1; i < chart.notes.length; i++) {
      expect(chart.notes[i].time).toBeGreaterThanOrEqual(chart.notes[i - 1].time)
    }
  })
})

describe('estimateTempo', () => {
  it('일정한 간격의 온셋에서는 그 간격을 박자 주기로 추정한다', () => {
    const onsets = Array.from({ length: 16 }, (_, i) => 0.5 + i * 0.5) // 0.5초 간격 = 120bpm
    const tempo = estimateTempo(onsets)
    expect(tempo).not.toBeNull()
    expect(tempo!).toBeGreaterThan(0.47)
    expect(tempo!).toBeLessThan(0.53)
  })

  it('온셋이 너무 적으면 박자를 추정하지 않는다', () => {
    expect(estimateTempo([1, 2, 3])).toBeNull()
  })

  it('간격이 들쭉날쭉하면 박자를 추정하지 않는다', () => {
    const onsets = [0.3, 0.71, 1.02, 1.9, 2.15, 3.4, 3.55, 4.9]
    expect(estimateTempo(onsets)).toBeNull()
  })
})

describe('박자 그리드 기반 채보 (난이도별 밀도)', () => {
  // 4분음표(강)/8분음표(중)/16분음표(약) 세 층으로 클릭을 겹쳐 넣어서,
  // 실제 곡처럼 "강박 + 잔잔한 사이 박자"가 있는 트랙을 흉내낸다.
  function buildLayeredClickTrack(sampleRate: number, duration: number) {
    const samples = new Float32Array(Math.floor(sampleRate * duration))
    const beat = 0.5
    const sixteenth = beat / 4
    for (let t = beat; t < duration - beat; t += sixteenth) {
      const stepIndex = Math.round((t - beat) / sixteenth)
      const amp = stepIndex % 4 === 0 ? 1.0 : stepIndex % 2 === 0 ? 0.6 : 0.35
      const start = Math.floor(t * sampleRate)
      const len = 110
      for (let i = 0; i < len && start + i < samples.length; i++) {
        const env = 1 - i / len
        samples[start + i] += Math.sin((2 * Math.PI * 440 * i) / sampleRate) * env * amp
      }
    }
    return samples
  }

  it('실제로 곡에서 가장 잘게 쪼개진 박자 단위(16분음표)를 잡아낸다', () => {
    const sampleRate = 44100
    const duration = 14
    const samples = buildLayeredClickTrack(sampleRate, duration)
    const { energies, times } = computeEnergy(samples, sampleRate)
    const denseOnsets = pickOnsets(energies, times, DENSE_ONSET_PARAMS)
    const tempo = estimateTempo(denseOnsets)
    expect(tempo).not.toBeNull()
    // 트랙의 가장 촘촘한 층이 16분음표(0.125초) 간격이라, 이 값을 잡아내야
    // 어려움 난이도가 그 단위 그대로, 보통/쉬움은 2배/4배로 쓸 수 있다.
    expect(tempo!).toBeGreaterThan(0.11)
    expect(tempo!).toBeLessThan(0.14)
  })

  it('어려움이 보통보다, 보통이 쉬움보다 노트를 확실히 더 촘촘하게 넣는다', () => {
    const sampleRate = 44100
    const duration = 14
    const samples = buildLayeredClickTrack(sampleRate, duration)
    const { energies, times } = computeEnergy(samples, sampleRate)

    const easy = buildChartFromEnergy(energies, times, duration, 'easy')
    const normal = buildChartFromEnergy(energies, times, duration, 'normal')
    const hard = buildChartFromEnergy(energies, times, duration, 'hard')

    expect(normal.notes.length).toBeGreaterThan(easy.notes.length)
    expect(hard.notes.length).toBeGreaterThan(normal.notes.length)
    // 16분음표까지 채우는 어려움은 최소한 정박(4분음표)의 두 배 이상은 돼야
    // "진짜 어렵다"고 할 수 있다.
    expect(hard.notes.length).toBeGreaterThan(easy.notes.length * 2)
  })
})

describe('addHoldsAndChords', () => {
  function makeNotes(times: number[]): NoteState[] {
    return times.map((t, i) => ({ time: t, lane: (i % 5) as NoteState['lane'], id: i, judgment: null, judgedAt: null }))
  }

  function params(overrides: Partial<HoldChordParams> = {}): HoldChordParams {
    return { holdChance: 0, minHoldDuration: 0.35, maxHoldDuration: 0.75, chordChance: 0, secondChordChance: 0, ...overrides }
  }

  it('holdChance가 0보다 크면 일부 노트가 롱노트(holdDuration)가 된다', () => {
    const times = Array.from({ length: 60 }, (_, i) => 1.5 + i * 0.4)
    const notes = makeNotes(times)
    const result = addHoldsAndChords(notes, 30, 12345, params({ holdChance: 1 }))
    expect(result.some((n) => n.holdDuration !== undefined)).toBe(true)
  })

  it('holdChance가 0이면 롱노트를 만들지 않는다', () => {
    const times = Array.from({ length: 30 }, (_, i) => 1.5 + i * 0.4)
    const notes = makeNotes(times)
    const result = addHoldsAndChords(notes, 20, 999, params())
    expect(result.every((n) => n.holdDuration === undefined)).toBe(true)
  })

  it('chordChance가 크면 같은 시각에 다른 레인 노트가 추가로 생긴다', () => {
    const times = Array.from({ length: 30 }, (_, i) => 1.5 + i * 0.4)
    const notes = makeNotes(times)
    const result = addHoldsAndChords(notes, 20, 42, params({ chordChance: 1 }))
    expect(result.length).toBeGreaterThan(notes.length)
    const byTime = new Map<number, Set<number>>()
    for (const n of result) {
      if (!byTime.has(n.time)) byTime.set(n.time, new Set())
      byTime.get(n.time)!.add(n.lane)
    }
    const hasChord = [...byTime.values()].some((lanes) => lanes.size >= 2)
    expect(hasChord).toBe(true)
  })

  it('secondChordChance가 크면 3키 동시 입력(한 시각에 레인 3개)도 생긴다', () => {
    const times = Array.from({ length: 30 }, (_, i) => 1.5 + i * 0.4)
    const notes = makeNotes(times)
    const result = addHoldsAndChords(notes, 20, 77, params({ chordChance: 1, secondChordChance: 1 }))
    const byTime = new Map<number, Set<number>>()
    for (const n of result) {
      if (!byTime.has(n.time)) byTime.set(n.time, new Set())
      byTime.get(n.time)!.add(n.lane)
    }
    const hasTripleChord = [...byTime.values()].some((lanes) => lanes.size >= 3)
    expect(hasTripleChord).toBe(true)
  })

  it('secondChordChance가 0이면(보통 난이도) 3키 이상 동시 입력이 생기지 않는다', () => {
    const times = Array.from({ length: 30 }, (_, i) => 1.5 + i * 0.4)
    const notes = makeNotes(times)
    const result = addHoldsAndChords(notes, 20, 77, params({ chordChance: 1, secondChordChance: 0 }))
    const byTime = new Map<number, Set<number>>()
    for (const n of result) {
      if (!byTime.has(n.time)) byTime.set(n.time, new Set())
      byTime.get(n.time)!.add(n.lane)
    }
    expect([...byTime.values()].every((lanes) => lanes.size <= 2)).toBe(true)
  })

  it('롱노트 길이는 곡이 끝나기 전(END_MARGIN) 안에서만 늘어난다', () => {
    const times = [1.5]
    const notes = makeNotes(times)
    const duration = 1.9 // 노트 시작 1.5 + 여유 0.3 = 곡은 사실상 여유가 거의 없다
    const result = addHoldsAndChords(notes, duration, 7, params({ holdChance: 1 }))
    for (const n of result) {
      if (n.holdDuration !== undefined) {
        expect(n.time + n.holdDuration).toBeLessThanOrEqual(duration - 0.3 + 1e-9)
      }
    }
  })

  it('같은 입력(시드 포함)이면 항상 같은 결과를 만든다 (결정적)', () => {
    const times = [1.5, 2.0, 2.5, 3.0, 3.5]
    const notes = makeNotes(times)
    const a = addHoldsAndChords(notes, 10, 5, params({ holdChance: 0.5, chordChance: 0.5 }))
    const b = addHoldsAndChords(notes, 10, 5, params({ holdChance: 0.5, chordChance: 0.5 }))
    expect(a).toEqual(b)
  })

  it('쉬움 난이도 채보에는 롱노트/코드가 없다', () => {
    const sampleRate = 44100
    const duration = 10
    const samples = new Float32Array(sampleRate * duration)
    for (let t = 0.5; t < duration; t += 0.25) {
      const start = Math.floor(t * sampleRate)
      for (let i = 0; i < 150; i++) samples[start + i] = 1.0
    }
    const { energies, times } = computeEnergy(samples, sampleRate)
    const chart = buildChartFromEnergy(energies, times, duration, 'easy')
    expect(chart.notes.every((n) => n.holdDuration === undefined)).toBe(true)
    const timeCounts = new Map<number, number>()
    for (const n of chart.notes) timeCounts.set(n.time, (timeCounts.get(n.time) ?? 0) + 1)
    expect([...timeCounts.values()].every((c) => c === 1)).toBe(true)
  })

  it('실제 채보에서 보통은 최대 2키, 어려움은 최대 3키까지만 동시 입력이 생긴다', () => {
    const sampleRate = 44100
    const duration = 20
    const samples = buildLayeredClickTrackFor(sampleRate, duration)
    const { energies, times } = computeEnergy(samples, sampleRate)

    function maxSimultaneous(chart: ReturnType<typeof buildChartFromEnergy>) {
      const timeCounts = new Map<number, number>()
      for (const n of chart.notes) timeCounts.set(n.time, (timeCounts.get(n.time) ?? 0) + 1)
      return Math.max(0, ...timeCounts.values())
    }

    const normal = buildChartFromEnergy(energies, times, duration, 'normal')
    const hard = buildChartFromEnergy(energies, times, duration, 'hard')
    expect(maxSimultaneous(normal)).toBeLessThanOrEqual(2)
    expect(maxSimultaneous(hard)).toBeLessThanOrEqual(3)
  })
})
