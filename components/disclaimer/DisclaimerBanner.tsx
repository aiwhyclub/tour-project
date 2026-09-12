import type { Disclaimer } from '@/types/itinerary';

/**
 * 서버가 강제 주입한 면책 목록을 렌더한다 (R1).
 * 모델이 쓴 문구가 아니라 서버가 정한 문구이므로 누락될 수 없다.
 */
export function DisclaimerBanner({ items }: { items: Disclaimer[] }) {
  if (items.length === 0) return null;

  const warnings = items.filter((d) => d.severity === 'warning');
  const infos = items.filter((d) => d.severity === 'info');

  return (
    <aside
      aria-label="결과 이용 시 주의사항"
      className="rounded-[var(--radius-card)] border border-warn-line bg-warn-bg p-5 sm:p-6"
    >
      <h3 className="mb-3 flex items-center gap-2 text-h3 text-warn-ink">
        <span aria-hidden="true">⚠</span>
        결과를 보기 전에 확인해 주세요
      </h3>
      <ul className="flex flex-col gap-2.5">
        {warnings.map((d) => (
          <li key={d.id} className="flex gap-2 text-sm leading-relaxed text-warn-ink">
            <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-warn-ink" />
            {d.message}
          </li>
        ))}
        {infos.map((d) => (
          <li key={d.id} className="flex gap-2 text-sm leading-relaxed text-ink-soft">
            <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ink-muted" />
            {d.message}
          </li>
        ))}
      </ul>
    </aside>
  );
}
