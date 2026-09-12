'use client';

import { useRef, type ReactNode } from 'react';
import { gsap, useGSAP } from '@/lib/motion/gsap-setup';

/**
 * 스크롤 진입 시 올라오며 나타나는 범용 래퍼.
 *
 * R7: 모션 저감 환경에서는 거리 이동 없이 아주 짧은 페이드만 남긴다.
 *     matchMedia 가 조건 해제 시 자동으로 되돌리므로 리사이즈도 안전하다.
 */
export function Reveal({
  children,
  delay = 0,
  className = '',
  as: Tag = 'div',
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: 'div' | 'section' | 'li' | 'article';
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(
        {
          motion: '(prefers-reduced-motion: no-preference)',
          calm: '(prefers-reduced-motion: reduce)',
        },
        (ctx) => {
          const { calm } = ctx.conditions as Record<string, boolean>;

          gsap.from(ref.current, {
            opacity: 0,
            y: calm ? 0 : 24,
            duration: calm ? 0.15 : 0.7,
            delay: calm ? 0 : delay,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: ref.current,
              start: 'top 88%',
              once: true,
            },
          });
        },
      );

      return () => mm.revert();
    },
    { scope: ref, dependencies: [delay] },
  );

  return (
    <Tag ref={ref as never} className={className}>
      {children}
    </Tag>
  );
}
