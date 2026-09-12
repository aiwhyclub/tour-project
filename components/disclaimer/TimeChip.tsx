import type { TimeEstimate } from '@/types/itinerary';
import { minutesToKorean } from '@/lib/format/date';
import { ConfidenceBadge } from './ConfidenceBadge';

/**
 * 시각을 렌더하는 유일한 컴포넌트.
 *
 * R1: 여기 표시되는 시각은 "일정상 계획 시간"이며 영업시간 보장이 아니다.
 *     hoursNote 가 있으면 title 로 노출해 오해를 줄인다.
 */
export function TimeChip({ value, showBadge = false }: { value: TimeEstimate; showBadge?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <time className="text-sm font-bold tabular-nums text-ocean-800">{value.start}</time>
      <span className="text-xs text-ink-muted">
        {minutesToKorean(value.durationMinutes)}
      </span>
      {showBadge && <ConfidenceBadge confidence={value.confidence} />}
      {value.hoursNote && (
        <span
          className="cursor-help text-xs text-ink-muted"
          title={value.hoursNote}
          aria-label={value.hoursNote}
        >
          ⓘ
        </span>
      )}
    </span>
  );
}
