'use client';

export function Chip({
  label,
  hint,
  selected,
  disabled,
  onToggle,
}: {
  label: string;
  hint?: string;
  selected: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      aria-label={hint ? label + ' — ' + hint : label}
      disabled={disabled && !selected}
      onClick={onToggle}
      className={
        'rounded-[var(--radius-chip)] border px-4 py-2 text-sm font-medium ' +
        'transition-all duration-[var(--duration-fast)] ' +
        'disabled:cursor-not-allowed disabled:opacity-40 ' +
        (selected
          ? 'border-ocean-700 bg-ocean-700 text-white shadow-[var(--shadow-card)]'
          : 'border-control-border bg-surface text-ink-soft hover:border-ocean-600 hover:bg-ocean-50')
      }
    >
      {label}
    </button>
  );
}
