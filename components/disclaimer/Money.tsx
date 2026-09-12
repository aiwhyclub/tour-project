import type { MoneyEstimate } from '@/types/itinerary';
import { krw, krwRange } from '@/lib/format/krw';
import { ConfidenceBadge } from './ConfidenceBadge';

/**
 * 금액을 렌더하는 유일한 컴포넌트.
 *
 * R1: MoneyEstimate 를 소비할 수 있는 곳을 여기 한 곳으로 묶고,
 *     항상 ConfidenceBadge 를 함께 내보낸다.
 *     "배지 붙이는 걸 기억한다"가 아니라 구조적으로 뗄 수 없게 만든다.
 */
export function Money({
  value,
  size = 'base',
  showRange = true,
  showBadge = true,
}: {
  value: MoneyEstimate;
  size?: 'base' | 'lg' | 'sm';
  showRange?: boolean;
  showBadge?: boolean;
}) {
  const amountClass =
    size === 'lg'
      ? 'text-h2 font-extrabold tracking-tight'
      : size === 'sm'
        ? 'text-sm font-bold'
        : 'text-body font-bold';

  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span className={amountClass + ' text-ink tabular-nums'}>{krw(value.amount)}</span>
      {showBadge && <ConfidenceBadge confidence={value.confidence} />}
      {showRange && (
        <span className="text-xs text-ink-muted tabular-nums">
          {krwRange(value.rangeLow, value.rangeHigh)}
        </span>
      )}
    </span>
  );
}

/** 금액의 산정 근거와 확인 안내. 표 행을 펼쳤을 때 보여준다. */
export function MoneyBasis({ value }: { value: MoneyEstimate }) {
  return (
    <p className="text-xs leading-relaxed text-ink-muted">
      <span className="font-semibold text-ink-soft">산정 근거</span> {value.basis}
      <span className="mx-1.5 text-line-strong">·</span>
      {value.verifyHint}
    </p>
  );
}
