'use client';

import { useRef, useState } from 'react';
import { gsap, useGSAP } from '@/lib/motion/gsap-setup';
import { BUDGET_CATEGORY_LABEL, type BudgetTable as BudgetTableData } from '@/types/itinerary';
import { krw } from '@/lib/format/krw';
import { Card } from '@/components/ui/Card';
import { Money, MoneyBasis } from '@/components/disclaimer/Money';

const STATUS_TONE = {
  under: 'bg-ok-bg text-ok-ink',
  near: 'bg-ocean-50 text-ocean-800',
  over: 'bg-warn-bg text-warn-ink',
} as const;

const STATUS_LABEL = {
  under: '예산 여유',
  near: '예산 근접',
  over: '예산 초과',
} as const;

/**
 * 예산표.
 *
 * 표시되는 총계·비중·1인당은 모두 서버가 라인 아이템으로부터 재계산한 값이다 (R8).
 * 여기서는 어떤 산술도 하지 않는다 — 화면에서 계산하면 서버와 어긋날 수 있다.
 */
export function BudgetTable({ budget }: { budget: BudgetTableData }) {
  const [openRow, setOpenRow] = useState<string | null>(null);
  const scope = useRef<HTMLDivElement>(null);

  const { contextSafe } = useGSAP({ scope });

  const toggleRow = contextSafe((category: string) => {
    setOpenRow((prev) => (prev === category ? null : category));
    requestAnimationFrame(() => {
      const rows =
        scope.current?.querySelectorAll('[data-assumption="' + category + '"] li') ?? [];
      if (rows.length) {
        gsap.from(rows, { y: 8, opacity: 0, duration: 0.3, stagger: 0.04, ease: 'power2.out' });
      }
    });
  });

  return (
    <Card as="section" className="overflow-hidden">
      <div ref={scope}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5 sm:p-6">
        <h3 className="text-h2 text-ink">예상 예산표</h3>
        <span
          className={
            'rounded-[var(--radius-chip)] px-3 py-1.5 text-sm font-bold ' +
            STATUS_TONE[budget.vsUserBudget.status]
          }
        >
          {STATUS_LABEL[budget.vsUserBudget.status]}
        </span>
      </header>

      {/* 데스크톱: 표 / 모바일: 카드 — 같은 데이터, 배치만 다르다 (R4) */}
      <div className="hidden md:block">
        <table className="w-full">
          <caption className="sr-only">
            항목별 예상 비용과 전체 대비 비중. 모든 금액은 추정값입니다.
          </caption>
          <thead>
            <tr className="border-b border-line bg-surface-subtle text-left">
              <th scope="col" className="px-6 py-3 text-xs font-bold text-ink-muted">항목</th>
              <th scope="col" className="px-6 py-3 text-xs font-bold text-ink-muted">예상 금액</th>
              <th scope="col" className="px-6 py-3 text-xs font-bold text-ink-muted">1인당</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-ink-muted">비중</th>
            </tr>
          </thead>
          <tbody>
            {budget.lines.map((line) => (
              <tr key={line.category} className="border-b border-line align-top last:border-b-0">
                <td className="px-6 py-4">
                  <button
                    type="button"
                    onClick={() => toggleRow(line.category)}
                    aria-expanded={openRow === line.category}
                    className="text-left"
                  >
                    <span className="block text-body font-bold text-ink">{line.label}</span>
                    <span className="mt-0.5 block text-xs text-ink-muted">
                      {BUDGET_CATEGORY_LABEL[line.category]} · 산정 근거 보기
                    </span>
                  </button>
                  {openRow === line.category && (
                    <div data-assumption={line.category} className="mt-3 max-w-[420px]">
                      <MoneyBasis value={line.estimate} />
                      <ul className="mt-2 flex flex-col gap-1">
                        {line.assumptions.map((a) => (
                          <li key={a} className="flex gap-1.5 text-xs text-ink-muted">
                            <span aria-hidden="true">·</span>
                            {a}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4"><Money value={line.estimate} /></td>
                <td className="px-6 py-4"><Money value={line.perPerson} size="sm" showRange={false} /></td>
                <td className="px-6 py-4 text-right text-sm font-bold tabular-nums text-ink-soft">
                  {line.sharePercent.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-surface-subtle">
              <td className="px-6 py-5 text-body font-extrabold text-ink">합계</td>
              <td className="px-6 py-5"><Money value={budget.total} size="lg" /></td>
              <td className="px-6 py-5"><Money value={budget.perPerson} showRange={false} /></td>
              <td className="px-6 py-5 text-right text-sm font-bold tabular-nums text-ink-soft">100.0%</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <ul className="flex flex-col md:hidden">
        {budget.lines.map((line) => (
          <li key={line.category} className="border-b border-line p-5">
            <button
              type="button"
              onClick={() => toggleRow(line.category)}
              aria-expanded={openRow === line.category}
              className="flex w-full items-start justify-between gap-3 text-left"
            >
              <span>
                <span className="block text-body font-bold text-ink">{line.label}</span>
                {/* 금액은 항상 Money 를 통해 렌더한다 (R1). 다만 같은 행의 총액이
                    이미 신뢰도 배지를 달고 있으므로 여기서는 배지를 중복하지 않는다. */}
                <span className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-ink-muted">
                  <span>1인당</span>
                  <Money
                    value={line.perPerson}
                    size="sm"
                    showRange={false}
                    showBadge={false}
                  />
                  <span>· {line.sharePercent.toFixed(1)}%</span>
                </span>
              </span>
              <Money value={line.estimate} size="sm" showRange={false} />
            </button>
            {openRow === line.category && (
              <div data-assumption={line.category} className="mt-3">
                <MoneyBasis value={line.estimate} />
                <ul className="mt-2 flex flex-col gap-1">
                  {line.assumptions.map((a) => (
                    <li key={a} className="flex gap-1.5 text-xs text-ink-muted">
                      <span aria-hidden="true">·</span>
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        ))}
        <li className="flex items-center justify-between gap-3 bg-surface-subtle p-5">
          {/* shrink-0 이 없으면 좁은 화면에서 '합'/'계' 로 쪼개진다 */}
          <span className="shrink-0 whitespace-nowrap text-body font-extrabold text-ink">
            합계
          </span>
          <Money value={budget.total} />
        </li>
      </ul>

      <div className="flex flex-col gap-3 border-t border-line bg-surface-subtle p-5 sm:p-6">
        <p className="text-sm font-medium text-ink-soft">{budget.vsUserBudget.comment}</p>
        <p className="text-xs text-ink-muted">
          입력한 예산 {krw(budget.vsUserBudget.userBudget)} 기준 ·{' '}
          {budget.excluded.join(' · ')}
        </p>
      </div>
      </div>
    </Card>
  );
}
