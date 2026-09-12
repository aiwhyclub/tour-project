'use client';

import { useRef, useState } from 'react';
import { gsap, useGSAP } from '@/lib/motion/gsap-setup';
import {
  CHECKLIST_CATEGORY_LABEL,
  CHECKLIST_PRIORITY_LABEL,
  type ChecklistPriority,
  type PackingChecklist as PackingChecklistData,
} from '@/types/itinerary';
import { Card } from '@/components/ui/Card';

const PRIORITY_TONE: Record<ChecklistPriority, string> = {
  must: 'bg-accent-700 text-white',
  recommended: 'bg-ocean-100 text-ocean-800',
  optional: 'bg-surface-sunken text-ink-muted',
};

/** 준비물 체크리스트. 항목을 누르면 취소선이 훑고 지나가며 살짝 튄다 (조건 1-1). */
export function PackingChecklist({ checklist }: { checklist: PackingChecklistData }) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const scope = useRef<HTMLDivElement>(null);

  const { contextSafe } = useGSAP({ scope });

  const toggle = contextSafe((id: string) => {
    const next = new Set(checked);
    const turningOn = !next.has(id);
    if (turningOn) next.add(id);
    else next.delete(id);
    setChecked(next);

    const row = scope.current?.querySelector('[data-check-id="' + id + '"]');
    if (!row) return;

    const strike = row.querySelector('[data-strike]');
    if (strike) {
      gsap.fromTo(
        strike,
        { scaleX: turningOn ? 0 : 1 },
        { scaleX: turningOn ? 1 : 0, duration: 0.28, ease: 'power2.inOut' },
      );
    }
    if (turningOn) {
      gsap.fromTo(
        row,
        { scale: 1 },
        { scale: 1.03, duration: 0.14, yoyo: true, repeat: 1, ease: 'power2.inOut' },
      );
    }
  });

  const doneCount = checked.size;

  return (
    <Card as="section">
      <div ref={scope}>
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5 sm:p-6">
          <h3 className="text-h2 text-ink">준비물 체크리스트</h3>
          <span className="text-sm font-bold tabular-nums text-ocean-700">
            {doneCount} / {checklist.items.length}
          </span>
        </header>

        {/* 768~1023px 는 2열로 둔다. 그 폭에서 3열이면 체크박스+라벨+사유+배지 2개가 뭉개진다. */}
        <ul className="grid gap-2 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
          {checklist.items.map((item) => {
            const isChecked = checked.has(item.id);
            return (
              <li key={item.id} data-check-id={item.id}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={isChecked}
                  onClick={() => toggle(item.id)}
                  className={
                    'flex w-full items-start gap-3 rounded-[var(--radius-field)] border p-3.5 text-left transition-colors ' +
                    (isChecked
                      ? 'border-ocean-200 bg-ocean-50'
                      : 'border-line bg-surface hover:border-ocean-200 hover:bg-ocean-50/50')
                  }
                >
                  <span
                    aria-hidden="true"
                    className={
                      'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 text-xs font-bold transition-colors ' +
                      (isChecked
                        ? 'border-ocean-700 bg-ocean-700 text-white'
                        : 'border-control-border bg-surface text-transparent')
                    }
                  >
                    ✓
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="relative inline-block">
                      <span
                        className={
                          'text-body font-bold transition-colors ' +
                          (isChecked ? 'text-ink-muted' : 'text-ink')
                        }
                      >
                        {item.label}
                      </span>
                      <span
                        data-strike
                        aria-hidden="true"
                        className="absolute left-0 top-1/2 h-[2px] w-full origin-left bg-ink-muted"
                        style={{ transform: 'scaleX(0)' }}
                      />
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-ink-muted">
                      {item.reason}
                    </span>
                  </span>

                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span
                      className={
                        'rounded-[var(--radius-chip)] px-2 py-0.5 text-[11px] font-bold ' +
                        PRIORITY_TONE[item.priority]
                      }
                    >
                      {CHECKLIST_PRIORITY_LABEL[item.priority]}
                    </span>
                    <span className="text-[11px] text-ink-muted">
                      {CHECKLIST_CATEGORY_LABEL[item.category]}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <p className="border-t border-line bg-surface-subtle p-5 text-sm leading-relaxed text-ink-soft sm:p-6">
          {checklist.seasonNote}
        </p>
      </div>
    </Card>
  );
}
