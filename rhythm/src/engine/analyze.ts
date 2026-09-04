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

/** 감지된 가장 잘게 쪼개진 박자 단위(unitStep)를 난이도별로 몇 배 할지.
 * 어려움=그 단위 그대로(가장 촘촘하게), 보통=2배 간격, 쉬움=4배 간격. */
const UNIT_MULTIPLIER: Record<Difficulty, number> = { hard: 1, normal: 2, easy: 4 }

/** 박자 추정용 "일단 최대한 촘촘하게" 잡는 온셋 후보 — 난이도와 무관하게
 * 한 번만 뽑아서 박자 그리드의 기준으로 쓴다. */
export const DENSE_ONSET_PARAMS = { thresholdMultiplier: 1.12, minSpacing: 0.05, historySeconds: 1.0 }

// 온셋들 사이에서 찾는 "가장 잘게 쪼개진 박자 단위" 후보 범위.
// 너무 작으면 잡음을, 너무 크면 마디 단위를 주울 수 있어 16분음표~4분음표
// 정도로 나올 법한 구간으로 잡는다 (대략 30~250bpm의 16분음표~마디 사이).
const MIN_UNIT_STEP = 0.06
const MAX_UNIT_STEP = 0.5
const MIN_ONSETS_FOR_TEMPO = 6
const MIN_HISTOGRAM_COUNT = 3
const MIN_HISTOGRAM_SHARE = 0.12

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

/** 온셋 후보들 사이의 모든 짧은 간격(쌍마다의 시간차, lag)을 히스토그램으로
 * 모아 가장 흔한 간격을 "가장 잘게 쪼개진 박자 단위"로 추정한다. 온셋
 * 목록 자체가 이미 촘촘(16분음표 수준)해도, 연속된 두 온셋 사이 간격만
 * 보면 그 잘게 쪼개진 간격만 보이므로, 대신 온셋들 사이의 "모든" 근접 쌍
 * 간격을 모아서 통계적으로 가장 흔한 간격을 찾는다 — 곡 전체에 실제로
 * 존재하는 가장 촘촘한 규칙적 펄스를 안정적으로 잡아낸다. 실제 BPM을
 * 정확히 맞추는 게 목적이 아니라 "노트를 몇 분음표 단위로 쪼갤지" 기준을
 * 잡는 용도라, 반박자/두마디처럼 배수로 어긋나도 게임 난이도상 문제되지
 * 않는다. 박자가 뚜렷하지 않은 소스(온셋이 너무 적거나 간격이 들쭉날쭉)면
 * null을 돌려주고, 그 경우 호출부는 예전 방식(피크 검출만으로 노트 배치)
 * 으로 대체한다. */
export function estimateTempo(onsetTimes: number[]): number | null {
  if (onsetTimes.length < MIN_ONSETS_FOR_TEMPO) return null

  const lags: number[] = []
  for (let i = 0; i < onsetTimes.length; i++) {
    for (let j = i + 1; j < onsetTimes.length; j++) {
      const d = onsetTimes[j] - onsetTimes[i]
      if (d > MAX_UNIT_STEP) break // onsetTimes는 오름차순이라 j를 늘려도 커지기만 한다
      if (d >= MIN_UNIT_STEP) lags.push(d)
    }
  }
  if (lags.length < MIN_HISTOGRAM_COUNT) return null

  const binSize = 0.025
  const bins = new Map<number, number>()
  for (const d of lags) {
    const bin = Math.round(d / binSize) * binSize
    bins.set(bin, (bins.get(bin) ?? 0) + 1)
  }
  let bestBin = 0
  let bestCount = 0
  for (const [bin, count] of bins) {
    if (count > bestCount) {
      bestCount = count
      bestBin = bin
    }
  }
  if (bestCount < MIN_HISTOGRAM_COUNT || bestCount / lags.length < MIN_HISTOGRAM_SHARE) return null
  return bestBin
}

function nearestEnergyIndex(times: number[], t: number): number {
  const hop = times.length >= 2 ? times[1] - times[0] : 0.01
  const idx = Math.round((t - times[0]) / hop)
  return Math.max(0, Math.min(times.length - 1, idx))
}

/** t 주변(windowSeconds 폭)의 평균 에너지 — "이 근방이 대체로 얼마나
 * 시끄러운지"를 나타내는 기준선. */
function localBaseline(energies: number[], times: number[], t: number, windowSeconds = 1.0): number {
  const hop = times.length >= 2 ? times[1] - times[0] : 0.01
  const half = Math.max(1, Math.round(windowSeconds / hop / 2))
  const center = nearestEnergyIndex(times, t)
  const from = Math.max(0, center - half)
  const to = Math.min(energies.length - 1, center + half)
  if (to <= from) return 0
  let sum = 0
  for (let i = from; i <= to; i++) sum += energies[i]
  return sum / (to - from + 1)
}

/** 감지된 가장 잘게 쪼개진 박자 단위(unitStep)를 난이도별 배수로 늘린
 * 그리드를 곡 전체에 깔고, 각 그리드 지점이 "실제로 소리가 있는 자리"인지
 * 판단해서 노트를 남긴다 — 판단 기준은 (1) 촘촘한 온셋 후보가 근처에
 * 있는지, 그리고 어려움 난이도에서는 (2) 그 자리 에너지가 주변 평균보다
 * 확실히 큰지도 추가로 본다(작은 하이햇 같은 여린 타격도 잡아내기 위해). */
