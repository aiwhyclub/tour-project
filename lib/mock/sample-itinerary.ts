import type { ItineraryDraft } from '@/lib/validation/itinerary-schema';
import type { PlanRequest } from '@/lib/validation/plan-request';
import { tripDays } from '@/lib/validation/plan-request';
import { normalizePlan } from '@/lib/gemini/normalize';
import { AVOID_OPTIONS, TRAVEL_STYLES, labelOf } from '@/lib/constants/options';
import type { ItineraryPlan } from '@/types/itinerary';

/**
 * 목업 일정.
 *
 * 중요한 설계 결정: 목업도 실제 경로와 똑같이 normalizePlan 을 통과한다.
 * 덕분에 EPIC 2 에서 보는 화면과 EPIC 3 에서 보는 화면의 데이터 형태가
 * 구조적으로 동일하며, 합계 재계산·면책 주입 로직도 키 없이 검증된다.
 */

/** 초안은 평탄한 금액만 담는다. 추정 객체 조립은 normalizePlan 의 몫이다. */
const cost = (amount: number | null, basis: string) => ({ amount, basis });

const DAY_TEMPLATES = [
  {
    theme: '바다를 따라 천천히',
    summary: '도착 후 무리하지 않고 해안선을 따라 이동하며 첫날의 리듬을 잡습니다.',
    pace: 'relaxed' as const,
    items: [
      {
        kind: 'move' as const,
        title: '공항 도착 및 숙소 이동',
        areaName: '공항 일대',
        description: '짐을 먼저 숙소에 두고 가볍게 움직입니다. 체크인 전이면 짐만 맡겨도 됩니다.',
        start: '11:00',
        duration: 70,
        cost: cost(18000, '공항 리무진 또는 택시 기준 추정'),
        indoor: false,
        tips: ['짐이 많으면 수하물 배송 서비스를 고려해 보세요.'],
      },
      {
        kind: 'meal' as const,
        title: '해안가 현지 식당에서 점심',
        areaName: '해안 도로변',
        description: '첫 끼는 이동 동선에서 벗어나지 않는 곳으로 잡았습니다. 지역 식재료를 쓰는 곳 위주입니다.',
        start: '12:40',
        duration: 70,
        cost: cost(42000, '2인 기준 일반 시세 추정'),
        indoor: true,
        tips: ['점심 피크는 12시30분 전후라 조금 이르거나 늦게 가면 여유롭습니다.'],
      },
      {
        kind: 'sight' as const,
        title: '해안 산책로 걷기',
        areaName: '해안 산책로',
        description: '평지 위주의 짧은 구간만 걷습니다. 벤치가 많아 중간에 쉬기 좋습니다.',
        start: '14:20',
        duration: 80,
        cost: cost(null, ''),
        indoor: false,
        tips: ['바람이 강한 날이 많아 겉옷을 챙기면 좋습니다.'],
      },
      {
        kind: 'rest' as const,
        title: '전망 좋은 카페에서 휴식',
        areaName: '해안 카페 거리',
        description: '오후 햇빛이 좋은 시간대입니다. 앉아서 다음 일정을 정리하기 좋습니다.',
        start: '16:00',
        duration: 60,
        cost: cost(16000, '음료 2~3잔 기준 추정'),
        indoor: true,
        tips: [],
      },
      {
        kind: 'stay' as const,
        title: '숙소 체크인 및 저녁',
        areaName: '숙소 인근',
        description: '첫날은 멀리 나가지 않고 숙소 주변에서 마무리합니다.',
        start: '18:00',
        duration: 120,
        cost: cost(48000, '2인 저녁 식사 기준 추정'),
        indoor: true,
        tips: [],
      },
    ],
  },
  {
    theme: '자연과 풍경 위주로',
    summary: '가장 체력이 좋은 날에 대표 명소를 배치했습니다. 이동을 한 방향으로 묶었습니다.',
    pace: 'balanced' as const,
    items: [
      {
        kind: 'meal' as const,
        title: '숙소 근처에서 아침',
        areaName: '숙소 인근',
        description: '무리하지 않게 늦은 아침으로 시작합니다.',
        start: '09:00',
        duration: 50,
        cost: cost(18000, '2인 기준 간단한 아침 추정'),
        indoor: true,
        tips: [],
      },
      {
        kind: 'sight' as const,
        title: '대표 전망 명소',
        areaName: '중산간 지역',
        description: '이 지역에서 가장 널리 알려진 풍경을 볼 수 있는 곳입니다. 경사가 완만한 코스를 택했습니다.',
        start: '10:20',
        duration: 110,
        cost: cost(12000, '입장료 2인 기준 추정'),
        indoor: false,
        tips: ['오전에 사람이 적습니다.', '주차장이 붐빌 수 있어 조금 일찍 도착하는 편이 낫습니다.'],
      },
      {
        kind: 'meal' as const,
        title: '지역 향토 음식 점심',
        areaName: '명소 인근 마을',
        description: '이동 거리를 줄이기 위해 오전 일정 근처로 잡았습니다.',
        start: '12:40',
        duration: 70,
        cost: cost(45000, '2인 기준 일반 시세 추정'),
        indoor: true,
        tips: [],
      },
      {
        kind: 'activity' as const,
        title: '지역 공방 체험',
        areaName: '공방 거리',
        description: '실내 활동이라 날씨 영향을 받지 않습니다. 소요 시간이 짧아 부담이 적습니다.',
        start: '14:30',
        duration: 90,
        cost: cost(60000, '2인 체험비 기준 추정'),
        indoor: true,
        tips: ['예약이 필요한 곳이 많습니다. 이 서비스는 예약을 제공하지 않으니 직접 확인해 주세요.'],
      },
      {
        kind: 'sight' as const,
        title: '노을 보기 좋은 지점',
        areaName: '서쪽 해안',
        description: '해지는 시간에 맞춰 이동합니다. 차에서 내려 조금만 걸으면 됩니다.',
        start: '17:30',
        duration: 70,
        cost: cost(null, ''),
        indoor: false,
        tips: ['일몰 시각은 계절에 따라 크게 달라집니다.'],
      },
      {
        kind: 'meal' as const,
        title: '저녁 식사',
        areaName: '항구 주변',
        description: '하루를 마무리하는 식사입니다. 숙소 방향과 같은 쪽으로 잡았습니다.',
        start: '19:10',
        duration: 90,
        cost: cost(56000, '2인 기준 일반 시세 추정'),
        indoor: true,
        tips: [],
      },
    ],
  },
  {
    theme: '여유롭게 마무리',
    summary: '돌아가는 일정에 맞춰 이동 부담이 적은 코스로만 채웠습니다.',
    pace: 'relaxed' as const,
    items: [
      {
        kind: 'meal' as const,
        title: '느긋한 아침',
        areaName: '숙소 인근',
        description: '체크아웃 전에 여유 있게 식사합니다.',
        start: '09:30',
        duration: 60,
        cost: cost(20000, '2인 기준 추정'),
        indoor: true,
        tips: [],
      },
      {
        kind: 'sight' as const,
        title: '가까운 실내 전시 공간',
        areaName: '시내 중심',
        description: '날씨와 무관하게 볼 수 있는 곳으로 배치했습니다.',
        start: '11:00',
        duration: 90,
        cost: cost(16000, '입장료 2인 기준 추정'),
        indoor: true,
        tips: [],
      },
      {
        kind: 'activity' as const,
        title: '기념품 거리 둘러보기',
        areaName: '시내 상점가',
        description: '짐이 늘어날 수 있으니 마지막 날에 배치했습니다.',
        start: '13:00',
        duration: 70,
        cost: cost(40000, '기념품 구입 예상액 추정'),
        indoor: true,
        tips: ['공항에서도 살 수 있는 품목은 미리 확인해 두면 짐이 줄어듭니다.'],
      },
      {
        kind: 'move' as const,
        title: '공항으로 이동',
        areaName: '공항 방면',
        description: '교통 상황을 감안해 출발 3시간 전에 움직입니다.',
        start: '15:00',
        duration: 80,
        cost: cost(18000, '리무진 또는 택시 기준 추정'),
        indoor: false,
        tips: ['성수기에는 도로가 막히니 여유를 더 두세요.'],
      },
    ],
  },
];

