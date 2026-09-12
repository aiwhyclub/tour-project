import { describe, expect, it } from 'vitest';
import { normalizePlan } from '@/lib/gemini/normalize';
import type { ItineraryDraft } from '@/lib/validation/itinerary-schema';
import type { PlanRequest } from '@/lib/validation/plan-request';
import type { Confidence } from '@/types/itinerary';

/**
 * normalize 는 이 저장소에서 가장 신뢰가 걸린 함수다.
 * 모델이 준 초안을 사용자가 믿을 수 있는 형태로 바꾸는 유일한 지점이고,
 * R1(모든 금액은 추정)과 R8(서버가 산술을 다시 한다)이 실제로 성립하는 곳이다.
 */

type DraftItem = ItineraryDraft['days'][number]['items'][number];
type DraftLine = ItineraryDraft['budget']['lines'][number];

const item = (over: Partial<DraftItem> = {}): DraftItem => ({
  id: 'd1-a1',
  order: 1,
  kind: 'sight',
  title: '성산일출봉',
  areaName: '서귀포시 성산읍',
  description: '분화구 정상까지 걷는 코스입니다.',
  startTime: '09:00',
  durationMinutes: 90,
  costAmount: 5_000,
  costBasis: '성인 1인 입장료 기준',
  tips: [],
  respectsAvoid: [],
  indoor: false,
  ...over,
});

const line = (over: Partial<DraftLine> = {}): DraftLine => ({
  category: 'stay',
  label: '숙박',
  amount: 300_000,
  basis: '2박 기준 일반 시세',
  assumptions: [],
  ...over,
});

const draft = (over: Partial<ItineraryDraft> = {}): ItineraryDraft => ({
  summary: {
    title: '제주 3일',
    // 요청과 어긋나는 값을 일부러 넣어 둔다 — 서버가 요청 쪽을 신뢰하는지 본다.
    destination: '부산',
    startDate: '1999-01-01',
    endDate: '1999-01-03',
    days: 99,
    nights: 99,
    partySummary: '성인 2명, 아동 1명',
    styleTags: ['힐링'],
    headline: '천천히 걷는 제주',
    highlights: ['성산일출봉', '카페 투어', '올레길'],
  },
  days: [
    {
      dayIndex: 1,
      date: '2026-10-03',
      theme: '동부 해안',
      summary: '바다를 따라 천천히.',
      pace: 'relaxed',
      items: [item(), item({ id: 'd1-a2', order: 2, costAmount: 12_000 })],
    },
  ],
  budget: {
    lines: [line(), line({ category: 'food', label: '식비', amount: 200_000 })],
    excluded: ['항공권 미포함'],
  },
  checklist: {
    items: [
      {
        id: 'c1',
        label: '우산',
        category: 'gear',
        priority: 'must',
        reason: '가을 제주는 비가 잦습니다.',
      },
    ],
    seasonNote: '일교차가 큽니다.',
  },
  rainyDay: {
    alternatives: [
      {
        id: 'r1',
        dayIndex: 1,
        replacesActivityId: 'd1-a1',
        title: '제주민속촌',
        areaName: '서귀포시',
        description: '실내 전시가 많습니다.',
        costAmount: 15_000,
        costBasis: '성인 입장료',
      },
    ],
    generalAdvice: ['우비를 챙기세요.'],
  },
  ...over,
});

const request = (over: Partial<PlanRequest> = {}): PlanRequest => ({
  destination: '제주도',
  startDate: '2026-10-03',
  endDate: '2026-10-05',
  partySize: { adults: 2, children: 1, infants: 1 },
  budget: { amount: 900_000, currency: 'KRW', scope: 'total' },
  styles: ['healing'],
  foodPreference: { likes: [], avoidIngredients: '', spiceLevel: 'medium' },
  avoid: [],
  notes: '',
  locale: 'ko-KR',
  ...over,
});

const run = (d = draft(), r = request(), degraded = false, reasons: string[] = []) =>
  normalizePlan(d, { request: r, model: 'test-model', degraded, degradedReasons: reasons });

