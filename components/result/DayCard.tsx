'use client';

import { useRef, useState } from 'react';
import { gsap, useGSAP, Flip, ScrollTrigger } from '@/lib/motion/gsap-setup';
import { ACTIVITY_KIND_LABEL, DAY_PACE_LABEL, type DayPlan } from '@/types/itinerary';
import { koreanDate } from '@/lib/format/date';
import { Card } from '@/components/ui/Card';
import { Money } from '@/components/disclaimer/Money';
import { TimeChip } from '@/components/disclaimer/TimeChip';

const KIND_TONE: Record<string, string> = {
  meal: 'bg-accent-50 text-accent-700 border-accent-100',
  move: 'bg-surface-sunken text-ink-muted border-line',
  rest: 'bg-surface-sunken text-ink-muted border-line',
  stay: 'bg-ocean-50 text-ocean-800 border-ocean-100',
  sight: 'bg-ocean-50 text-ocean-800 border-ocean-100',
  activity: 'bg-ocean-100 text-ocean-900 border-ocean-200',
};

/**
 * 일자 카드.
 *
 * 사용자 요구(조건 1-1): 클릭하면 동적으로 펼쳐진다.
 * Flip 으로 레이아웃 전환을 보간하고, 끝난 뒤 ScrollTrigger.refresh() 를 호출한다.
 * 이걸 빼먹으면 아래쪽 섹션의 트리거 위치가 어긋나 스크롤이 튄다 (R3).
 */
export function DayCard({ day, defaultOpen }: { day: DayPlan; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(Boolean(defaultOpen));
  const ref = useRef<HTMLDivElement>(null);

  const { contextSafe } = useGSAP({ scope: ref });

  const toggle = contextSafe(() => {
    const list = ref.current?.querySelector('[data-day-items]');
    const state = list ? Flip.getState(list) : null;

    setOpen((prev) => !prev);

    requestAnimationFrame(() => {
      if (state && list) {
        Flip.from(state, {
          duration: 0.5,
          ease: 'power2.inOut',
          absolute: false,
          onComplete: () => ScrollTrigger.refresh(),
        });
      } else {
        ScrollTrigger.refresh();
      }

      if (ref.current) {
        const rows = ref.current.querySelectorAll('[data-activity-row]');
        if (rows.length) {
          gsap.from(rows, {
            opacity: 0,
            y: 10,
            duration: 0.35,
            stagger: 0.035,
            ease: 'power2.out',
          });
        }
      }
    });
  });

  const visibleItems = open ? day.items : day.items.slice(0, 3);
  const hiddenCount = day.items.length - visibleItems.length;

  return (
    <Card as="li" className="overflow-hidden">
      <div ref={ref}>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-label={
            day.dayIndex + '일차 ' + day.theme + ' — ' + (open ? '접기' : '전체 일정 펼치기')
          }
          className="flex w-full items-start gap-4 p-5 text-left transition-colors hover:bg-ocean-50/60 sm:p-6"
        >
          <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-[var(--radius-field)] bg-ocean-700 text-white">
            <span className="text-[10px] font-medium leading-none opacity-80">DAY</span>
            <span className="text-body font-extrabold leading-none">{day.dayIndex}</span>
          </span>

          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-h3 text-ink">{day.theme}</span>
              <span className="rounded-[var(--radius-chip)] bg-surface-sunken px-2 py-0.5 text-xs font-medium text-ink-muted">
                {DAY_PACE_LABEL[day.pace]}
              </span>
            </span>
            <span className="mt-1 block text-xs text-ink-muted">{koreanDate(day.date)}</span>
            <span className="mt-2 block text-sm leading-relaxed text-ink-soft">
              {day.summary}
            </span>
          </span>

          <span
            aria-hidden="true"
            className={
              'mt-1 shrink-0 text-ink-muted transition-transform duration-[var(--duration-base)] ' +
              (open ? 'rotate-180' : '')
            }
          >
            ▾
          </span>
        </button>

        <ol data-day-items className="flex flex-col border-t border-line">
          {visibleItems.map((item) => (
            <li
              key={item.id}
              data-activity-row
              className="flex flex-col gap-2 border-b border-line px-5 py-4 last:border-b-0 sm:flex-row sm:gap-5 sm:px-6"
            >
              <div className="flex shrink-0 items-center gap-2 sm:w-40 sm:flex-col sm:items-start sm:gap-1.5">
                <TimeChip value={item.time} />
                <span
                  className={
                    'rounded-[var(--radius-chip)] border px-2 py-0.5 text-[11px] font-bold ' +
                    (KIND_TONE[item.kind] ?? KIND_TONE.sight)
                  }
                >
                  {ACTIVITY_KIND_LABEL[item.kind]}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h4 className="text-body font-bold text-ink">{item.title}</h4>
                  {item.cost && <Money value={item.cost} size="sm" showRange={false} />}
                </div>
                <p className="mt-0.5 text-xs text-ink-muted">
                  {item.areaName}
                  {item.indoor && <span className="ml-2 text-ocean-600">실내</span>}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  {item.description}
                </p>

                {item.tips.length > 0 && (
                  <ul className="mt-2.5 flex flex-col gap-1">
                    {item.tips.map((tip) => (
                      <li key={tip} className="flex gap-1.5 text-xs text-ink-muted">
                        <span aria-hidden="true">·</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                )}

                {item.respectsAvoid.length > 0 && (
                  <p className="mt-2 text-xs text-ocean-700">
                    요청 반영: {item.respectsAvoid.join(', ')}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>

        <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-subtle px-5 py-4 sm:px-6">
          {hiddenCount > 0 ? (
            <button
              type="button"
              onClick={toggle}
              className="text-sm font-bold text-ocean-700 underline underline-offset-4 hover:text-ocean-900"
            >
              일정 {hiddenCount}개 더 보기
            </button>
          ) : (
            <span className="text-xs text-ink-muted">
              {day.dayIndex}일차 일정 {day.items.length}개
            </span>
          )}

          <span className="flex items-center gap-2 text-sm">
            <span className="text-xs font-bold text-ink-muted">그날 비용</span>
            <Money value={day.daySubtotal} size="sm" showRange={false} />
          </span>
        </div>
      </div>
    </Card>
  );
}
