'use client';

import { useRef } from 'react';
import { gsap, useGSAP } from '@/lib/motion/gsap-setup';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

const STEPS = [
  '조건을 정리하고 있어요',
  '일자별 동선을 잡고 있어요',
  '예산을 계산하고 있어요',
  '준비물과 우천 대안을 챙기고 있어요',
] as const;

/** 처리 중 화면. 취소할 수 있어야 사용자가 갇히지 않는다. */
export function LoadingView({ onCancel }: { onCancel: () => void }) {
  const scope = useRef<HTMLDivElement>(null);

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
          if (calm) return; // R7: 반복 애니메이션을 만들지 않는다

          gsap.to('[data-loading-dot]', {
            y: -8,
            duration: 0.5,
            stagger: { each: 0.12, repeat: -1, yoyo: true },
            ease: 'power1.inOut',
          });
          gsap.to('[data-loading-step]', {
            opacity: 1,
            duration: 0.4,
            stagger: 1.1,
            ease: 'power1.out',
          });
        },
      );
      return () => mm.revert();
    },
    { scope },
  );

  return (
    <Card as="section" className="p-8 sm:p-12">
      <div ref={scope} className="flex flex-col items-center gap-7 text-center">
        <div className="flex gap-2" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              data-loading-dot
              className="h-3 w-3 rounded-full bg-ocean-500"
            />
          ))}
        </div>

        <div role="status" aria-live="polite">
          <h2 className="text-h2 text-ink">여행 계획을 만들고 있어요</h2>
          <p className="mt-2 text-sm text-ink-soft">
            보통 10초에서 30초 정도 걸립니다.
          </p>
        </div>

        <ul className="flex flex-col gap-2">
          {STEPS.map((step, i) => (
            <li
              key={step}
              data-loading-step
              className="text-sm text-ink-muted"
              style={{ opacity: i === 0 ? 1 : 0.25 }}
            >
              {step}
            </li>
          ))}
        </ul>

        <Button variant="ghost" onClick={onCancel}>
          취소
        </Button>
      </div>
    </Card>
  );
}
