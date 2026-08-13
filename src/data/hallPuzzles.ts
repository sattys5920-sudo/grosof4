import type { HallPuzzle } from './types'

// 강당 조사 이벤트용 문제 뱅크 30개. 사용자가 직접 만든 23개(hp03, hp04, hp05, hp06,
// hp07, hp09, hp10, hp11, hp12, hp13, hp14, hp15, hp17, hp18, hp20, hp21, hp22, hp23,
// hp25, hp26, hp28, hp29, hp30)와 그에 맞춰 새로 제작한 7개로 구성했다.
// 원소기호/암호/애너그램/방정식/수열 등 다양한 유형을 섞었고, 전반적으로
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
    title: '자모를 흩어놓은 이름',
    category: '애너그램',
    questionText: '다음 다섯 글자를 자음과 모음 단위로 흩어 다시 조합하면 어떤 단어가 되는가? (한글로 답하시오)\n으 셀 다 비 에',
    answer: '에델바이스',
    solution:
      '각 글자를 자음과 모음으로 분해하면 으=ㅇㅡ, 셀=ㅅㅔㄹ, 다=ㄷㅏ, 비=ㅂㅣ, 에=ㅇㅔ이다. 이 낱글자들을 다시 조합하면 에(ㅇㅔ)-델(ㄷㅔㄹ)-바(ㅂㅏ)-이(ㅇㅣ)-스(ㅅㅡ), 즉 에델바이스가 된다.',
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
    title: '나무 속 쪽지',
    category: '단어',
    questionText:
      '나무 속에 쪽지가 숨어 있다. 다음 아홉 단어를 순서대로 이어 붙이면 나타나는 문장을 찾아라. (영문 대문자, 띄어쓰기 없이 답하시오)\nTIRE LET OVER EYE TO RUDE EAR LINT GREET',
    answer: 'ILOVEYOUDARLING',
    solution:
      '아홉 단어를 순서대로 이어 붙이면 TIRELETOVEREYETORUDEEARLINTGREET이 된다. 이 안에 나무(TREE)를 이루는 글자들이 여러 겹 섞여 있는데, 이를 지우고 남은 글자를 다시 이으면 ILOVEYOUDARLING이 완성된다.',
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
    title: '숫자 말의 꼬리잇기',
    category: '연쇄',
    questionText: '1 > 8 > 2 > 1\n13 > 9 > 11 > 99 > 8 > 13\n8 > 12 > 11 > ? > 8',
    answer: '9',
    solution:
      '숫자를 영단어로 바꾸면 앞 단어의 마지막 글자가 다음 단어의 첫 글자와 같아지는 고리가 만들어진다(ONE-EIGHT-TWO-ONE, THIRTEEN-NINE-ELEVEN-NINETYNINE-EIGHT-THIRTEEN). EIGHT(T)-TWELVE(E)-ELEVEN(N) 다음에는 N으로 시작해 E로 끝나는 단어가 이어져야 다시 EIGHT(E)로 연결되므로, 정답은 NINE(9)이다.',
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
    title: '자음·모음 겹쳐 쓰기',
    category: '한글 자모',
    questionText: '1+2=5\n3+24=12\n8+19=14\n7+19=?',
    answer: '10',
    solution:
      '자음과 모음에 1 번부터 순서대로 번호를 매긴다(1~14: ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ, 15~24: ㅏㅑㅓㅕㅗㅛㅜㅠㅣㅡ). 두 번호에 해당하는 글자의 획을 겹쳐 그리면 새 글자가 만들어진다. 1(ㄱ)과 2(ㄴ)의 획을 이으면 네 변이 모두 채워져 5 번째 글자 ㅁ이 되고, 3(ㄷ)에 24(ㅡ)의 가로획을 더하면 위쪽에 획이 하나 늘어 12 번째 글자 ㅌ이 된다. 같은 방식으로 7(ㅅ)에 19(ㅗ)의 가로획을 더하면 10 번째 글자 ㅊ이 되므로, 정답은 10.',
  },
  {
    id: 'hp12',
    title: '네 방향의 획',
    category: '암호',
    questionText:
      '다음 기호에서 W·S·E·N은 각각 서·남·동·북을 뜻한다. 이 기호가 나타내는 단어는 무엇인가? (영문 대문자로 답하시오)\nWSES ESWN WSES',
    answer: 'SOS',
    solution:
      '네 글자로 묶인 기호 하나가 알파벳 한 글자를 나타낸다. 서(W)·남(S)·동(E)·북(N) 방향으로 순서대로 획을 그으면 그 모양이 알파벳이 되는데, 이 규칙을 세 묶음에 차례로 적용하면 S, O, S가 되어 SOS(국제 조난 신호)가 완성된다.',
  },
  {
    id: 'hp13',
    title: '겹쳐진 12 시간',
    category: '숫자규칙',
    questionText: '13+14=3\n1+17=6\n8+20=4\n4+19=?',
    answer: '11',
    solution:
      '두 수를 12 시간제 시각으로 바꾸어 더한 뒤, 다시 12 시간제로 나타낸다. 13 시는 1 시, 14 시는 2 시이므로 1+2=3. 1 시와 17 시(=5 시)를 더하면 1+5=6. 8 시와 20 시(=8 시)를 더하면 8+8=16, 12 시간제로 나타내면 16-12=4. 같은 방식으로 4 시와 19 시(=7 시)를 더하면 4+7=11.',
  },
  {
    id: 'hp14',
    title: '꼬인 자판의 메모',
    category: '암호',
    questionText: ':!;”(@446:“;‘-:’/?\n위 기호가 나타내는 문장이 묻는 질문에 답하시오. (한글 두 글자로 답하시오)',
    answer: '고운',
    solution:
      '키보드가 한/영 전환 없이 한글 입력 상태일 때 이 기호들을 그대로 두드리면 "우리 학교 이름은?"이라는 문장이 완성된다. 그 질문의 답은 고운(고등학교).',
  },
  {
    id: 'hp15',
    title: '초성이 감춘 숫자',
    category: '암호',
    questionText: '괴이 = 7\n로그 = 9\n리을 = 2\n괴기 = ?',
    answer: '14',
    solution:
      '각 단어에서 첫 자음(초성)만 남기면 정해진 숫자가 대응된다: ㄱ=7, ㄹ=2, ㅇ=0. 괴이 → ㄱ+ㅇ=7+0=7. 로그 → ㄹ+ㄱ=2+7=9. 리을 → ㄹ+ㅇ=2+0=2. 같은 방식으로 괴기 → ㄱ+ㄱ=7+7=14.',
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
    title: '빠진 기호',
    category: '수학기호',
    questionText: '다음 식이 성립하도록 빈칸에 공통으로 들어갈 기호는 무엇인가?\n3? × 5? = 6?',
    answer: '!',
    solution: '팩토리얼(!) 기호를 넣으면 3!×5!=6×120=720이고, 6!=720으로 두 값이 같아진다.',
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
    title: '제곱을 뒤집으면',
    category: '숫자규칙',
    questionText: '다음 규칙에 따라 빈칸에 들어갈 두 자리 숫자를 구하시오.\n0240-0552\n0918-0846\n0110-03??',
    answer: '90',
    solution:
      '앞 두 자리 수를 제곱한 뒤(두 자리로 채워) 그 숫자를 뒤집으면 뒤 두 자리가 된다. 02²=04, 뒤집으면 40 → 0240. 05²=25, 뒤집으면 52 → 0552. 09²=81, 뒤집으면 18 → 0918. 08²=64, 뒤집으면 46 → 0846. 01²=01, 뒤집으면 10 → 0110. 같은 방식으로 03²=09, 뒤집으면 90이므로 정답은 90.',
  },
  {
    id: 'hp21',
    title: '단어들의 가면',
    category: '알파벳',
    questionText: '다음 단어들 앞에 공통으로 숨어 있는 한 글자를 찾으시오. (영문 소문자로 답하시오)\ntop  it  ing  have  truck',
    answer: 's',
    solution: '앞에 s를 붙이면 stop, sit, sing, shave, struck으로 모두 뜻이 통하는 단어가 된다.',
  },
  {
    id: 'hp22',
    title: '숫자로 겹쳐 쓰기',
    category: '숫자',
    questionText: 'ONE + ZERO = 6\nEERHT + THREE = 8\nZERO + ONE = (?)',
    answer: '9',
    solution:
      '숫자를 글자 모양 그대로 겹쳐 쓸 때 만들어지는 새로운 숫자를 찾는 규칙이다. 예를 들어 3을 좌우로 뒤집은 모양(EERHT)과 원래 3(THREE)을 겹치면 8이 된다. 같은 방식으로 0(ZERO)과 1(ONE)을 겹치면 6이 되고, 순서를 바꾸어 1(ONE)과 0(ZERO)을 겹치면 6을 뒤집은 모양인 9가 된다.',
  },
  {
    id: 'hp23',
    title: '숫자 속 세 조각',
    category: '숫자규칙',
    questionText: 'one 314\ntwo 325\nthree 538\nfour 448\nfive ?',
    answer: '459',
    solution:
      '세 자리 숫자는 [글자 수][몇 번째 수인지][글자 수+순서]로 이루어진다. one은 글자 수 3, 순서 1, 합 4 → 314. two는 3, 2, 5 → 325. three는 5, 3, 8 → 538. four는 4, 4, 8 → 448. five는 글자 수 4, 순서 5, 합 9이므로 459.',
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
    title: '곱셈의 디지털 루트',
    category: '숫자규칙',
    questionText: '11 11 = 4\n13 15 = 6\n15 19 = 6\n17 23 = ?',
    answer: '4',
    solution:
      '두 수를 곱한 뒤, 각 자리 숫자를 한 자리 수가 될 때까지 계속 더한다(디지털 루트). 11×11=121→1+2+1=4. 13×15=195→1+9+5=15→1+5=6. 15×19=285→2+8+5=15→6. 17×23=391→3+9+1=13→1+3=4.',
  },
  {
    id: 'hp26',
    title: '방위 숫자의 합',
    category: '숫자규칙',
    questionText: 'WE = 360\nNEW = 360\nSEE = ?',
    answer: '360',
    solution:
      '각 알파벳을 나침반 방위 각도로 바꾼다: N=0, E=90, S=180, W=270. 그 값을 모두 더한다. WE: 270+90=360. NEW: 0+90+270=360. SEE: 180+90+90=360.',
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
    title: '거꾸로 선 숫자들',
    category: '암호',
    questionText:
      '다음은 6부터 1까지의 영어 단어를 각각 거꾸로 뒤집어 이어붙인 문자열이다. 물음표(?) 자리에 들어갈 글자를 순서대로 이으면 무엇이 되는가? (영문 소문자로 답하시오)\nxis??ifruofeerhtowt??o',
    answer: 'even',
    solution:
      '6, 5, 4, 3, 2, 1을 영단어(SIX, FIVE, FOUR, THREE, TWO, ONE)로 바꾸고 각 단어를 거꾸로 뒤집어 이어 붙이면 XISEVIFRUOFEERHTOWTENO가 된다. 물음표로 가려진 자리(EVIF의 EV, ENO의 EN)를 순서대로 이으면 EVEN이 완성된다.',
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