describe('R8 — 서버가 산술을 다시 한다', () => {
  it('예산 총계는 행 금액의 합이다', () => {
    const plan = run();
    expect(plan.budget.total.amount).toBe(500_000);
  });

  it('모델이 뭐라고 쓰든 행에서 다시 계산한다 (총계를 모델에게 받지 않는다)', () => {
    const plan = run(
      draft({
        budget: {
          lines: [line({ amount: 111_111 }), line({ amount: 222_222 })],
          excluded: [],
        },
      }),
    );
    expect(plan.budget.total.amount).toBe(333_333);
  });

  it('일자 소계는 그날 항목 비용의 합이다', () => {
    expect(run().days[0]?.daySubtotal.amount).toBe(17_000);
  });

  it('비용이 null 인 항목은 소계에서 건너뛴다 (0 으로 세지 않는다)', () => {
    const d = draft();
    const day = d.days[0];
    if (!day) throw new Error('fixture');
    day.items = [item({ costAmount: 5_000 }), item({ id: 'x', costAmount: null, costBasis: '' })];

    const plan = run(d);
    expect(plan.days[0]?.daySubtotal.amount).toBe(5_000);
    expect(plan.days[0]?.items[1]?.cost).toBeNull();
  });
});

describe('R8 — 비중 합이 정확히 100.0%', () => {
  const shares = (amounts: number[]) =>
    run(draft({ budget: { lines: amounts.map((amount) => line({ amount })), excluded: [] } }))
      .budget.lines.map((l) => l.sharePercent);

  it('나누어떨어지는 경우', () => {
    expect(shares([250_000, 250_000])).toEqual([50, 50]);
  });

  it('3등분 잔차를 마지막 행이 흡수한다 (33.3 + 33.3 + 33.4)', () => {
    const s = shares([100_000, 100_000, 100_000]);
    expect(s).toEqual([33.3, 33.3, 33.4]);
    expect(s.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 10);
  });

  it('7등분에서도 합이 100.0 이다', () => {
    const s = shares([1, 1, 1, 1, 1, 1]);
    expect(s.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 10);
  });

  it('한 행이 나머지를 압도해도 합이 100.0 이다', () => {
    const s = shares([999_999, 1, 1]);
    expect(s.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 10);
  });

  it('총계가 0 이면 비중을 계산하지 않는다 (0 으로 나누지 않는다)', () => {
    const s = shares([0, 0, 0]);
    expect(s).toEqual([0, 0, 0]);
  });
});

describe('1인당 계산 — 유아 제외', () => {
  it('유아는 1인당 계산에서 빠진다 (성인2 + 아동1 = 3인)', () => {
    // 총계 500,000 / 3 = 166,667
    expect(run().budget.perPerson.amount).toBe(166_667);
  });

  it('성인만 있으면 그 수로 나눈다', () => {
    const plan = run(draft(), request({ partySize: { adults: 2, children: 0, infants: 0 } }));
    expect(plan.budget.perPerson.amount).toBe(250_000);
  });

  it('유아만 있는 극단값에서도 0 으로 나누지 않는다', () => {
    const plan = run(draft(), request({ partySize: { adults: 1, children: 0, infants: 5 } }));
    expect(plan.budget.perPerson.amount).toBe(500_000);
  });

  it('요약 카드의 1인당 금액이 예산표와 같은 값이다', () => {
    const plan = run();
    expect(plan.summary.perPersonBudget.amount).toBe(plan.budget.perPerson.amount);
  });
});

describe('사용자 예산과의 비교 — 유아를 포함한다 (1인당 계산과 비대칭)', () => {
  it('전체 총액 기준이면 입력 금액을 그대로 쓴다', () => {
    expect(run().budget.vsUserBudget.userBudget).toBe(900_000);
  });

  it('1인당 기준이면 유아를 포함한 총원(4명)으로 곱한다', () => {
    // 1인당 계산은 3인(유아 제외), 예산 환산은 4인(유아 포함). 의도된 비대칭이다.
    const plan = run(
      draft(),
      request({ budget: { amount: 300_000, currency: 'KRW', scope: 'per_person' } }),
    );
    expect(plan.budget.vsUserBudget.userBudget).toBe(1_200_000);
  });

  it('차액은 총계 - 사용자 예산이다', () => {
    expect(run().budget.vsUserBudget.difference).toBe(500_000 - 900_000);
  });
});

