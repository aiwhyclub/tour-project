import { CONFIDENCE_LABEL, type Confidence } from '@/types/itinerary';

const STYLES: Record<Confidence, string> = {
  estimate: 'bg-ocean-50 text-ocean-800 border-ocean-200',
  typical_range: 'bg-warn-bg text-warn-ink border-warn-line',
  unverified: 'bg-surface-sunken text-ink-soft border-line-strong',
};

/**
 * 추정 배지.
 *
 * R1: 이 배지는 정적 문구가 아니라 데이터의 confidence 필드를 읽어 렌더된다.
 * 화면에 금액이나 시각이 보이는 곳에는 반드시 이 배지가 함께 있다.
 */
export function ConfidenceBadge({
  confidence,
  className = '',
}: {
  confidence: Confidence;
  className?: string;
}) {
  return (
    <span
      className={
        'inline-flex shrink-0 items-center rounded-[var(--radius-chip)] border ' +
        'px-2 py-0.5 text-xs font-bold leading-none ' +
        STYLES[confidence] +
        ' ' +
        className
      }
    >
      {CONFIDENCE_LABEL[confidence]}
    </span>
  );
}