function buildGridOnsets(
  denseOnsets: number[],
  energies: number[],
  times: number[],
  duration: number,
  unitStep: number,
  difficulty: Difficulty,
): number[] {
  const step = unitStep * UNIT_MULTIPLIER[difficulty]
  const phase = denseOnsets[0] ?? step
  const matchTolerance = step * 0.5
  const useEnergyGate = difficulty === 'hard'
  const energyGateMultiplier = 1.25

  const out: number[] = []
  const endTime = duration - END_MARGIN_SECONDS
  const startIndex = Math.floor((LEAD_IN_SECONDS - phase) / step) - 1
  for (let i = startIndex; ; i++) {
    const t = phase + i * step
    if (t > endTime) break
    if (t < LEAD_IN_SECONDS) continue

    let accept = denseOnsets.some((o) => Math.abs(o - t) <= matchTolerance)
    if (!accept && useEnergyGate) {
      const baseline = localBaseline(energies, times, t)
      const here = energies[nearestEnergyIndex(times, t)] ?? 0
      if (baseline > 1e-6 && here > baseline * energyGateMultiplier) accept = true
    }
    if (accept) out.push(t)
  }
  return out
}

function seededRng(seed: number): () => number {
  let s = Math.floor(seed) % 2147483647
  if (s <= 0) s += 2147483646
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}

export const LANE_COUNT = 5

/** 온셋 시각들에 레인(0~4)을 배정한다. 같은 파일이면 항상 같은 채보가
 * 나오도록 온셋 시각들 자체로 시드를 만든다 (연습 가능한 고정 채보). */
export function assignLanes(times: number[]): ChartNote[] {
  const seed = times.reduce((acc, t) => acc + t * 997, 1)
  const rng = seededRng(seed)
  const notes: ChartNote[] = []
  let last: Lane | null = null
  let streak = 0
  for (const t of times) {
    let lane = Math.floor(rng() * LANE_COUNT) as Lane
    if (lane === last) {
      streak++
      if (streak >= 2) {
        lane = ((lane + 1 + Math.floor(rng() * (LANE_COUNT - 1))) % LANE_COUNT) as Lane
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
  const denseOnsets = pickOnsets(energies, times, DENSE_ONSET_PARAMS)
  const unitStep = estimateTempo(denseOnsets)

  let onsets: number[] =
    unitStep !== null ? buildGridOnsets(denseOnsets, energies, times, duration, unitStep, difficulty) : []
  if (onsets.length === 0) {
    // 박자가 뚜렷하지 않거나(말소리 등) 그리드가 완전히 비면, 예전처럼
    // 피크 검출만으로 노트를 배치한다.
    onsets = pickOnsets(energies, times, params)
  }

  onsets = fillGaps(onsets, duration, params.minSpacing)
  const notes = assignLanes(onsets)
    .filter((n) => n.time > LEAD_IN_SECONDS && n.time < duration - END_MARGIN_SECONDS)
    .sort((a, b) => a.time - b.time)
  return { notes, duration, difficulty }
}

/** 이미 디코딩된 AudioBuffer에서 채보를 만든다. 사용자가 고른 파일이든
 * public/songs/의 수록곡이든, 디코딩만 끝나면 이후 과정은 동일하다. */
export function analyzeAudioBuffer(audioBuffer: AudioBuffer, difficulty: Difficulty): Chart {
  const channels: Float32Array[] = []
  for (let c = 0; c < audioBuffer.numberOfChannels; c++) channels.push(audioBuffer.getChannelData(c))
  const mono = mixToMono(channels)
  const { energies, times } = computeEnergy(mono, audioBuffer.sampleRate)
  return buildChartFromEnergy(energies, times, audioBuffer.duration, difficulty)
}

/** 오디오 파일을 디코딩하고 채보까지 만든다. 재생에도 같은 AudioContext를
 * 재사용해야 브라우저의 컨텍스트 개수 제한/자동재생 정책에 걸리지 않는다. */
export async function decodeAndAnalyze(file: File, difficulty: Difficulty, audioCtx: AudioContext): Promise<{ chart: Chart; audioBuffer: AudioBuffer }> {
  const arrayBuffer = await file.arrayBuffer()
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
  const chart = analyzeAudioBuffer(audioBuffer, difficulty)
  return { chart, audioBuffer }
}

/** public/songs/의 수록곡처럼 URL로 제공되는 오디오를 받아와 디코딩하고
 * 채보까지 만든다. */
export async function decodeAndAnalyzeFromUrl(url: string, difficulty: Difficulty, audioCtx: AudioContext): Promise<{ chart: Chart; audioBuffer: AudioBuffer }> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`수록곡을 불러오지 못했어요 (${res.status}).`)
  const arrayBuffer = await res.arrayBuffer()
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
  const chart = analyzeAudioBuffer(audioBuffer, difficulty)
  return { chart, audioBuffer }
}
