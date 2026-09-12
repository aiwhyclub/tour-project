import type { MoneyEstimate } from '@/types/itinerary';
import { krw, krwRange } from '@/lib/format/krw';
import { ConfidenceBadge } from './ConfidenceBadge';

/**
 * 금액을 렌더하는 유일한 컴포넌트.
 *
 * R1: MoneyEstimate 를 소비할 수 있는 곳을 여기 한 곳으로 묶고,
 *     항상 ConfidenceBadge 를 함께 내보낸다.
 *     "배지 붙이는 걸 기억한다"가 아니라 구조적으로 뗄 수 없게 만든다.
 *
 * showBadge 같은 예외 구멍을 두지 않는다. 한 번 열어 두면 "이 줄은 옆에 배지가
 * 있으니까 괜찮다" 같은 판단이 호출부마다 생기고, 그 판단이 맞는지는 화면을
 * 직접 봐야만 알 수 있게 된다. 실제로 그렇게 뚫린 구멍 하나 때문에 390px 예산
 * 카드의 1인당 금액 4건이 배지 없이 나가고 있었다 (S6 위반).
 *
 * showRange 는 다르다. 범위는 확신도가 아니라 밀도의 문제이고, 빼도 그 금액이
 * 확정으로 읽히지 않는다.
 */
export function Money({
  value,
  size = 'base',
  showRange = true,
}: {
  value: MoneyEstimate;
  size?: 'base' | 'lg' | 'sm';
  showRange?: boolean;
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
      <ConfidenceBadge confidence={value.confidence} />
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
