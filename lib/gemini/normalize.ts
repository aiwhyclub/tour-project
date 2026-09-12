import type {
  ActivityItem,
  BudgetLine,
  Confidence,
  DayPlan,
  Disclaimer,
  ItineraryPlan,
  MoneyEstimate,
  RainyAlternative,
} from '@/types/itinerary';
import type { ItineraryDraft } from '@/lib/validation/itinerary-schema';
import type { PlanRequest } from '@/lib/validation/plan-request';

/**
 * 모델 초안을 신뢰 가능한 최종 형태로 조립한다.
 *
 * 모델이 주는 것(ItineraryDraft)과 사용자가 받는 것(ItineraryPlan)은 형태가 다르다.
 * 모델은 평탄한 숫자·텍스트만 주고, 추정 객체(MoneyEstimate·TimeEstimate)는
 * 전적으로 이 파일이 만든다. 두 가지 이득이 있다.
 *
 *   R1: 모델이 confidence 를 아예 제출할 수 없다. "확정"이라고 주장할 통로가 없다.
 *   R8: 합계·비중·1인당 금액을 모델 산술이 아니라 라인 아이템에서 계산한다.
 *       행 합계가 총계와 어긋나는 표는 빠진 기능보다 빠르게 신뢰를 무너뜨린다.
 *
 * 부수적으로, 평탄한 스키마는 Gemini 의 구조화 출력 복잡도 한계도 피해 간다.
 */

const DEFAULT_VERIFY_HINT = '방문 전 공식 채널에서 직접 확인하세요.';
const DEFAULT_HOURS_NOTE = '운영시간은 계절·요일에 따라 달라질 수 있습니다.';

/** 금액에서 추정 객체를 만든다. 범위는 대표값 기준 ±15%. */
function toMoney(
  amount: number,
  basis: string,
  confidence: Confidence = 'estimate',
): MoneyEstimate {
  const value = Math.max(0, Math.round(amount));
  return {
    amount: value,
    currency: 'KRW',
    rangeLow: Math.round(value * 0.85),
    rangeHigh: Math.round(value * 1.2),
    confidence,
    basis: (basis || '일반 시세 기준 추정').slice(0, 120),
    verifyHint: DEFAULT_VERIFY_HINT,
  };
}

/** 합산 결과. 신뢰도는 구성 요소 중 가장 낮은 쪽을 따른다. */
function sumMoney(
  parts: readonly (MoneyEstimate | null)[],
  basis: string,
): MoneyEstimate {
  const present = parts.filter((p): p is MoneyEstimate => p !== null);
  const confidence: Confidence = present.some((p) => p.confidence === 'unverified')
    ? 'unverified'
    : present.some((p) => p.confidence === 'typical_range')
      ? 'typical_range'
      : 'estimate';

  return {
    amount: present.reduce((a, p) => a + p.amount, 0),
    currency: 'KRW',
    rangeLow: present.reduce((a, p) => a + p.rangeLow, 0),
    rangeHigh: present.reduce((a, p) => a + p.rangeHigh, 0),
    confidence,
    basis,
    verifyHint: DEFAULT_VERIFY_HINT,
  };
}

function divideMoney(m: MoneyEstimate, divisor: number, basis: string): MoneyEstimate {
  const d = Math.max(1, divisor);
  return {
    amount: Math.round(m.amount / d),
    currency: 'KRW',
    rangeLow: Math.round(m.rangeLow / d),
    rangeHigh: Math.round(m.rangeHigh / d),
    confidence: m.confidence,
    basis,
    verifyHint: DEFAULT_VERIFY_HINT,
  };
}

/** 모델이 뭐라고 썼든 이 목록이 붙는다 (R1). */
function buildDisclaimers(degraded: boolean, reasons: string[]): Disclaimer[] {
  const list: Disclaimer[] = [
    {
      id: 'dc-budget',
      scope: 'budget',
      severity: 'warning',
      message:
        '표시된 모든 금액은 추정값입니다. 실제 가격은 시기·업체·인원에 따라 달라지므로 예약 전 직접 확인해 주세요.',
    },
    {
      id: 'dc-hours',
      scope: 'hours',
      severity: 'warning',
      message:
        '표시된 시각은 일정상 계획 시간이며 영업시간 보장이 아닙니다. 휴무일과 운영시간은 방문 전 확인이 필요합니다.',
    },
    {
      id: 'dc-availability',
      scope: 'availability',
      severity: 'info',
      message:
        '장소의 운영 여부와 예약 가능 여부는 확인되지 않았습니다. 이 서비스는 예약을 제공하지 않습니다.',
    },
    {
      id: 'dc-general',
      scope: 'general',
      severity: 'info',
      message:
        'AI가 생성한 일정 초안입니다. 그대로 따르기보다 참고 자료로 사용하고, 중요한 항목은 직접 확인해 주세요.',
    },
  ];

  if (degraded) {
    list.push({
      id: 'dc-degraded',
      scope: 'general',
      severity: 'warning',
      message:
        '생성 결과 일부가 온전하지 않아 보정했습니다. 내용이 부족해 보이면 다시 만들어 주세요.' +
        (reasons.length ? ' (' + reasons.join(', ') + ')' : ''),
    });
  }

  return list;
}

export interface NormalizeOptions {
  request: PlanRequest;
  model: string;
  degraded: boolean;
  degradedReasons: string[];
}

