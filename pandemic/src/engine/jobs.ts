// 팬데믹 기본판 직업 7종. 실제 능력만 반영한다.
//
// 참고: 사용자가 제공한 스펙은 "건축 전문가"(2번)와 "운영 전문가"(7번)를
// 별개 직업처럼 나열했지만, 두 항목의 설명이 완전히 동일(연구소 건설 시
// 카드 미소모 + 연구소에서 카드 버리고 아무 도시로 이동)해서 사실상 같은
// 직업인 실제 기본판의 "오퍼레이션 엑스퍼트(Operations Expert)"를 가리킨다.
// 기본판은 7개 직업이 전부 달라야 하므로, 실제로 빠져 있던 7번째 직업인
// "대책 전문가(Contingency Planner)"로 채웠다 — 버림 더미의 이벤트 카드를
// 손패처럼 확보해 뒀다가 쓸 수 있는 능력이다.
import type { JobId } from './types'

export interface JobDef {
  id: JobId
  name: string
  color: string
  description: string
}

export const JOBS: Record<JobId, JobDef> = {
  dispatcher: {
    id: 'dispatcher',
    name: '운항 관리자',
    color: '#e8c34a',
    description: '다른 플레이어의 말을 자신의 말처럼 이동시킬 수 있고, 다른 플레이어가 있는 도시로 직접 이동할 수 있다.',
  },
  operationsExpert: {
    id: 'operationsExpert',
    name: '운영 전문가',
    color: '#6a9c46',
    description: '연구소 건설 시 도시 카드를 버리지 않는다. 연구소에 있을 때 턴마다 한 번, 도시 카드 1장을 버리고 원하는 도시로 이동할 수 있다.',
  },
  scientist: {
    id: 'scientist',
    name: '과학자',
    color: '#e0e0e0',
    description: '치료제 개발에 같은 색 도시 카드가 4장만 필요하다.',
  },
  medic: {
    id: 'medic',
    name: '위생병',
    color: '#c94b3f',
    description: '치료 행동 1회로 현재 도시의 해당 색 큐브를 모두 제거한다. 치료제가 개발된 질병은 그 도시에 머무는 동안 큐브가 놓이는 즉시 자동으로 제거된다.',
  },
  researcher: {
    id: 'researcher',
    name: '연구원',
    color: '#c48a3a',
    description: '정보 공유 시, 같은 도시에 있는 다른 플레이어에게 자신의 손에 있는 아무 도시 카드나 줄 수 있다.',
  },
  quarantineSpecialist: {
    id: 'quarantineSpecialist',
    name: '검역관',
    color: '#4a8f6e',
    description: '자신이 있는 도시와 그와 연결된 모든 도시에서는 질병 큐브가 놓이지 않고, 발병도 일어나지 않는다.',
  },
  contingencyPlanner: {
    id: 'contingencyPlanner',
    name: '대책 전문가',
    color: '#8a6fc4',
    description: '자신의 행동으로, 버림 더미에서 이벤트 카드 1장을 손패처럼 확보해 둘 수 있다(손패 장수에 포함되지 않음). 사용하면 버림 더미가 아닌 게임에서 완전히 제거된다. 한 번에 하나만 보관할 수 있다.',
  },
}

export const JOB_IDS: JobId[] = Object.keys(JOBS) as JobId[]

export function cureCardsRequired(job: JobId): number {
  return job === 'scientist' ? 4 : 5
}
