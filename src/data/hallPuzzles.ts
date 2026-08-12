import type { HallPuzzle } from './types'

// 강당 조사 이벤트용 문제 뱅크 30개. 숫자/영단어로 답이 떨어지는 유형 위주로,
// 기존 교실 문제보다 난이도를 올려 구성했다. 정답 제출은 최대 3 회, 맞히면
// 정답과 풀이가 함께 공개된다.
export const HALL_PUZZLES: HallPuzzle[] = [
  {
    id: 'hp01',
    title: '늘어나는 간격',
    category: '수열',
    questionText: '다음 수열의 빈칸에 들어갈 숫자를 구하시오.\n2, 6, 12, 20, 30, ?',
    answer: '42',
    solution: '앞뒤 항의 차이가 4, 6, 8, 10, 12로 2씩 커진다. 30 다음 차이는 12이므로 30+12=42.',
  },
  {
    id: 'hp02',
    title: '어긋난 두 바늘',
    category: '시계',
    questionText: '시계가 4시 30분을 가리킬 때, 시침과 분침이 이루는 더 작은 쪽 각도는 몇 도인가?',
    answer: '45',
    solution:
      '분침은 30분에서 180˚. 시침은 4시에서 120˚이고 30분 동안 15˚ 더 움직여 135˚. 두 각도의 차는 180-135=45˚.',
  },
  {
    id: 'hp03',
    title: '부자의 나이',
    category: '방정식',
    questionText:
      '아버지와 아들의 나이를 더하면 66살이다. 아버지의 나이는 아들 나이의 3배보다 6살 적다. 아들의 나이는 몇 살인가?',
    answer: '18',
    solution: '아들 나이를 x라 하면 아버지는 3x-6. x+(3x-6)=66 → 4x=72 → x=18.',
  },
  {
    id: 'hp04',
    title: '밀려난 알파벳',
    category: '암호',
    questionText:
      '알파벳을 3칸씩 뒤로 미는 암호로 어떤 영단어를 바꿨더니 "VWXGB"가 되었다. 원래 단어는 무엇인가? (영문 대문자로 답하시오)',
    answer: 'STUDY',
    solution: '암호는 각 글자를 알파벳 3칸 뒤로 민 것이므로, 반대로 3칸 앞으로 당기면 V→S, W→T, X→U, G→D, B→Y, 즉 STUDY.',
  },
  {
    id: 'hp05',
    title: '자리를 바꾸면',
    category: '방정식',
    questionText:
      '두 자리 자연수가 있다. 각 자릿수의 합은 11이다. 십의 자리와 일의 자리를 서로 바꾸면 원래 수보다 45 크다. 원래 수는 얼마인가?',
    answer: '38',
    solution:
      '십의 자리를 a, 일의 자리를 b라 하면 a+b=11이고 (10b+a)-(10a+b)=45 → 9(b-a)=45 → b-a=5. 두 식을 풀면 a=3, b=8. 원래 수는 38 (바꾼 수 83, 83-38=45로 확인된다).',
  },
  {
    id: 'hp06',
    title: '한 글자씩',
    category: '단어',
    questionText:
      'CAT에서 시작해 매 단계마다 알파벳 한 글자씩만 바꿔 3단계 만에 DOG를 만들려 한다. CAT → ? → ? → DOG 순서로 바꿀 때, 두 번째 단계의 단어는? (CAT→COT→COG→DOG 순서를 따른다)',
    answer: 'COG',
    solution: 'CAT의 A를 O로 바꾸면 COT, COT의 T를 G로 바꾸면 COG, COG의 C를 D로 바꾸면 DOG. 두 번째 단계는 COG.',
  },
  {
    id: 'hp07',
    title: '한 사람만 진실',
    category: '논리',
    questionText:
      '동아리방에서 물건이 사라졌다. 갑은 "을이 가져갔다", 을은 "나는 아니다", 병은 "갑이 가져갔다"라고 말했다. 셋 중 진실을 말한 사람은 정확히 한 명뿐이다. 범인은 누구인가? (갑/을/병 중 하나로 답하시오)',
    answer: '을',
    solution:
      '을이 범인이라고 가정하면 갑의 말은 참, 을의 말("나는 아니다")은 거짓, 병의 말("갑이 가져갔다")도 거짓 — 진실이 정확히 한 명이라는 조건과 맞는다. 다른 경우를 대입하면 진실을 말한 사람이 0명이거나 2명이 되어 모순된다. 따라서 범인은 을.',
  },
  {
    id: 'hp08',
    title: '거꾸로 계산',
    category: '방정식',
    questionText: '어떤 수에 7을 곱한 뒤 5를 더했더니 33이 되었다. 원래 수는 얼마인가?',
    answer: '4',
    solution: '7x+5=33 → 7x=28 → x=4.',
  },
  {
    id: 'hp09',
    title: '흩어진 글자',
    category: '단어',
    questionText: '다음 여덟 글자를 재배열하면 어떤 공간을 가리키는 영단어가 된다. "OMOSCLAR" — 그 단어는?',
    answer: 'CLASSROOM',
    solution: 'O, M, O, S, C, L, A, R을 재배열하면 CLASSROOM(교실)이 된다.',
  },
  {
    id: 'hp10',
    title: '세 자릿수 조건',
    category: '숫자',
    questionText:
      '세 자리 자연수가 있다. 각 자릿수를 모두 곱하면 30, 모두 더하면 10이다. 만들 수 있는 가장 작은 세 자리 수는?',
    answer: '235',
    solution: '2×3×5=30, 2+3+5=10을 만족하는 조합은 {2,3,5}뿐이다. 이 세 숫자로 만들 수 있는 가장 작은 수는 235.',
  },
  {
    id: 'hp11',
    title: '느려지는 시계',
    category: '시계',
    questionText:
      '어떤 시계가 하루에 15분씩 늦게 간다. 정오에 정확히 맞춰 놓았다면, 이 시계가 다시 정확한 시각을 가리키는 것은 며칠 후인가?',
    answer: '48',
    solution: '시계가 12시간(720분) 늦어야 다시 정확한 시각과 겹친다. 하루에 15분씩 늦으므로 720÷15=48일.',
  },
  {
    id: 'hp12',
    title: '격자 속 직사각형',
    category: '도형',
    questionText: '가로 3칸, 세로 2칸으로 이루어진 격자판에서 만들 수 있는 크고 작은 직사각형의 총 개수는?',
    answer: '18',
    solution: '가로선 4개, 세로선 3개 중 각각 2개씩 고르면 직사각형 하나가 정해진다. C(4,2)×C(3,2)=6×3=18.',
  },
  {
    id: 'hp13',
    title: '뒤로 밀린 암호',
    category: '암호',
    questionText: 'LIBRARY를 알파벳 4칸씩 뒤로 미는 암호로 바꾸면 어떤 문자열이 되는가? (영문 대문자로 답하시오)',
    answer: 'PMFVEVC',
    solution: 'L→P, I→M, B→F, R→V, A→E, R→V, Y→C. 순서대로 이으면 PMFVEVC.',
  },
  {
    id: 'hp14',
    title: '홀수만 더하면',
    category: '숫자',
    questionText: '1부터 49까지의 홀수를 모두 더하면 얼마인가?',
    answer: '625',
    solution: '1부터 49까지 홀수는 25개이며, 1부터 시작하는 연속된 홀수 n개의 합은 항상 n². 25²=625.',
  },
  {
    id: 'hp15',
    title: '5년 전과 지금',
    category: '방정식',
    questionText: '5년 전 나이의 2배가 지금 나이보다 10살 많다. 지금 나이는 몇 살인가?',
    answer: '20',
    solution: '지금 나이를 x라 하면 2(x-5)=x+10 → 2x-10=x+10 → x=20.',
  },
  {
    id: 'hp16',
    title: '눈의 합이 8',
    category: '확률',
    questionText: '주사위 두 개를 동시에 굴렸을 때, 나온 눈의 합이 8이 되는 경우의 수는 몇 가지인가?',
    answer: '5',
    solution: '(2,6), (3,5), (4,4), (5,3), (6,2)로 총 5가지.',
  },
  {
    id: 'hp17',
    title: '이진수 해독',
    category: '숫자',
    questionText: '이진수 101101을 십진수로 바꾸면 얼마인가?',
    answer: '45',
    solution: '101101 = 32+0+8+4+0+1 = 45.',
  },
  {
    id: 'hp18',
    title: '흩어진 창고',
    category: '단어',
    questionText: '다음 일곱 글자를 재배열하면 보관 공간을 뜻하는 영단어가 된다. "TSRO EGA" — 그 단어는?',
    answer: 'STORAGE',
    solution: 'S, T, O, R, A, G, E를 재배열하면 STORAGE(저장, 창고)가 된다.',
  },
  {
    id: 'hp19',
    title: '세 사람의 나이',
    category: '방정식',
    questionText:
      '세 사람의 나이를 모두 더하면 45살이다. 첫째는 둘째의 2배이고, 셋째는 첫째보다 5살 적다. 둘째의 나이는 몇 살인가?',
    answer: '10',
    solution: '둘째를 x라 하면 첫째는 2x, 셋째는 2x-5. x+2x+(2x-5)=45 → 5x=50 → x=10.',
  },
  {
    id: 'hp20',
    title: '커지는 수열',
    category: '수열',
    questionText: '다음 수열의 빈칸에 들어갈 숫자를 구하시오.\n1, 1, 2, 3, 5, 8, 13, ?',
    answer: '21',
    solution: '앞의 두 항을 더해 다음 항을 만드는 규칙(피보나치 수열)이다. 8+13=21.',
  },
  {
    id: 'hp21',
    title: '같은 요일의 비밀',
    category: '논리',
    questionText:
      '학생 13명이 있다. 각자의 생일이 속한 요일(월~일, 7개 중 하나)을 기준으로 나눌 때, 반드시 같은 요일에 생일인 학생이 최소 몇 명 이상 존재하는 조가 생기는가?',
    answer: '2',
    solution: '13명을 7개의 요일에 나누면 13÷7은 1이 남으므로, 적어도 한 요일에는 최소 2명이 몰릴 수밖에 없다 (비둘기집 원리).',
  },
  {
    id: 'hp22',
    title: '두 나머지의 교차점',
    category: '숫자',
    questionText: '7로 나누면 나머지가 3이고, 5로 나누면 나머지가 2인 가장 작은 자연수는?',
    answer: '17',
    solution: '7로 나눠 나머지 3인 수: 3, 10, 17, 24… 이 중 5로 나눠 나머지가 2인 가장 작은 수는 17 (17÷5=3…2).',
  },
  {
    id: 'hp23',
    title: '뒤섞인 책들의 방',
    category: '단어',
    questionText: '다음 일곱 글자를 재배열하면 책이 모인 공간을 뜻하는 영단어가 된다. "ARBLIRY" — 그 단어는?',
    answer: 'LIBRARY',
    solution: 'A, R, B, L, I, R, Y를 재배열하면 LIBRARY(도서관)가 된다.',
  },
  {
    id: 'hp24',
    title: '저녁의 두 바늘',
    category: '시계',
    questionText: '시계가 6시 40분을 가리킬 때, 시침과 분침이 이루는 더 작은 쪽 각도는 몇 도인가?',
    answer: '40',
    solution:
      '분침은 40분에서 240˚. 시침은 6시에서 180˚이고 40분 동안 20˚ 더 움직여 200˚. 두 각도 차는 240-200=40˚로, 이는 이미 작은 쪽이다.',
  },
  {
    id: 'hp25',
    title: '두 배씩 커지는 수열',
    category: '수열',
    questionText: '다음 수열의 빈칸에 들어갈 숫자를 구하시오.\n3, 6, 12, 24, ?',
    answer: '48',
    solution: '각 항이 앞 항의 2배가 되는 규칙(등비수열)이다. 24×2=48.',
  },
  {
    id: 'hp26',
    title: '겹치는 두 조건',
    category: '집합',
    questionText:
      '한 반 30명 중 안경을 쓴 학생은 18명, 왼손잡이는 10명, 둘 다 해당하는 학생은 5명이다. 안경도 쓰지 않고 왼손잡이도 아닌 학생은 몇 명인가?',
    answer: '7',
    solution: '안경을 썼거나 왼손잡이인 학생 = 18+10-5=23명. 전체 30명 중 나머지는 30-23=7명.',
  },
  {
    id: 'hp27',
    title: '앞으로 당긴 암호',
    category: '암호',
    questionText: '어떤 암호문 "KHOOR"는 알파벳을 3칸씩 뒤로 미는 방식으로 만들어졌다. 원래 단어는 무엇인가?',
    answer: 'HELLO',
    solution: '반대로 3칸씩 앞으로 당기면 K→H, H→E, O→L, O→L, R→O, 즉 HELLO.',
  },
  {
    id: 'hp28',
    title: '맞물리는 톱니',
    category: '숫자',
    questionText:
      '톱니 18개짜리 톱니바퀴와 톱니 24개짜리 톱니바퀴가 맞물려 있다. 처음 맞물린 지점에서 다시 만나려면, 작은 톱니바퀴(18개)는 최소 몇 바퀴를 돌아야 하는가?',
    answer: '4',
    solution: '두 톱니 수의 최소공배수는 LCM(18,24)=72. 작은 톱니바퀴 기준 회전수는 72÷18=4바퀴.',
  },
  {
    id: 'hp29',
    title: '제곱으로 자라는 수열',
    category: '수열',
    questionText: '다음 수열의 빈칸에 들어갈 숫자를 구하시오.\n1, 4, 9, 16, 25, ?',
    answer: '36',
    solution: '각 항은 1², 2², 3², 4², 5²… 제곱수이다. 다음 항은 6²=36.',
  },
  {
    id: 'hp30',
    title: '가장 빠른 사람',
    category: '논리',
    questionText:
      '다섯 명이 달리기를 했다. "가는 나보다 빠르다", "다는 가보다 느리다", "나는 라보다 느리다", "가는 라보다 느리다", "마는 라보다 빠르다"는 사실이 모두 참일 때, 가장 빠른 사람은 누구인가? (가/나/다/라/마 중 하나로 답하시오)',
    answer: '마',
    solution:
      '조건을 정리하면 마>라>나, 라>가>다이다. 즉 마가 라보다 빠르고, 라는 가와 나보다 빠르므로 다섯 명 중 가장 빠른 사람은 마.',
  },
]

export function hallPuzzleById(id: string): HallPuzzle | undefined {
  return HALL_PUZZLES.find((p) => p.id === id)
}