export function normalizePlan(
  draft: ItineraryDraft,
  opts: NormalizeOptions,
): ItineraryPlan {
  const { request, model, degraded, degradedReasons } = opts;

  const totalPeople =
    request.partySize.adults + request.partySize.children + request.partySize.infants;
  // 유아는 대체로 요금을 내지 않으므로 1인당 계산에서 제외한다.
  const payingPeople = Math.max(1, request.partySize.adults + request.partySize.children);

  const userBudget =
    request.budget.scope === 'per_person'
      ? request.budget.amount * Math.max(1, totalPeople)
      : request.budget.amount;

  /* --- 일자별: 평탄한 필드를 추정 객체로 조립하고 소계를 계산 (R8) --- */
  const days: DayPlan[] = draft.days.map((day) => {
    const items: ActivityItem[] = day.items.map((item) => ({
      id: item.id,
      order: item.order,
      kind: item.kind,
      title: item.title,
      areaName: item.areaName,
      description: item.description,
      time: {
        start: item.startTime,
        durationMinutes: item.durationMinutes,
        // 신뢰도는 서버가 정한다. 모델은 제출할 수 없다 (R1).
        confidence: 'estimate',
        hoursNote: DEFAULT_HOURS_NOTE,
      },
      cost:
        item.costAmount === null
          ? null
          : toMoney(item.costAmount, item.costBasis || '일반 시세 기준 추정'),
      tips: item.tips,
      respectsAvoid: item.respectsAvoid,
      indoor: item.indoor,
    }));

    return {
      dayIndex: day.dayIndex,
      date: day.date,
      theme: day.theme,
      summary: day.summary,
      pace: day.pace,
      items,
      daySubtotal: sumMoney(
        items.map((i) => i.cost),
        day.dayIndex + '일차 일정 비용 합계 (서버 재계산)',
      ),
    };
  });

  /* --- 예산표: 총계·1인당·비중을 라인에서 재계산 (R8) --- */
  const lines: BudgetLine[] = draft.budget.lines.map((line) => {
    const estimate = toMoney(
      line.amount,
      line.basis || '일반 시세 기준 추정',
      'typical_range',
    );
    return {
      category: line.category,
      label: line.label,
      estimate,
      perPerson: divideMoney(
        estimate,
        payingPeople,
        payingPeople + '인 기준 1인당 (서버 재계산)',
      ),
      sharePercent: 0, // 총계 확정 후 채운다
      assumptions: line.assumptions,
    };
  });

  const total = sumMoney(
    lines.map((l) => l.estimate),
    '예산 항목 합계 (서버 재계산)',
  );

  // 각 행을 독립적으로 반올림하면 합이 100.1% 같은 값이 되어 표가 이상해 보인다.
  // 마지막 행이 잔차를 흡수하게 해 정확히 100.0% 로 맞춘다.
  if (total.amount > 0) {
    let accumulated = 0;
    lines.forEach((line, index) => {
      if (index === lines.length - 1) {
        line.sharePercent = Math.round((100 - accumulated) * 10) / 10;
      } else {
        const share = Math.round((line.estimate.amount / total.amount) * 1000) / 10;
        line.sharePercent = share;
        accumulated += share;
      }
    });
  }

  const perPerson = divideMoney(
    total,
    payingPeople,
    payingPeople + '인 기준 1인당 총액 (서버 재계산)',
  );

  const difference = total.amount - userBudget;
  const ratio = userBudget > 0 ? total.amount / userBudget : 1;
  const status: 'under' | 'near' | 'over' =
    ratio <= 0.9 ? 'under' : ratio <= 1.05 ? 'near' : 'over';

  const comment =
    status === 'under'
      ? '입력한 예산보다 약 ' +
        Math.abs(difference).toLocaleString('ko-KR') +
        '원 여유가 있습니다.'
      : status === 'near'
        ? '입력한 예산과 비슷한 수준입니다.'
        : '입력한 예산보다 약 ' +
          difference.toLocaleString('ko-KR') +
          '원 초과합니다. 숙박이나 체험을 조정해 보세요.';

  const totalBudget: MoneyEstimate = { ...total, basis: '전체 예상 비용 (서버 재계산)' };

  const alternatives: RainyAlternative[] = draft.rainyDay.alternatives.map((alt) => ({
    id: alt.id,
    dayIndex: alt.dayIndex,
    replacesActivityId: alt.replacesActivityId,
    title: alt.title,
    areaName: alt.areaName,
    description: alt.description,
    cost:
      alt.costAmount === null
        ? null
        : toMoney(alt.costAmount, alt.costBasis || '일반 시세 기준 추정'),
  }));

  return {
    schemaVersion: 1,
    summary: {
      title: draft.summary.title,
      // 요청과 어긋날 수 없는 값은 요청 쪽을 신뢰한다.
      destination: request.destination,
      startDate: request.startDate,
      endDate: request.endDate,
      days: days.length,
      nights: Math.max(0, days.length - 1),
      partySummary: draft.summary.partySummary,
      styleTags: draft.summary.styleTags,
      headline: draft.summary.headline,
      highlights: draft.summary.highlights,
      totalBudget,
      perPersonBudget: perPerson,
    },
    days,
    budget: {
      lines,
      total: totalBudget,
      perPerson,
      excluded: draft.budget.excluded,
      vsUserBudget: { userBudget, difference, status, comment },
    },
    checklist: draft.checklist,
    rainyDay: {
      alternatives,
      generalAdvice: draft.rainyDay.generalAdvice,
    },
    disclaimers: buildDisclaimers(degraded, degradedReasons),
    generation: {
      model,
      generatedAt: new Date().toISOString(),
      degraded,
      degradedReasons,
    },
  };
}
