'use client';

import { useRef, type ReactNode } from 'react';
import { gsap, useGSAP } from '@/lib/motion/gsap-setup';

/**
 * 클릭·호버에 반응하는 공통 카드 동작 (사용자 요구 조건 1-1).
 *
 * 이벤트 핸들러에서 만드는 트윈은 contextSafe 로 감싼다.
 * 그러지 않으면 useGSAP 컨텍스트 밖에서 생성되어 언마운트 시 정리되지 않는다.
 */
export function InteractiveCard({
  children,
  onActivate,
  className = '',
  ariaLabel,
  expanded,
}: {
  children: ReactNode;
  onActivate?: () => void;
  className?: string;
  ariaLabel?: string;
  expanded?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const { contextSafe } = useGSAP({ scope: ref });

  const press = contextSafe(() => {
    gsap.fromTo(
      ref.current,
      { scale: 1 },
      { scale: 0.985, duration: 0.12, yoyo: true, repeat: 1, ease: 'power2.inOut' },
    );
  });

  const lift = contextSafe((up: boolean) => {
    gsap.to(ref.current, {
      y: up ? -4 : 0,
      duration: 0.25,
      ease: 'power2.out',
    });
  });

  const handleClick = () => {
    press();
    onActivate?.();
  };

  const interactive = Boolean(onActivate);

  return (
    <div
      ref={ref}
      className={className}
      {...(interactive
        ? {
            role: 'button',
            tabIndex: 0,
            'aria-label': ariaLabel,
            'aria-expanded': expanded,
            onClick: handleClick,
            onKeyDown: (event: React.KeyboardEvent) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handleClick();
              }
            },
            onMouseEnter: () => lift(true),
            onMouseLeave: () => lift(false),
            onFocus: () => lift(true),
            onBlur: () => lift(false),
          }
        : {})}
    >
      {children}
    </div>
  );
}