describe('예산 대비 판정 경계', () => {
  const statusFor = (total: number, userBudget: number) =>
    run(
      draft({ budget: { lines: [line({ amount: total })], excluded: [] } }),
      request({ budget: { amount: userBudget, currency: 'KRW', scope: 'total' } }),
    ).budget.vsUserBudget.status;

  it('비율 0.9 는 여유(under) 다 — 경계 포함', () => {
    expect(statusFor(900_000, 1_000_000)).toBe('under');
  });

  it('비율이 0.9 를 조금 넘으면 비슷(near) 이다', () => {
    expect(statusFor(900_001, 1_000_000)).toBe('near');
  });

  it('비율 1.05 는 비슷(near) 이다 — 경계 포함', () => {
    expect(statusFor(1_050_000, 1_000_000)).toBe('near');
  });

  it('비율이 1.05 를 넘으면 초과(over) 다', () => {
    expect(statusFor(1_050_001, 1_000_000)).toBe('over');
  });

  it('사용자 예산이 0 이면 비율을 1 로 두어 초과라고 겁주지 않는다', () => {
    expect(statusFor(500_000, 0)).toBe('near');
  });
});

describe('R1 — 확정 금액을 표현할 수 없다', () => {
  it('모든 금액에 confidence 가 붙고 3가지 값 중 하나다', () => {
    const plan = run();
    const seen = new Set<Confidence>();

    const collect = (m: { confidence: Confidence } | null) => {
      if (m) seen.add(m.confidence);
    };

    collect(plan.budget.total);
    collect(plan.budget.perPerson);
    collect(plan.summary.totalBudget);
    collect(plan.summary.perPersonBudget);
    for (const l of plan.budget.lines) {
      collect(l.estimate);
      collect(l.perPerson);
    }
    for (const d of plan.days) {
      collect(d.daySubtotal);
      for (const i of d.items) collect(i.cost);
    }
    for (const a of plan.rainyDay.alternatives) collect(a.cost);

    expect(seen.size).toBeGreaterThan(0);
    for (const c of seen) {
      expect(['estimate', 'typical_range', 'unverified']).toContain(c);
    }
  });

  it('직렬화된 응답 어디에도 confirmed 가 없다', () => {
    expect(JSON.stringify(run())).not.toContain('confirmed');
  });

  it('모든 금액에 확인 안내가 붙는다', () => {
    const plan = run();
    expect(plan.budget.total.verifyHint).toBe('방문 전 공식 채널에서 직접 확인하세요.');
    expect(plan.days[0]?.items[0]?.cost?.verifyHint).toBe(
      '방문 전 공식 채널에서 직접 확인하세요.',
    );
  });

  it('시각에는 운영시간 보장이 아니라는 주석이 붙는다', () => {
    expect(run().days[0]?.items[0]?.time.hoursNote).toBe(
      '운영시간은 계절·요일에 따라 달라질 수 있습니다.',
    );
  });

  it('시각의 신뢰도도 서버가 정한다 (모델은 제출할 수 없다)', () => {
    expect(run().days[0]?.items[0]?.time.confidence).toBe('estimate');
  });

  it('금액 범위는 대표값 기준 -15% / +20% 다', () => {
    const cost = run().days[0]?.items[0]?.cost;
    expect(cost?.amount).toBe(5_000);
    expect(cost?.rangeLow).toBe(4_250);
    expect(cost?.rangeHigh).toBe(6_000);
  });

  it('근거가 비면 기본 문구를 채운다 (빈 칸을 보여주지 않는다)', () => {
    const d = draft();
    const day = d.days[0];
    if (!day) throw new Error('fixture');
    day.items = [item({ costAmount: 1_000, costBasis: '' })];

    expect(run(d).days[0]?.items[0]?.cost?.basis).toBe('일반 시세 기준 추정');
  });
});

describe('합산 신뢰도 — 가장 낮은 쪽을 따른다', () => {
  it('예산 행은 일반 시세(typical_range) 로 매긴다', () => {
    expect(run().budget.lines[0]?.estimate.confidence).toBe('typical_range');
  });

  it('행이 모두 일반 시세면 총계도 일반 시세다', () => {
    expect(run().budget.total.confidence).toBe('typical_range');
  });

  it('일정 항목은 추정(estimate) 이고 소계도 추정이다', () => {
    const plan = run();
    expect(plan.days[0]?.items[0]?.cost?.confidence).toBe('estimate');
    expect(plan.days[0]?.daySubtotal.confidence).toBe('estimate');
  });

  it('비용이 하나도 없는 날의 소계는 0원이고 추정이다', () => {
    const d = draft();
    const day = d.days[0];
    if (!day) throw new Error('fixture');
    day.items = [item({ costAmount: null, costBasis: '' })];

    const subtotal = run(d).days[0]?.daySubtotal;
    expect(subtotal?.amount).toBe(0);
    expect(subtotal?.confidence).toBe('estimate');
  });

  it('1인당 금액은 원본의 신뢰도를 물려받는다', () => {
    const plan = run();
    expect(plan.budget.perPerson.confidence).toBe(plan.budget.total.confidence);
  });
});

