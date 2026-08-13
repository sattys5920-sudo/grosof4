import type { HallPuzzle } from './types'

// 강당 조사 이벤트용 문제 뱅크 30개. 사용자가 직접 만든 10개(hp03, hp05, hp07, hp10,
// hp13, hp15, hp17, hp22, hp29, hp30)와 그에 맞춰 새로 제작한 20개로 구성했다.
// 원소기호/암호/한자/애너그램/논리/방정식 등 다양한 유형을 섞었고, 전반적으로
// 난이도를 높여 배치했다. 정답 제출은 최대 3 회, 맞히면 정답과 풀이가 함께 공개된다.
export const HALL_PUZZLES: HallPuzzle[] = [
  {
    id: 'hp01',
    title: '알파벳 자리값',
    category: '숫자암호',
    questionText:
      'A=1, B=2, C=3, … Z=26일 때, 다음 숫자가 나타내는 단어는 무엇인가? (영문 대문자로 답하시오)\n7-8-15-19-20',
    answer: 'GHOST',
    solution: '7=G, 8=H, 15=O, 19=S, 20=T. 순서대로 이으면 GHOST(유령).',
  },
  {
    id: 'hp02',
    title: '연필과 지우개',
    category: '방정식',
    questionText:
      '연필 한 자루와 지우개 두 개를 사면 1700 원이고, 연필 세 자루와 지우개 한 개를 사면 2100 원이다. 지우개 한 개의 가격은 얼마인가? (단위 없이 숫자만 답하시오)',
    answer: '600',
    solution:
      '연필값을 p, 지우개값을 e라 하면 p+2e=1700, 3p+e=2100. 두 식을 연립하면 e=600, p=500 (검산: 3×500+600=2100).',
  },
  {
    id: 'hp03',
    title: '한 붓으로 쓰기',
    category: '알파벳',
    questionText: 'ONE -> 4\nTWO -> 4\nSIX -> 4\nTEN -> ()',
    answer: '5',
    solution:
      '각 단어를 이루는 알파벳을 한붓그리기(펜을 떼지 않고 한 번에 쓰기)로 쓸 때 필요한 최소 획수의 합을 구하는 규칙이다. TEN을 이루는 T, E, N의 최소 획수를 더하면 5가 된다.',
  },
  {
    id: 'hp04',
    title: '세 자리에 들어갈 한 글자',
    category: '동음이의어',
    questionText:
      '다음 세 문장에 공통으로 들어갈 한 글자는 무엇인가?\n"__를 타고 강을 건넜다."\n"__가 아파서 병원에 갔다."\n"__ 하나를 깎아 먹었다."',
    answer: '배',
    solution: '배(舟-배를 타다, 복부, 과일)는 발음이 같지만 뜻이 다른 세 단어에 모두 해당한다.',
  },
  {
    id: 'hp05',
    title: '겹쳐진 두 단어',
    category: '단어',
    questionText: 'ARAIN\nSEEDD\n()',
    answer: 'TEETH',
    solution:
      'A, 비(RAIN), 씨(SEED), D를 순서대로 소리 내어 읽으면 영어 알파벳 A-B-C-D를 읽은 것과 같아진다(비=B, 씨=C). 이어 E까지 더하면 TEETH(치아, TOOTH도 정답)가 완성된다.',
  },
  {
    id: 'hp06',
    title: '책상 밑 낙서',
    category: '위치암호',
    questionText:
      '어느 책상 밑에 낙서가 남아 있다. 알파벳별로 나타나는 자리(왼쪽부터, 공백 없이 총 6 자리)가 다음과 같을 때 완성되는 단어는? (영문 대문자로 답하시오)\nH: 1\nE: 2, 6\nL: 3\nP: 4\nM: 5',
    answer: 'HELPME',
    solution: '1 번 자리 H, 2 번 자리 E, 3 번 자리 L, 4 번 자리 P, 5 번 자리 M, 6 번 자리 E를 순서대로 이으면 HELPME.',
  },
  {
    id: 'hp07',
    title: '숫자 속 알파벳',
    category: '암호',
    questionText: '31 62 13 -> 넥타이\n33 11 61 72 -> 장미\n51 102 61 101 -> 축제\n32 74 33 23 -> ()',
    answer: '영웅',
    solution:
      '앞자리 숫자는 그 수를 나타내는 영단어를, 뒷자리 숫자는 그 영단어의 몇 번째 알파벳인지를 가리킨다. 31은 3(THREE)의 1 번째 알파벳 T, 62는 6(SIX)의 2 번째 알파벳 I, 13은 1(ONE)의 3 번째 알파벳 E — TIE(넥타이). 같은 방식으로 32 74 33 23을 풀면 H-E-R-O, 즉 HERO(영웅)가 된다.',
  },
  {
    id: 'hp08',
    title: '점점 벌어지는 간격',
    category: '수열',
    questionText: '다음 수열의 빈칸에 들어갈 숫자를 구하시오.\n2, 3, 7, 16, 32, 57, ?',
    answer: '93',
    solution:
      '이웃한 두 항의 차이를 구하면 1, 4, 9, 16, 25로 각각 1², 2², 3², 4², 5²이다. 즉 n 번째 항에서 다음 항으로 갈 때 n²을 더하는 규칙이다. 57에 6²=36을 더하면 93.',
  },
  {
    id: 'hp09',
    title: '250 일 후',
    category: '요일',
    questionText: '오늘은 화요일이다. 250 일 후는 무슨 요일인가?',
    answer: '일요일',
    solution: '250을 7로 나누면 몫 35, 나머지 5. 화요일에서 5 일을 더하면 화→수→목→금→토→일, 즉 일요일.',
  },
  {
    id: 'hp10',
    title: '뜻으로 이어지는 사슬',
    category: '연상',
    questionText: '다음 다섯 영단어 중, 규칙에 따라 정답이 되는 단어를 고르시오.\nWARM  TICKET  SOUP  PALACE  PADDY',
    answer: 'PALACE',
    solution: '각 단어의 뜻을 한 글자 한자어로 옮기면 온(WARM), 표(TICKET), 국(SOUP), 궁(PALACE), 논(PADDY)이다. 온 → 궁, 국 → 논, 표 → 표의 대응 관계가 성립하며, 정답은 PALACE(궁).',
  },
  {
    id: 'hp11',
    title: '제곱수 원소',
    category: '원소기호',
    questionText: '다음 원소 기호 순서에서 빈칸에 들어갈 원소 기호는? (원자번호가 규칙을 이룬다)\nH Be F S Mn ?',
    answer: 'Kr',
    solution: '원자번호가 1, 4, 9, 16, 25로 각각 1², 2², 3², 4², 5²이다. 다음은 6²=36이며, 원자번호 36 번 원소는 크립톤(Kr).',
  },
  {
    id: 'hp12',
    title: '좌표 속 암호',
    category: '암호',
    questionText:
      '가로 세로 각 5 칸에 A~Z(I와 J는 한 칸)를 순서대로 채운 표가 있다.\n1 행: A B C D E\n2 행: F G H I/J K\n3 행: L M N O P\n4 행: Q R S T U\n5 행: V W X Y Z\n좌표를 (행)(열) 순서의 두 자리 숫자로 나타낼 때, "44 42 11 35"가 뜻하는 단어는? (영문 대문자로 답하시오)',
    answer: 'TRAP',
    solution: '44=4 행 4 열=T, 42=4 행 2 열=R, 11=1 행 1 열=A, 35=3 행 5 열=P. 이어 붙이면 TRAP(함정).',
  },
  {
    id: 'hp13',
    title: '나에게 무언가를 더하면',
    category: '한자',
    questionText:
      '나의 다리 하나를 더하면 흙으로 갈 수 있고, 나에게 입을 더하면 밭으로 갈 수 있다. 나의 머리 하나를 더하면 나는 세 개가 된다. 나는 누구일까?',
    answer: '십',
    solution:
      '한자 十(열 십)에 다리(丨) 하나를 더하면 土(흙 토), 입(口)을 더하면 田(밭 전), 머리(一)를 더하면 千(일천 천, 十이 세 개 겹친 모양과 통함)이 된다.',
  },
  {
    id: 'hp14',
    title: '자리마다 다른 이동',
    category: '암호',
    questionText:
      '어떤 단어를 첫 글자는 1 칸, 둘째 글자는 2 칸, 셋째 글자는 3 칸, 넷째 글자는 4 칸, 다섯째 글자는 5 칸씩 알파벳 순서로 뒤로 밀어 암호화했더니 "NQXWJ"가 되었다. 원래 단어는? (영문 대문자로 답하시오)',
    answer: 'MOUSE',
    solution: '반대로 자리 수만큼 앞으로 당기면 N(-1)=M, Q(-2)=O, X(-3)=U, W(-4)=S, J(-5)=E. 이어 붙이면 MOUSE.',
  },
  {
    id: 'hp15',
    title: '숫자 속 곱셈',
    category: '숫자규칙',
    questionText: '82 = 96\n23 = 26\n74 = 98\n59 = ?',
    answer: '95',
    solution:
      '두 자리 수를 "십의 자리 숫자 + 일의 자리 숫자" 형태로 읽어 (10+일의 자리)×십의 자리로 계산한다. 82는 "팔십이"를 (10+2)×8=96으로 계산한 것. 같은 방식으로 59는 (10+9)×5=95.',
  },
  {
    id: 'hp16',
    title: '세 과목의 벤다이어그램',
    category: '집합',
    questionText:
      '45 명 학급에서 국어를 좋아하는 학생 22 명, 수학 18 명, 영어 20 명이다. 국어·수학을 모두 좋아하는 학생 8 명, 수학·영어 모두 7 명, 국어·영어 모두 9 명, 세 과목을 모두 좋아하는 학생은 4 명이다. 세 과목 중 어느 것도 좋아하지 않는 학생은 몇 명인가?',
    answer: '5',
    solution: '적어도 한 과목을 좋아하는 학생 수 = 22+18+20-8-7-9+4=40. 전체 45 명 중 나머지 45-40=5 명은 어느 과목도 좋아하지 않는다.',
  },
  {
    id: 'hp17',
    title: '이름을 읽으면',
    category: '음절',
    questionText: 'A + V = 4\nD + B = 2\nW + C = 4\nK + O = (?)',
    answer: '3',
    solution:
      '각 알파벳을 한글로 읽었을 때의 음절 수를 더한다. A(에이,2)+V(브이,2)=4. D(디,1)+B(비,1)=2. W(더블유,3)+C(씨,1)=4. K(케이,2)+O(오,1)=3.',
  },
  {
    id: 'hp18',
    title: '겹치는 불행',
    category: '초성',
    questionText:
      '"눈 위에 서리까지 더해지다"라는 뜻으로, 불행한 일이 겹쳐 일어남을 비유하는 사자성어를 초성 힌트로 맞히시오.\nㅅㅅㄱㅅ',
    answer: '설상가상',
    solution: '雪上加霜(설상가상) — 설(ㅅ) 상(ㅅ) 가(ㄱ) 상(ㅅ).',
  },
  {
    id: 'hp19',
    title: '두 배 더하기 하나',
    category: '수열',
    questionText: '다음 수열의 빈칸에 들어갈 숫자를 구하시오.\n3, 7, 15, 31, 63, ?',
    answer: '127',
    solution: '각 항은 앞 항의 2 배에 1을 더한 값이다. 63×2+1=127.',
  },
  {
    id: 'hp20',
    title: '한 명만 거짓말',
    category: '논리',
    questionText:
      '세 사람 갑, 을, 병 중 한 명이 범인이다. 갑은 "범인은 나다", 을은 "범인은 갑이 아니다", 병은 "범인은 을이다"라고 말했다. 이 중 정확히 한 명만 거짓말을 했다. 범인은 누구인가? (갑/을/병 중 하나로 답하시오)',
    answer: '을',
    solution:
      '범인이 을이라고 가정하면 갑의 말(범인은 나다)은 거짓, 을의 말(범인은 갑이 아니다)은 참, 병의 말(범인은 을이다)은 참 — 거짓말이 정확히 한 명이라는 조건과 맞는다. 다른 경우를 대입하면 거짓말한 사람이 0 명이거나 2 명이 되어 모순된다. 따라서 범인은 을.',
  },
  {
    id: 'hp21',
    title: '곱에서 합을 빼면',
    category: '숫자규칙',
    questionText: '24 -> 2\n36 -> 9\n48 -> 20\n67 -> ?',
    answer: '29',
    solution: '두 자릿수의 곱에서 두 자릿수의 합을 뺀다. 24: 2×4-(2+4)=2. 36: 3×6-(3+6)=9. 48: 4×8-(4+8)=20. 67: 6×7-(6+7)=29.',
  },
  {
    id: 'hp22',
    title: '숫자로 겹쳐 쓰기',
    category: '숫자',
    questionText: 'ONE + ZERO = 6\nEERHT + THREE = 8\nZERO + ONE = (?)',
    answer: '9',
    solution:
      '숫자를 겹쳐 쓸 때 생기는 교차점의 개수를 세는 규칙이다. 1(ONE)의 오른쪽 아래로 0(ZERO)을 겹쳐 쓰면 만들어지는 교차점이 6 개가 된다. 같은 방식으로 ZERO와 ONE을 겹치면 교차점은 9 개가 된다.',
  },
  {
    id: 'hp23',
    title: '색칠된 정육면체',
    category: '도형',
    questionText:
      '겉면을 모두 칠한 정육면체를 각 모서리를 3 등분해 27 개의 작은 정육면체로 잘랐다. 이 중 정확히 두 면만 칠해진 작은 정육면체는 몇 개인가?',
    answer: '12',
    solution: '모서리 위에 있지만 꼭짓점은 아닌 작은 정육면체가 두 면만 칠해진다. 정육면체는 모서리가 12 개이고, 각 모서리마다 그런 조각이 정확히 1 개씩 있으므로 총 12 개.',
  },
  {
    id: 'hp24',
    title: '3도 5도 아닌 수',
    category: '경우의 수',
    questionText: '1부터 100까지의 자연수 중, 3의 배수도 아니고 5의 배수도 아닌 수는 모두 몇 개인가?',
    answer: '53',
    solution: '3의 배수는 33 개, 5의 배수는 20 개, 15의 배수(둘 다)는 6 개이다. 3의 배수 또는 5의 배수는 33+20-6=47 개이므로, 둘 다 아닌 수는 100-47=53 개.',
  },
  {
    id: 'hp25',
    title: '세 수의 합',
    category: '방정식',
    questionText: '세 자연수 x, y, z가 있다. x+y=10, y+z=14, z+x=16이다. 이 중 가장 큰 수는 얼마인가?',
    answer: '10',
    solution: '세 식을 모두 더하면 2(x+y+z)=40, x+y+z=20. z=20-10=10, x=20-14=6, y=20-16=4. 가장 큰 수는 z=10.',
  },
  {
    id: 'hp26',
    title: '흩어진 기숙사',
    category: '단어',
    questionText: '다음 아홉 글자를 재배열하면 잠을 자고 머무는 시설을 뜻하는 영단어가 된다. "ROTIMROYD" — 그 단어는?',
    answer: 'DORMITORY',
    solution: 'R, O, T, I, M, R, O, Y, D를 재배열하면 DORMITORY(기숙사)가 된다.',
  },
  {
    id: 'hp27',
    title: '흩어진 증거',
    category: '단어',
    questionText: '다음 여덟 글자를 재배열하면 사건 해결에 필요한 것을 뜻하는 영단어가 된다. "EDVEICNE" — 그 단어는?',
    answer: 'EVIDENCE',
    solution: 'E, D, V, E, I, C, N, E를 재배열하면 EVIDENCE(증거)가 된다.',
  },
  {
    id: 'hp28',
    title: '16 진수 해독',
    category: '숫자',
    questionText: '16 진수 2F를 10 진수로 바꾸면 얼마인가?',
    answer: '47',
    solution: '2F = 2×16 + 15 = 32+15 = 47.',
  },
  {
    id: 'hp29',
    title: '원소 번호의 규칙',
    category: '원소기호',
    questionText: 'H K Y Pm -> ?',
    answer: 'At',
    solution: '원자번호가 1, 19, 39, 61, 85로 나열되며 앞뒤 차이가 18, 20, 22, 24로 2씩 커지는 규칙이다. 원자번호 85 번 원소는 아스타틴(At).',
  },
  {
    id: 'hp30',
    title: '책상에 적힌 경고',
    category: '위치암호',
    questionText:
      '책상에 다음과 같은 표시가 남아 있다. 알파벳별로 나타나는 자리(왼쪽부터, 공백 없이 총 12 자리)가 다음과 같을 때 완성되는 문장은?\nI: 1, 3, 7\nW: 2\nL: 4, 5, 8, 9, 11, 12\nK: 6\nA: 10',
    answer: 'IWILLKILLALL',
    solution: '자리를 순서대로 채우면 I-W-I-L-L-K-I-L-L-A-L-L, 즉 "I WILL KILL ALL"이 된다.',
  },
]

export function hallPuzzleById(id: string): HallPuzzle | undefined {
  return HALL_PUZZLES.find((p) => p.id === id)
}
