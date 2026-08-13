import type { HallEvent, HallLogEntry } from './types'

// 강당 조사 이벤트 10종. 불가가 방에 들어가 로그를 순서대로 재생하며 분위기를 잡고,
// 이후 학생들이 오브젝트 10개 중 하나를 상의해서 선택해 <열어 본다>/<그냥 둔다>를
// 고른다. 오브젝트 구성은 이벤트형(hazardText, hp/스태미나 손상) 3개, 문제형(puzzleId,
// 풀면 다음 진행에 도움) 3개, 아이템 획득형(itemShopId 또는 itemCoins) 4개로 고정한다.
// 로그 중간에는 다수결 선택지 노드가 하나씩 끼어 있다. 학생들이 <도망간다>/<다가간다>/
// <숨는다> 중 투표하면 불가가 표결을 마감해 결과 서사를 확정하고 다음 로그로 넘어간다.

const CHOICES = (
  flee: string,
  approach: string,
  hide: string,
): HallLogEntry['choices'] => [
  { id: 'flee', label: '도망간다', resultText: flee },
  { id: 'approach', label: '다가간다', resultText: approach },
  { id: 'hide', label: '숨는다', resultText: hide },
]

export const HALL_EVENTS: HallEvent[] = [
  {
    id: 'he01',
    roomName: '교무실',
    creatureName: '출석부의 것',
    creatureIntro:
      '불 꺼진 교무실, 아무도 없어야 할 자리에서 서류 넘기는 소리가 난다....... 누군가 출석부를 처음부터 끝까지, 천천히 다시 세고 있다.',
    logs: [
      {
        text: '문을 열자 형광등 하나만 깜빡이고 있다....... 책상들은 각자의 자리에 그대로지만, 의자 하나만 안쪽을 향해 돌아가 있다. 아무도 앉지 않은 그 의자가, 아주 미세하게 삐걱거린다.',
      },
      {
        text: '의자가 다시 한번 혼자 덜그럭거린다....... 수상하다. 아무도 손대지 않았는데 등받이가 조금씩 이쪽으로 돌아오고 있다.',
        choices: CHOICES(
          '다급히 뒷걸음질 치다 문틀에 어깨를 부딪힌다....... 돌아보니 의자는 어느새 다시 얌전히 멈춰 있다.',
          '숨을 죽이고 다가가 의자 등받이에 손을 얹는다....... 아직 온기가 남아 있다. 방금까지 누군가 앉아 있었던 것처럼.',
          '책상 밑으로 몸을 숨긴다....... 덜그럭거리던 의자가 천천히, 아주 천천히 이쪽으로 방향을 튼다.',
        ),
      },
      {
        text: '가운데 교탁 위, 출석부가 펼쳐진 채 놓여 있다....... 페이지가 저절로 한 장씩, 축축하게 젖은 소리를 내며 넘어간다.',
      },
      {
        text: '넘어가던 페이지가 어느 한 곳에서 멈춘다....... 11번 자리 칸에, 이름이 있어야 할 자리가 비어 있다. 그 위에 손톱으로 긁은 듯한 자국이 남아 있다.',
      },
      {
        text: '어디선가 작게 속삭이는 소리가 들린다. "……열, 하나, 셋……" 숫자를 세는 것 같다. 세는 순서가 이상하다. 목소리는 점점 가까워진다.',
      },
    ],
    objects: [
      {
        id: 'he01-o1',
        label: '국어 선생님의 서랍장',
        kind: 'minigame',
        minigameKind: 'oddeven',
        minigameRule: '서랍이 여러 칸이다....... 승부는 그것과의 홀짝으로 정한다. 참여한 만큼 함께 걸고, 함께 받는다.',
        hpDamage: 10,
        minigameWinCoins: 3,
      },
      { id: 'he01-o2', label: '담임 선생님 책상', kind: 'puzzle', puzzleId: 'hp01' },
      {
        id: 'he01-o3',
        label: '상벌점 기록부',
        kind: 'hazard',
        hazardText: '기록부를 넘기자 종이 끝에 손가락을 베인다....... 별것 아닌 상처인데 이상하게 힘이 쭉 빠진다.',
        staminaDamage: 12,
      },
      {
        id: 'he01-o4',
        label: '낡은 커피포트',
        kind: 'minigame',
        minigameKind: 'poker',
        minigameRule: '커피포트 스위치를 누를지 말지....... 승부는 그것과의 카드 대결로 정한다. 참여한 만큼 함께 걸고, 함께 받는다.',
        staminaDamage: 10,
        minigameWinCoins: 3,
      },
      { id: 'he01-o5', label: '교무실 게시판', kind: 'puzzle', puzzleId: 'hp02' },
      {
        id: 'he01-o6',
        label: '잠긴 캐비닛',
        kind: 'hazard',
        hazardText: '캐비닛 문이 갑자기 세게 닫히며 손끝을 찧는다....... 눈앞이 잠깐 하얘질 만큼 아프다.',
        hpDamage: 12,
      },
      { id: 'he01-o7', label: '시청각실 열쇠함', kind: 'item', itemCoins: 2 },
      { id: 'he01-o8', label: '교사용 개인 사물함', kind: 'item', itemShopId: 'sh-food-2' },
      { id: 'he01-o9', label: '출석부가 놓인 교탁 서랍', kind: 'puzzle', puzzleId: 'hp03' },
      { id: 'he01-o10', label: '탁상 달력', kind: 'item', itemCoins: 2 },
    ],
    finalClue:
      '게시판에 올라온 목록 글이다....... 1 번부터 15 번까지 나열되어 있는데, 11 번 항목이 유독 눈에 띈다: "괴담연구회의 열한 번째 부원은 없습니다."',
    finalClueKind: 'napolitan',
  },
  {
    id: 'he02',
    roomName: '체육실',
    creatureName: '그물 사이의 손',
    creatureIntro:
      '체육관 창고, 개켜 놓은 매트 더미 사이로 배구 네트가 팽팽하게 당겨져 있다....... 아무도 만지지 않았는데.',
    logs: [
      {
        text: '창고 문을 열자 퀴퀴한 땀 냄새와 함께 서늘한 바람이 훅 끼친다....... 스위치를 켜도 조명 절반은 들어오지 않는다. 어둠이 진 구석마다 무언가 웅크리고 있을 것만 같다.',
      },
      {
        text: '구석에 쌓인 매트 더미가 다시 한번 크게 부풀어 오른다....... 숨 쉬듯 부풀었다 가라앉는다. 그 틈에서 옅은 신음소리가 새어 나오는 것 같다.',
        choices: CHOICES(
          '매트 더미에서 등을 돌려 문 쪽으로 달아난다....... 등 뒤에서 무언가 무너지는 소리가 크게 울린다.',
          '매트 더미에 손을 얹고 지그시 눌러 본다....... 안쪽에서 손 하나가 마주 눌러 오는 감촉이 느껴진다.',
          '트로피 진열장 뒤로 몸을 숨긴다....... 매트 더미가 부스스 가라앉더니, 이내 아무 일 없었다는 듯 조용해진다.',
        ),
      },
      {
        text: '벽에 걸린 트로피들이 유리 진열장 안에서 서로 부딪히며 잘그락 소리를 낸다....... 바람 한 점 없는데도, 소리는 점점 커진다.',
      },
      {
        text: '네트 한가운데, 흰 손가락 같은 것이 비집고 나와 있다가 스르륵 사라진다. 그물코가 팽팽하게 당겨졌다 풀리기를 반복한다.',
      },
    ],
    objects: [
      {
        id: 'he02-o1',
        label: '배구공이 담긴 바구니',
        kind: 'minigame',
        minigameKind: 'robo77',
        minigameRule: '바구니 속 공 하나를 골라 꺼내 본다....... 승부는 그것과의 로보 77 승부로 정한다. 참여한 만큼 함께 걸고, 함께 받는다.',
        staminaDamage: 10,
        minigameWinCoins: 3,
      },
      {
        id: 'he02-o2',
        label: '쌓아 올린 매트 더미',
        kind: 'minigame',
        minigameKind: 'oddeven',
        minigameRule: '매트 더미 중 하나를 골라 잡아당겨 본다....... 승부는 그것과의 홀짝으로 정한다. 참여한 만큼 함께 걸고, 함께 받는다.',
        hpDamage: 12,
        minigameWinCoins: 3,
      },
      { id: 'he02-o3', label: '줄넘기 보관 상자', kind: 'puzzle', puzzleId: 'hp04' },
      { id: 'he02-o4', label: '트로피 진열장', kind: 'item', itemShopId: 'sh-food-3' },
      {
        id: 'he02-o5',
        label: '심판 호루라기함',
        kind: 'hazard',
        hazardText: '호루라기 하나를 집어 드는 순간, 귀청을 찢을 듯한 고음이 머릿속에서 울린다....... 정신이 아득해진다.',
        staminaDamage: 15,
      },
      { id: 'he02-o6', label: '구급함', kind: 'puzzle', puzzleId: 'hp05' },
      {
        id: 'he02-o7',
        label: '녹슨 역기 세트',
        kind: 'hazard',
        hazardText: '역기 하나가 손에서 미끄러져 발등 위로 떨어진다....... 눈물이 핑 돌 만큼 아프다.',
        hpDamage: 14,
      },
      { id: 'he02-o8', label: '낡은 라디오', kind: 'item', itemCoins: 2 },
      { id: 'he02-o9', label: '체육복 수거함', kind: 'puzzle', puzzleId: 'hp06' },
      { id: 'he02-o10', label: '창고 안쪽 철제 캐비닛', kind: 'item', itemShopId: 'sh-food-1' },
    ],
    finalClue:
      '얼굴이 지워진 학생증을 발견했다....... 2016 년 3 월 입학, 이름은 유민서.',
    finalClueKind: 'idcard',
  },
  {
    id: 'he03',
    roomName: '미술실',
    creatureName: '자세를 바꾼 석고상',
    creatureIntro:
      '미술실 구석, 늘 같은 자리에 서 있던 석고상들의 자세가 조금씩 달라져 있다....... 마치 방금까지 걷고 있었던 것처럼.',
    logs: [
      {
        text: '문을 열자 물감 냄새가 유난히 진하게 코를 찌른다....... 이젤 위에는 아무도 그리지 않은 그림 한 점이 놓여 있다. 캔버스 가장자리에 물감이 아직도 흘러내리고 있다.',
      },
      {
        text: '석고상 하나가 아주 조금, 눈에 띄지 않을 정도로 고개를 돌린다....... 분명히 방금 전과 다른 각도다.',
        choices: CHOICES(
          '황급히 문 쪽으로 물러난다....... 뒤돌아보니 석고상 전부가 원래 자세로 돌아와 있다. 마치 아무 일도 없었던 것처럼.',
          '석고상 앞으로 다가가 얼굴을 들여다본다....... 텅 빈 눈구멍 속에 무언가 희미하게 비친다. 내 얼굴이 아니다.',
          '이젤 뒤에 몸을 웅크린다....... 석고상들이 하나둘 천천히, 이쪽을 향해 고개를 돌리는 소리가 들린다.',
        ),
      },
      {
        text: '석고상들이 조금씩 다른 방향을 보고 있다....... 전부 문 쪽을, 정확히는 방금 들어온 사람 쪽을 향해 있다.',
      },
      {
        text: '캔버스 위 그림 속 인물의 얼굴이 텅 비어 있다....... 자세히 보니 물감이 채 마르지 않았다. 붓 자국이 아직도 조금씩 움직이고 있다.',
      },
      {
        text: '붓 하나가 저절로 굴러 바닥에 떨어진다....... 누군가 방금 내려놓은 것처럼, 붓끝에 젖은 물감이 뚝뚝 떨어진다.',
      },
    ],
    objects: [
      {
        id: 'he03-o1',
        label: '석고상 진열대',
        kind: 'minigame',
        minigameKind: 'poker',
        minigameRule: '석고상 중 하나를 골라 옮겨 본다....... 승부는 그것과의 카드 대결로 정한다. 참여한 만큼 함께 걸고, 함께 받는다.',
        hpDamage: 13,
        minigameWinCoins: 3,
      },
      { id: 'he03-o2', label: '빈 이젤', kind: 'puzzle', puzzleId: 'hp07' },
      {
        id: 'he03-o3',
        label: '물감 캐비닛',
        kind: 'minigame',
        minigameKind: 'robo77',
        minigameRule: '캐비닛 서랍 중 하나를 골라 열어 본다....... 승부는 그것과의 로보 77 승부로 정한다. 참여한 만큼 함께 걸고, 함께 받는다.',
        staminaDamage: 10,
        minigameWinCoins: 3,
      },
      {
        id: 'he03-o4',
        label: '조소용 점토함',
        kind: 'hazard',
        hazardText: '점토를 만지자 표면 안쪽에서 차갑고 축축한 것이 손가락을 움켜쥔다....... 소름이 온몸에 돋는다.',
        staminaDamage: 14,
      },
      { id: 'he03-o5', label: '액자 보관함', kind: 'puzzle', puzzleId: 'hp08' },
      { id: 'he03-o6', label: '스케치북 더미', kind: 'item', itemShopId: 'sh-food-2' },
      {
        id: 'he03-o7',
        label: '크로키용 관절 인형',
        kind: 'hazard',
        hazardText: '인형의 팔 관절이 저절로 꺾이며 손가락 끝을 스친다....... 베인 곳이 아니라 정신이 아뜩해진다.',
        staminaDamage: 12,
      },
      { id: 'he03-o8', label: '벽에 걸린 유화 작품', kind: 'item', itemCoins: 2 },
      { id: 'he03-o9', label: '붓 세척통', kind: 'puzzle', puzzleId: 'hp09' },
      { id: 'he03-o10', label: '구석 벽장', kind: 'item', itemShopId: 'sh-food-3' },
    ],
    finalClue:
      '괴이에 관한 낡은 책 한 페이지....... 괴이를 완전히 끊어내려면 저주가 시작된 뒤로 정확히 10 년을 기다려야 한다고 적혀 있다.',
    finalClueKind: 'book-wait',
  },
  {
    id: 'he04',
    roomName: '음악실',
    creatureName: '저절로 눌리는 건반',
    creatureIntro:
      '음악실 그랜드피아노 건반이 아무도 손대지 않았는데 하나씩 눌린다....... 같은 소절이 계속 반복된다.',
    logs: [
      {
        text: '문을 열자 피아노 소리가 뚝 끊긴다....... 방금까지 분명 무언가 연주하고 있었다. 건반 뚜껑이 미세하게 떨리고 있다.',
      },
      {
        text: '보면대 위 악보에서 낮은 허밍 소리가 새어 나오기 시작한다....... 누군가 그 노래를 따라 부르고 있는 것 같다.',
        choices: CHOICES(
          '귀를 막고 문 쪽으로 뛰쳐나간다....... 등 뒤에서 피아노 건반이 격렬하게 두드려지는 소리가 울린다.',
          '악보에 얼굴을 가까이 대고 허밍을 따라 흥얼거려 본다....... 순간 온몸의 털이 곤두선다. 목소리가 두 겹으로 겹쳐 들린다.',
          '피아노 밑으로 몸을 숨긴다....... 허밍이 점점 가까워지더니, 바로 옆에서 멎는다.',
        ),
      },
      {
        text: '보면대 위에 낯선 악보 한 장이 놓여 있다....... 음표 대신 이상한 기호들이 빼곡하다. 종이 끝이 축축하게 젖어 있다.',
      },
      {
        text: '타악기 창고 쪽에서 낮은 북소리가 규칙적으로 울린다....... 심장 박동과 비슷한 간격이다. 점점 빨라진다.',
      },
      {
        text: '메트로놈이 저절로 움직이기 시작한다....... 속도가 점점 빨라진다. 째깍거리는 소리가 방 전체를 채운다.',
      },
    ],
    objects: [
      {
        id: 'he04-o1',
        label: '그랜드피아노 건반 뚜껑',
        kind: 'minigame',
        minigameKind: 'oddeven',
        minigameRule: '건반을 하나 골라 눌러 본다....... 승부는 그것과의 홀짝으로 정한다. 참여한 만큼 함께 걸고, 함께 받는다.',
        staminaDamage: 10,
        minigameWinCoins: 3,
      },
      {
        id: 'he04-o2',
        label: '악보 보관함',
        kind: 'minigame',
        minigameKind: 'poker',
        minigameRule: '악보 뭉치 중 하나를 골라 꺼내 본다....... 승부는 그것과의 카드 대결로 정한다. 참여한 만큼 함께 걸고, 함께 받는다.',
        hpDamage: 12,
        minigameWinCoins: 3,
      },
      { id: 'he04-o3', label: '멈추지 않는 메트로놈', kind: 'puzzle', puzzleId: 'hp10' },
      {
        id: 'he04-o4',
        label: '타악기 창고',
        kind: 'hazard',
        hazardText: '북채 하나가 저절로 날아와 이마를 스친다....... 순간 귀가 먹먹해진다.',
        staminaDamage: 13,
      },
      { id: 'he04-o5', label: '지휘봉 보관함', kind: 'item', itemShopId: 'sh-food-1' },
      { id: 'he04-o6', label: '합창단 명부', kind: 'puzzle', puzzleId: 'hp11' },
      {
        id: 'he04-o7',
        label: '방음 녹음 부스',
        kind: 'hazard',
        hazardText: '부스 문을 닫자마자 안쪽 공기가 무겁게 짓눌러 온다....... 숨이 잘 쉬어지지 않는다.',
        staminaDamage: 15,
      },
      { id: 'he04-o8', label: '기타 거치대', kind: 'item', itemCoins: 2 },
      { id: 'he04-o9', label: '오래된 오르간', kind: 'puzzle', puzzleId: 'hp12' },
      { id: 'he04-o10', label: '방음 커튼 뒤 공간', kind: 'item', itemShopId: 'sh-food-2' },
    ],
    finalClue:
      '누렇게 바랜 신문 조각을 찾았다....... 흉가로 소문난 폐건물을 탐방하러 향하던 유 모 양이 뺑소니 사고를 당했다는 기사다.',
    finalClueKind: 'newspaper',
  },
  {
    id: 'he05',
    roomName: '운동장',
    creatureName: '조회대 위의 그림자',
    creatureIntro:
      '텅 빈 운동장, 조회대 위에 사람 형체의 그림자가 홀로 길게 드리워 있다....... 그 위에는 아무도 서 있지 않은데.',
    logs: [
      {
        text: '운동장에 나서자 안개가 발목까지 차오른다....... 트랙 표시선이 평소보다 하나 더 그려져 있는 것 같다. 안개 속에서 발소리가 희미하게 섞여 든다.',
      },
      {
        text: '조회대 위 그림자가 천천히 이쪽을 향해 고개를 돌린다....... 얼굴이 있어야 할 자리가 새까맣게 비어 있다.',
        choices: CHOICES(
          '곧장 몸을 돌려 정문 쪽으로 뛴다....... 안개 속에서 발소리가 하나 더 따라붙는 것 같다.',
          '조회대 계단을 조심스레 오른다....... 그림자가 한 걸음, 딱 한 걸음만큼 뒤로 물러난다.',
          '스탠드 벤치 아래로 몸을 낮춘다....... 그림자가 조회대에서 천천히 내려와 운동장을 가로질러 걷기 시작한다.',
        ),
      },
      {
        text: '골대 그물이 바람 없이 흔들린다....... 그 안에 무언가 걸려 있는 듯하다. 그물코 사이로 희끄무레한 것이 언뜻 비친다.',
      },
      {
        text: '국기게양줄이 저절로 팽팽해지며 삐걱거리는 소리를 낸다. 줄 끝에서 무언가 매달린 것처럼 무거워 보인다.',
      },
    ],
    objects: [
      {
        id: 'he05-o1',
        label: '스탠드 벤치',
        kind: 'minigame',
        minigameKind: 'robo77',
        minigameRule: '벤치 자리 하나를 골라 앉아 본다....... 승부는 그것과의 로보 77 승부로 정한다. 참여한 만큼 함께 걸고, 함께 받는다.',
        hpDamage: 10,
        minigameWinCoins: 3,
      },
      { id: 'he05-o2', label: '텅 빈 골대의 그물', kind: 'puzzle', puzzleId: 'hp13' },
      {
        id: 'he05-o3',
        label: '조회대 마이크',
        kind: 'minigame',
        minigameKind: 'oddeven',
        minigameRule: '마이크 스위치를 눌러 본다....... 승부는 그것과의 홀짝으로 정한다. 참여한 만큼 함께 걸고, 함께 받는다.',
        staminaDamage: 10,
        minigameWinCoins: 3,
      },
      {
        id: 'he05-o4',
        label: '국기게양대 줄',
        kind: 'hazard',
        hazardText: '줄을 당기는 순간 손바닥이 세게 쏠린다....... 화끈거리는 통증에 힘이 빠진다.',
        staminaDamage: 12,
      },
      { id: 'he05-o5', label: '모래사장 한가운데', kind: 'puzzle', puzzleId: 'hp14' },
      { id: 'he05-o6', label: '야외 수돗가', kind: 'item', itemShopId: 'sh-food-3' },
      {
        id: 'he05-o7',
        label: '스코어보드 조작반',
        kind: 'hazard',
        hazardText: '버튼을 누르자 감전된 것처럼 짜릿한 통증이 손을 타고 올라온다.',
        hpDamage: 12,
      },
      { id: 'he05-o8', label: '화단 구석', kind: 'item', itemCoins: 2 },
      { id: 'he05-o9', label: '트랙 위 낯선 표시선', kind: 'puzzle', puzzleId: 'hp15' },
      { id: 'he05-o10', label: '운동장 창고 컨테이너', kind: 'item', itemShopId: 'sh-food-1' },
    ],
    finalClue:
      '2018 년 7 월, 동아리 단체 사진을 찾았다....... 열한 명이 함께 찍혀 있고, 아래에는 이름과 함께 "영원하자!"라는 문구가 적혀 있다.',
    finalClueKind: 'photo-2018-07',
  },
  {
    id: 'he06',
    roomName: '경비실',
    creatureName: '화면 속 열한 번째',
    creatureIntro:
      'CCTV 모니터 화면 속, 아무도 없어야 할 복도에 사람 그림자 하나가 가만히 서 있다....... 화면을 넘겨도 계속 따라온다.',
    logs: [
      {
        text: '경비실 문을 열자 모니터 여러 대가 지지직거리며 화면이 깜빡인다. 한 화면만 유독 어둡다.',
      },
      {
        text: '출입 기록부 속 낯선 이름 옆, 잉크가 아직 마르지 않은 듯 번져 있다....... 방금 누군가 적어 넣은 것처럼.',
        choices: CHOICES(
          '기록부를 덮고 경비실 밖으로 물러난다....... 뒤에서 모니터 하나가 지지직거리며 다시 켜지는 소리가 들린다.',
          '펜을 들어 그 이름 옆에 손을 대 본다....... 잉크가 손끝에 옮아 붙으며 차갑게 식어 간다.',
          '책상 밑에 몸을 웅크린다....... 모니터 화면 속 그림자가 카메라 정면으로 돌아서더니, 이쪽을 똑바로 본다.',
        ),
      },
      {
        text: '출입 기록부를 펼치자 오늘 날짜 칸에 낯선 필체로 이름 하나가 적혀 있다....... 아무도 못 보던 이름이다.',
      },
      {
        text: '무전기에서 잡음 섞인 숫자가 반복해서 흘러나온다....... "열, 하나, 열, 하나……." 목소리가 점점 낮아진다.',
      },
      {
        text: '모니터 한 대가 꺼졌다 켜지며, 화면 속 그림자가 카메라 쪽으로 한 걸음 다가와 있다.',
      },
    ],
    objects: [
      { id: 'he06-o1', label: 'CCTV 모니터', kind: 'puzzle', puzzleId: 'hp16' },
      {
        id: 'he06-o2',
        label: '출입 기록부',
        kind: 'minigame',
        minigameKind: 'poker',
        minigameRule: '기록부 페이지 하나를 골라 넘겨 본다....... 승부는 그것과의 카드 대결로 정한다. 참여한 만큼 함께 걸고, 함께 받는다.',
        hpDamage: 10,
        minigameWinCoins: 3,
      },
      {
        id: 'he06-o3',
        label: '열쇠 보관함',
        kind: 'minigame',
        minigameKind: 'robo77',
        minigameRule: '열쇠 하나를 골라 꺼내 본다....... 승부는 그것과의 로보 77 승부로 정한다. 참여한 만큼 함께 걸고, 함께 받는다.',
        staminaDamage: 10,
        minigameWinCoins: 3,
      },
      {
        id: 'he06-o4',
        label: '무전기',
        kind: 'hazard',
        hazardText: '무전기를 켜자 귀를 찌르는 잡음이 터져 나온다....... 머리가 울리고 다리에 힘이 풀린다.',
        staminaDamage: 14,
      },
      { id: 'he06-o5', label: '순찰 일지', kind: 'puzzle', puzzleId: 'hp17' },
      { id: 'he06-o6', label: '낡은 라디오', kind: 'item', itemShopId: 'sh-food-2' },
      {
        id: 'he06-o7',
        label: '비상벨 패널',
        kind: 'hazard',
        hazardText: '패널을 만지는 순간 벨이 미친 듯이 울려 고막이 찢어질 듯 아프다.',
        staminaDamage: 15,
      },
      { id: 'he06-o8', label: '손전등 보관함', kind: 'item', itemCoins: 2 },
      { id: 'he06-o9', label: '캐비닛 서류철', kind: 'puzzle', puzzleId: 'hp18' },
      { id: 'he06-o10', label: '낡은 의자 밑', kind: 'item', itemShopId: 'sh-food-3' },
    ],
    finalClue:
      '학생들이 주고받은 쪽지를 발견했다....... 학교에 귀신이 있다는 소문, 매년 죽은 학생이 나타난다는 이야기가 적혀 있다.',
    finalClueKind: 'chat-note',
  },
  {
    id: 'he07',
    roomName: '식당',
    creatureName: '빈 자리의 식판',
    creatureIntro:
      '텅 빈 식당, 치워지지 않은 식판 하나가 긴 테이블 맨 끝자리에 놓여 있다....... 아무도 앉지 않은 그 자리에.',
    logs: [
      {
        text: '식당 안은 조용하다....... 배식대 위 조명만 홀로 켜져 있다. 나머지 조명은 전부 꺼져 있는데도 어딘가 밝다.',
      },
      {
        text: '식판 옆 젓가락이 허공에서 무언가를 집으려는 듯 까딱거린다....... 그 손짓이 점점 또렷해진다.',
        choices: CHOICES(
          '식판에서 물러나 조리실 쪽으로 걸음을 옮긴다....... 등 뒤에서 의자 끄는 소리가 스륵 울린다.',
          '식판 앞에 다가서서 젓가락을 살며시 건드려 본다....... 손끝이 닿는 순간 젓가락이 세게 움찔한다.',
          '배식대 뒤로 몸을 숨긴다....... 빈 의자가 스르르 당겨지며, 누군가 자리에 앉는 소리가 들린다.',
        ),
      },
      {
        text: '테이블 맨 끝, 식판 하나가 김이 나는 채로 놓여 있다....... 방금 누군가 받아 온 것처럼, 국그릇 표면이 잔잔히 흔들린다.',
      },
      {
        text: '냉장고 문이 저절로 살짝 열렸다 닫힌다....... 안에서 서늘한 바람이 새어 나온다.',
      },
      {
        text: '식판 옆 젓가락이 저절로 미세하게 움직인다....... 마치 누군가 아직 식사 중인 것처럼, 그릇 부딪히는 소리가 들린다.',
      },
    ],
    objects: [
      {
        id: 'he07-o1',
        label: '배식대 앞 트레이',
        kind: 'minigame',
        minigameKind: 'oddeven',
        minigameRule: '트레이 하나를 골라 들어 본다....... 승부는 그것과의 홀짝으로 정한다. 참여한 만큼 함께 걸고, 함께 받는다.',
        hpDamage: 10,
        minigameWinCoins: 3,
      },
      {
        id: 'he07-o2',
        label: '대형 냉장고',
        kind: 'minigame',
        minigameKind: 'poker',
        minigameRule: '냉장고 칸 하나를 골라 열어 본다....... 승부는 그것과의 카드 대결로 정한다. 참여한 만큼 함께 걸고, 함께 받는다.',
        staminaDamage: 12,
        minigameWinCoins: 3,
      },
      { id: 'he07-o3', label: '식판 수거대', kind: 'puzzle', puzzleId: 'hp19' },
      { id: 'he07-o4', label: '잠긴 조리실 문', kind: 'item', itemCoins: 2 },
      {
        id: 'he07-o5',
        label: '벽에 걸린 메뉴판',
        kind: 'hazard',
        hazardText: '메뉴판을 떼어 내려다 못이 손바닥을 스치며 깊게 긁힌다.',
        hpDamage: 11,
      },
      { id: 'he07-o6', label: '정수기', kind: 'puzzle', puzzleId: 'hp20' },
      {
        id: 'he07-o7',
        label: '식자재 창고',
        kind: 'hazard',
        hazardText: '창고 안쪽 선반이 무너지며 상자가 어깨 위로 떨어진다....... 묵직한 통증이 퍼진다.',
        hpDamage: 13,
      },
      { id: 'he07-o8', label: '테이블 밑 서랍', kind: 'item', itemCoins: 2 },
      { id: 'he07-o9', label: '위생 점검표', kind: 'puzzle', puzzleId: 'hp21' },
      { id: 'he07-o10', label: '잔반통 옆 선반', kind: 'item', itemShopId: 'sh-food-2' },
    ],
    finalClue:
      '2026 년에 가입한 부원의 자기소개 글을 찾았다....... 11 번째 부원이 되어 설렌다는 인사말이 담겨 있다.',
    finalClueKind: 'intro-2026',
  },
  {
    id: 'he08',
    roomName: '창고',
    creatureName: '뒤집힌 거울 조각',
    creatureIntro:
      '오래된 물건들이 쌓인 창고 안쪽, 깨진 거울 조각들이 벽에 기대어 있다....... 조각마다 비치는 것이 조금씩 다르다.',
    logs: [
      {
        text: '창고 문을 열자 먼지 냄새가 훅 끼친다....... 손전등 불빛이 닿는 곳마다 그림자가 길게 늘어진다.',
      },
      {
        text: '낯익은 낙서 옆으로 못 보던 글씨가 하나 더 겹쳐 적혀 있다....... 필체가 소름 끼치게 낯익다.',
        choices: CHOICES(
          '책상에서 눈을 떼고 창고 입구 쪽으로 물러난다....... 등 뒤에서 거울 조각들이 잘그락 부딪히는 소리가 난다.',
          '글씨에 손끝을 가져다 대 본다....... 종이가 아니라 마치 살갗처럼 미지근하다.',
          '박스 더미 뒤로 몸을 숨긴다....... 거울 조각 하나가 천천히 이쪽을 비추는 방향으로 돌아간다.',
        ),
      },
      {
        text: '낡은 책상들이 아무렇게나 쌓여 있다....... 그중 하나에는 낯익은 낙서가 남아 있다.',
      },
      {
        text: '깨진 거울 조각 하나가 저절로 조금씩 움직여 방향을 바꾼다.',
      },
      {
        text: '박스 더미 안쪽에서 부스럭거리는 소리가 난다....... 쥐치고는 소리가 너무 크다. 무언가 천천히 몸을 일으키는 소리 같다.',
      },
    ],
    objects: [
      {
        id: 'he08-o1',
        label: '낡은 책상 더미',
        kind: 'minigame',
        minigameKind: 'robo77',
        minigameRule: '책상 하나를 골라 옮겨 본다....... 승부는 그것과의 로보 77 승부로 정한다. 참여한 만큼 함께 걸고, 함께 받는다.',
        hpDamage: 12,
        minigameWinCoins: 3,
      },
      {
        id: 'he08-o2',
        label: '청소도구함',
        kind: 'minigame',
        minigameKind: 'oddeven',
        minigameRule: '도구함 안 물건 하나를 골라 꺼내 본다....... 승부는 그것과의 홀짝으로 정한다. 참여한 만큼 함께 걸고, 함께 받는다.',
        staminaDamage: 10,
        minigameWinCoins: 3,
      },
      { id: 'he08-o3', label: '뜯긴 페인트통', kind: 'puzzle', puzzleId: 'hp22' },
      {
        id: 'he08-o4',
        label: '녹슨 사다리',
        kind: 'hazard',
        hazardText: '사다리에 발을 딛는 순간 한 칸이 부러지며 크게 휘청인다....... 온몸에 힘이 쭉 빠진다.',
        staminaDamage: 14,
      },
      { id: 'he08-o5', label: '쌓인 박스 더미', kind: 'item', itemShopId: 'sh-food-3' },
      { id: 'he08-o6', label: '깨진 거울 조각들', kind: 'puzzle', puzzleId: 'hp23' },
      {
        id: 'he08-o7',
        label: '예비 의자 무더기',
        kind: 'hazard',
        hazardText: '의자 더미가 갑자기 무너지며 그 밑에 깔릴 뻔한다....... 정신없이 빠져나오느라 기운이 다 빠졌다.',
        staminaDamage: 13,
      },
      { id: 'he08-o8', label: '둘둘 말린 현수막', kind: 'item', itemCoins: 2 },
      { id: 'he08-o9', label: '공구함', kind: 'puzzle', puzzleId: 'hp24' },
      { id: 'he08-o10', label: '안쪽 철제 캐비닛', kind: 'item', itemShopId: 'sh-food-1' },
    ],
    finalClue:
      '같은 책의 다른 페이지를 찾았다....... 이곳에서 벗어나려면 괴이를 낱낱이 조사해 완전히 타파해야 한다고 적혀 있다.',
    finalClueKind: 'book-escape',
  },
  {
    id: 'he09',
    roomName: '과학실',
    creatureName: '표본병 속 시선',
    creatureIntro:
      '과학실 진열장, 표본병 속 무언가가 이쪽을 빤히 보고 있다....... 눈을 뗄 때마다 병 안의 위치가 조금씩 바뀌어 있다.',
    logs: [
      {
        text: '과학실 문을 열자 포르말린 냄새가 코를 찌른다....... 형광등이 지지직거리며 불안정하게 깜빡인다.',
      },
      {
        text: '표본병 하나가 유독 크게 흔들리다 멈춘다....... 안쪽 무언가가 유리에 바짝 붙어 이쪽을 보고 있다.',
        choices: CHOICES(
          '진열장에서 물러나 문 쪽으로 향한다....... 뒤에서 병뚜껑 하나가 딸깍, 스스로 열리는 소리가 난다.',
          '병 가까이 얼굴을 대고 들여다본다....... 안의 눈동자가 이쪽 움직임을 그대로 따라 움직인다.',
          '실험대 밑에 몸을 숨긴다....... 표본병들이 하나둘, 진열장 유리에 부딪히며 흔들리기 시작한다.',
        ),
      },
      {
        text: '표본병들이 진열장 안에서 아주 조금씩 흔들린다....... 지진이라기엔 흔들림이 너무 규칙적이다.',
      },
      {
        text: '실험 노트 한 권이 저절로 펼쳐진다....... 마지막 페이지에 끝맺지 못한 문장이 남아 있다.',
      },
      {
        text: '분젠버너에 불이 저절로 붙었다 꺼진다....... 아무도 가스 밸브를 돌리지 않았는데, 파란 불꽃이 잠깐씩 사람 모양으로 흔들린다.',
      },
    ],
    objects: [
      {
        id: 'he09-o1',
        label: '표본병 진열장',
        kind: 'minigame',
        minigameKind: 'poker',
        minigameRule: '표본병 하나를 골라 꺼내 본다....... 승부는 그것과의 카드 대결로 정한다. 참여한 만큼 함께 걸고, 함께 받는다.',
        staminaDamage: 10,
        minigameWinCoins: 3,
      },
      {
        id: 'he09-o2',
        label: '펼쳐진 실험 노트',
        kind: 'minigame',
        minigameKind: 'robo77',
        minigameRule: '노트 페이지 하나를 골라 넘겨 본다....... 승부는 그것과의 로보 77 승부로 정한다. 참여한 만큼 함께 걸고, 함께 받는다.',
        hpDamage: 11,
        minigameWinCoins: 3,
      },
      { id: 'he09-o3', label: '현미경대', kind: 'puzzle', puzzleId: 'hp25' },
      {
        id: 'he09-o4',
        label: '시약장',
        kind: 'hazard',
        hazardText: '시약병 마개를 여는 순간 코를 찌르는 냄새에 순간적으로 어지럼증이 밀려온다.',
        staminaDamage: 13,
      },
      { id: 'he09-o5', label: '분젠버너', kind: 'item', itemShopId: 'sh-food-2' },
      { id: 'he09-o6', label: '원소 주기율표', kind: 'puzzle', puzzleId: 'hp26' },
      {
        id: 'he09-o7',
        label: '해부 실습대',
        kind: 'hazard',
        hazardText: '실습대 위 도구가 손등을 스치며 얕게 베인다....... 별것 아닌데 오싹한 한기가 든다.',
        hpDamage: 10,
      },
      { id: 'he09-o8', label: '실험실 냉동고', kind: 'item', itemCoins: 2 },
      { id: 'he09-o9', label: '안전 캐비닛', kind: 'puzzle', puzzleId: 'hp27' },
      { id: 'he09-o10', label: '구석 실험 도구함', kind: 'item', itemShopId: 'sh-food-3' },
    ],
    finalClue:
      '2018 년 8 월, 같은 동아리 단체 사진을 찾았다....... 그런데 이번엔 열 명뿐이다. 한 사람의 실루엣이 통째로 비어 있다.',
    finalClueKind: 'photo-2018-08',
  },
  {
    id: 'he10',
    roomName: '무용실',
    creatureName: '거울 속의 여분',
    creatureIntro:
      '무용실 전면 거울에 비친 인원이 실제보다 한 명 더 많다....... 다들 그 사실을 애써 못 본 척한다.',
    logs: [
      {
        text: '무용실 문을 열자 거울벽에 비친 자기 모습이 한 박자 늦게 따라 움직인다.',
      },
      {
        text: '거울 속 여분의 그림자가 이쪽을 향해 천천히 손을 들어 올린다....... 인사를 하듯이.',
        choices: CHOICES(
          '거울에서 등을 돌려 문 쪽으로 뛴다....... 거울 속 그림자도 똑같이 등을 돌리는 모습이 유리 끝에 스친다.',
          '거울 앞으로 다가서서 손을 마주 들어 본다....... 거울 속 그림자의 손끝이 유리 표면에 닿을 듯 가까워진다.',
          '커튼 뒤로 몸을 숨긴다....... 거울 속 그림자가 거울 밖으로, 한 발 나서려는 듯 형체가 흐려진다.',
        ),
      },
      {
        text: '발레바 앞, 낡은 카세트 플레이어에서 아무도 튼 적 없는 음악이 흘러나온다.',
      },
      {
        text: '거울 속에 비친 인원을 세어 보니 실제보다 하나가 많다....... 거울 속 그 형체가 이쪽을 보고 살짝 웃는다.',
      },
      {
        text: '음향 스피커에서 지지직거리는 잡음 사이로 낮은 박자 소리가 섞여 든다....... 발소리 같기도 하다. 점점 박자가 맞아 들어간다.',
      },
    ],
    objects: [
      { id: 'he10-o1', label: '전면 거울벽', kind: 'puzzle', puzzleId: 'hp28' },
      {
        id: 'he10-o2',
        label: '발레바',
        kind: 'minigame',
        minigameKind: 'oddeven',
        minigameRule: '바를 붙잡을 위치를 하나 골라 본다....... 승부는 그것과의 홀짝으로 정한다. 참여한 만큼 함께 걸고, 함께 받는다.',
        hpDamage: 13,
        minigameWinCoins: 3,
      },
      {
        id: 'he10-o3',
        label: '음향 스피커',
        kind: 'minigame',
        minigameKind: 'poker',
        minigameRule: '스피커 버튼 하나를 골라 눌러 본다....... 승부는 그것과의 카드 대결로 정한다. 참여한 만큼 함께 걸고, 함께 받는다.',
        staminaDamage: 10,
        minigameWinCoins: 3,
      },
      {
        id: 'he10-o4',
        label: '의상 보관함',
        kind: 'hazard',
        hazardText: '보관함 안쪽에서 차가운 손이 손목을 스치듯 잡는다....... 소름과 함께 다리 힘이 풀린다.',
        staminaDamage: 14,
      },
      { id: 'he10-o5', label: '스트레칭 매트', kind: 'puzzle', puzzleId: 'hp29' },
      { id: 'he10-o6', label: '발레슈즈 진열대', kind: 'item', itemShopId: 'sh-food-1' },
      {
        id: 'he10-o7',
        label: '소품 보관함',
        kind: 'hazard',
        hazardText: '소품함을 열자 안에 있던 무거운 소품이 발등 위로 쏟아진다.',
        hpDamage: 12,
      },
      { id: 'he10-o8', label: '방음 부스', kind: 'item', itemCoins: 2 },
      { id: 'he10-o9', label: '낡은 카세트 플레이어', kind: 'puzzle', puzzleId: 'hp30' },
      { id: 'he10-o10', label: '커튼 뒤 공간', kind: 'item', itemShopId: 'sh-food-2' },
    ],
    finalClue: '벽에 급하게 휘갈겨 쓴 메모를 발견했다....... "이곳에서 탈출하고 괴이를 끊어라!"',
    finalClueKind: 'escape-note',
  },
]

export function hallEventById(id: string): HallEvent | undefined {
  return HALL_EVENTS.find((e) => e.id === id)
}
