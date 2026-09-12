import type { RainyDayPlan } from '@/types/itinerary';
import { Card } from '@/components/ui/Card';
import { Money } from '@/components/disclaimer/Money';

export function RainyDayPanel({
  rainyDay,
  dayThemes,
}: {
  rainyDay: RainyDayPlan;
  dayThemes: Map<number, string>;
}) {
  return (
    <Card as="section">
      <header className="border-b border-line p-5 sm:p-6">
        <h3 className="flex items-center gap-2 text-h2 text-ink">
          <span aria-hidden="true">☂</span>
          우천 시 대안
        </h3>
        <p className="mt-1.5 text-sm text-ink-soft">
          비가 오면 아래 일정으로 바꾸면 됩니다. 실외 일정을 우선 대체했습니다.
        </p>
      </header>

      <ul className="grid gap-3 p-5 sm:p-6 md:grid-cols-2">
        {rainyDay.alternatives.map((alt) => (
          <li
            key={alt.id}
            className="flex flex-col gap-2 rounded-[var(--radius-field)] border border-line bg-surface-subtle p-4"
          >
            <div className="flex items-center gap-2">
              <span className="rounded-[var(--radius-chip)] bg-ocean-700 px-2 py-0.5 text-[11px] font-bold text-white">
                {alt.dayIndex}일차
              </span>
              <span className="truncate text-xs text-ink-muted">
                {dayThemes.get(alt.dayIndex) ?? ''}
              </span>
            </div>

            <h4 className="text-body font-bold text-ink">{alt.title}</h4>
            <p className="text-xs text-ink-muted">{alt.areaName}</p>
            <p className="text-sm leading-relaxed text-ink-soft">{alt.description}</p>

            {alt.cost && (
              <div className="mt-1">
                <Money value={alt.cost} size="sm" showRange={false} />
              </div>
            )}
          </li>
        ))}
      </ul>

      <div className="border-t border-line bg-surface-subtle p-5 sm:p-6">
        <h4 className="mb-2.5 text-sm font-bold text-ink">비 오는 날 참고</h4>
        <ul className="flex flex-col gap-2">
          {rainyDay.generalAdvice.map((advice) => (
            <li key={advice} className="flex gap-2 text-sm leading-relaxed text-ink-soft">
              <span
                aria-hidden="true"
                className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-ink-muted"
              />
              {advice}
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
