// 사용자가 고른 mp3(또는 다른 오디오 파일)에서 브라우저 안에서 바로 채보를
// 만들어 낸다. 서버 업로드 없이 Web Audio API로 디코딩 -> 에너지 기반 온셋
// (박자/타격점) 검출 -> 4레인 배정까지 전부 클라이언트에서 처리한다.
//
// 순수 계산 부분(computeEnergy/pickOnsets/fillGaps/assignLanes/
// buildChartFromEnergy)은 Float32Array/숫자 배열만 다뤄서 실제 오디오
// 디코딩(AudioContext, 브라우저 전용) 없이도 합성 데이터로 테스트할 수 있다.
import type { Chart, ChartNote, Difficulty, Lane } from './types'

export const DIFFICULTY_PARAMS: Record<Difficulty, { thresholdMultiplier: number; minSpacing: number }> = {
  easy: { thresholdMultiplier: 1.6, minSpacing: 0.34 },
  normal: { thresholdMultiplier: 1.35, minSpacing: 0.22 },
  hard: { thresholdMultiplier: 1.15, minSpacing: 0.14 },
}

const FRAME_SIZE = 1024
const HOP = 512
/** 노트가 없는 구간이 이보다 길게 이어지면 중간에 채워 넣는다 (조용한 구간 대비 안전망). */
const MAX_GAP_SECONDS = 2.5
/** 곡 시작 후 이만큼은 노트를 배치하지 않는다 (마음의 준비 시간). */
const LEAD_IN_SECONDS = 1.0
const END_MARGIN_SECONDS = 0.3

/** 스테레오/멀티채널을 모노로 섞는다. */
export function mixToMono(channels: Float32Array[]): Float32Array {
  if (channels.length === 1) return channels[0]
  const length = channels[0].length
  const out = new Float32Array(length)
  for (const data of channels) {
    for (let i = 0; i < length; i++) out[i] += data[i] / channels.length
  }
  return out
}

/** 프레임 단위 RMS 에너지를 계산한다. */
export function computeEnergy(samples: Float32Array, sampleRate: number, frameSize = FRAME_SIZE, hop = HOP): { energies: number[]; times: number[] } {
  const energies: number[] = []
  const times: number[] = []
  for (let i = 0; i + frameSize <= samples.length; i += hop) {
    let sum = 0
    for (let k = 0; k < frameSize; k++) {
      const s = samples[i + k]
      sum += s * s
    }
    energies.push(Math.sqrt(sum / frameSize))
    times.push(i / sampleRate)
  }
  return { energies, times }
}

/** 직전 구간 평균 에너지보다 threshold배 이상 튀는 국소 최댓값을 온셋으로 잡는다
 * (전형적인 에너지 기반 비트 검출: 스펙트럼 플럭스보다 단순하지만 타악기/보컬
 * 어택처럼 에너지가 튀는 지점을 잘 잡아낸다). */
export function pickOnsets(
  energies: number[],
  times: number[],
  opts: { thresholdMultiplier: number; minSpacing: number; historySeconds?: number },
): number[] {
  if (energies.length < 3) return []
  const hop = times.length >= 2 ? times[1] - times[0] : 0.01
  const historyFrames = Math.max(4, Math.round((opts.historySeconds ?? 1.0) / hop))

  const candidates: Array<{ time: number; energy: number }> = []
  for (let i = 1; i < energies.length - 1; i++) {
    const from = Math.max(0, i - historyFrames)
    if (from >= i) continue
    let sum = 0
    for (let k = from; k < i; k++) sum += energies[k]
    const localAvg = sum / (i - from)
    if (localAvg <= 1e-6) continue // 무음 구간은 온셋으로 치지 않는다
    const isPeak = energies[i] >= energies[i - 1] && energies[i] >= energies[i + 1]
    if (isPeak && energies[i] > localAvg * opts.thresholdMultiplier) {
      candidates.push({ time: times[i], energy: energies[i] })
    }
  }

  const onsets: number[] = []
  for (const c of candidates) {
    if (onsets.length === 0 || c.time - onsets[onsets.length - 1] >= opts.minSpacing) {
      onsets.push(c.time)
    }
  }
  return onsets
}

/** 노트 없는 구간이 maxGap보다 길면 중간에 하나씩 채운다. */
export function fillGaps(onsetTimes: number[], duration: number, minSpacing: number, maxGap: number = MAX_GAP_SECONDS): number[] {
  const sorted = [...onsetTimes].sort((a, b) => a - b)
  const withEdges = [0, ...sorted, duration]
  const filled = [...sorted]
  for (let i = 0; i < withEdges.length - 1; i++) {
    const gapStart = withEdges[i]
    const gapEnd = withEdges[i + 1]
    const gap = gapEnd - gapStart
    if (gap <= maxGap) continue
    const count = Math.floor(gap / maxGap)
    for (let k = 1; k <= count; k++) {
      const t = gapStart + (gap * k) / (count + 1)
      if (t - gapStart >= minSpacing && gapEnd - t >= minSpacing) filled.push(t)
    }
  }
  return filled.sort((a, b) => a - b)
}

function seededRng(seed: number): () => number {
  let s = Math.floor(seed) % 2147483647
  if (s <= 0) s += 2147483646
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}

/** 온셋 시각들에 레인(0~3)을 배정한다. 같은 파일이면 항상 같은 채보가
 * 나오도록 온셋 시각들 자체로 시드를 만든다 (연습 가능한 고정 채보). */
export function assignLanes(times: number[]): ChartNote[] {
  const seed = times.reduce((acc, t) => acc + t * 997, 1)
  const rng = seededRng(seed)
  const notes: ChartNote[] = []
  let last: Lane | null = null
  let streak = 0
  for (const t of times) {
    let lane = Math.floor(rng() * 4) as Lane
    if (lane === last) {
      streak++
      if (streak >= 2) {
        lane = ((lane + 1 + Math.floor(rng() * 3)) % 4) as Lane
        streak = 0
      }
    } else {
      streak = 0
    }
    last = lane
    notes.push({ time: t, lane })
  }
  return notes
}

export function buildChartFromEnergy(energies: number[], times: number[], duration: number, difficulty: Difficulty): Chart {
  const params = DIFFICULTY_PARAMS[difficulty]
  let onsets = pickOnsets(energies, times, params)
  onsets = fillGaps(onsets, duration, params.minSpacing)
  const notes = assignLanes(onsets)
    .filter((n) => n.time > LEAD_IN_SECONDS && n.time < duration - END_MARGIN_SECONDS)
    .sort((a, b) => a.time - b.time)
  return { notes, duration, difficulty }
}

/** 오디오 파일을 디코딩하고 채보까지 만든다. 재생에도 같은 AudioContext를
 * 재사용해야 브라우저의 컨텍스트 개수 제한/자동재생 정책에 걸리지 않는다. */
export async function decodeAndAnalyze(file: File, difficulty: Difficulty, audioCtx: AudioContext): Promise<{ chart: Chart; audioBuffer: AudioBuffer }> {
  const arrayBuffer = await file.arrayBuffer()
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
  const channels: Float32Array[] = []
  for (let c = 0; c < audioBuffer.numberOfChannels; c++) channels.push(audioBuffer.getChannelData(c))
  const mono = mixToMono(channels)
  const { energies, times } = computeEnergy(mono, audioBuffer.sampleRate)
  const chart = buildChartFromEnergy(energies, times, audioBuffer.duration, difficulty)
  return { chart, audioBuffer }
}