describe('면책 주입 — 모델이 뭐라고 쓰든 붙는다', () => {
  it('항상 4개가 붙는다', () => {
    const list = run().disclaimers;
    expect(list).toHaveLength(4);
    expect(list.map((d) => d.id)).toEqual([
      'dc-budget',
      'dc-hours',
      'dc-availability',
      'dc-general',
    ]);
  });

  it('예약을 제공하지 않는다고 명시한다 (S16)', () => {
    const availability = run().disclaimers.find((d) => d.id === 'dc-availability');
    expect(availability?.message).toContain('예약을 제공하지 않습니다');
  });

  it('저하 모드면 하나가 더 붙는다', () => {
    const list = run(draft(), request(), true, []);
    expect(list.disclaimers).toHaveLength(5);
    expect(list.disclaimers[4]?.id).toBe('dc-degraded');
  });

  it('저하 사유를 문구에 덧붙인다', () => {
    const plan = run(draft(), request(), true, ['일정 항목 일부 누락']);
    expect(plan.disclaimers[4]?.message).toContain('(일정 항목 일부 누락)');
  });

  it('사유가 없으면 괄호를 만들지 않는다', () => {
    expect(run(draft(), request(), true, []).disclaimers[4]?.message).not.toContain('(');
  });
});

describe('요약 — 요청과 어긋날 수 없는 값은 요청을 신뢰한다', () => {
  it('여행지·날짜를 모델 값이 아니라 요청 값으로 덮어쓴다', () => {
    const plan = run();
    expect(plan.summary.destination).toBe('제주도');
    expect(plan.summary.startDate).toBe('2026-10-03');
    expect(plan.summary.endDate).toBe('2026-10-05');
  });

  it('일수·박수는 실제 days 길이에서 다시 센다', () => {
    const plan = run();
    expect(plan.summary.days).toBe(1);
    expect(plan.summary.nights).toBe(0);
  });

  it('제목·하이라이트처럼 모델의 창작물은 그대로 둔다', () => {
    const plan = run();
    expect(plan.summary.title).toBe('제주 3일');
    expect(plan.summary.highlights).toEqual(['성산일출봉', '카페 투어', '올레길']);
  });
});

describe('생성 메타', () => {
  it('모델명과 저하 여부를 그대로 담는다', () => {
    const plan = run(draft(), request(), true, ['사유']);
    expect(plan.generation.model).toBe('test-model');
    expect(plan.generation.degraded).toBe(true);
    expect(plan.generation.degradedReasons).toEqual(['사유']);
  });

  it('schemaVersion 이 1 이다', () => {
    expect(run().schemaVersion).toBe(1);
  });
});

describe('우천 대안', () => {
  it('대체 대상 id 를 담는다', () => {
    expect(run().rainyDay.alternatives[0]?.replacesActivityId).toBe('d1-a1');
  });

  it('특정할 수 없으면 null 을 유지한다 (빈 문자열로 바꾸지 않는다)', () => {
    const d = draft();
    const alt = d.rainyDay.alternatives[0];
    if (!alt) throw new Error('fixture');
    alt.replacesActivityId = null;

    expect(run(d).rainyDay.alternatives[0]?.replacesActivityId).toBeNull();
  });

  it('대안의 비용도 추정 객체로 조립된다', () => {
    const cost = run().rainyDay.alternatives[0]?.cost;
    expect(cost?.amount).toBe(15_000);
    expect(cost?.confidence).toBe('estimate');
    expect(cost?.rangeLow).toBe(12_750);
  });

  it('비용이 null 이면 null 로 둔다', () => {
    const d = draft();
    const alt = d.rainyDay.alternatives[0];
    if (!alt) throw new Error('fixture');
    alt.costAmount = null;
    alt.costBasis = '';

    expect(run(d).rainyDay.alternatives[0]?.cost).toBeNull();
  });

  it('일반 조언을 그대로 옮긴다', () => {
    expect(run().rainyDay.generalAdvice).toEqual(['우비를 챙기세요.']);
  });
});

describe('R5 — 지도·좌표가 아니다', () => {
  it('출력 어디에도 좌표 필드가 없다', () => {
    const text = JSON.stringify(run());
    for (const key of ['latitude', 'longitude', '"lat"', '"lng"', 'coordinates']) {
      expect(text).not.toContain(key);
    }
  });
});
