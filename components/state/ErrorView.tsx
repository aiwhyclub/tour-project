'use client';

import { ERROR_SPECS } from '@/lib/errors';
import type { PlanErrorState } from '@/lib/state/plan-machine';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

/**
 * 오류 화면.
 *
 * 오류 코드마다 서로 다른 한국어 문구를 보여준다.
 * 내부 오류 원문이나 스택은 절대 노출하지 않는다 (R2).
 */
export function ErrorView({
  error,
  onRetry,
  onEdit,
}: {
  error: PlanErrorState;
  onRetry: () => void;
  onEdit: () => void;
}) {
  const spec = ERROR_SPECS[error.code];

  return (
    <Card as="section" className="p-8 sm:p-12">
      <div className="flex flex-col items-center gap-6 text-center" role="alert">
        <span
          aria-hidden="true"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-danger-bg text-2xl"
        >
          ⚠
        </span>

        <div>
          <h2 className="text-h2 text-ink">{error.message}</h2>
          <p className="mt-2.5 max-w-[460px] text-sm leading-relaxed text-ink-soft">
            {spec.detail}
          </p>
        </div>

        {error.fields && Object.keys(error.fields).length > 0 && (
          <ul className="w-full max-w-[460px] rounded-[var(--radius-field)] border border-danger-line bg-danger-bg p-4 text-left">
            {Object.entries(error.fields).map(([field, message]) => (
              <li key={field} className="text-sm text-danger-ink">
                {message}
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="secondary" onClick={onEdit}>
            조건 수정
          </Button>
          {error.retryable && <Button onClick={onRetry}>다시 시도</Button>}
        </div>

        <p className="text-xs text-ink-muted">
          입력한 조건은 그대로 남아 있습니다.
        </p>
      </div>
    </Card>
  );
}
