import type { PlanSummary } from '@/types/itinerary';
import { koreanRange } from '@/lib/format/date';
import { Card } from '@/components/ui/Card';
import { Money } from '@/components/disclaimer/Money';

export function SummaryCard({ summary }: { summary: PlanSummary }) {
  return (
    <Card as="article" className="overflow-hidden">
      <div className="bg-gradient-to-br from-ocean-800 to-ocean-600 p-6 sm:p-8">
        <p className="mb-2 text-sm font-bold tracking-wide text-ocean-100">
          {summary.destination} · {koreanRange(summary.startDate, summary.endDate)}
        </p>
        <h2 className="text-h1 text-white">{summary.title}</h2>
        <p className="mt-3 max-w-[600px] text-body leading-relaxed text-white/85">
          {summary.headline}
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <span className="rounded-[var(--radius-chip)] bg-white/15 px-3 py-1 text-xs font-bold text-white">
            {summary.nights}박 {summary.days}일
          </span>
          <span className="rounded-[var(--radius-chip)] bg-white/15 px-3 py-1 text-xs font-bold text-white">
            {summary.partySummary}
          </span>
          {summary.styleTags.map((tag) => (
            <span
              key={tag}
              className="rounded-[var(--radius-chip)] bg-white/15 px-3 py-1 text-xs font-bold text-white"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-6 p-6 sm:p-8 md:grid-cols-[1.2fr_1fr]">
        <div>
          <h3 className="mb-3 text-h3 text-ink">이 여행의 핵심</h3>
          <ul className="flex flex-col gap-2.5">
            {summary.highlights.map((item) => (
              <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-ink-soft">
                {/* 장식용 불릿. aria-hidden 이고 텍스트가 아니라 대비 기준 대상이 아니다.
                    accent-500 은 흰 배경에서 2.82:1 이라 글자색으로는 절대 쓰지 않는다. */}
                <span
                  aria-hidden="true"
                  className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500"
                />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-4 rounded-[var(--radius-field)] bg-surface-subtle p-5">
          <div>
            <p className="mb-1.5 text-xs font-bold text-ink-muted">전체 예상 비용</p>
            <Money value={summary.totalBudget} size="lg" />
          </div>
          <div className="border-t border-line pt-4">
            <p className="mb-1.5 text-xs font-bold text-ink-muted">1인당</p>
            <Money value={summary.perPersonBudget} />
          </div>
        </div>
      </div>
    </Card>
  );
}
