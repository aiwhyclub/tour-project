'use client';

import { useMemo, useRef } from 'react';
import { gsap, useGSAP, ScrollTrigger } from '@/lib/motion/gsap-setup';
import type { ItineraryPlan } from '@/types/itinerary';
import { SummaryCard } from './SummaryCard';
import { DayCard } from './DayCard';
import { BudgetTable } from './BudgetTable';
import { PackingChecklist } from './PackingChecklist';
import { RainyDayPanel } from './RainyDayPanel';
import { RegenerateBar } from './RegenerateBar';
import { DisclaimerBanner } from '@/components/disclaimer/DisclaimerBanner';

/**
 * 결과 화면.
 *
 * 섹션 순서는 PRD 가 고정한 대로다:
 *   여행 요약 카드 → 일자별 코스 → 예산표 → 준비물 → 우천 시 대안
 * 이 순서는 배열이 아니라 JSX 구조로 못 박혀 있어 실수로 뒤바뀔 수 없다.
 */
export function ResultView({
  plan,
  onEdit,
  onRegenerate,
  busy,
}: {
  plan: ItineraryPlan;
  onEdit: () => void;
  onRegenerate: () => void;
  busy: boolean;
}) {
  const scope = useRef<HTMLDivElement>(null);

  const dayThemes = useMemo(
    () => new Map(plan.days.map((d) => [d.dayIndex, d.theme])),
    [plan.days],
  );

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(
        {
          motion: '(prefers-reduced-motion: no-preference)',
          calm: '(prefers-reduced-motion: reduce)',
        },
        (ctx) => {
          const { calm } = ctx.conditions as Record<string, boolean>;
          const sections = scope.current?.querySelectorAll('[data-result-section]');
          if (!sections?.length) return;

          gsap.from(sections, {
            opacity: 0,
            y: calm ? 0 : 20,
            duration: calm ? 0.15 : 0.55,
            stagger: calm ? 0 : 0.09,
            ease: 'power2.out',
            onComplete: () => ScrollTrigger.refresh(),
          });
        },
      );

      return () => mm.revert();
    },
    { scope, dependencies: [plan.generation.generatedAt] },
  );

  return (
    <div ref={scope} className="flex flex-col gap-6 sm:gap-8">
      <div data-result-section>
        <DisclaimerBanner items={plan.disclaimers} />
      </div>

      {/* 1. 여행 요약 카드 */}
      <div data-result-section>
        <SummaryCard summary={plan.summary} />
      </div>

      {/* 2. 일자별 코스 */}
      <section data-result-section aria-labelledby="course-heading">
        <h3 id="course-heading" className="mb-4 text-h2 text-ink">
          일자별 코스
        </h3>
        <ol className="flex flex-col gap-4">
          {plan.days.map((day, index) => (
            <DayCard key={day.dayIndex} day={day} defaultOpen={index === 0} />
          ))}
        </ol>
      </section>

      {/* 3. 예상 예산표 */}
      <div data-result-section>
        <BudgetTable budget={plan.budget} />
      </div>

      {/* 4. 준비물 체크리스트 */}
      <div data-result-section>
        <PackingChecklist checklist={plan.checklist} />
      </div>

      {/* 5. 우천 시 대안 */}
      <div data-result-section>
        <RainyDayPanel rainyDay={plan.rainyDay} dayThemes={dayThemes} />
      </div>

      <div data-result-section>
        <RegenerateBar onEdit={onEdit} onRegenerate={onRegenerate} busy={busy} />
      </div>

      <p className="text-center text-xs text-ink-muted">
        {plan.generation.model} 로 생성 ·{' '}
        {new Date(plan.generation.generatedAt).toLocaleString('ko-KR')}
        {plan.generation.degraded && ' · 일부 보정됨'}
      </p>
    </div>
  );
}
