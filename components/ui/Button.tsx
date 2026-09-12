'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-ocean-700 text-white hover:bg-ocean-800 active:bg-ocean-900 disabled:bg-ocean-300',
  secondary:
    'bg-surface text-ocean-800 border border-ocean-200 hover:bg-ocean-50 active:bg-ocean-100',
  ghost: 'bg-transparent text-ink-soft hover:bg-surface-sunken',
};

export function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: Variant;
}) {
  return (
    <button
      {...props}
      className={
        'inline-flex items-center justify-center gap-2 rounded-[var(--radius-field)] ' +
        'px-6 py-3.5 text-body font-bold transition-colors duration-[var(--duration-fast)] ' +
        'disabled:cursor-not-allowed disabled:opacity-70 ' +
        VARIANTS[variant] +
        ' ' +
        className
      }
    >
      {children}
    </button>
  );
}
