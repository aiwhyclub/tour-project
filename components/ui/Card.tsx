import type { ReactNode } from 'react';

export function Card({
  children,
  className = '',
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article' | 'li';
}) {
  return (
    <Tag
      className={
        'rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-card)] ' +
        className
      }
    >
      {children}
    </Tag>
  );
}
