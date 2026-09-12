'use client';

import {
  BUDGET_SCOPES,
  TRAVEL_STYLES,
  labelOf,
} from '@/lib/constants/options';
import { koreanDate, koreanRange } from '@/lib/format/date';
import { krw } from '@/lib/format/krw';
import { tripDays, type PlanRequestInput } from '@/lib/validation/plan-request';

/**
 * 입력 조건 요약. 처리 중 오버레이와 오류 화면이 함께 쓴다.
 *
 * 존재 이유는 장식이 아니라 증거다. 두 화면 모두 "입력값이 보존되어 있다"고
 * 문장으로만 말해 왔는데(S4), 사용자가 그것을 확인할 방법이 없었다.
 * 조건을 그대로 보여 주면 말이 아니라 사실이 된다.
 *
 * ── 린트 주의 ──────────────────────────────────────────────────────────
 * eslint.config.mjs 의 가드레일 2(R1)는 식별자 이름으로 동작한다.
 * `request.budget.amount` 는 허용된다 — 속성명이 budget 이고, 이 값은 사용자가
 * 직접 적은 입력이지 서버가 만든 추정값(MoneyEstimate)이 아니므로 Money.tsx 를
 * 거칠 대상이 아니다. 다만 `const total = request.budget; total.amount` 처럼
 * 중간 변수를 두면 즉시 규칙에 걸린다. 이 파일에서 total·estimate·cost·
 * perPerson·totalBudget·perPersonBudget·daySubtotal 이름의 지역변수를 만들지 말 것.
 */
export function InputSummary({ request }: { request: PlanRequestInput | null }) {
  if (!request) return null;

  const days = tripDays(request.startDate, request.endDate);
  const nights = Math.max(0, days - 1);

  const party = [
    '성인 ' + request.partySize.adults + '명',
    request.partySize.children > 0 ? '아동 ' + request.partySize.children + '명' : null,
    request.partySize.infants > 0 ? '유아 ' + request.partySize.infants + '명' : null,
  ].filter(Boolean) as string[];

  const styleLabels = request.styles.map((s) => labelOf(TRAVEL_STYLES, s));

  const scope = labelOf(BUDGET_SCOPES, request.budget.scope);
  const money = krw(request.budget.amount);

  const firstLine = [
    request.destination,
    koreanRange(request.startDate, request.endDate),
    days === 1 ? '당일치기' : nights + '박 ' + days + '일',
  ].join(' · ');

  const secondLine = [...party, scope + ' ' + money, ...styleLabels].join(' · ');

  return (
    <div className="w-full max-w-[560px] rounded-[var(--radius-field)] border border-line bg-surface-subtle px-5 py-4 text-left">
      <p className="text-xs font-bold tracking-wider text-ink-muted">입력한 조건</p>
      <p className="mt-2 text-sm leading-relaxed break-keep text-ink">{firstLine}</p>
      <p className="mt-1 text-sm leading-relaxed break-keep text-ink-soft">{secondLine}</p>
      {/* 날짜는 요약 줄에서 월.일로 줄였으므로 요일이 필요한 사람을 위해 한 번 더 적는다 */}
      <p className="mt-2 text-xs text-ink-muted">
        {koreanDate(request.startDate)} ~ {koreanDate(request.endDate)}
      </p>
    </div>
  );
}
