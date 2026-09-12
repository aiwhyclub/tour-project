'use client';

import { Button } from '@/components/ui/Button';

export function RegenerateBar({
  onEdit,
  onRegenerate,
  busy,
}: {
  onEdit: () => void;
  onRegenerate: () => void;
  busy: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-surface-subtle p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <p className="text-sm leading-relaxed text-ink-soft">
        마음에 들지 않으면 조건을 바꾸거나 같은 조건으로 다시 만들어 보세요.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:shrink-0">
        <Button variant="secondary" onClick={onEdit} disabled={busy}>
          조건 수정
        </Button>
        <Button onClick={onRegenerate} disabled={busy}>
          다시 만들기
        </Button>
      </div>
    </div>
  );
}