function buildDraft(request: PlanRequest): ItineraryDraft {
  const days = tripDays(request.startDate, request.endDate);
  const nights = Math.max(0, days - 1);
  const totalPeople =
    request.partySize.adults + request.partySize.children + request.partySize.infants;

  const partyParts: string[] = ['성인 ' + request.partySize.adults + '명'];
  if (request.partySize.children > 0)
    partyParts.push('아동 ' + request.partySize.children + '명');
  if (request.partySize.infants > 0)
    partyParts.push('유아 ' + request.partySize.infants + '명');

  const startMs = Date.parse(request.startDate + 'T00:00:00Z');

  const dayPlans = Array.from({ length: days }, (_, i) => {
    // 마지막 날은 항상 마무리 템플릿을 쓴다.
    const template =
      i === days - 1 && days > 1
        ? DAY_TEMPLATES[2]!
        : DAY_TEMPLATES[Math.min(i, DAY_TEMPLATES.length - 2)]!;

    const date = new Date(startMs + i * 86_400_000).toISOString().slice(0, 10);

    return {
      dayIndex: i + 1,
      date,
      theme: template.theme,
      summary: template.summary,
      pace: template.pace,
      items: template.items.map((item, idx) => ({
        id: 'd' + (i + 1) + '-a' + (idx + 1),
        order: idx + 1,
        kind: item.kind,
        title: item.title,
        areaName: item.areaName,
        description: item.description,
        startTime: item.start,
        durationMinutes: item.duration,
        costAmount: item.cost.amount,
        costBasis: item.cost.basis,
        tips: item.tips,
        // 화면에 그대로 노출되므로 enum 원본값이 아니라 한국어 라벨을 쓴다.
        respectsAvoid: request.avoid.slice(0, 2).map((a) => labelOf(AVOID_OPTIONS, a)),
        indoor: item.indoor,
      })),
    };
  });

  const stayTotal = 120_000 * nights;
  const foodTotal = 60_000 * days;
  const transportTotal = 40_000 * days;
  const activityTotal = 45_000 * days;

  return {
    summary: {
      title: request.destination + ' ' + nights + '박 ' + days + '일',
      destination: request.destination,
      startDate: request.startDate,
      endDate: request.endDate,
      days,
      nights,
      partySummary: partyParts.join(', '),
      styleTags: request.styles.map((s) => labelOf(TRAVEL_STYLES, s)),
      headline:
        '이동을 줄이고 쉬는 시간을 넉넉히 둔 ' + request.destination + ' 일정입니다.',
      highlights: [
        '하루 이동 거리를 짧게 묶어 체력 부담을 줄였습니다',
        '실내 일정을 섞어 날씨 영향을 줄였습니다',
        '식사는 이동 동선 위에서만 골랐습니다',
        '마지막 날은 공항 이동까지 여유를 뒀습니다',
      ],
    },
    days: dayPlans,
    budget: {
      lines: [
        {
          category: 'stay' as const,
          label: '숙박',
          amount: stayTotal,
          basis: nights + '박 기준 중급 숙소 일반 시세',
          assumptions: [
            '중급 숙소 1실 기준으로 잡았습니다',
            '성수기·주말에는 크게 오를 수 있습니다',
          ],
        },
        {
          category: 'food' as const,
          label: '식비',
          amount: foodTotal,
          basis: '1일 ' + totalPeople + '인 식사 3끼 기준 추정',
          assumptions: ['점심·저녁은 일반 식당, 아침은 간단식 기준입니다'],
        },
        {
          category: 'transport' as const,
          label: '교통',
          amount: transportTotal,
          basis: '대중교통·택시 혼합 기준 추정',
          assumptions: ['렌터카를 쓰면 유류비·주차비가 별도로 듭니다'],
        },
        {
          category: 'activity' as const,
          label: '체험·입장',
          amount: activityTotal,
          basis: '입장료와 체험비 합산 추정',
          assumptions: ['체험 프로그램을 줄이면 가장 크게 아낄 수 있는 항목입니다'],
        },
      ],
      excluded: ['항공권 미포함', '여행자보험 미포함', '기념품 구입비 미포함'],
    },
    checklist: {
      items: [
        { id: 'c1', label: '신분증', category: 'document' as const, priority: 'must' as const, reason: '숙소 체크인과 항공 탑승에 필요합니다.' },
        { id: 'c2', label: '예약 확인 화면 캡처', category: 'document' as const, priority: 'must' as const, reason: '통신이 끊겨도 확인할 수 있게 미리 저장해 두세요.' },
        { id: 'c3', label: '보조배터리', category: 'gear' as const, priority: 'must' as const, reason: '사진 촬영과 길 찾기로 배터리 소모가 큽니다.' },
        { id: 'c4', label: '겉옷', category: 'clothing' as const, priority: 'must' as const, reason: '해안가는 낮과 밤의 체감 온도 차가 큽니다.' },
        { id: 'c5', label: '편한 신발', category: 'clothing' as const, priority: 'must' as const, reason: '평지 위주지만 하루 총 도보 시간이 짧지 않습니다.' },
        { id: 'c6', label: '우산 또는 우비', category: 'gear' as const, priority: 'recommended' as const, reason: '갑작스러운 비에 대비합니다.' },
        { id: 'c7', label: '상비약', category: 'health' as const, priority: 'recommended' as const, reason: '소화제·진통제 등 익숙한 약을 챙기면 안심됩니다.' },
        { id: 'c8', label: '자외선 차단제', category: 'health' as const, priority: 'recommended' as const, reason: '야외 일정이 포함되어 있습니다.' },
        { id: 'c9', label: '멀미약', category: 'health' as const, priority: 'optional' as const, reason: '구불구불한 도로 구간이 있을 수 있습니다.' },
        { id: 'c10', label: '접이식 장바구니', category: 'etc' as const, priority: 'optional' as const, reason: '기념품을 담기에 편합니다.' },
      ],
      seasonNote:
        '이 시기에는 일교차가 큰 편입니다. 얇은 옷을 여러 겹 겹쳐 입는 편이 실용적입니다.',
    },
    rainyDay: {
      alternatives: [
        {
          id: 'r1',
          dayIndex: 1,
          replacesActivityId: 'd1-a3',
          title: '실내 전시 공간',
          areaName: '시내 중심',
          description: '해안 산책 대신 비를 피하면서 둘러볼 수 있는 실내 공간입니다.',
          costAmount: 16000,
          costBasis: '입장료 2인 기준 추정',
        },
        {
          id: 'r2',
          dayIndex: Math.min(2, days),
          replacesActivityId: null,
          title: '지역 박물관',
          areaName: '시내 중심',
          description: '야외 전망 일정을 대체할 수 있습니다. 이동 거리가 짧습니다.',
          costAmount: 10000,
          costBasis: '입장료 2인 기준 추정',
        },
        {
          id: 'r3',
          dayIndex: Math.min(2, days),
          replacesActivityId: null,
          title: '실내 온천 또는 스파',
          areaName: '숙소 인근',
          description: '비 오는 날 체온을 유지하며 쉬기 좋습니다.',
          costAmount: 36000,
          costBasis: '2인 이용료 기준 추정',
        },
      ],
      generalAdvice: [
        '비 예보가 있으면 실외 일정과 실내 일정의 순서를 바꾸는 것만으로도 대부분 해결됩니다.',
        '해안 지역은 바람이 강해 우산보다 우비가 실용적일 때가 많습니다.',
        '우천 시 운휴하는 야외 시설이 있으니 당일 오전에 운영 여부를 확인해 주세요.',
      ],
    },
  };
}

/** 목업 계획을 실제 경로와 동일한 정규화를 거쳐 반환한다. */
export function buildMockPlan(request: PlanRequest): ItineraryPlan {
  return normalizePlan(buildDraft(request), {
    request,
    model: 'mock-fixture',
    degraded: false,
    degradedReasons: [],
  });
}
