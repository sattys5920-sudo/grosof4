import { describe, expect, it } from 'vitest'
import { classifyHit, findNoteToHit, autoMissNotes, scoreForJudgment, summarize, PERFECT_WINDOW, GREAT_WINDOW, GOOD_WINDOW } from './judge'
import { computeEnergy, pickOnsets, fillGaps, assignLanes, buildChartFromEnergy, mixToMono, DIFFICULTY_PARAMS } from './analyze'
import type { NoteState } from './types'

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
  it('레인은 항상 0~3 사이다', () => {
    const notes = assignLanes([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    for (const n of notes) {
      expect(n.lane).toBeGreaterThanOrEqual(0)
      expect(n.lane).toBeLessThanOrEqual(3)
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
