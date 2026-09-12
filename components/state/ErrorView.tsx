'use client';

import { useEffect, useRef } from 'react';
import { ERROR_SPECS } from '@/lib/errors';
import type { PlanErrorState } from '@/lib/state/plan-machine';
import type { PlanRequestInput } from '@/lib/validation/plan-request';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { InputSummary } from '@/components/state/InputSummary';

/**
 * 오류 화면.
 *
 * 오류 코드마다 서로 다른 한국어 문구를 보여준다.
 * 내부 오류 원문이나 스택은 절대 노출하지 않는다 (R2).
 *
 * 입력 요약을 함께 보여 준다 (E2-S19). "입력한 조건은 그대로 남아 있습니다"라고
 * 쓰기만 하면 사용자는 확인할 방법이 없다. 조건을 보여 주면 문장이 사실이 된다.
 */
export function ErrorView({
  error,
  request,
  onRetry,
  onEdit,
}: {
  error: PlanErrorState;
  request: PlanRequestInput | null;
  onRetry: () => void;
  onEdit: () => void;
}) {
  const spec = ERROR_SPECS[error.code];
  const primaryRef = useRef<HTMLButtonElement>(null);

  // role="alert" 가 읽힌 뒤 주 행동으로 포커스를 옮긴다
  // (design/screen-states.md §7). 재시도할 수 없는 오류면 [조건 수정] 이 주 행동이다.
  useEffect(() => {
    primaryRef.current?.focus();
  }, [error.code]);

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

        <InputSummary request={request} />

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="secondary"
            onClick={onEdit}
            ref={error.retryable ? undefined : primaryRef}
          >
            조건 수정
          </Button>
          {error.retryable && (
            <Button onClick={onRetry} ref={primaryRef}>
              다시 시도
            </Button>
          )}
        </div>

        <div className="flex flex-col items-center gap-1">
          <p className="text-xs text-ink-muted">입력한 조건은 그대로 남아 있습니다.</p>
          {/* 문의용 식별자. 키나 내부 경로는 들어가지 않는다 (R2·SEC4). */}
          <p className="text-xs text-ink-muted">오류 코드 {error.code}</p>
        </div>
      </div>
    </Card>
  );
}
