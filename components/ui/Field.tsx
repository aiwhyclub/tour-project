import type { ReactNode } from 'react';

export function Field({
  label,
  htmlFor,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  const describedBy = [hint ? htmlFor + '-hint' : null, error ? htmlFor + '-error' : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className="text-sm font-bold text-ink">
        {label}
        {required && (
          <span className="ml-1 text-accent-700" aria-label="필수 항목">
            *
          </span>
        )}
      </label>
      {hint && (
        <p id={htmlFor + '-hint'} className="text-xs text-ink-muted">
          {hint}
        </p>
      )}
      <div data-described-by={describedBy || undefined}>{children}</div>
      {error && (
        <p
          id={htmlFor + '-error'}
          role="alert"
          className="flex items-start gap-1.5 text-sm font-medium text-danger-ink"
        >
          <span aria-hidden="true">⚠</span>
          {error}
        </p>
      )}
    </div>
  );
}
