'use client';

import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-ocean-700 text-white hover:bg-ocean-800 active:bg-ocean-900 disabled:bg-ocean-300',
  secondary:
    'bg-surface text-ocean-800 border border-ocean-200 hover:bg-ocean-50 active:bg-ocean-100',
  ghost: 'bg-transparent text-ink-soft hover:bg-surface-sunken',
};

/**
 * ref 를 평범한 prop 으로 받는다. React 19 부터 함수 컴포넌트가 forwardRef 없이
 * ref 를 받을 수 있는데, ButtonHTMLAttributes 에는 ref 가 들어 있지 않아 명시한다.
 * 처리 중 오버레이가 열릴 때 [취소] 로 포커스를 옮기는 데 쓴다.
 */
export function Button({
  children,
  variant = 'primary',
  className = '',
  ref,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: Variant;
  ref?: Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={ref}
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
